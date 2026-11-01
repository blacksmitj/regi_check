import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { AuditLog } from "@/types/domain";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    let logs;
    if (workspaceId) {
      logs = await db
        .select()
        .from(auditLog)
        .where(eq(auditLog.workspaceId, workspaceId))
        .orderBy(desc(auditLog.timestamp));
    } else {
      logs = await db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.timestamp));
    }

    const formatted: AuditLog[] = logs.map((l) => ({
      id: l.id,
      workspaceId: l.workspaceId,
      timestamp: l.timestamp.toISOString(),
      officerName: l.officerName,
      officerEmail: l.officerEmail,
      participantId: l.participantId || undefined,
      participantName: l.participantName || undefined,
      checklistItemId: l.checklistItemId || undefined,
      checklistItemLabel: l.checklistItemLabel || undefined,
      action: l.action,
      previousValue: l.previousValue ?? undefined,
      newValue: l.newValue ?? undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil audit logs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId,
      officerName,
      officerEmail,
      participantId,
      participantName,
      checklistItemId,
      checklistItemLabel,
      action,
      previousValue,
      newValue,
    } = body;

    if (!workspaceId || !officerName || !officerEmail || !action) {
      return NextResponse.json(
        { error: "Field wajib audit log belum lengkap" },
        { status: 400 }
      );
    }

    const newId = `log_${crypto.randomUUID()}`;
    const [created] = await db
      .insert(auditLog)
      .values({
        id: newId,
        workspaceId,
        officerName,
        officerEmail,
        participantId: participantId || null,
        participantName: participantName || null,
        checklistItemId: checklistItemId || null,
        checklistItemLabel: checklistItemId ? (checklistItemLabel || checklistItemId) : null,
        action,
        previousValue: previousValue ?? null,
        newValue: newValue ?? null,
      })
      .returning();

    return NextResponse.json(
      {
        id: created.id,
        workspaceId: created.workspaceId,
        timestamp: created.timestamp.toISOString(),
        officerName: created.officerName,
        officerEmail: created.officerEmail,
        participantId: created.participantId || undefined,
        participantName: created.participantName || undefined,
        checklistItemId: created.checklistItemId || undefined,
        checklistItemLabel: created.checklistItemLabel || undefined,
        action: created.action,
        previousValue: created.previousValue ?? undefined,
        newValue: created.newValue ?? undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/audit-logs error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan audit log" },
      { status: 500 }
    );
  }
}

