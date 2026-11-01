import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  checklistResponse,
  participant,
  formField,
  auditLog,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { calculateParticipantStatus } from "@/lib/domain/status-engine";

interface RouteParams {
  params: Promise<{ id: string; participantId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { participantId } = await params;
    const responses = await db
      .select()
      .from(checklistResponse)
      .where(eq(checklistResponse.participantId, participantId));

    return NextResponse.json(responses);
  } catch (error) {
    console.error("GET responses error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil response checklist" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, participantId } = await params;
    const body = await req.json();
    const user = await getCurrentUser();

    const {
      checklistItemId,
      value,
      status = "incomplete",
      notes,
      evidence = [],
      id: responseId,
    } = body;

    if (!checklistItemId) {
      return NextResponse.json(
        { error: "checklistItemId wajib diisi" },
        { status: 400 }
      );
    }

    // Check existing response
    const [existing] = await db
      .select()
      .from(checklistResponse)
      .where(
        and(
          eq(checklistResponse.participantId, participantId),
          eq(checklistResponse.checklistItemId, checklistItemId)
        )
      );

    let saved;
    if (existing) {
      const [updated] = await db
        .update(checklistResponse)
        .set({
          value,
          status,
          notes: notes ?? existing.notes,
          evidence: evidence ?? existing.evidence,
          updatedBy: user?.name || user?.email || "Petugas",
          updatedAt: new Date(),
        })
        .where(eq(checklistResponse.id, existing.id))
        .returning();
      saved = updated;
    } else {
      const newId = responseId || `resp_${crypto.randomUUID()}`;
      const [inserted] = await db
        .insert(checklistResponse)
        .values({
          id: newId,
          participantId,
          checklistItemId,
          value,
          status,
          notes: notes || null,
          evidence: evidence || [],
          updatedBy: user?.name || user?.email || "Petugas",
        })
        .returning();
      saved = inserted;
    }

    // Recalculate participant status
    const [p] = await db
      .select()
      .from(participant)
      .where(eq(participant.id, participantId));

    let newParticipantStatus = "incomplete";
    if (p) {
      const fields = await db
        .select()
        .from(formField)
        .where(eq(formField.workspaceId, id));

      const allResponses = await db
        .select()
        .from(checklistResponse)
        .where(eq(checklistResponse.participantId, participantId));

      newParticipantStatus = calculateParticipantStatus(
        fields as any,
        allResponses as any
      );

      if (p.status !== newParticipantStatus) {
        await db
          .update(participant)
          .set({ status: newParticipantStatus, updatedAt: new Date() })
          .where(eq(participant.id, participantId));
      }

      // Add audit log
      const item = fields.find((f) => f.id === checklistItemId);
      await db.insert(auditLog).values({
        id: `log_${crypto.randomUUID()}`,
        workspaceId: id,
        officerName: user?.name || "Petugas",
        officerEmail: user?.email || "petugas@regicheck.id",
        participantId: p.id,
        participantName: String(p.data?.["Nama Lengkap"] || p.data?.["Nama"] || "Peserta"),
        checklistItemId,
        checklistItemLabel: item?.label || checklistItemId,
        action: status === "rejected" ? "Menolak Item" : "Memperbarui Checklist",
        newValue: notes ? `${status}: ${notes}` : status,
      });
    }

    return NextResponse.json({
      response: saved,
      newParticipantStatus,
    });
  } catch (error) {
    console.error("POST responses error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan response" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, routeParams: RouteParams) {
  return POST(req, routeParams);
}

