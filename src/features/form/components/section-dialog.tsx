"use client";

import { useState, useEffect } from "react";
import { FormField } from "@/types/domain";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FolderKanban, Trash2 } from "lucide-react";

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: FormField | null;
  onSave: (data: { label: string; description?: string }) => void;
  onDelete?: (id: string) => void;
}

export function SectionDialog({
  open,
  onOpenChange,
  section,
  onSave,
  onDelete,
}: SectionDialogProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const isEditing = Boolean(section && section.id);

  useEffect(() => {
    if (open) {
      setLabel(section?.label || "");
      setDescription(section?.description || "");
    }
  }, [open, section]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSave({
      label: label.trim(),
      description: description.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-semibold">
                {isEditing ? "Edit Section / Group" : "Buat Section / Group Baru"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Section digunakan sebagai pemisah logis dan pengelompokan pertanyaan/field pada formulir checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="sec-label" className="text-xs font-semibold">
                Judul Section / Group <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sec-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Contoh: Identitas & Dokumen Peserta"
                className="text-xs h-9 font-medium"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-desc" className="text-xs font-semibold">
                Deskripsi / Petunjuk Pengisian (Opsional)
              </Label>
              <Textarea
                id="sec-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan singkat tentang grup pertanyaan ini..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2 border-t pt-3">
            {isEditing && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (section?.id) {
                    onDelete(section.id);
                    onOpenChange(false);
                  }
                }}
                className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2.5 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Grup
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!label.trim()}
                className="text-xs h-8 px-4"
              >
                {isEditing ? "Simpan Perubahan" : "Tambahkan"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

