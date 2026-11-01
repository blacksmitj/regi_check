import { Suspense } from "react";
import { WorkspaceGeneralSettingsClient } from "@/features/workspace/components/workspace-general-settings-client";

export const instant = false;

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat pengaturan workspace...
        </div>
      }
    >
      <WorkspaceGeneralSettingsClient workspaceId={workspaceId} />
    </Suspense>
  );
}
