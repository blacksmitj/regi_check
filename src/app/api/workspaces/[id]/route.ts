import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspace, checklistResponse, participant } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, id));
    if (!ws) {
      return NextResponse.json(
        { error: "Workspace tidak ditemukan" },
        { status: 404 }
      );
    }
    return NextResponse.json(ws);
  } catch (error) {
    console.error("GET /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data workspace" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(workspace)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Workspace tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui workspace" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const [deleted] = await db
      .delete(workspace)
      .where(eq(workspace.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Workspace tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus workspace" },
      { status: 500 }
    );
  }
}

