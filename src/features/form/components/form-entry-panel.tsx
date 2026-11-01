"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Participant,
  Workspace,
  FormField,
  SyncStatus,
  EvidenceFile,
} from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FolderKanban,
} from "lucide-react";

interface FormEntryPanelProps {
  participant: Participant;
  workspace?: Workspace;
  formFields: FormField[];
  // backward compat props
  checklistItems?: FormField[];
  initialResponses?: unknown[];
  onSaveResponse?: (resp: unknown) => Promise<void>;
  onUpdateParticipantData?: (data: Record<string, unknown>) => Promise<void>;
  syncStatus: SyncStatus;
  onBackToList?: () => void;
}

interface FormSectionGroup {
  id: string;
  title: string;
  description?: string;
  isExplicitSection: boolean;
  fields: Array<{
    field: FormField;
    globalNumber: number;
  }>;
}

export function FormEntryPanel({
  participant,
  workspace,
  formFields: directFormFields,
  checklistItems,
  onUpdateParticipantData,
  syncStatus,
  onBackToList,
}: FormEntryPanelProps) {
  const fields = directFormFields || checklistItems || [];

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile[]>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Sync participant data into local state when participant changes
  useEffect(() => {
    setFormData(participant.data || {});
  }, [participant.id, participant.data]);

  // Dynamic Name resolution based on workspace settings or fallback
  const resolvedNameKey =
    (workspace?.nameColumn && formData[workspace.nameColumn] !== undefined)
      ? workspace.nameColumn
      : Object.keys(formData).find((k) => /nama/i.test(k)) || "Nama";
  const participantName = String(
    formData[resolvedNameKey] || formData["Nama Lengkap"] || formData["Nama"] || "Peserta"
  );

  // Dynamic Unique Key resolution based on workspace settings or fallback
  const resolvedUniqueKeyLabel =
    workspace?.uniqueKeyColumn ||
    Object.keys(formData).find((k) => /nik|ktp|id|nomor|nim/i.test(k)) ||
    "ID Peserta";
  const uniqueKeyValue = formData[resolvedUniqueKeyLabel] !== undefined
    ? String(formData[resolvedUniqueKeyLabel])
    : String(formData["NIK"] || "-");

  // Identify main photo based on workspace settings, formFields, or auto-detect
  const photoField = fields.find(
    (f) => f.type === "image" && f.sourceType === "excel_column"
  );
  const mainPhotoKey =
    (workspace?.photoColumn && workspace.photoColumn !== "none" && formData[workspace.photoColumn] !== undefined)
      ? workspace.photoColumn
      : photoField?.excelColumn ||
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

  // Helper to check if a single field is filled
  const isFieldFilled = (f: FormField): boolean => {
    const key = f.excelColumn || f.id;
    const val =
      formData[key] !== undefined
        ? formData[key]
        : formData[f.id] ?? formData[f.label];
    if (val === undefined || val === null || val === "") return false;
    if (f.type === "checkbox") {
      return val === true || val === "true" || val === "Ya" || val === 1;
    }
    return true;
  };

  // Calculate statistics (excluding section headers)
  const activeItems = useMemo(() => fields.filter((f) => f.active), [fields]);
  const activeInputFields = useMemo(
    () => activeItems.filter((f) => f.type !== "section"),
    [activeItems]
  );
  const requiredFields = activeInputFields.filter((f) => f.required);
  const filledRequiredCount = requiredFields.filter(isFieldFilled).length;

  // Group items into ordered sections
  const { hasAnyExplicitSection, sectionGroups } = useMemo(() => {
    const hasExplicit = activeItems.some((f) => f.type === "section");
    const groups: FormSectionGroup[] = [];
    let currentGroup: FormSectionGroup | null = null;
    let fieldCounter = 0;

    for (const item of activeItems) {
      if (item.type === "section") {
        currentGroup = {
          id: item.id,
          title: item.label || "Bagian Form",
          description: item.description,
          isExplicitSection: true,
          fields: [],
        };
        groups.push(currentGroup);
      } else {
        fieldCounter += 1;
        if (!currentGroup) {
          currentGroup = {
            id: "default-top-section",
            title: hasExplicit ? "Informasi Umum" : "Formulir Data Peserta",
            description: hasExplicit
              ? "Field pembuka sebelum bagian pertama"
              : undefined,
            isExplicitSection: false,
            fields: [],
          };
          groups.push(currentGroup);
        }
        currentGroup.fields.push({
          field: item,
          globalNumber: fieldCounter,
        });
      }
    }

    return {
      hasAnyExplicitSection: hasExplicit,
      sectionGroups: groups,
    };
  }, [activeItems]);

  // Render a single field item
  const renderFieldCard = (field: FormField, displayIndex: number) => {
    const fieldKey = field.excelColumn || field.id;
    const currentValue =
      formData[fieldKey] !== undefined
        ? formData[fieldKey]
        : formData[field.id] !== undefined
          ? formData[field.id]
          : formData[field.label];

    const isEditable = field.editable ?? true;

    return (
      <div
        key={field.id}
        className="space-y-1.5 p-2 rounded-md hover:bg-muted/40 transition-colors"
      >
        {/* Field Header */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
              {displayIndex}
            </span>
            <Label
              htmlFor={`form-input-${field.id}`}
              className="text-xs font-semibold text-foreground cursor-pointer truncate"
              title={field.label}
            >
              {field.label}
              {field.required && (
                <span className="text-rose-500 ml-0.5 font-bold">*</span>
              )}
            </Label>
          </div>

          {!isEditable && (
            <span
              className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0"
              title="Field Read-Only"
            >
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {field.description && (
          <p className="text-[11px] text-muted-foreground pl-5.5 line-clamp-2">
            {field.description}
          </p>
        )}

        {/* Field Input Control */}
        <div className="pl-5.5 pt-0.5">
            {/* 1. Tipe Gambar / Foto */}
            {field.type === "image" &&
              (() => {
                const strVal = String(currentValue || "").trim();
                const isDrive = isGoogleDriveUrl(strVal);
                const displayImg = isDrive
                  ? getGoogleDriveThumbnailUrl(strVal, 400)
                  : strVal;

                return (
                  <div className="flex items-center gap-4 flex-wrap">
                    {strVal ? (
                      <div
                        className="relative group cursor-pointer"
                        onClick={() =>
                          handleOpenPreview(strVal, field.label, "image")
                        }
                      >
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
                              onClick={() =>
                                handleOpenPreview(strVal, field.label, "image")
                              }
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
                            <CheckCircle2 className="w-3 h-3" /> Link Google
                            Drive terdeteksi otomatis
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
                  onValueChange={(val) => handleFieldValueChange(fieldKey, val)}
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

            {/* 3b. Tipe Radio Buttons */}
            {field.type === "radio" && (
              <div className="space-y-1.5 py-1">
                {(field.options && field.options.length > 0
                  ? field.options
                  : ["Pilihan 1", "Pilihan 2"]
                ).map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`radio-${field.id}`}
                      disabled={!isEditable}
                      checked={String(currentValue || "") === opt}
                      onChange={() => handleFieldValueChange(fieldKey, opt)}
                      className="accent-primary"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
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
            {(field.type === "file" || field.evidenceEnabled) &&
              (() => {
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
                            <p className="text-xs font-medium truncate">
                              {strVal}
                            </p>
                            {(isDrive || isPdf) && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />{" "}
                                {isDrive ? "Link Google Drive" : "Dokumen PDF"}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleOpenPreview(strVal, field.label, "file")
                          }
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
                    {evidenceMap[fieldKey] &&
                      evidenceMap[fieldKey].length > 0 && (
                        <div className="space-y-1 pt-1">
                          {evidenceMap[fieldKey].map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-2 rounded border bg-muted/40 text-xs max-w-md"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <span className="truncate font-medium">
                                  {att.name}
                                </span>
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
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-background overflow-hidden">
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
              <span>{resolvedUniqueKeyLabel}: <span className="font-medium text-foreground">{uniqueKeyValue}</span></span>
              <span>•</span>
              <span>
                HP: {String(formData["Nomor HP"] || formData["HP"] || "-")}
              </span>
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
                className={`h-full transition-all duration-300 ${
                  filledRequiredCount === requiredFields.length
                    ? "bg-emerald-500"
                    : "bg-primary"
                }`}
                style={{
                  width: `${
                    requiredFields.length > 0
                      ? (filledRequiredCount / requiredFields.length) * 100
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
          <AutosaveIndicator status={syncStatus} />
        </div>
      </div>

      {/* Main Form Fields Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3">
        {activeInputFields.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium">
              Belum ada field form yang dikonfigurasi.
            </p>
            <p className="text-xs mt-1">
              Klik tombol &quot;Atur Form&quot; untuk menambahkan field.
            </p>
          </div>
        ) : !hasAnyExplicitSection ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl mx-auto">
            {activeInputFields.map((field, idx) =>
              renderFieldCard(field, idx + 1)
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto">
            {sectionGroups.map((group, groupIdx) => {
              if (!group.isExplicitSection && group.fields.length === 0) {
                return null;
              }

              const isCollapsed = Boolean(collapsedSections[group.id]);
              const groupFilledCount = group.fields.filter(({ field }) =>
                isFieldFilled(field)
              ).length;
              const groupTotalCount = group.fields.length;
              const isAllGroupFilled =
                groupTotalCount > 0 && groupFilledCount === groupTotalCount;

              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-border bg-card/50 shadow-xs overflow-hidden"
                >
                  {/* Collapsible Section Header */}
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(group.id)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left border-b border-border/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FolderKanban className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            Bagian {groupIdx + 1}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {group.title}
                          </h3>
                        </div>
                        {group.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={isAllGroupFilled ? "default" : "secondary"}
                        className={`text-[10px] font-semibold px-2 py-0.5 ${
                          isAllGroupFilled
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                            : ""
                        }`}
                      >
                        {groupFilledCount}/{groupTotalCount} Terisi
                      </Badge>
                      <div className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Section Body */}
                  {!isCollapsed && (
                    <div className="p-3 sm:p-4 bg-background/50">
                      {group.fields.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3 text-center">
                          Belum ada field di dalam grup section ini.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                          {group.fields.map(({ field, globalNumber }) =>
                            renderFieldCard(field, globalNumber)
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
