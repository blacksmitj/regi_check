"use client";

import { useState, useMemo } from "react";
import { FormTemplate, FormField } from "@/types/domain";
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
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Search,
  Layers,
  FileCheck2,
  Calendar,
  AlertTriangle,
  FolderTree,
  Check,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ApplyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: FormTemplate[];
  isLoadingTemplates?: boolean;
  currentItemsCount: number;
  currentTemplateId?: string;
  onApplyTemplate: (template: FormTemplate, mode: "replace" | "append") => Promise<void> | void;
}

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  templates,
  isLoadingTemplates = false,
  currentItemsCount,
  currentTemplateId,
  onApplyTemplate,
}: ApplyTemplateDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<"replace" | "append">("replace");
  const [isApplying, setIsApplying] = useState(false);

  // Set selected template initially or keep updated
  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;
    try {
      setIsApplying(true);
      await onApplyTemplate(selectedTemplate, applyMode);
      onOpenChange(false);
      setSelectedTemplateId(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isApplying) return;
    onOpenChange(false);
    setSelectedTemplateId(null);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Gunakan Master Template Form
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pilih template checklist yang sudah ada untuk diterapkan ke formulir workspace ini.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama atau deskripsi template..."
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Template List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground px-0.5">
              Daftar Template Tersedia ({filteredTemplates.length})
            </div>

            {isLoadingTemplates ? (
              <div className="flex flex-col items-center justify-center p-8 text-xs text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary" />
                <span>Memuat daftar template...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg text-xs text-muted-foreground space-y-1">
                <Layers className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="font-medium text-foreground">Template Tidak Ditemukan</p>
                <p>
                  {search
                    ? "Tidak ada template yang cocok dengan pencarian."
                    : "Belum ada template tersimpan. Anda bisa membuat template baru di menu Template."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const isCurrent = currentTemplateId === template.id;
                  const sectionsCount = template.items?.filter((it) => it.type === "section").length || 0;
                  const fieldsCount = (template.items?.length || 0) - sectionsCount;

                  return (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`relative flex flex-col p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary"
                          : "border-border hover:border-border/80 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm truncate">
                              {template.name}
                            </span>
                            {isCurrent && (
                              <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-normal">
                                Terhubung
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-muted-foreground line-clamp-2 text-[11px]">
                              {template.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-primary/40 text-primary">
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5 text-primary/80" />
                          <span>{fieldsCount} field</span>
                          {sectionsCount > 0 && <span>• {sectionsCount} seksi</span>}
                        </div>
                        {template.updatedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(template.updatedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Mode Choice (Only when template selected) */}
          {selectedTemplate && (
            <div className="p-3.5 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Metode Penerapan Template</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Template terpilih: <strong>{selectedTemplate.name}</strong>
                </span>
              </div>

              <RadioGroup
                value={applyMode}
                onValueChange={(val) => setApplyMode(val as "replace" | "append")}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
              >
                <div
                  onClick={() => setApplyMode("replace")}
                  className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all ${
                    applyMode === "replace"
                      ? "border-primary bg-background shadow-xs font-medium"
                      : "border-border/70 hover:bg-background/60"
                  }`}
                >
                  <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="mode-replace" className="cursor-pointer font-medium text-xs">
                      Ganti Seluruh Form (Replace)
                    </Label>
                    <p className="text-[11px] text-muted-foreground font-normal">
                      Mengosongkan form saat ini dan menggantinya dengan struktur dari template.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setApplyMode("append")}
                  className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all ${
                    applyMode === "append"
                      ? "border-primary bg-background shadow-xs font-medium"
                      : "border-border/70 hover:bg-background/60"
                  }`}
                >
                  <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="mode-append" className="cursor-pointer font-medium text-xs">
                      Gabungkan di Bawah (Append)
                    </Label>
                    <p className="text-[11px] text-muted-foreground font-normal">
                      Menambahkan field dari template ke bagian bawah form yang sudah ada.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {applyMode === "replace" && currentItemsCount > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Form saat ini memiliki <strong>{currentItemsCount} item</strong>. Memilih "Ganti
                    Seluruh Form" akan menimpa item yang ada dengan item dari template ini.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isApplying}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={!selectedTemplate || isApplying}
            className="text-xs gap-1.5"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menerapkan...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terapkan Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

