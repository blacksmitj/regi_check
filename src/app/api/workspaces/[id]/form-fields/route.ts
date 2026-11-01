import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formField } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import crypto from "crypto";
import { FormField } from "@/types/domain";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const fields = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, id))
      .orderBy(asc(formField.order));

    return NextResponse.json(fields);
  } catch (error) {
    console.error("GET /api/workspaces/[id]/form-fields error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil konfigurasi form field" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const items: FormField[] = await req.json();

    // Delete existing workspace form fields and insert new ones
    await db.delete(formField).where(eq(formField.workspaceId, id));

    if (items && items.length > 0) {
      const formatted = items.map((item, index) => ({
        id: item.id || `field_${crypto.randomUUID()}`,
        workspaceId: id,
        templateId: null,
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
        order: item.order ?? index,
        active: item.active ?? true,
      }));

      await db.insert(formField).values(formatted);
    }

    const updated = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, id))
      .orderBy(asc(formField.order));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/workspaces/[id]/form-fields error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan form fields" },
      { status: 500 }
    );
  }
}

