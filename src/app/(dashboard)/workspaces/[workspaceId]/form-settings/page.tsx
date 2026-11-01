import { Suspense } from "react";
import { WorkspaceFormSettingsClient } from "@/features/workspace/components/workspace-form-settings-client";

export const instant = false;

export default async function WorkspaceFormSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat pengaturan form...
        </div>
      }
    >
      <WorkspaceFormSettingsClient workspaceId={workspaceId} />
    </Suspense>
  );
}

