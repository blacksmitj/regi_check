"use client";

import { useState, useEffect } from "react";
import {
  Participant,
  FormField,
  SyncStatus,
  EvidenceFile,
} from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { StatusBadge } from "@/components/shared/status-badge";
import { saveEvidenceFile, getEvidenceBlobUrl } from "@/lib/storage/indexed-db";
import { MediaPreviewModal } from "@/components/shared/media-preview-modal";
import {
  isGoogleDriveUrl,
  getGoogleDriveThumbnailUrl,
  isPdfUrl,
} from "@/lib/domain/drive-detector";
import {
  UploadCloud,
  FileCheck,
  FileText,
  Trash2,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface FormEntryPanelProps {
  participant: Participant;
  formFields: FormField[];
  // backward compat props
  checklistItems?: FormField[];
  initialResponses?: unknown[];
  onSaveResponse?: (resp: unknown) => Promise<void>;
  onUpdateParticipantData?: (data: Record<string, unknown>) => Promise<void>;
  syncStatus: SyncStatus;
  onBackToList?: () => void;
}

export function FormEntryPanel({
  participant,
  formFields: directFormFields,
  checklistItems,
  onUpdateParticipantData,
  syncStatus,
  onBackToList,
}: FormEntryPanelProps) {
  const fields = directFormFields || checklistItems || [];

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile[]>>({});

  // Media preview modal state
  const [previewModal, setPreviewModal] = useState<{
    open: boolean;
    url: string;
    title: string;
    type: "image" | "file" | "auto";
  }>({
    open: false,
    url: "",
    title: "",
    type: "auto",
  });

  const handleOpenPreview = (
    url: string,
    title: string,
    type: "image" | "file" | "auto" = "auto"
  ) => {
    setPreviewModal({
      open: true,
      url,
      title,
      type,
    });
  };

  // Sync participant data into local state when participant changes
  useEffect(() => {
    setFormData(participant.data || {});
  }, [participant.id, participant.data]);

  const participantName = String(
    formData["Nama Lengkap"] || formData["Nama"] || "Peserta"
  );

  // Identify main photo
  const photoField = fields.find(
    (f) => f.type === "image" && f.sourceType === "excel_column"
  );
  const mainPhotoKey =
    photoField?.excelColumn ||
    Object.keys(formData).find((k) => /foto|photo|avatar|gambar/i.test(k));
  const rawMainPhotoUrl = mainPhotoKey ? String(formData[mainPhotoKey] || "") : "";
  const mainPhotoUrl = rawMainPhotoUrl
    ? isGoogleDriveUrl(rawMainPhotoUrl)
      ? getGoogleDriveThumbnailUrl(rawMainPhotoUrl, 300)
      : rawMainPhotoUrl
    : "";

  // Update a single form field value
  const handleFieldValueChange = async (key: string, value: unknown) => {
    const nextData = { ...formData, [key]: value };
    setFormData(nextData);
    if (onUpdateParticipantData) {
      await onUpdateParticipantData(nextData);
    }
  };

  // Upload photo
  const handlePhotoUpload = async (key: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await handleFieldValueChange(key, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Upload file attachment (IndexedDB)
  const handleUploadAttachment = async (fieldKey: string, file: File) => {
    try {
      const fileId = `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await saveEvidenceFile(fileId, file, file.name);

      const existing = evidenceMap[fieldKey] || [];
      const updated: EvidenceFile[] = [
        ...existing,
        {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          localId: fileId,
        },
      ];

      setEvidenceMap((prev) => ({ ...prev, [fieldKey]: updated }));

      // Also save file name / info in participant data
      await handleFieldValueChange(fieldKey, file.name);
    } catch (err) {
      console.error("Failed to upload attachment", err);
    }
  };

  // Open preview in new tab
  const handlePreviewAttachment = async (file: EvidenceFile) => {
    if (file.localId) {
      const blobUrl = await getEvidenceBlobUrl(file.localId);
      if (blobUrl) {
        window.open(blobUrl, "_blank");
      }
    } else if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  // Calculate statistics
  const activeFields = fields.filter((f) => f.active);
  const requiredFields = activeFields.filter((f) => f.required);
  const filledRequiredCount = requiredFields.filter((f) => {
    const key = f.excelColumn || f.id;
    const val = formData[key] !== undefined ? formData[key] : formData[f.id] ?? formData[f.label];
    if (val === undefined || val === null || val === "") return false;
    if (f.type === "checkbox") return val === true || val === "true" || val === "Ya" || val === 1;
    return true;
  }).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Top Header: Participant Profile Summary & Autosave */}
      <div className="p-4 sm:p-5 border-b border-border bg-card shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onBackToList}
              className="md:hidden h-8 w-8 shrink-0 -ml-1 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {/* Participant Avatar */}
          <div
            className={`relative shrink-0 ${mainPhotoUrl ? "cursor-pointer group" : ""}`}
            onClick={() => {
              if (rawMainPhotoUrl) {
                handleOpenPreview(rawMainPhotoUrl, participantName, "image");
              }
            }}
          >
            {mainPhotoUrl ? (
              <>
                <img
                  src={mainPhotoUrl}
                  alt={participantName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 shadow-xs group-hover:opacity-85 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px]">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border-2 border-primary/20">
                {participantName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {participantName}
              </h2>
              <StatusBadge status={participant.status} />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>NIK: {String(formData["NIK"] || "-")}</span>
              <span>•</span>
              <span>HP: {String(formData["Nomor HP"] || formData["HP"] || "-")}</span>
            </div>
          </div>
        </div>

        {/* Progress & Sync Status */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="text-right">
            <div className="text-xs font-semibold text-foreground">
              {filledRequiredCount} dari {requiredFields.length} Wajib Terisi
            </div>
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-300 ${filledRequiredCount === requiredFields.length
                    ? "bg-emerald-500"
                    : "bg-primary"
                  }`}
                style={{
                  width: `${requiredFields.length > 0 ? (filledRequiredCount / requiredFields.length) * 100 : 100}%`,
                }}
              />
            </div>
          </div>
          <AutosaveIndicator status={syncStatus} />
        </div>
      </div>

      {/* Main Form Fields Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {activeFields.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium">Belum ada field form yang dikonfigurasi.</p>
            <p className="text-xs mt-1">Klik tombol &quot;Atur Form&quot; untuk menambahkan field.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {activeFields.map((field, idx) => {
              const fieldKey = field.excelColumn || field.id;
              const currentValue =
                formData[fieldKey] !== undefined
                  ? formData[fieldKey]
                  : formData[field.id] !== undefined
                    ? formData[field.id]
                    : formData[field.label];

              const isEditable = field.editable ?? true;
              const isExcelSource = field.sourceType === "excel_column";

              return (
                <Card
                  key={field.id}
                  className="border shadow-xs hover:border-primary/40 transition-colors bg-card"
                >
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    {/* Field Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <Label
                            htmlFor={`form-input-${field.id}`}
                            className="text-sm font-semibold text-foreground cursor-pointer"
                          >
                            {field.label}
                            {field.required && (
                              <span className="text-rose-500 ml-1 font-bold">*</span>
                            )}
                          </Label>

                          {isExcelSource ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              Kolom Excel: {field.excelColumn || field.label}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              Field Tambahan
                            </span>
                          )}

                          {!isEditable && (
                            <span
                              className="text-[10px] text-muted-foreground flex items-center gap-1"
                              title="Field Read-Only"
                            >
                              <Lock className="w-3 h-3" />
                              Terkunci
                            </span>
                          )}
                        </div>

                        {field.description && (
                          <p className="text-xs text-muted-foreground pl-7">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Field Input Control */}
                    <div className="pl-7 pt-1">
                      {/* 1. Tipe Gambar / Foto */}
                      {field.type === "image" && (() => {
                        const strVal = String(currentValue || "").trim();
                        const isDrive = isGoogleDriveUrl(strVal);
                        const displayImg = isDrive
                          ? getGoogleDriveThumbnailUrl(strVal, 400)
                          : strVal;

                        return (
                          <div className="flex items-center gap-4 flex-wrap">
                            {strVal ? (
                              <div className="relative group cursor-pointer" onClick={() => handleOpenPreview(strVal, field.label, "image")}>
                                <img
                                  src={displayImg}
                                  alt={field.label}
                                  className="w-20 h-20 rounded-lg object-cover border border-border shadow-xs hover:opacity-90 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-medium gap-1">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border text-[11px]">
                                <ImageIcon className="w-5 h-5 mb-1" />
                                Belum ada
                              </div>
                            )}

                            {isEditable && (
                              <div className="space-y-2 flex-1 min-w-[200px]">
                                <div className="flex items-center gap-2">
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handlePhotoUpload(fieldKey, file);
                                        }
                                      }}
                                    />
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-input bg-background hover:bg-muted text-xs font-medium w-fit">
                                      <Camera className="w-3.5 h-3.5 text-primary" />
                                      Pilih / Ambil Foto
                                    </div>
                                  </label>

                                  {strVal && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-primary gap-1"
                                      onClick={() => handleOpenPreview(strVal, field.label, "image")}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Preview Foto
                                    </Button>
                                  )}
                                </div>
                                <Input
                                  placeholder="Link Google Drive foto atau URL gambar..."
                                  value={strVal}
                                  onChange={(e) =>
                                    handleFieldValueChange(fieldKey, e.target.value)
                                  }
                                  className="text-xs h-8"
                                />
                                {isDrive && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Link Google Drive terdeteksi otomatis
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* 2. Tipe Checkbox (Ya / Tidak) */}
                      {field.type === "checkbox" && (
                        <div className="flex items-center space-x-2.5 py-1">
                          <Checkbox
                            id={`form-input-${field.id}`}
                            disabled={!isEditable}
                            checked={
                              currentValue === true ||
                              currentValue === "true" ||
                              currentValue === "Ya" ||
                              currentValue === 1
                            }
                            onCheckedChange={(checked) =>
                              handleFieldValueChange(fieldKey, Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`form-input-${field.id}`}
                            className="text-xs font-medium cursor-pointer"
                          >
                            Centang untuk menyatakan memenuhi / sudah sesuai
                          </Label>
                        </div>
                      )}

                      {/* 3. Tipe Dropdown (Select) */}
                      {field.type === "select" && (
                        <div className="max-w-md">
                          <Select
                            disabled={!isEditable}
                            value={String(currentValue || "")}
                            onValueChange={(val) =>
                              handleFieldValueChange(fieldKey, val)
                            }
                          >
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Pilih opsi..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options && field.options.length > 0
                                ? field.options
                                : ["Opsi 1", "Opsi 2", "Opsi 3"]
                              ).map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* 4. Tipe Textarea */}
                      {field.type === "textarea" && (
                        <Textarea
                          id={`form-input-${field.id}`}
                          disabled={!isEditable}
                          value={String(currentValue || "")}
                          placeholder={field.description || "Tuliskan keterangan..."}
                          rows={3}
                          onChange={(e) =>
                            handleFieldValueChange(fieldKey, e.target.value)
                          }
                          className="text-xs"
                        />
                      )}

                      {/* 5. Tipe Tanggal */}
                      {field.type === "date" && (
                        <div className="relative max-w-xs">
                          <Input
                            id={`form-input-${field.id}`}
                            disabled={!isEditable}
                            type="date"
                            value={String(currentValue || "")}
                            onChange={(e) =>
                              handleFieldValueChange(fieldKey, e.target.value)
                            }
                            className="text-xs h-9"
                          />
                        </div>
                      )}

                      {/* 6. Tipe Angka / Nominal */}
                      {field.type === "number" && (
                        <div className="max-w-sm">
                          <Input
                            id={`form-input-${field.id}`}
                            disabled={!isEditable}
                            type="number"
                            value={
                              currentValue !== undefined && currentValue !== null
                                ? String(currentValue)
                                : ""
                            }
                            placeholder="0"
                            onChange={(e) =>
                              handleFieldValueChange(
                                fieldKey,
                                e.target.value === "" ? "" : Number(e.target.value)
                              )
                            }
                            className="text-xs h-9 font-mono"
                          />
                        </div>
                      )}

                      {/* 7. Tipe Email */}
                      {field.type === "email" && (
                        <div className="max-w-md">
                          <Input
                            id={`form-input-${field.id}`}
                            disabled={!isEditable}
                            type="email"
                            value={String(currentValue || "")}
                            placeholder="nama@email.com"
                            onChange={(e) =>
                              handleFieldValueChange(fieldKey, e.target.value)
                            }
                            className="text-xs h-9"
                          />
                        </div>
                      )}

                      {/* 8. Tipe Telepon */}
                      {field.type === "phone" && (
                        <div className="max-w-sm">
                          <Input
                            id={`form-input-${field.id}`}
                            disabled={!isEditable}
                            type="tel"
                            value={String(currentValue || "")}
                            placeholder="08123456789"
                            onChange={(e) =>
                              handleFieldValueChange(fieldKey, e.target.value)
                            }
                            className="text-xs h-9 font-mono"
                          />
                        </div>
                      )}

                      {/* 9. Tipe Text Standar (Default) */}
                      {(field.type === "text" || !field.type) && (
                        <div className="max-w-lg">
                          <Input
                            id={`form-input-${field.id}`}
                            disabled={!isEditable}
                            type="text"
                            value={String(currentValue || "")}
                            placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                            onChange={(e) =>
                              handleFieldValueChange(fieldKey, e.target.value)
                            }
                            className="text-xs h-9"
                          />
                        </div>
                      )}

                      {/* 10. Tipe File / Lampiran Dokumen */}
                      {(field.type === "file" || field.evidenceEnabled) && (() => {
                        const strVal = String(currentValue || "").trim();
                        const isDrive = isGoogleDriveUrl(strVal);
                        const isPdf = isPdfUrl(strVal);

                        return (
                          <div className="pt-1 space-y-3">
                            {/* If participant data contains a direct link / Drive URL */}
                            {strVal && (
                              <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/40 max-w-lg">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <FileText className="w-4 h-4 text-primary shrink-0" />
                                  <div className="truncate">
                                    <p className="text-xs font-medium truncate">{strVal}</p>
                                    {isDrive && (
                                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Link Google Drive
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenPreview(strVal, field.label, "file")}
                                  className="h-7 text-xs text-primary gap-1 shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Preview Dokumen
                                </Button>
                              </div>
                            )}

                            {isEditable && (
                              <div className="space-y-2 max-w-lg">
                                <Input
                                  placeholder="Link Google Drive dokumen / PDF..."
                                  value={strVal}
                                  onChange={(e) =>
                                    handleFieldValueChange(fieldKey, e.target.value)
                                  }
                                  className="text-xs h-8"
                                />

                                <div className="flex items-center gap-3">
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleUploadAttachment(fieldKey, file);
                                        }
                                      }}
                                    />
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-input bg-background hover:bg-muted text-xs font-medium w-fit">
                                      <UploadCloud className="w-3.5 h-3.5 text-primary" />
                                      Unggah Dokumen / Bukti
                                    </div>
                                  </label>
                                  {field.evidenceRequired && (
                                    <span className="text-[11px] text-rose-500 font-semibold">
                                      * Lampiran dokumen wajib
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* List of uploaded attachments */}
                            {evidenceMap[fieldKey] && evidenceMap[fieldKey].length > 0 && (
                              <div className="space-y-1 pt-1">
                                {evidenceMap[fieldKey].map((att) => (
                                  <div
                                    key={att.id}
                                    className="flex items-center justify-between p-2 rounded border bg-muted/40 text-xs max-w-md"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="w-4 h-4 text-primary shrink-0" />
                                      <span className="truncate font-medium">{att.name}</span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">
                                        ({(att.size / 1024).toFixed(0)} KB)
                                      </span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handlePreviewAttachment(att)}
                                      className="h-7 text-xs text-primary"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Buka
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Preview Modal (Foto & PDF) */}
      <MediaPreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal((prev) => ({ ...prev, open }))}
        url={previewModal.url}
        title={previewModal.title}
        type={previewModal.type}
      />
    </div>
  );
}

// Backward compatibility export
export const ChecklistFormPanel = FormEntryPanel;

