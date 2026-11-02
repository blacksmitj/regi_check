import { Suspense } from "react";
import { SheetSyncMonitoringClient } from "@/features/workspace/components/sheet-sync-monitoring-client";

export const instant = false;

export default async function SheetSyncPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat monitoring sinkronisasi spreadsheet...
        </div>
      }
    >
      <SheetSyncMonitoringClient workspaceId={workspaceId} />
    </Suspense>
  );
}
