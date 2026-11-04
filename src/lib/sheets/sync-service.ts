import { db } from "@/lib/db";
import { workspace, participant, formField, sheetSyncLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { fetchAndParseGoogleSheet } from "@/lib/sheets/google-sheets";
import { calculateParticipantStatus } from "@/lib/domain/status-engine";
import {
  ParticipantKeyOptions,
  getParticipantNik,
  getParticipantUniqueKey,
  getParticipantCompositeKey,
  deduplicateRowsPreservingLatest,
} from "@/lib/domain/participant-identity";

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

    const { nameColumn, nikColumn } = targetWorkspace;

    // Check if unique key column exists in sheet headers
    const hasUniqueKey = headers.some(
      (h) => h.trim().toLowerCase() === uniqueKeyColumn.trim().toLowerCase()
    );

    // If case differs, find actual sheet column name matching uniqueKeyColumn
    const actualUniqueKey =
      headers.find((h) => h.trim().toLowerCase() === uniqueKeyColumn.trim().toLowerCase()) ||
      uniqueKeyColumn;

    const actualNameColumn = nameColumn
      ? headers.find((h) => h.trim().toLowerCase() === nameColumn.trim().toLowerCase()) || nameColumn
      : undefined;

    const actualNikColumn = nikColumn
      ? headers.find((h) => h.trim().toLowerCase() === nikColumn.trim().toLowerCase()) || nikColumn
      : undefined;

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

    const dbKeyOptions: ParticipantKeyOptions = {
      uniqueKeyColumn,
      nameColumn,
      nikColumn,
    };

    const existingNikSet = new Set<string>();
    const existingCompositeSet = new Set<string>();

    for (const p of existingParticipants) {
      const pData = p.data as Record<string, unknown>;
      const pNik = getParticipantNik(pData, nikColumn);
      if (pNik) {
        existingNikSet.add(pNik);
      }
      const compositeKey = getParticipantCompositeKey(pData, dbKeyOptions);
      if (compositeKey) {
        existingCompositeSet.add(compositeKey);
      }
    }

    // 4. Fetch form fields for status calculation
    const workspaceFields = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, workspaceId));

    // 5. Filter baris spreadsheet:
    // a. Buang duplikat internal di dalam spreadsheet dengan mempertahankan baris TERAKHIR (terbaru)
    const sheetKeyOptions: ParticipantKeyOptions = {
      uniqueKeyColumn: actualUniqueKey,
      nameColumn: actualNameColumn,
      nikColumn: actualNikColumn,
    };

    const {
      filteredRows: deduplicatedSheetRows,
      internalDuplicatesDiscarded,
      emptyKeyDiscarded,
    } = deduplicateRowsPreservingLatest(rows, sheetKeyOptions);

    // b. Filter hanya baris yang BELUM ADA di database
    const newParticipantsToInsert: Array<{
      id: string;
      workspaceId: string;
      data: Record<string, unknown>;
      status: "complete" | "incomplete" | "rejected";
    }> = [];

    let alreadyInDbCount = 0;

    for (const row of deduplicatedSheetRows) {
      // 1. Cek NIK (Prioritas Utama)
      const rowNik = getParticipantNik(row, actualNikColumn);
      if (rowNik && existingNikSet.has(rowNik)) {
        alreadyInDbCount++;
        continue;
      }

      // 2. Cek Gabungan ID Unik + Nama (Prioritas Kedua / Fallback)
      const compositeKey = getParticipantCompositeKey(row, sheetKeyOptions);
      if (!compositeKey && !rowNik) continue;

      if (compositeKey && existingCompositeSet.has(compositeKey)) {
        alreadyInDbCount++;
        continue;
      }

      // Tandai agar tidak dimasukkan ganda dalam run yang sama
      if (rowNik) existingNikSet.add(rowNik);
      if (compositeKey) existingCompositeSet.add(compositeKey);

      // Compute participant completeness status
      const computedStatus = calculateParticipantStatus(workspaceFields as any, row);

      newParticipantsToInsert.push({
        id: `p_${crypto.randomUUID()}`,
        workspaceId,
        data: row,
        status: computedStatus as any,
      });
    }

    const skippedCount = internalDuplicatesDiscarded + emptyKeyDiscarded + alreadyInDbCount;

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
