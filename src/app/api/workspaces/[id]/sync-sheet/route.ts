import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspace, sheetSyncLog } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { syncWorkspaceGoogleSheet } from "@/lib/sheets/sync-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspaces/[id]/sync-sheet
 * Returns current sync configuration and latest sync logs.
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
        googleSheetUrl: workspace.googleSheetUrl,
        autoSyncEnabled: workspace.autoSyncEnabled,
        syncIntervalMinutes: workspace.syncIntervalMinutes,
        lastSyncedAt: workspace.lastSyncedAt,
        lastSyncStatus: workspace.lastSyncStatus,
        lastSyncMessage: workspace.lastSyncMessage,
        uniqueKeyColumn: workspace.uniqueKeyColumn,
      })
      .from(workspace)
      .where(eq(workspace.id, id))
      .limit(1);

    if (!ws) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    // Fetch latest 50 logs
    const logs = await db
      .select()
      .from(sheetSyncLog)
      .where(eq(sheetSyncLog.workspaceId, id))
      .orderBy(desc(sheetSyncLog.createdAt))
      .limit(50);

    return NextResponse.json({
      config: ws,
      logs,
    });
  } catch (error: any) {
    console.error("GET /api/workspaces/[id]/sync-sheet error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memuat data sinkronisasi" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/sync-sheet
 * Action handler:
 * - action === "trigger": Runs sync right now (manual trigger)
 * - action === "update_config": Updates googleSheetUrl, autoSyncEnabled, syncIntervalMinutes
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, googleSheetUrl, autoSyncEnabled, syncIntervalMinutes } = body;

    if (action === "update_config") {
      await db
        .update(workspace)
        .set({
          googleSheetUrl: googleSheetUrl !== undefined ? googleSheetUrl : undefined,
          autoSyncEnabled: autoSyncEnabled !== undefined ? Boolean(autoSyncEnabled) : undefined,
          syncIntervalMinutes:
            syncIntervalMinutes !== undefined ? Number(syncIntervalMinutes) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(workspace.id, id));

      return NextResponse.json({ success: true, message: "Pengaturan berhasil disimpan" });
    }

    if (action === "trigger") {
      const triggeredBy = `manual:${user.name || user.email}`;
      const result = await syncWorkspaceGoogleSheet(id, triggeredBy);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/workspaces/[id]/sync-sheet error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses sinkronisasi" },
      { status: 500 }
    );
  }
}
