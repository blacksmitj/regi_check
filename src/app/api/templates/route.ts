import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formTemplate, formField } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import crypto from "crypto";
import { FormField } from "@/types/domain";

export async function GET() {
  try {
    const templates = await db
      .select()
      .from(formTemplate)
      .orderBy(desc(formTemplate.createdAt));

    const allFields = await db
      .select()
      .from(formField)
      .orderBy(asc(formField.order));

    const result = templates.map((tpl) => ({
      ...tpl,
      createdAt: tpl.createdAt.toISOString(),
      updatedAt: tpl.updatedAt.toISOString(),
      items: allFields.filter((f) => f.templateId === tpl.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data template" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, sampleColumns = [], items = [], id: customId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama template wajib diisi" },
        { status: 400 }
      );
    }

    const tplId = customId || `tpl_${crypto.randomUUID()}`;

    const savedTpl = await db.transaction(async (tx) => {
      const [createdTpl] = await tx
        .insert(formTemplate)
        .values({
          id: tplId,
          name,
          description: description || null,
          sampleColumns: sampleColumns || [],
        })
        .returning();

      if (items && items.length > 0) {
        const fields = items.map((item: FormField, idx: number) => ({
          id: `field_${crypto.randomUUID()}`,
          templateId: tplId,
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

        await tx.insert(formField).values(fields);
      }

      return createdTpl;
    });

    const insertedFields = await db
      .select()
      .from(formField)
      .where(eq(formField.templateId, tplId))
      .orderBy(asc(formField.order));

    return NextResponse.json(
      {
        ...savedTpl,
        createdAt: savedTpl.createdAt.toISOString(),
        updatedAt: savedTpl.updatedAt.toISOString(),
        items: insertedFields,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      { error: "Gagal membuat template" },
      { status: 500 }
    );
  }
}

