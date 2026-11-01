import { Suspense } from "react";
import { WorkspaceChecklistSettingsClient } from "@/features/workspace/components/workspace-checklist-settings-client";

export const instant = false;

export default async function WorkspaceChecklistSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat pengaturan checklist...
        </div>
      }
    >
      <WorkspaceChecklistSettingsClient workspaceId={workspaceId} />
    </Suspense>
  );
}
