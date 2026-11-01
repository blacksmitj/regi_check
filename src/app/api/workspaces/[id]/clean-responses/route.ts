import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checklistResponse, participant } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get all participants in this workspace
    const participants = await db
      .select({ id: participant.id })
      .from(participant)
      .where(eq(participant.workspaceId, id));

    const participantIds = participants.map((p) => p.id);

    if (participantIds.length > 0) {
      for (const pId of participantIds) {
        await db
          .delete(checklistResponse)
          .where(eq(checklistResponse.participantId, pId));
      }

      // Reset participant statuses to incomplete
      await db
        .update(participant)
        .set({ status: "incomplete", updatedAt: new Date() })
        .where(eq(participant.workspaceId, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/clean-responses error:", error);
    return NextResponse.json(
      { error: "Gagal membersihkan response workspace" },
      { status: 500 }
    );
  }
}

