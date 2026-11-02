import { db } from "@/lib/db";
import { workspace, participant, formField, sheetSyncLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { fetchAndParseGoogleSheet } from "@/lib/sheets/google-sheets";
import { calculateParticipantStatus } from "@/lib/domain/status-engine";

export interface SyncSheetResult {
  success: boolean;
  totalRowsFound: number;
  newAddedCount: number;
  skippedCount: number;
  message: string;
  durationMs: number;
  error?: string;
}

/**
 * Core engine to synchronize participant data from Google Spreadsheet for a given workspace.
 * Automatically discards duplicate entries based on uniqueKeyColumn, only inserting new participants.
 */
export async function syncWorkspaceGoogleSheet(
  workspaceId: string,
  triggeredBy: string = "manual"
): Promise<SyncSheetResult> {
  const startTime = Date.now();

  // 1. Fetch workspace details
  const [targetWorkspace] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  if (!targetWorkspace) {
    throw new Error(`Workspace dengan ID ${workspaceId} tidak ditemukan.`);
  }

  const { googleSheetUrl, uniqueKeyColumn } = targetWorkspace;

  if (!googleSheetUrl || !googleSheetUrl.trim()) {
    throw new Error("Link Google Spreadsheet belum dikonfigurasi untuk workspace ini.");
  }

  if (!uniqueKeyColumn || !uniqueKeyColumn.trim()) {
    throw new Error(
      "Kolom Kunci Unik (Unique Key Column) belum ditentukan. Silakan tetapkan kunci unik terlebih dahulu."
    );
  }

  // Set workspace status to running
  await db
    .update(workspace)
    .set({
      lastSyncStatus: "running",
      lastSyncMessage: "Sedang menarik data dari Google Spreadsheet...",
    })
    .where(eq(workspace.id, workspaceId));

  try {
    // 2. Fetch data from Google Sheets
    const parsedSheet = await fetchAndParseGoogleSheet(googleSheetUrl);
    const { rows, headers } = parsedSheet;
    const totalRowsFound = rows.length;

    // Check if unique key column exists in sheet headers
    const hasUniqueKey = headers.some(
      (h) => h.trim().toLowerCase() === uniqueKeyColumn.trim().toLowerCase()
    );

    // If case differs, find actual sheet column name matching uniqueKeyColumn
    const actualUniqueKey =
      headers.find((h) => h.trim().toLowerCase() === uniqueKeyColumn.trim().toLowerCase()) ||
      uniqueKeyColumn;

    if (!hasUniqueKey && totalRowsFound > 0) {
      throw new Error(
        `Kolom Kunci Unik "${uniqueKeyColumn}" tidak ditemukan di header Google Spreadsheet. Header yang ada: ${headers.slice(0, 5).join(", ")}...`
      );
    }

    // 3. Fetch existing participants for this workspace to build duplicate set
    const existingParticipants = await db
      .select({
        id: participant.id,
        data: participant.data,
      })
      .from(participant)
      .where(eq(participant.workspaceId, workspaceId));

    const existingKeySet = new Set<string>();
    for (const p of existingParticipants) {
      const pData = p.data as Record<string, unknown>;
      const val = pData[uniqueKeyColumn] ?? pData[actualUniqueKey];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        existingKeySet.add(String(val).trim().toLowerCase());
      }
    }

    // 4. Fetch form fields for status calculation
    const workspaceFields = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, workspaceId));

    // 5. Filter only NEW participants and avoid in-sheet internal duplicates
    const seenInCurrentSheet = new Set<string>();
    const newParticipantsToInsert: Array<{
      id: string;
      workspaceId: string;
      data: Record<string, unknown>;
      status: "complete" | "incomplete" | "rejected";
    }> = [];

    let skippedCount = 0;

    for (const row of rows) {
      const rawVal = row[actualUniqueKey] ?? row[uniqueKeyColumn];
      const keyVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";

      // Discard empty key
      if (!keyVal) {
        skippedCount++;
        continue;
      }

      const lowerKey = keyVal.toLowerCase();

      // Check if already in database OR already seen in earlier rows of this sheet
      if (existingKeySet.has(lowerKey) || seenInCurrentSheet.has(lowerKey)) {
        skippedCount++;
        continue;
      }

      seenInCurrentSheet.add(lowerKey);

      // Compute participant completeness status
      const computedStatus = calculateParticipantStatus(workspaceFields as any, row);

      newParticipantsToInsert.push({
        id: `p_${crypto.randomUUID()}`,
        workspaceId,
        data: row,
        status: computedStatus as any,
      });
    }

    // 6. Batch Insert new participants
    const BATCH_SIZE = 50;
    for (let i = 0; i < newParticipantsToInsert.length; i += BATCH_SIZE) {
      const chunk = newParticipantsToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(participant).values(chunk);
    }

    const durationMs = Date.now() - startTime;
    const newAddedCount = newParticipantsToInsert.length;
    const message =
      newAddedCount > 0
        ? `Berhasil menambahkan ${newAddedCount} peserta baru (${skippedCount} dilewati).`
        : `Tidak ada data baru. ${skippedCount} data di spreadsheet sudah terdaftar di sistem.`;

    // 7. Update workspace state
    await db
      .update(workspace)
      .set({
        lastSyncedAt: new Date(),
        lastSyncStatus: "success",
        lastSyncMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, workspaceId));

    // 8. Log sync event
    await db.insert(sheetSyncLog).values({
      id: `log_${crypto.randomUUID()}`,
      workspaceId,
      triggeredBy,
      status: "success",
      totalRowsFound,
      newAddedCount,
      skippedCount,
      durationMs,
    });

    return {
      success: true,
      totalRowsFound,
      newAddedCount,
      skippedCount,
      message,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error?.message || "Terjadi kesalahan yang tidak terduga saat sinkronisasi.";

    // Update workspace with failed state
    await db
      .update(workspace)
      .set({
        lastSyncedAt: new Date(),
        lastSyncStatus: "failed",
        lastSyncMessage: `Gagal: ${errorMessage}`,
        updatedAt: new Date(),
      })
      .where(eq(workspace.id, workspaceId));

    // Log failure
    await db.insert(sheetSyncLog).values({
      id: `log_${crypto.randomUUID()}`,
      workspaceId,
      triggeredBy,
      status: "failed",
      totalRowsFound: 0,
      newAddedCount: 0,
      skippedCount: 0,
      errorMessage,
      durationMs,
    });

    return {
      success: false,
      totalRowsFound: 0,
      newAddedCount: 0,
      skippedCount: 0,
      message: errorMessage,
      durationMs,
      error: errorMessage,
    };
  }
}
