import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspace, appscriptSyncLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/appscript-sync
 * Ambil config AppScript dan 50 riwayat sync terakhir
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [ws] = await db
      .select({
        id: workspace.id,
        name: workspace.name,
        appscriptApiKey: workspace.appscriptApiKey,
        appscriptSheetName: workspace.appscriptSheetName,
        appscriptLockSheet: workspace.appscriptLockSheet,
      })
      .from(workspace)
      .where(eq(workspace.id, id))
      .limit(1);

    if (!ws) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    // Jika belum punya API key, buatkan secara otomatis
    let apiKey = ws.appscriptApiKey;
    if (!apiKey) {
      apiKey = `rc_sync_${crypto.randomBytes(18).toString("hex")}`;
      await db
        .update(workspace)
        .set({
          appscriptApiKey: apiKey,
          updatedAt: new Date(),
        })
        .where(eq(workspace.id, id));
    }

    // Fetch latest 50 logs
    const logs = await db
      .select()
      .from(appscriptSyncLog)
      .where(eq(appscriptSyncLog.workspaceId, id))
      .orderBy(desc(appscriptSyncLog.createdAt))
      .limit(50);

    return NextResponse.json({
      config: {
        workspaceId: ws.id,
        workspaceName: ws.name,
        apiKey,
        sheetName: ws.appscriptSheetName || "Data Peserta",
        lockSheet: Boolean(ws.appscriptLockSheet),
      },
      logs,
    });
  } catch (error: any) {
    console.error("GET /api/workspaces/[id]/appscript-sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memuat konfigurasi AppScript" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/appscript-sync
 * Handler aksi konfigurasi:
 * - action === "regenerate_key": Membuat API key baru
 * - action === "update_config": Menyimpan nama sheet default dan preferensi lock sheet
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, sheetName, lockSheet } = body;

    if (action === "regenerate_key") {
      const newApiKey = `rc_sync_${crypto.randomBytes(18).toString("hex")}`;
      await db
        .update(workspace)
        .set({
          appscriptApiKey: newApiKey,
          updatedAt: new Date(),
        })
        .where(eq(workspace.id, id));

      return NextResponse.json({
        success: true,
        apiKey: newApiKey,
        message: "API Key berhasil diperbarui",
      });
    }

    if (action === "update_config") {
      await db
        .update(workspace)
        .set({
          appscriptSheetName: sheetName !== undefined ? String(sheetName).trim() : undefined,
          appscriptLockSheet: lockSheet !== undefined ? Boolean(lockSheet) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(workspace.id, id));

      return NextResponse.json({
        success: true,
        message: "Pengaturan AppScript berhasil disimpan",
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/workspaces/[id]/appscript-sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses pengaturan AppScript" },
      { status: 500 }
    );
  }
}
