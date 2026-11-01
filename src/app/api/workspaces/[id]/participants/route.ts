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
    const { participants, stream } = body as {
      participants: Array<{
        data: Record<string, unknown>;
        action?: "create" | "overwrite" | "skip";
        existingId?: string;
      }>;
      stream?: boolean;
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

    const BATCH_SIZE = 25;
    const total = participants.length;
    const totalBatches = Math.ceil(total / BATCH_SIZE) || 1;

    // Check if client requests streaming
    const isStreamRequested = stream === true || req.headers.get("accept")?.includes("application/x-ndjson");

    if (isStreamRequested) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          let createdCount = 0;
          let updatedCount = 0;
          let skippedCount = 0;
          let processedCount = 0;

          try {
            // Initial event
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "start",
                  total,
                  totalBatches,
                  batchSize: BATCH_SIZE,
                }) + "\n"
              )
            );

            for (let i = 0; i < total; i += BATCH_SIZE) {
              const batchNum = Math.floor(i / BATCH_SIZE) + 1;
              const batchItems = participants.slice(i, i + BATCH_SIZE);

              for (const item of batchItems) {
                const action = item.action || "create";

                if (action === "skip") {
                  skippedCount++;
                } else if (action === "overwrite" && item.existingId) {
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

                processedCount++;
              }

              // Send progress after batch completion
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "progress",
                    currentBatch: batchNum,
                    totalBatches,
                    processed: processedCount,
                    total,
                    percentage: Math.round((processedCount / total) * 100),
                    createdCount,
                    updatedCount,
                    skippedCount,
                  }) + "\n"
                )
              );
            }

            // Final done event
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "done",
                  result: {
                    total,
                    importedCount: createdCount + updatedCount,
                    createdCount,
                    updatedCount,
                    skippedCount,
                  },
                }) + "\n"
              )
            );

            controller.close();
          } catch (err: any) {
            console.error("Streaming import error:", err);
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "error",
                  error: err?.message || "Terjadi kesalahan saat memproses batch import.",
                }) + "\n"
              )
            );
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Standard non-streaming fallback
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
