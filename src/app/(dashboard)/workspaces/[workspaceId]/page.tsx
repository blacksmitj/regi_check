import { Suspense } from "react";
import { WorkspaceDetailClient } from "@/features/workspace/components/workspace-detail-client";

export const instant = false;

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat workspace...
        </div>
      }
    >
      <WorkspaceDetailClient workspaceId={workspaceId} />
    </Suspense>
  );
}
