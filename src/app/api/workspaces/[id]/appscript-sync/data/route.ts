import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspace, participant, formField, appscriptSyncLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { OfficerHistoryItem } from "@/types/domain";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper untuk format nilai cell agar aman dan tidak melebihi batas 32.767 karakter
function formatCellValue(val: unknown): string {
  if (val === undefined || val === null) return "-";
  const str = String(val).trim();
  if (str === "") return "-";
  if (str.startsWith("data:image/") || str.startsWith("data:application/")) {
    return "[File/Gambar]";
  }
  if (str.length > 32767) {
    return str.slice(0, 32764) + "...";
  }
  return str;
}

/**
 * GET /api/workspaces/[id]/appscript-sync/data
 * Endpoint publik terautentikasi API Key untuk ditarik langsung oleh Google Apps Script.
 * Mengembalikan headers dan rows data peserta (kolom awal + status + info petugas).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id } = await params;

  // Header atau query parameter apiKey
  const url = new URL(req.url);
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("apiKey");

  const requestedSheetName = url.searchParams.get("sheetName") || "Data Peserta";
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "Google-Apps-Script";

  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key tidak ditemukan. Sertakan parameter ?apiKey=... atau header X-API-Key." },
        { status: 401 }
      );
    }

    // 1. Validasi Workspace & API Key
    const [ws] = await db
      .select()
      .from(workspace)
      .where(eq(workspace.id, id))
      .limit(1);

    if (!ws) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    if (!ws.appscriptApiKey || ws.appscriptApiKey !== apiKey) {
      // Catat log gagal jika key tidak cocok
      await db.insert(appscriptSyncLog).values({
        id: crypto.randomUUID(),
        workspaceId: id,
        status: "failed",
        totalRowsSent: 0,
        sheetName: requestedSheetName,
        ipAddress,
        userAgent,
        durationMs: Date.now() - startTime,
        errorMessage: "API Key tidak valid atau tidak cocok.",
      });

      return NextResponse.json({ error: "API Key tidak valid" }, { status: 403 });
    }

    // 2. Ambil data peserta dan form fields
    const participants = await db
      .select()
      .from(participant)
      .where(eq(participant.workspaceId, id))
      .orderBy(desc(participant.createdAt));

    const fields = await db
      .select()
      .from(formField)
      .where(eq(formField.workspaceId, id));

    const activeSortedFormFields = fields
      .filter((f) => f.active && f.type !== "section")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Kumpulan key kolom original ketika di-import (diprioritaskan dari workspace.importHeaders asli)
    let importOriginalKeys: string[] = [];
    if (ws.importHeaders && Array.isArray(ws.importHeaders) && ws.importHeaders.length > 0) {
      const keysSet = new Set<string>(ws.importHeaders);
      participants.forEach((p) => {
        if (p.data) {
          Object.keys(p.data).forEach((key) => {
            if (!key.startsWith("_")) {
              keysSet.add(key);
            }
          });
        }
      });
      importOriginalKeys = Array.from(keysSet);
    } else {
      const keysSet = new Set<string>();
      participants.forEach((p) => {
        if (p.data) {
          Object.keys(p.data).forEach((key) => {
            if (!key.startsWith("_")) {
              keysSet.add(key);
            }
          });
        }
      });
      importOriginalKeys = Array.from(keysSet);
    }

    const resolveColumnTitle = (rawKey: string): string => {
      const matchedField = fields.find(
        (f) =>
          f.id === rawKey ||
          f.excelColumn === rawKey ||
          f.label.trim().toLowerCase() === rawKey.trim().toLowerCase()
      );
      return matchedField?.label || rawKey;
    };

    const resolveFieldValue = (data: Record<string, unknown>, field: (typeof fields)[number]): unknown => {
      const candidates = [field.excelColumn, field.id, field.label].filter(Boolean) as string[];
      for (const candidate of candidates) {
        if (data[candidate] !== undefined && data[candidate] !== null && String(data[candidate]).trim() !== "") {
          return data[candidate];
        }
      }
      const dataKeys = Object.keys(data).filter((k) => !k.startsWith("_"));
      for (const candidate of candidates) {
        const lowerCandidate = candidate.trim().toLowerCase();
        const matchedKey = dataKeys.find((k) => k.trim().toLowerCase() === lowerCandidate);
        if (matchedKey && data[matchedKey] !== undefined && data[matchedKey] !== null && String(data[matchedKey]).trim() !== "") {
          return data[matchedKey];
        }
      }
      return undefined;
    };

    // 3. Susun Headers (Sesuai format Export Excel mode import_order)
    const headerSet = new Set<string>();
    const headers: string[] = [];

    importOriginalKeys.forEach((key) => {
      const col = resolveColumnTitle(key);
      if (!headerSet.has(col)) {
        headerSet.add(col);
        headers.push(col);
      }
    });

    activeSortedFormFields.forEach((field) => {
      if (!headerSet.has(field.label)) {
        headerSet.add(field.label);
        headers.push(field.label);
      }
    });

    // Kolom verifikasi & catatan petugas
    headers.push("Status");
    headers.push("Terakhir Diubah Oleh");
    headers.push("Waktu Update Terakhir");
    headers.push("Riwayat Petugas (Awal - Akhir)");

    // 4. Susun Rows Matrix [ [val1, val2, ...], [val1, val2, ...] ]
    const rows = participants.map((p) => {
      const rowData: Record<string, string> = {};
      const addedHeaders = new Set<string>();

      importOriginalKeys.forEach((key) => {
        const col = resolveColumnTitle(key);
        rowData[col] = formatCellValue(p.data[key]);
        addedHeaders.add(col);
      });

      activeSortedFormFields.forEach((field) => {
        if (!addedHeaders.has(field.label)) {
          rowData[field.label] = formatCellValue(resolveFieldValue(p.data, field));
          addedHeaders.add(field.label);
        }
      });

      const historyRaw = p.data["_officerHistory"];
      const historyList: OfficerHistoryItem[] = Array.isArray(historyRaw)
        ? (historyRaw as OfficerHistoryItem[])
        : [];
      const lastUpdatedBy = p.data["_lastUpdatedBy"]
        ? String(p.data["_lastUpdatedBy"])
        : historyList.length > 0
          ? historyList[historyList.length - 1].officerName
          : "-";
      const lastUpdatedAtRaw = p.data["_lastUpdatedAt"]
        ? String(p.data["_lastUpdatedAt"])
        : historyList.length > 0
          ? historyList[historyList.length - 1].timestamp
          : "";
      const lastUpdatedAtFormatted = lastUpdatedAtRaw
        ? new Date(lastUpdatedAtRaw).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";

      const historyFormatted =
        historyList.length > 0
          ? historyList
              .map((h) => {
                const timeStr = new Date(h.timestamp).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return `${h.officerName} (${timeStr})`;
              })
              .join(" → ")
          : lastUpdatedBy !== "-"
            ? `${lastUpdatedBy} (${lastUpdatedAtFormatted})`
            : "-";

      const statusText =
        p.status === "complete"
          ? "Lengkap"
          : p.status === "rejected"
            ? "Ditolak"
            : "Belum Lengkap";

      rowData["Status"] = statusText;
      rowData["Terakhir Diubah Oleh"] = formatCellValue(lastUpdatedBy);
      rowData["Waktu Update Terakhir"] = formatCellValue(lastUpdatedAtFormatted);
      rowData["Riwayat Petugas (Awal - Akhir)"] = formatCellValue(historyFormatted);

      // Kembalikan array terurut persis sesuai urutan `headers`
      return headers.map((h) => rowData[h] ?? "-");
    });

    const durationMs = Date.now() - startTime;

    // 5. Simpan log sukses ke database
    await db.insert(appscriptSyncLog).values({
      id: crypto.randomUUID(),
      workspaceId: id,
      status: "success",
      totalRowsSent: rows.length,
      sheetName: requestedSheetName,
      ipAddress,
      userAgent,
      durationMs,
    });

    return NextResponse.json({
      status: "success",
      workspaceId: ws.id,
      workspaceName: ws.name,
      totalRows: rows.length,
      headers,
      rows,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/workspaces/[id]/appscript-sync/data error:", error);

    // Rekam log kegagalan jika terjadi server error
    try {
      await db.insert(appscriptSyncLog).values({
        id: crypto.randomUUID(),
        workspaceId: id,
        status: "failed",
        totalRowsSent: 0,
        sheetName: requestedSheetName,
        ipAddress,
        userAgent,
        durationMs: Date.now() - startTime,
        errorMessage: error?.message || "Internal Server Error",
      });
    } catch (logErr) {
      console.error("Failed to write appscript error log:", logErr);
    }

    return NextResponse.json(
      { error: error?.message || "Gagal mengambil data sinkronisasi AppScript" },
      { status: 500 }
    );
  }
}
