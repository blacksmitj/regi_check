"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { AlertTriangle, Trash2, RotateCcw, Loader2 } from "lucide-react";

interface WorkspaceConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "clean_data" | "delete_workspace";
  workspaceName: string;
  onConfirm: () => Promise<void>;
}

export function WorkspaceConfirmationDialog({
  open,
  onOpenChange,
  type,
  workspaceName,
  onConfirm,
}: WorkspaceConfirmationDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isClean = type === "clean_data";
  const requiredKeyword = isClean ? "RESET" : "HAPUS";
  const isValid = confirmInput.trim().toUpperCase() === requiredKeyword;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmInput("");
      setIsLoading(false);
    }
    onOpenChange(nextOpen);
  };

  const handleExecute = async () => {
    if (!isValid || isLoading) return;
    try {
      setIsLoading(true);
      await onConfirm();
      handleOpenChange(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="p-2 bg-destructive/10 rounded-full">
              {isClean ? <RotateCcw className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <AlertDialogTitle className="text-base font-bold">
              {isClean ? "Bersihkan Data Form Peserta" : "Hapus Workspace Permanen"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {isClean ? (
              <>
                Tindakan ini akan <strong>mereset semua respons isian form</strong> dan mengembalikan status semua peserta pada kegiatan{" "}
                <span className="font-semibold text-foreground">"{workspaceName}"</span> menjadi belum lengkap. Data peserta dan struktur form tidak akan dihapus.
              </>
            ) : (
              <>
                Tindakan ini bersifat <strong>permanen dan tidak dapat dibatalkan</strong>. Workspace{" "}
                <span className="font-semibold text-foreground">"{workspaceName}"</span> beserta seluruh data peserta, isian form, dan pengaturan akan dihapus secara total dari sistem.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2.5 my-2 p-3 bg-muted/60 rounded-md border border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Konfirmasi Pengamanan:</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ketik kata <span className="font-mono font-bold text-destructive bg-destructive/10 px-1 py-0.5 rounded">{requiredKeyword}</span> di bawah untuk mengaktifkan tombol konfirmasi:
          </p>
          <Field className="space-y-1">
            <FieldLabel htmlFor="confirm-keyword" className="sr-only">Kata Kunci Konfirmasi</FieldLabel>
            <Input
              id="confirm-keyword"
              placeholder={`Ketik "${requiredKeyword}"`}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="text-xs uppercase placeholder:normal-case font-mono"
              autoComplete="off"
              disabled={isLoading}
            />
          </Field>
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} className="text-xs h-9">
            Batal
          </AlertDialogCancel>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isValid || isLoading}
            onClick={handleExecute}
            className="text-xs h-9 gap-1.5 font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                {isClean ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isClean ? "Ya, Bersihkan Data" : "Ya, Hapus Permanen"}</span>
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

