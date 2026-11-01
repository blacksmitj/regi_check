import { Suspense } from "react";
import { ImportParticipantsClient } from "@/features/workspace/components/import-participants-client";

export const instant = false;

export default async function ImportParticipantsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat wizard import...
        </div>
      }
    >
      <ImportParticipantsClient workspaceId={workspaceId} />
    </Suspense>
  );
}
