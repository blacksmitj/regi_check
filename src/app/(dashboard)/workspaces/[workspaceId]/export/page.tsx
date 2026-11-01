import { Suspense } from "react";
import { ExportWorkspaceClient } from "@/features/workspace/components/export-workspace-client";

export const instant = false;

export default async function ExportWorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat halaman export...
        </div>
      }
    >
      <ExportWorkspaceClient workspaceId={workspaceId} />
    </Suspense>
  );
}
