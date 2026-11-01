import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participant, formField } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { calculateParticipantStatus } from "@/lib/domain/status-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const participants = await db
      .select()
      .from(participant)
      .where(eq(participant.workspaceId, id))
      .orderBy(desc(participant.createdAt));

    return NextResponse.json(participants);
  } catch (error) {
    console.error("GET /api/workspaces/[id]/participants error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar peserta" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { participants } = body as {
      participants: Array<{
        data: Record<string, unknown>;
        action?: "create" | "overwrite" | "skip";
        existingId?: string;
      }>;
    };

    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: "Daftar peserta tidak valid" },
        { status: 400 }
      );
    }

    // Get workspace form fields to calculate status
    const workspaceFields = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, id));

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of participants) {
      const action = item.action || "create";

      if (action === "skip") {
        skippedCount++;
        continue;
      }

      if (action === "overwrite" && item.existingId) {
        const computedStatus = calculateParticipantStatus(
          workspaceFields as any,
          item.data
        );

        await db
          .update(participant)
          .set({
            data: item.data,
            status: computedStatus,
            updatedAt: new Date(),
          })
          .where(eq(participant.id, item.existingId));

        updatedCount++;
      } else {
        const computedStatus = calculateParticipantStatus(
          workspaceFields as any,
          item.data
        );

        const newId = `p_${crypto.randomUUID()}`;
        await db.insert(participant).values({
          id: newId,
          workspaceId: id,
          data: item.data,
          status: computedStatus,
        });

        createdCount++;
      }
    }

    return NextResponse.json({
      total: participants.length,
      importedCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/participants error:", error);
    return NextResponse.json(
      { error: "Gagal mengimpor data peserta" },
      { status: 500 }
    );
  }
}

