import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formTemplate, formField } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import crypto from "crypto";
import { FormField } from "@/types/domain";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [tpl] = await db
      .select()
      .from(formTemplate)
      .where(eq(formTemplate.id, id));

    if (!tpl) {
      return NextResponse.json(
        { error: "Template tidak ditemukan" },
        { status: 404 }
      );
    }

    const fields = await db
      .select()
      .from(formField)
      .where(eq(formField.templateId, id))
      .orderBy(asc(formField.order));

    return NextResponse.json({
      ...tpl,
      createdAt: tpl.createdAt.toISOString(),
      updatedAt: tpl.updatedAt.toISOString(),
      items: fields,
    });
  } catch (error) {
    console.error("GET /api/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil template" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, sampleColumns = [], items = [] } = body;

    const [updatedTpl] = await db
      .update(formTemplate)
      .set({
        name,
        description: description || null,
        sampleColumns: sampleColumns || [],
        updatedAt: new Date(),
      })
      .where(eq(formTemplate.id, id))
      .returning();

    if (!updatedTpl) {
      return NextResponse.json(
        { error: "Template tidak ditemukan" },
        { status: 404 }
      );
    }

    // Re-create items for this template
    await db.delete(formField).where(eq(formField.templateId, id));

    if (items && items.length > 0) {
      const formatted = items.map((item: FormField, idx: number) => ({
        id: item.id || `field_${crypto.randomUUID()}`,
        templateId: id,
        workspaceId: null,
        label: item.label,
        description: item.description || null,
        type: item.type,
        sourceType: item.sourceType || "checklist_input",
        excelColumn: item.excelColumn || null,
        required: item.required ?? false,
        editable: item.editable ?? false,
        evidenceEnabled: item.evidenceEnabled ?? false,
        evidenceRequired: item.evidenceRequired ?? false,
        validation: item.validation || null,
        options: item.options || null,
        order: item.order ?? idx,
        active: item.active ?? true,
      }));

      await db.insert(formField).values(formatted);
    }

    const updatedFields = await db
      .select()
      .from(formField)
      .where(eq(formField.templateId, id))
      .orderBy(asc(formField.order));

    return NextResponse.json({
      ...updatedTpl,
      createdAt: updatedTpl.createdAt.toISOString(),
      updatedAt: updatedTpl.updatedAt.toISOString(),
      items: updatedFields,
    });
  } catch (error) {
    console.error("PUT /api/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui template" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(formTemplate)
      .where(eq(formTemplate.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Template tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/templates/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus template" },
      { status: 500 }
    );
  }
}

