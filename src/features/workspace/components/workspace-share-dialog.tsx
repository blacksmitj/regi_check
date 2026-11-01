"use client";

import { useState } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Copy, Check, Share2, ExternalLink } from "lucide-react";

interface WorkspaceShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
}

export function WorkspaceShareDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: WorkspaceShareDialogProps) {
  const [copied, setCopied] = useState(false);

  // Generate share URL - mengarah langsung ke workspace detail
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/workspaces/${workspaceId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin link:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="p-2 bg-primary/10 rounded-full">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Bagikan Workspace
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Berikan tautan ini kepada petugas lapangan. Saat petugas membuka tautan dan login menggunakan akun Google, mereka akan langsung diarahkan ke workspace{" "}
            <span className="font-semibold text-foreground">&quot;{workspaceName}&quot;</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Field className="gap-1.5">
            <FieldLabel htmlFor="workspace-share-url" className="text-xs font-medium text-foreground">
              Tautan Workspace
            </FieldLabel>
            <div className="flex items-center gap-2 w-full">
              <Input
                id="workspace-share-url"
                readOnly
                value={shareUrl}
                className="text-xs font-mono select-all bg-muted/50 h-9 flex-1"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 shrink-0 h-9 px-3 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </Button>
            </div>
          </Field>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span>💡</span> Alur Akses Petugas:
            </p>
            <p>
              Petugas yang membuka tautan dan login menggunakan Google akan otomatis terdata di menu <strong>Petugas</strong> (status <em>Menunggu Persetujuan</em>). Admin cukup menekan tombol <strong>Setujui</strong> agar petugas langsung aktif mengelola workspace ini.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-row items-center gap-2 pt-2 border-t border-border">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-4"
          >
            <span>Uji buka link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

