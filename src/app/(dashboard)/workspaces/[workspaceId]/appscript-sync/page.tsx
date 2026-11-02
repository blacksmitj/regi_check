import { Suspense } from "react";
import { AppScriptSyncClient } from "@/features/workspace/components/appscript-sync-client";

export const instant = false;

export default async function AppScriptSyncPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat konfigurasi AppScript Sync...
        </div>
      }
    >
      <AppScriptSyncClient workspaceId={workspaceId} />
    </Suspense>
  );
}
