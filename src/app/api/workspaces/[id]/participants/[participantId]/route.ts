import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participant, formField, auditLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { calculateParticipantStatus } from "@/lib/domain/status-engine";
import { getCurrentUser } from "@/lib/auth";
import { OfficerHistoryItem } from "@/types/domain";

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
    const currentUser = await getCurrentUser();

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

    const officerName =
      updates.officerName || currentUser?.name || "Petugas";
    const officerEmail =
      updates.officerEmail || currentUser?.email || "petugas@regicheck.id";
    const nowIso = new Date().toISOString();

    const existingData = (existing.data || {}) as Record<string, unknown>;
    const prevHistory = Array.isArray(existingData._officerHistory)
      ? (existingData._officerHistory as OfficerHistoryItem[])
      : [];

    const newHistoryEntry: OfficerHistoryItem = {
      officerName,
      officerEmail,
      timestamp: nowIso,
      action: "Memperbarui Data Peserta",
    };

    const updatedHistory = [...prevHistory, newHistoryEntry];

    let mergedData: Record<string, unknown> = existingData;
    if (updates.data) {
      mergedData = {
        ...existingData,
        ...updates.data,
        _lastUpdatedBy: officerName,
        _lastUpdatedEmail: officerEmail,
        _lastUpdatedAt: nowIso,
        _officerHistory: updatedHistory,
      };
    }

    let status = updates.status || existing.status;

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
        data: mergedData,
        status,
        updatedAt: new Date(),
      })
      .where(eq(participant.id, participantId))
      .returning();

    // Catat juga ke tabel audit_log
    if (updates.data) {
      const participantName = String(
        mergedData["Nama Lengkap"] ||
          mergedData["Nama"] ||
          Object.entries(mergedData).find(([k]) => /nama/i.test(k))?.[1] ||
          "Peserta"
      );

      await db.insert(auditLog).values({
        id: `log_${crypto.randomUUID()}`,
        workspaceId: id,
        officerName,
        officerEmail,
        participantId: existing.id,
        participantName,
        checklistItemId: null,
        checklistItemLabel: "Form Data Peserta",
        action: "Memperbarui Data Peserta",
        previousValue: existing.status,
        newValue:
          status === "complete"
            ? "Status: Lengkap"
            : status === "rejected"
              ? "Status: Ditolak"
              : "Status: Belum Lengkap",
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/workspaces/[id]/participants/[participantId] error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data peserta" },
      { status: 500 }
    );
  }
}

