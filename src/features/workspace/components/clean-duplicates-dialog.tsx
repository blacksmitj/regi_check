"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, CheckCircle2, Loader2, KeyRound, User } from "lucide-react";

export interface DuplicateGroupItem {
  keyValue: string;
  nameValue?: string;
  total: number;
  retainedParticipant: { id: string; name?: string; updatedAt?: string | null };
  deletedParticipants: Array<{ id: string; name?: string; updatedAt?: string | null }>;
}

interface CleanDuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyColumn: string;
  nameColumn?: string | null;
  duplicateCount: number;
  duplicateGroups: DuplicateGroupItem[];
  onConfirm: (targetIds?: string[]) => Promise<void>;
}

export function CleanDuplicatesDialog({
  open,
  onOpenChange,
  keyColumn,
  nameColumn,
  duplicateCount,
  duplicateGroups,
  onConfirm,
}: CleanDuplicatesDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleExecuteAll = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm(); // hapus semua
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteSingleGroup = async (group: DuplicateGroupItem) => {
    if (isDeleting) return;
    const targetIds = group.deletedParticipants.map((p) => p.id);
    if (targetIds.length === 0) return;

    try {
      setIsDeleting(true);
      setDeletingId(group.keyValue);
      await onConfirm(targetIds); // hapus hanya peserta duplikat dari grup ini
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6 gap-4">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-500">
            <div className="p-2 bg-amber-500/10 rounded-full">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Konfirmasi Pembersihan Data Peserta Duplikat
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Ditemukan <strong className="text-foreground">{duplicateCount} data duplikat</strong> berdasarkan pencocokan ganda pada kolom{" "}
            <Badge variant="outline" className="font-mono text-primary font-semibold text-[11px] gap-1 px-1.5 py-0">
              <KeyRound className="w-3 h-3" />
              {keyColumn}
            </Badge>
            {nameColumn && (
              <>
                {" "}dan{" "}
                <Badge variant="outline" className="font-mono text-primary font-semibold text-[11px] gap-1 px-1.5 py-0">
                  <User className="w-3 h-3" />
                  {nameColumn}
                </Badge>
              </>
            )}
            {" "}(kedua kolom harus sama). Baris dengan riwayat pembaruan (<span className="italic font-medium">updated_at</span>) terbaru akan{" "}
            <strong>dipertahankan</strong>, sedangkan data duplikat lainnya beserta riwayat checklist akan{" "}
            <strong>dihapus permanen</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Daftar ID Unik Peserta yang Duplikat */}
        <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-semibold text-foreground">
              Daftar ID Unik Terduplikasi ({duplicateGroups.length} grup):
            </span>
            <span className="text-[11px]">Total dihapus: {duplicateCount} baris</span>
          </div>

          <div className="overflow-y-auto max-h-[260px] rounded-lg border border-border/80 bg-muted/40 divide-y divide-border/60 p-1">
            {duplicateGroups.map((group, idx) => (
              <div key={idx} className="p-2.5 text-xs space-y-2 bg-card/60 rounded m-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-semibold text-foreground bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] truncate">
                      {group.keyValue || "(Kosong)"}
                    </span>
                    {(group.nameValue || group.retainedParticipant.name) && (
                      <span className="text-foreground font-medium flex items-center gap-1 truncate text-xs">
                        <User className="w-3 h-3 text-muted-foreground shrink-0" />
                        {group.nameValue || group.retainedParticipant.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {group.total} total ({group.deletedParticipants.length} dihapus)
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDeleting}
                      onClick={() => handleExecuteSingleGroup(group)}
                      className="h-6 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                      title="Uji coba hapus duplikat peserta ini saja"
                    >
                      {deletingId === group.keyValue ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Uji Hapus 1 Ini"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-1 bg-background/50 px-2 py-1 rounded">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    Sisakan data ID {group.retainedParticipant.id.slice(0, 8)}... (Terbaru)
                  </span>
                  <span className="text-destructive font-medium">
                    Hapus {group.deletedParticipants.length} data lainnya
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2 text-amber-800 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
          <span>
            Anda dapat menekan tombol <strong>"Uji Hapus 1 Ini"</strong> pada salah satu peserta di atas untuk mencoba menghapus 1 data saja terlebih dahulu.
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <DialogClose render={<Button variant="outline" size="sm" disabled={isDeleting} className="text-xs h-9" />}>
            Batal
          </DialogClose>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleExecuteAll}
            className="text-xs h-9 gap-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
          >
            {isDeleting && !deletingId ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menghapus {duplicateCount} Peserta...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua ({duplicateCount} Duplikat)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
