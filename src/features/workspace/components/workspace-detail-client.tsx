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
import { WorkspaceShareDialog } from "./workspace-share-dialog";
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
  Share2,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { clearWorkspaceOfflineDrafts } from "@/lib/storage/indexed-db";

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
  const [shareModalOpen, setShareModalOpen] = useState(false);

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
  const activeIndex = participants.findIndex((p) => p.id === selectedParticipantId);
  const hasPrevParticipant = activeIndex > 0;
  const hasNextParticipant = activeIndex >= 0 && activeIndex < participants.length - 1;

  const handlePrevParticipant = () => {
    if (hasPrevParticipant) {
      setSelectedParticipantId(participants[activeIndex - 1].id);
    }
  };

  const handleNextParticipant = () => {
    if (hasNextParticipant) {
      setSelectedParticipantId(participants[activeIndex + 1].id);
    }
  };

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
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Workspace Operational Header Skeleton */}
        <div className="px-4 py-2.5 border-b border-border bg-card/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Main Split Layout Skeleton */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar Skeleton (Participants) */}
          <div className="w-full md:w-80 lg:w-96 border-r border-border flex flex-col shrink-0 p-3 gap-3 bg-muted/10">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="space-y-2.5 mt-2 flex-1 overflow-hidden">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel Skeleton (Form & Checklist) */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-background">
            <div className="space-y-2 border-b pb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="p-4 border rounded-lg space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
            <div className="space-y-3 border rounded-lg p-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>
        </div>
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
      {/* Workspace Operational Header - disembunyikan di mobile saat sedang membuka checklist peserta */}
      <div
        className={`px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-border bg-card/80 items-center justify-between gap-2 shrink-0 ${
          mobileShowChecklist ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <Link href="/workspaces">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-foreground truncate">
                {workspace.name}
              </h1>
              <Badge variant={workspace.status === "active" ? "default" : "secondary"} className="text-[9px] sm:text-[10px] py-0 h-4 sm:h-auto shrink-0">
                {workspace.status === "active" ? "Aktif" : "Diarsipkan"}
              </Badge>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1.5 sm:gap-2 mt-0 sm:mt-0.5 truncate">
              <span className="hidden sm:inline-flex items-center gap-1 truncate">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="truncate">{workspace.startDate} s/d {workspace.endDate}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1 shrink-0">
                <Users className="w-3 h-3" />
                {participants.length} Peserta
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Desktop (Inline) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Share Button */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs h-8"
            onClick={() => setShareModalOpen(true)}
          >
            <Share2 className="w-3.5 h-3.5 text-primary" />
            <span>Bagikan</span>
          </Button>

          {/* Export */}
          <Link href={`/workspaces/${workspaceId}/export`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </Button>
          </Link>

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

        {/* Action Buttons: Mobile (Single Dropdown Kebab) */}
        <div className="flex md:hidden items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                  <span className="sr-only">Menu Aksi Workspace</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuItem
                onClick={() => setShareModalOpen(true)}
                className="text-xs gap-2.5 py-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-primary" />
                <span>Bagikan Workspace</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push(`/workspaces/${workspaceId}/export`)}
                className="text-xs gap-2.5 py-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Export Data</span>
              </DropdownMenuItem>

              {user?.role === "admin" && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => router.push(`/workspaces/${workspaceId}/import`)}
                    className="text-xs gap-2.5 py-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Import Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/workspaces/${workspaceId}/form-settings`)}
                    className="text-xs gap-2.5 py-2 cursor-pointer"
                  >
                    <FileCheck2 className="w-4 h-4 text-primary" />
                    <span>Atur Form Checklist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/workspaces/${workspaceId}/settings`)}
                    className="text-xs gap-2.5 py-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Pengaturan Workspace</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={() => setConfirmModal({ open: true, type: "clean_data" })}
                    className="text-xs text-amber-700 dark:text-amber-400 gap-2.5 py-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Bersihkan Data Form</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirmModal({ open: true, type: "delete_workspace" })}
                    className="text-xs text-destructive focus:text-destructive gap-2.5 py-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Workspace</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
            try {
              await api.cleanWorkspaceResponses(workspaceId);
              await clearWorkspaceOfflineDrafts(workspaceId, participants.map((p) => p.id));
              await queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
              await queryClient.invalidateQueries({ queryKey: ["responses"] });
              await queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
              toast.add({ type: "success", title: "Data form berhasil dibersihkan & di-reset ke kondisi awal" });
            } catch (err) {
              console.error(err);
              toast.add({ type: "error", title: "Gagal membersihkan data form workspace" });
            }
          } else {
            await api.deleteWorkspace(workspaceId);
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            router.push("/workspaces");
          }
        }}
      />

      {/* Share Modal */}
      <WorkspaceShareDialog
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        workspaceId={workspaceId}
        workspaceName={workspace.name}
      />

      {/* Main Split Layout: Left Sidebar Peserta + Right Panel Checklist */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <ParticipantSidebar
          participants={participants}
          workspace={workspace}
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
              workspace={workspace}
              formFields={checklistItems}
              initialResponses={activeResponses}
              onSaveResponse={async (resp) => {
                await saveMutation.mutateAsync(resp as any);
              }}
              onUpdateParticipantData={async (updatedData) => {
                try {
                  setSyncStatus("syncing");
                  await api.updateParticipant(
                    activeParticipant.id,
                    {
                      data: updatedData,
                      officerName: user?.name || "Petugas",
                      officerEmail: user?.email || "petugas@regicheck.id",
                    },
                    workspaceId
                  );
                  await queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
                  await queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
                  setSyncStatus("synced");
                } catch (err) {
                  setSyncStatus("error");
                  throw err;
                }
              }}
              syncStatus={syncStatus}
              onBackToList={() => setMobileShowChecklist(false)}
              onPrevParticipant={handlePrevParticipant}
              onNextParticipant={handleNextParticipant}
              hasPrev={hasPrevParticipant}
              hasNext={hasNextParticipant}
              participantIndexInfo={
                activeIndex >= 0 ? `${activeIndex + 1} dari ${participants.length} peserta` : undefined
              }
              onOpenShareModal={() => setShareModalOpen(true)}
              onOpenConfirmModal={(type) => setConfirmModal({ open: true, type })}
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

