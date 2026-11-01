"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { ParticipantSidebar } from "@/features/participant/components/participant-sidebar";
import { FormEntryPanel } from "@/features/form/components/form-entry-panel";
import { ChecklistResponse, SyncStatus } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceConfirmationDialog } from "./workspace-confirmation-dialog";
import Link from "next/link";
import {
  FileSpreadsheet,
  Settings,
  ArrowLeft,
  Calendar,
  Users,
  Download,
  AlertCircle,
  FileCheck2,
  MoreVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { EmptyState } from "@/components/shared/empty-state";

export function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "clean_data" | "delete_workspace";
  }>({
    open: false,
    type: "clean_data",
  });

  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [mobileShowChecklist, setMobileShowChecklist] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saved");

  // Fetch workspace details
  const { data: workspace, isLoading: loadingWs } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  // Fetch checklist items for this workspace
  const { data: checklistItems = [] } = useQuery({
    queryKey: ["workspaceChecklist", workspaceId],
    queryFn: () => api.getWorkspaceChecklist(workspaceId),
  });

  // Fetch participants for this workspace
  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ["participants", workspaceId],
    queryFn: () => api.getParticipants(workspaceId),
  });

  // Select first participant by default
  useEffect(() => {
    if (!selectedParticipantId && participants.length > 0) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);

  const activeParticipant = participants.find((p) => p.id === selectedParticipantId);

  // Fetch responses for active participant
  const { data: activeResponses = [] } = useQuery({
    queryKey: ["responses", selectedParticipantId],
    queryFn: () => (selectedParticipantId ? api.getResponses(selectedParticipantId) : []),
    enabled: !!selectedParticipantId,
  });

  // Save response mutation
  const saveMutation = useMutation({
    mutationFn: async (resp: Omit<ChecklistResponse, "id">) => {
      setSyncStatus("saving");
      // Simulate draft local save
      const res = await api.saveResponse(resp);
      setSyncStatus("saved");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["responses", selectedParticipantId] });
    },
    onError: () => {
      setSyncStatus("error");
    },
  });

  if (loadingWs || loadingParticipants) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
        Memuat data workspace & peserta...
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-8">
        <EmptyState
          title="Workspace tidak ditemukan"
          description="Workspace yang Anda cari mungkin telah dihapus."
          icon={AlertCircle}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Workspace Operational Header */}
      <div className="px-4 py-2.5 border-b border-border bg-card/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/workspaces">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-foreground line-clamp-1">
                {workspace.name}
              </h1>
              <Badge variant={workspace.status === "active" ? "default" : "secondary"} className="text-[10px] py-0">
                {workspace.status === "active" ? "Aktif" : "Diarsipkan"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {workspace.startDate} s/d {workspace.endDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {participants.length} Peserta
              </span>
            </p>
          </div>
        </div>

        {/* Admin Action Buttons */}
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <>
              <Link href={`/workspaces/${workspaceId}/import`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Excel</span>
                </Button>
              </Link>
              <Link href={`/workspaces/${workspaceId}/form-settings`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                  <span>Atur Form</span>
                </Button>
              </Link>
              <Link href={`/workspaces/${workspaceId}/settings`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Setting Workspace</span>
                </Button>
              </Link>
              <Link href={`/workspaces/${workspaceId}/export`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </Button>
              </Link>

              {/* Action Dropdown for Reset / Delete */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                      <span className="sr-only">Menu Opsi</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setConfirmModal({ open: true, type: "clean_data" })}
                    className="text-xs text-amber-700 dark:text-amber-400 gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Bersihkan Data Form</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmModal({ open: true, type: "delete_workspace" })}
                    className="text-xs text-destructive focus:text-destructive gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Workspace Ini</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <WorkspaceConfirmationDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        type={confirmModal.type}
        workspaceName={workspace.name}
        onConfirm={async () => {
          if (confirmModal.type === "clean_data") {
            await api.cleanWorkspaceResponses(workspaceId);
            queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
            queryClient.invalidateQueries({ queryKey: ["responses"] });
          } else {
            await api.deleteWorkspace(workspaceId);
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            router.push("/workspaces");
          }
        }}
      />

      {/* Main Split Layout: Left Sidebar Peserta + Right Panel Checklist */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <ParticipantSidebar
          participants={participants}
          selectedId={selectedParticipantId}
          onSelect={(id) => {
            setSelectedParticipantId(id);
            setMobileShowChecklist(true);
          }}
          className={mobileShowChecklist ? "hidden md:flex" : "flex"}
        />

        {activeParticipant ? (
          <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${!mobileShowChecklist ? "hidden md:flex" : "flex"}`}>
            <FormEntryPanel
              participant={activeParticipant}
              formFields={checklistItems}
              initialResponses={activeResponses}
              onSaveResponse={async (resp) => {
                await saveMutation.mutateAsync(resp as any);
              }}
              onUpdateParticipantData={async (updatedData) => {
                try {
                  setSyncStatus("saving");
                  await api.updateParticipant(activeParticipant.id, { data: updatedData });
                  queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
                  setSyncStatus("saved");
                } catch {
                  setSyncStatus("error");
                }
              }}
              syncStatus={syncStatus}
              onBackToList={() => setMobileShowChecklist(false)}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center p-8">
            <EmptyState
              title="Pilih Peserta"
              description="Pilih salah satu peserta di panel sebelah kiri untuk mulai memeriksa dan mengisi kelengkapan registrasi."
              icon={FileCheck2}
            />
          </div>
        )}
      </div>
    </div>
  );
}

