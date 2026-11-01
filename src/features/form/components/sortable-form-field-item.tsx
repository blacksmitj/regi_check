"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FormField, FormFieldType } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GripVertical,
  Trash2,
  FolderKanban,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface SortableFormFieldItemProps {
  item: FormField;
  index: number;
  fieldNumber?: number;
  isUnderSection?: boolean;
  canMoveGroupUp?: boolean;
  canMoveGroupDown?: boolean;
  onMoveGroupUp?: (sectionId: string) => void;
  onMoveGroupDown?: (sectionId: string) => void;
  availableColumns?: string[];
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onDelete: (id: string) => void;
}

export function SortableFormFieldItem({
  item,
  index,
  fieldNumber,
  isUnderSection = false,
  canMoveGroupUp = false,
  canMoveGroupDown = false,
  onMoveGroupUp,
  onMoveGroupDown,
  availableColumns = [],
  onUpdate,
  onDelete,
}: SortableFormFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.75 : 1,
  };

  const isSection = item.type === "section";
  const isExcelMapped = item.sourceType === "excel_column";

  if (isSection) {
    return (
      <div ref={setNodeRef} style={style}>
        <Card
          className={`border-2 shadow-xs ${
            isDragging
              ? "ring-2 ring-primary border-primary bg-primary/10"
              : "border-primary/30 bg-primary/5"
          }`}
        >
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              {/* Drag Handle & Section Icon */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-primary/10 text-primary/70 hover:text-primary touch-none"
                  title="Tarik untuk memindahkan posisi pembatas section"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
                <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20"
                >
                  Section / Group
                </Badge>
              </div>

              {/* Section Title & Description Inputs */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-primary">
                    Judul Section / Group
                  </Label>
                  <Input
                    value={item.label}
                    placeholder="Contoh: Identitas & Profil Peserta"
                    onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                    className="text-xs h-8 bg-background font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Deskripsi Grup (Opsional)</Label>
                  <Input
                    value={item.description || ""}
                    placeholder="Keterangan singkat grup ini..."
                    onChange={(e) =>
                      onUpdate(item.id, { description: e.target.value })
                    }
                    className="text-xs h-8 bg-background"
                  />
                </div>
              </div>

              {/* Move Group Up/Down & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                {(onMoveGroupUp || onMoveGroupDown) && (
                  <div className="flex items-center bg-background border border-border rounded-md p-0.5 mr-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!canMoveGroupUp}
                      onClick={() => onMoveGroupUp?.(item.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30"
                      title="Pindahkan seluruh grup beserta isinya ke atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!canMoveGroupDown}
                      onClick={() => onMoveGroupDown?.(item.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30"
                      title="Pindahkan seluruh grup beserta isinya ke bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(item.id)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0 h-8 w-8"
                  title="Hapus Pembatas Section"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isUnderSection ? "ml-4 sm:ml-6" : ""}
    >
      <Card
        className={`border shadow-xs ${
          isUnderSection ? "border-l-4 border-l-primary/40" : ""
        } ${
          isDragging ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-card"
        }`}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            {/* Drag Handle */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground touch-none"
                title="Tarik untuk mengubah urutan field form"
              >
                <GripVertical className="w-4 h-4" />
              </button>
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                {fieldNumber ?? index + 1}
              </span>
            </div>

            {/* Field Inputs */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Sumber Field */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Sumber Field</Label>
                <Select
                  value={item.sourceType === "excel_column" ? "excel_column" : "custom_field"}
                  onValueChange={(val) => {
                    const isCol = val === "excel_column";
                    onUpdate(item.id, {
                      sourceType: isCol ? "excel_column" : "custom_field",
                      editable: isCol ? true : item.editable,
                    });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom_field">Field Tambahan Admin</SelectItem>
                    <SelectItem value="excel_column">Kolom Bawaan Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Label Field */}
              <div className="space-y-1">
                <Label className="text-[11px]">Nama Field / Label</Label>
                <Input
                  value={item.label}
                  placeholder="Misal: Foto Peserta / NIK"
                  onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              {/* Tipe Tampilan / Input */}
              <div className="space-y-1">
                <Label className="text-[11px]">Tipe Input</Label>
                <Select
                  value={item.type}
                  onValueChange={(val) => {
                    if (val) onUpdate(item.id, { type: val as FormFieldType });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section">Section Header (Grup)</SelectItem>
                    <SelectItem value="text">Teks Singkat</SelectItem>
                    <SelectItem value="image">Foto / Gambar (Avatar/URL)</SelectItem>
                    <SelectItem value="number">Angka / Nominal</SelectItem>
                    <SelectItem value="phone">Nomor Telepon</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="textarea">Teks Panjang</SelectItem>
                    <SelectItem value="date">Tanggal</SelectItem>
                    <SelectItem value="select">Dropdown Pilihan</SelectItem>
                    <SelectItem value="checkbox">Checkbox (Ya / Tidak)</SelectItem>
                    <SelectItem value="file">File / Dokumen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Kolom Excel Terkait (Jika Excel Column) */}
              {isExcelMapped ? (
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-primary">Kolom Excel Terkait</Label>
                  {availableColumns.length > 0 ? (
                    <Select
                      value={item.excelColumn || ""}
                      onValueChange={(val) => {
                        onUpdate(item.id, {
                          excelColumn: val || undefined,
                          label: item.label || val || "",
                        });
                      }}
                    >
                      <SelectTrigger className="w-full h-8 text-xs border-primary/50">
                        <SelectValue placeholder="Pilih Kolom Excel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={item.excelColumn || ""}
                      placeholder="Ketik nama kolom header..."
                      onChange={(e) => onUpdate(item.id, { excelColumn: e.target.value })}
                      className="text-xs h-8 border-primary/50"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-[11px]">Petunjuk Pengisian</Label>
                  <Input
                    value={item.description || ""}
                    placeholder="Instruksi pengisian form..."
                    onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(item.id)}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"
              title="Hapus Field"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Toggles: Editable, Required & Evidence */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60 text-xs">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`edit-${item.id}`}
                checked={item.editable ?? true}
                onCheckedChange={(c) => onUpdate(item.id, { editable: Boolean(c) })}
              />
              <Label htmlFor={`edit-${item.id}`} className="cursor-pointer font-medium text-foreground">
                Dapat Diedit Saat Input Form
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id={`req-${item.id}`}
                checked={item.required}
                onCheckedChange={(c) => onUpdate(item.id, { required: Boolean(c) })}
              />
              <Label htmlFor={`req-${item.id}`} className="cursor-pointer font-medium text-foreground">
                Wajib Diisi (Required)
              </Label>
            </div>

            {!isExcelMapped && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`evi-${item.id}`}
                  checked={item.evidenceEnabled}
                  onCheckedChange={(c) =>
                    onUpdate(item.id, { evidenceEnabled: Boolean(c) })
                  }
                />
                <Label htmlFor={`evi-${item.id}`} className="cursor-pointer font-medium">
                  Lampiran Dokumen Tambahan
                </Label>
              </div>
            )}

            {!isExcelMapped && item.evidenceEnabled && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`evireq-${item.id}`}
                  checked={item.evidenceRequired}
                  onCheckedChange={(c) =>
                    onUpdate(item.id, { evidenceRequired: Boolean(c) })
                  }
                />
                <Label htmlFor={`evireq-${item.id}`} className="cursor-pointer text-rose-600 font-medium">
                  Lampiran Wajib Diunggah
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Backward compatibility export
export const SortableChecklistItem = SortableFormFieldItem;
