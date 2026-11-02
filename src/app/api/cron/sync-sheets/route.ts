import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspace } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { syncWorkspaceGoogleSheet } from "@/lib/sheets/sync-service";

/**
 * GET /api/cron/sync-sheets
 * Cron runner: finds all workspaces with autoSyncEnabled = true
 * where (lastSyncedAt + syncIntervalMinutes <= now) OR lastSyncedAt is null.
 * 
 * Can be called by:
 * - Vercel Cron
 * - Supabase pg_cron / Edge Function
 * - Local in-server interval runner
 * - External webhook (with optional Bearer CRON_SECRET)
 */
export async function GET(req: NextRequest) {
  // Optional security token check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // If CRON_SECRET is set but doesn't match
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch workspaces that have autoSyncEnabled = true and valid sheet URL
    const activeWorkspaces = await db
      .select({
        id: workspace.id,
        name: workspace.name,
        googleSheetUrl: workspace.googleSheetUrl,
        syncIntervalMinutes: workspace.syncIntervalMinutes,
        lastSyncedAt: workspace.lastSyncedAt,
        uniqueKeyColumn: workspace.uniqueKeyColumn,
      })
      .from(workspace)
      .where(
        and(
          eq(workspace.autoSyncEnabled, true),
          isNotNull(workspace.googleSheetUrl)
        )
      );

    const now = Date.now();
    const results: Array<{
      workspaceId: string;
      workspaceName: string;
      status: "synced" | "skipped_interval" | "failed";
      details?: any;
    }> = [];

    for (const ws of activeWorkspaces) {
      if (!ws.googleSheetUrl || !ws.uniqueKeyColumn) {
        continue;
      }

      // Check if interval has passed
      const intervalMs = (ws.syncIntervalMinutes || 5) * 60 * 1000;
      const lastSyncTime = ws.lastSyncedAt ? new Date(ws.lastSyncedAt).getTime() : 0;

      if (now - lastSyncTime < intervalMs) {
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          status: "skipped_interval",
        });
        continue;
      }

      // Execute sync
      try {
        const syncResult = await syncWorkspaceGoogleSheet(ws.id, "cron");
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          status: syncResult.success ? "synced" : "failed",
          details: syncResult,
        });
      } catch (err: any) {
        results.push({
          workspaceId: ws.id,
          workspaceName: ws.name,
          status: "failed",
          details: err?.message,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalChecked: activeWorkspaces.length,
      results,
    });
  } catch (error: any) {
    console.error("GET /api/cron/sync-sheets error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error in cron runner" },
      { status: 500 }
    );
  }
}
