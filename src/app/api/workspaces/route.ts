import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspace, formField, formTemplate } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await getCurrentUser();
    // If not logged in, or if officer, only show active workspaces
    const isOfficer = !user || user.role === "officer";

    let workspaces;
    if (isOfficer) {
      workspaces = await db
        .select()
        .from(workspace)
        .where(eq(workspace.status, "active"))
        .orderBy(desc(workspace.createdAt));
    } else {
      workspaces = await db
        .select()
        .from(workspace)
        .orderBy(desc(workspace.createdAt));
    }

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data workspace" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Allow admin or authenticated user to create workspace
    const body = await req.json();
    const {
      name,
      description,
      startDate,
      endDate,
      templateId,
      uniqueKeyColumn,
      nameColumn,
      photoColumn,
    } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Nama, tanggal mulai, dan tanggal selesai wajib diisi" },
        { status: 400 }
      );
    }

    const newWorkspaceId = `ws_${crypto.randomUUID()}`;

    const [created] = await db
      .insert(workspace)
      .values({
        id: newWorkspaceId,
        name,
        description: description || null,
        startDate,
        endDate,
        status: "active",
        templateId: templateId || null,
        uniqueKeyColumn: uniqueKeyColumn || null,
        nameColumn: nameColumn || null,
        photoColumn: photoColumn || null,
        createdBy: user?.id || null,
      })
      .returning();

    // If templateId provided, copy template fields to this workspace
    if (templateId) {
      const templateFields = await db
        .select()
        .from(formField)
        .where(eq(formField.templateId, templateId));

      if (templateFields.length > 0) {
        const workspaceFields = templateFields.map((field) => ({
          id: `field_${crypto.randomUUID()}`,
          workspaceId: newWorkspaceId,
          templateId: null,
          label: field.label,
          description: field.description,
          type: field.type,
          sourceType: field.sourceType,
          excelColumn: field.excelColumn,
          required: field.required,
          editable: field.editable,
          evidenceEnabled: field.evidenceEnabled,
          evidenceRequired: field.evidenceRequired,
          validation: field.validation,
          options: field.options,
          order: field.order,
          active: field.active,
        }));

        await db.insert(formField).values(workspaceFields);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Gagal membuat workspace" },
      { status: 500 }
    );
  }
}

