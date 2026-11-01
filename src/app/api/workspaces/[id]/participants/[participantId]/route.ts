import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participant, formField } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateParticipantStatus } from "@/lib/domain/status-engine";

interface RouteParams {
  params: Promise<{ id: string; participantId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { participantId } = await params;
    const [p] = await db
      .select()
      .from(participant)
      .where(eq(participant.id, participantId));

    if (!p) {
      return NextResponse.json(
        { error: "Peserta tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(p);
  } catch (error) {
    console.error("GET /api/workspaces/[id]/participants/[participantId] error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data peserta" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, participantId } = await params;
    const updates = await req.json();

    const [existing] = await db
      .select()
      .from(participant)
      .where(eq(participant.id, participantId));

    if (!existing) {
      return NextResponse.json(
        { error: "Peserta tidak ditemukan" },
        { status: 404 }
      );
    }

    let status = updates.status || existing.status;
    const mergedData = updates.data ? { ...existing.data, ...updates.data } : existing.data;

    if (updates.data && !updates.status) {
      const fields = await db
        .select()
        .from(formField)
        .where(eq(formField.workspaceId, id));

      status = calculateParticipantStatus(fields as any, mergedData);
    }

    const [updated] = await db
      .update(participant)
      .set({
        ...updates,
        data: mergedData,
        status,
        updatedAt: new Date(),
      })
      .where(eq(participant.id, participantId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/workspaces/[id]/participants/[participantId] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data peserta" },
      { status: 500 }
    );
  }
}

