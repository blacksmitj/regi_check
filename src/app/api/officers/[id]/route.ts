import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { officer } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const updates = await req.json();

    const [updated] = await db
      .update(officer)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(officer.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Petugas tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updated.id,
      workspaceId: updated.workspaceId || undefined,
      name: updated.name,
      email: updated.email,
      active: updated.active,
      status: (updated as { status?: string }).status || (updated.active ? "active" : "rejected"),
      requestedWorkspaceId: (updated as { requestedWorkspaceId?: string | null }).requestedWorkspaceId || undefined,
      requestedAt: (updated as { requestedAt?: Date | null }).requestedAt
        ? ((updated as { requestedAt?: Date | null }).requestedAt as Date).toISOString()
        : undefined,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("PUT /api/officers/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data petugas" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return PUT(req, { params });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(officer)
      .where(eq(officer.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Petugas tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/officers/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus petugas" },
      { status: 500 }
    );
  }
}

