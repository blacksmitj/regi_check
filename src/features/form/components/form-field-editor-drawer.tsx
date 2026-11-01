"use client";

import { useState } from "react";
import { FormField, FormFieldType } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Sparkles, Check } from "lucide-react";

interface FormFieldEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: FormField | null;
  availableColumns: string[];
  onSave: (field: FormField) => void;
  onDelete?: (id: string) => void;
}

export function FormFieldEditorDrawer({
  open,
  onOpenChange,
  field,
  availableColumns,
  onSave,
  onDelete,
}: FormFieldEditorDrawerProps) {
  if (!field) return null;

  return (
    <DrawerInner
      key={field.id}
      open={open}
      onOpenChange={onOpenChange}
      initialField={field}
      availableColumns={availableColumns}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}

function DrawerInner({
  open,
  onOpenChange,
  initialField,
  availableColumns,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialField: FormField;
  availableColumns: string[];
  onSave: (field: FormField) => void;
  onDelete?: (id: string) => void;
}) {
  const [formData, setFormData] = useState<FormField>({ ...initialField });
  const [optionsText, setOptionsText] = useState<string>(
    (initialField.options || []).join("\n")
  );

  const handleTypeChange = (type: FormFieldType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      options:
        type === "select" || type === "radio"
          ? prev.options && prev.options.length > 0
            ? prev.options
            : ["Pilihan 1", "Pilihan 2"]
          : undefined,
    }));
  };

  const handleSave = () => {
    const updated = { ...formData };
    if (updated.type === "select" || updated.type === "radio") {
      updated.options = optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      updated.options = undefined;
    }
    onSave(updated);
    onOpenChange(false);
  };

  const isExcelMapped = formData.sourceType === "excel_column";
  const isSection = formData.type === "section";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 bg-background">
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold">
              {isSection ? "Pengaturan Section / Group" : "Pengaturan Field Form"}
            </SheetTitle>
            <Badge
              variant={isSection ? "outline" : isExcelMapped ? "secondary" : "default"}
              className="text-[10px] px-1.5 py-0"
            >
              {isSection ? "Section Header" : isExcelMapped ? "Kolom Excel" : "Field Admin"}
            </Badge>
          </div>
          <SheetDescription className="text-xs">
            {isSection
              ? "Atur nama grup/section dan deskripsi pengantar untuk mengelompokkan field di bawahnya."
              : "Atur label, tipe input, validasi, dan perilaku petugas saat mengisi form peserta."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <FieldGroup className="gap-4">
            {/* Sumber Field (Hanya untuk field biasa) */}
            {!isSection && (
              <Field className="space-y-1.5">
                <FieldLabel className="text-xs font-semibold">Sumber Field</FieldLabel>
                <Select
                  value={formData.sourceType === "excel_column" ? "excel_column" : "custom_field"}
                  onValueChange={(val) => {
                    if (!val) return;
                    const source = val as "custom_field" | "excel_column";
                    setFormData((prev) => ({
                      ...prev,
                      sourceType: source,
                      excelColumn: source === "excel_column" ? prev.excelColumn || availableColumns[0] || "" : undefined,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom_field">Field Tambahan Admin (Baru)</SelectItem>
                    <SelectItem value="excel_column">Kolom Bawaan Excel Peserta</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {/* Kolom Excel Mapping */}
            {!isSection && formData.sourceType === "excel_column" && (
              <Field className="space-y-1.5 p-3 rounded-md bg-muted/40 border border-border">
                <FieldLabel className="text-xs font-semibold">Petakan ke Kolom Excel</FieldLabel>
                <Select
                  value={formData.excelColumn || ""}
                  onValueChange={(val) => {
                    if (!val) return;
                    setFormData((prev) => ({
                      ...prev,
                      excelColumn: val,
                      label: prev.label === "Field Form Baru" || !prev.label ? val : prev.label,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder="Pilih header kolom..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.length > 0 ? (
                      availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Tidak ada kolom Excel ditemukan
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FieldDescription className="text-[11px] text-muted-foreground">
                  Nilai awal input peserta akan diambil dari data kolom Excel ini.
                </FieldDescription>
              </Field>
            )}

            {/* Label Field / Judul Section */}
            <Field className="space-y-1.5">
              <FieldLabel className="text-xs font-semibold">
                {isSection ? "Judul Section / Group" : "Label Field di Form"}
              </FieldLabel>
              <Input
                value={formData.label}
                onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                placeholder={
                  isSection
                    ? "Contoh: Data Identitas Diri / Berkas Administrasi"
                    : "Contoh: Nama Lengkap / Konfirmasi Hadir"
                }
                className="text-xs h-8"
              />
            </Field>

            {/* Deskripsi / Petunjuk Pengisian */}
            <Field className="space-y-1.5">
              <FieldLabel className="text-xs font-semibold">
                {isSection ? "Deskripsi / Subjudul Section (Opsional)" : "Petunjuk Pengisian (Opsional)"}
              </FieldLabel>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={
                  isSection
                    ? "Contoh: Pastikan data di bagian ini sesuai dengan dokumen fisik asli peserta..."
                    : "Contoh: Pastikan nomor HP aktif WhatsApp..."
                }
                rows={2}
                className="text-xs"
              />
            </Field>

            {/* Tipe Input (Hanya untuk field biasa, bukan section/group) */}
            {!isSection && (
              <Field className="space-y-1.5">
                <FieldLabel className="text-xs font-semibold">Tipe Elemen Form</FieldLabel>
                <Select value={formData.type} onValueChange={(val) => handleTypeChange(val as FormFieldType)}>
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkbox">Checkbox (Centang / Ya-Tidak)</SelectItem>
                    <SelectItem value="text">Teks Pendek (Text)</SelectItem>
                    <SelectItem value="textarea">Teks Panjang (Textarea)</SelectItem>
                    <SelectItem value="number">Angka (Number)</SelectItem>
                    <SelectItem value="date">Tanggal (Date)</SelectItem>
                    <SelectItem value="select">Dropdown Pilihan (Select)</SelectItem>
                    <SelectItem value="radio">Radio Buttons (Pilihan Tunggal)</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Nomor Telepon / WhatsApp</SelectItem>
                    <SelectItem value="image">Upload Foto (Image)</SelectItem>
                    <SelectItem value="file">Upload Berkas / PDF (File)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {/* Options jika tipe select atau radio */}
            {!isSection && (formData.type === "select" || formData.type === "radio") && (
              <Field className="space-y-1.5 p-3 rounded-md bg-muted/40 border border-border">
                <FieldLabel className="text-xs font-semibold">Daftar Pilihan Opsi (Satu baris per opsi)</FieldLabel>
                <Textarea
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Pilihan A&#10;Pilihan B&#10;Pilihan C"
                  rows={3}
                  className="text-xs"
                />
              </Field>
            )}

            {/* Switch Opsi Form (hanya untuk field biasa) */}
            {!isSection && (
              <div className="space-y-3 pt-2 border-t border-border">
                <Field orientation="horizontal" className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-xs font-medium">Dapat Diedit Petugas (Editable)</FieldLabel>
                    <FieldDescription className="text-[11px] text-muted-foreground">Petugas dapat mengubah nilai saat registrasi</FieldDescription>
                  </div>
                  <Switch
                    checked={formData.editable}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        editable: checked,
                        // Jika no-edit (checked = false), otomatis no-required
                        required: !checked ? false : prev.required,
                      }))
                    }
                  />
                </Field>

                <Field orientation="horizontal" className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-xs font-medium">Wajib Diisi (Required)</FieldLabel>
                    <FieldDescription className="text-[11px] text-muted-foreground">
                      Form tidak lengkap bila field ini kosong
                      {!formData.editable && " (dinonaktifkan jika field non-editable)"}
                    </FieldDescription>
                  </div>
                  <Switch
                    checked={formData.required}
                    disabled={!formData.editable}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, required: checked }))}
                  />
                </Field>

                <Field orientation="horizontal" className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel className="text-xs font-medium">Wajibkan Foto Bukti (Evidence)</FieldLabel>
                    <FieldDescription className="text-[11px] text-muted-foreground">Petugas wajib mengambil foto bukti saat verifikasi</FieldDescription>
                  </div>
                  <Switch
                    checked={!!formData.evidenceEnabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        evidenceEnabled: checked,
                        evidenceRequired: checked ? prev.evidenceRequired : false,
                      }))
                    }
                  />
                </Field>
              </div>
            )}
          </FieldGroup>
        </div>

        <SheetFooter className="p-4 border-t border-border flex flex-row items-center justify-between gap-2">
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(formData.id);
                onOpenChange(false);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5 h-8 px-2.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
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
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs gap-1.5 h-8"
            >
              <Check className="w-3.5 h-3.5" />
              Terapkan
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
