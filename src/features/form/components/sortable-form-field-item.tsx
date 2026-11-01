"use client";

import { FormField } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  FolderKanban,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Settings,
} from "lucide-react";

interface SortableFormFieldItemProps {
  item: FormField;
  index: number;
  fieldNumber?: number;
  isUnderSection?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  canMoveGroupUp?: boolean;
  canMoveGroupDown?: boolean;
  onMoveGroupUp?: (sectionId: string) => void;
  onMoveGroupDown?: (sectionId: string) => void;
  availableColumns?: string[];
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onEditSection?: (item: FormField) => void;
  onDelete: (id: string) => void;
}

export function SortableFormFieldItem({
  item,
  index,
  fieldNumber,
  isUnderSection = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  canMoveGroupUp = false,
  canMoveGroupDown = false,
  onMoveGroupUp,
  onMoveGroupDown,
  availableColumns = [],
  onUpdate,
  onEditSection,
  onDelete,
}: SortableFormFieldItemProps) {
  const isSection = item.type === "section";
  const isExcelMapped = item.sourceType === "excel_column";

  if (isSection) {
    return (
      <div id={`form-item-row-${item.id}`} className="transition-all duration-200 ease-in-out">
        <Card className="border-2 shadow-xs border-primary/30 bg-primary/5 hover:border-primary/50 transition-all">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              {/* Up/Down buttons, Icon & Section Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex flex-col items-center justify-center -my-1 bg-background/80 border border-primary/20 rounded p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!canMoveUp}
                    onClick={() => onMoveUp?.(item.id)}
                    className="h-5 w-5 text-primary/70 hover:text-primary hover:bg-primary/10 disabled:opacity-25 active:scale-95 transition-transform"
                    title="Pindahkan pembatas section ke atas"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!canMoveDown}
                    onClick={() => onMoveDown?.(item.id)}
                    className="h-5 w-5 text-primary/70 hover:text-primary hover:bg-primary/10 disabled:opacity-25 active:scale-95 transition-transform"
                    title="Pindahkan pembatas section ke bawah"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary truncate max-w-[240px] sm:max-w-[340px]">
                      {item.label || "Section Tanpa Judul"}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 font-semibold bg-primary/15 text-primary border border-primary/20"
                    >
                      Section / Group
                    </Badge>
                  </div>
                  {item.description ? (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">
                      Semua field di bawah pembatas ini masuk ke dalam grup ini
                    </p>
                  )}
                </div>
              </div>

              {/* Move Group Up/Down & Edit & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                {(onMoveGroupUp || onMoveGroupDown) && (
                  <div className="flex items-center bg-background border border-border rounded-md p-0.5 mr-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!canMoveGroupUp}
                      onClick={() => onMoveGroupUp?.(item.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30 active:scale-95 transition-transform"
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
                      className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30 active:scale-95 transition-transform"
                      title="Pindahkan seluruh grup beserta isinya ke bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {onEditSection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditSection(item)}
                    className="h-7 px-2 text-xs gap-1 bg-background"
                  >
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Edit Grup</span>
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(item.id)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0 h-7 w-7"
                  title="Hapus Pembatas Section"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
      id={`form-item-row-${item.id}`}
      className={`transition-all duration-200 ease-in-out ${
        isUnderSection ? "ml-4 sm:ml-6" : ""
      }`}
    >
      <Card
        className={`border shadow-xs bg-card transition-all ${
          isUnderSection ? "border-l-4 border-l-primary/40" : ""
        }`}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            {/* Up/Down buttons & numbering */}
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex flex-col items-center justify-center -my-1 bg-muted/40 border border-border/60 rounded p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canMoveUp}
                  onClick={() => onMoveUp?.(item.id)}
                  className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-25 active:scale-95 transition-transform"
                  title="Pindahkan urutan field ke atas"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!canMoveDown}
                  onClick={() => onMoveDown?.(item.id)}
                  className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-25 active:scale-95 transition-transform"
                  title="Pindahkan urutan field ke bawah"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>

              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                {fieldNumber ?? index + 1}
              </span>
            </div>

            {/* Field Inputs */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Sumber Field */}
              <Field className="space-y-1">
                <FieldLabel className="text-[11px] font-semibold">Sumber Field</FieldLabel>
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
              </Field>

              {/* Label Field */}
              <Field className="space-y-1">
                <FieldLabel className="text-[11px]">Nama Field / Label</FieldLabel>
                <Input
                  value={item.label}
                  placeholder="Misal: Foto Peserta / NIK"
                  onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                  className="text-xs h-8"
                />
              </Field>

              {/* Tipe Tampilan / Input */}
              <Field className="space-y-1">
                <FieldLabel className="text-[11px]">Tipe Input</FieldLabel>
                <Select
                  value={item.type}
                  onValueChange={(val) => onUpdate(item.id, { type: val as any })}
                >
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Teks Pendek</SelectItem>
                    <SelectItem value="textarea">Teks Panjang (Catatan)</SelectItem>
                    <SelectItem value="number">Angka</SelectItem>
                    <SelectItem value="checkbox">Centang (Ya/Tidak)</SelectItem>
                    <SelectItem value="select">Dropdown Pilihan</SelectItem>
                    <SelectItem value="date">Tanggal</SelectItem>
                    <SelectItem value="drive_file">Upload Bukti Foto</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Kolom Excel Mapping */}
              {isExcelMapped ? (
                <Field className="space-y-1">
                  <FieldLabel className="text-[11px] text-emerald-600 font-semibold">
                    Map ke Kolom Excel
                  </FieldLabel>
                  {availableColumns.length > 0 ? (
                    <Select
                      value={item.excelColumn || ""}
                      onValueChange={(val) =>
                        onUpdate(item.id, {
                          excelColumn: val ?? undefined,
                          label: item.label === "Kolom Profil Peserta" || !item.label ? (val ?? "") : item.label,
                        })
                      }
                    >
                      <SelectTrigger className="w-full h-8 text-xs border-emerald-500/40 text-emerald-700 bg-emerald-500/5">
                        <SelectValue placeholder="Pilih Kolom..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={item.excelColumn || ""}
                      placeholder="Nama kolom Excel..."
                      onChange={(e) => onUpdate(item.id, { excelColumn: e.target.value })}
                      className="text-xs h-8"
                    />
                  )}
                </Field>
              ) : (
                <Field className="space-y-1">
                  <FieldLabel className="text-[11px]">Keterangan / Panduan</FieldLabel>
                  <Input
                    value={item.description || ""}
                    placeholder="Petunjuk pengisian..."
                    onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                    className="text-xs h-8"
                  />
                </Field>
              )}
            </div>

            {/* Tombol Hapus */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(item.id)}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0 h-8 w-8"
              title="Hapus Field"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Opsi Tambahan / Checkbox Baris Bawah */}
          <div className="flex items-center gap-6 pt-2 border-t text-xs flex-wrap">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`req-${item.id}`}
                checked={item.required}
                onCheckedChange={(checked) =>
                  onUpdate(item.id, { required: !!checked })
                }
              />
              <Label htmlFor={`req-${item.id}`} className="text-xs cursor-pointer">
                Wajib Diisi (Required)
              </Label>
            </div>

            {isExcelMapped && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-${item.id}`}
                  checked={item.editable}
                  onCheckedChange={(checked) =>
                    onUpdate(item.id, { editable: !!checked })
                  }
                />
                <Label htmlFor={`edit-${item.id}`} className="text-xs cursor-pointer">
                  Dapat Diubah oleh Petugas
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id={`ev-${item.id}`}
                checked={item.evidenceEnabled}
                onCheckedChange={(checked) =>
                  onUpdate(item.id, { evidenceEnabled: !!checked })
                }
              />
              <Label htmlFor={`ev-${item.id}`} className="text-xs cursor-pointer font-medium text-amber-700 dark:text-amber-400">
                Sertakan Bukti Foto / Dokumen
              </Label>
            </div>

            {item.evidenceEnabled && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`ev-req-${item.id}`}
                  checked={item.evidenceRequired}
                  onCheckedChange={(checked) =>
                    onUpdate(item.id, { evidenceRequired: !!checked })
                  }
                />
                <Label htmlFor={`ev-req-${item.id}`} className="text-xs cursor-pointer text-amber-800 dark:text-amber-300">
                  Foto Wajib Diambil
                </Label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
