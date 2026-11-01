"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Participant,
  Workspace,
  FormField,
  SyncStatus,
  EvidenceFile,
  OfficerHistoryItem,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  saveEvidenceFile,
  getEvidenceBlobUrl,
  saveOfflineDraft,
  getOfflineDraft,
  deleteOfflineDraft,
} from "@/lib/storage/indexed-db";
import { MediaPreviewModal } from "@/components/shared/media-preview-modal";
import {
  isGoogleDriveUrl,
  getGoogleDriveThumbnailUrl,
  isPdfUrl,
} from "@/lib/domain/drive-detector";
import { api } from "@/lib/api/client";
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
  History,
  UserCheck,
  Clock,
  ChevronLeft,
  Loader2,
  Trash2,
  X,
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
  onPrevParticipant?: () => void;
  onNextParticipant?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  participantIndexInfo?: string;
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
  onPrevParticipant,
  onNextParticipant,
  hasPrev,
  hasNext,
  participantIndexInfo,
}: FormEntryPanelProps) {
  const fields = directFormFields || checklistItems || [];

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile[]>>({});
  // Tracks which fieldKeys are currently uploading a file
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
  // Tracks upload errors per fieldKey
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [invalidFieldIds, setInvalidFieldIds] = useState<Set<string>>(new Set());
  const fieldCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const handleOpenFileFieldPreview = async (fieldKey: string, fieldLabel: string) => {
    const attachments = evidenceMap[fieldKey] || [];
    const currentFile = attachments[0];
    if (currentFile?.localId) {
      const blobUrl = await getEvidenceBlobUrl(currentFile.localId);
      if (blobUrl) {
        handleOpenPreview(blobUrl, currentFile.name || fieldLabel, "file");
        return;
      }
    }
    if (currentFile?.url) {
      handleOpenPreview(currentFile.url, currentFile.name || fieldLabel, "file");
      return;
    }
    const val = String(formData[fieldKey] || "");
    if (val) {
      handleOpenPreview(val, fieldLabel, "file");
    }
  };

  const handleOpenImageFieldPreview = async (fieldKey: string, fieldLabel: string) => {
    const attachments = evidenceMap[fieldKey] || [];
    const currentFile = attachments[0];
    if (currentFile?.localId) {
      const blobUrl = await getEvidenceBlobUrl(currentFile.localId);
      if (blobUrl) {
        handleOpenPreview(blobUrl, currentFile.name || fieldLabel, "image");
        return;
      }
    }
    if (currentFile?.url) {
      handleOpenPreview(currentFile.url, currentFile.name || fieldLabel, "image");
      return;
    }
    const val = String(formData[fieldKey] || "");
    if (val) {
      handleOpenPreview(val, fieldLabel, "image");
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Sync participant data into local state when participant changes
  // Local draft (IndexedDB) wins over server data; refetches never overwrite unsaved edits.
  const formDataRef = useRef<Record<string, unknown>>({});
  const versionRef = useRef(0); // increments on every local edit
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const applyFormData = (data: Record<string, unknown>) => {
    formDataRef.current = data;
    setFormData(data);
  };

  // Load draft when participant changes
  useEffect(() => {
    let cancelled = false;
    setDraftLoading(true);
    setSaveError(false);
    setInvalidFieldIds(new Set());
    dirtyRef.current = false;
    setDirty(false);
    // Reset upload state
    setUploadingFields(new Set());
    setUploadErrors({});
    (async () => {
      let draft;
      try {
        draft = await getOfflineDraft(participant.id);
      } catch (err) {
        console.error("Failed to load offline draft", err);
      }
      if (cancelled) return;
      if (draft?.data) {
        dirtyRef.current = true;
        setDirty(true);
        applyFormData(draft.data);
      } else {
        applyFormData(participant.data || {});
      }
      setDraftLoading(false);

      // Restore evidenceMap from participant.data (keys prefixed with _evidence_)
      const data = draft?.data || participant.data || {};
      const restored: Record<string, EvidenceFile[]> = {};
      for (const key of Object.keys(data)) {
        if (key.startsWith("_evidence_")) {
          const fieldKey = key.replace("_evidence_", "");
          try {
            const parsed = JSON.parse(String(data[key]));
            if (Array.isArray(parsed)) {
              restored[fieldKey] = parsed as EvidenceFile[];
            }
          } catch {
            // ignore malformed entries
          }
        }
      }
      if (!cancelled) {
        setEvidenceMap(restored);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant.id]);

  // Accept server data only when there are no unsaved local edits
  useEffect(() => {
    if (draftLoading || dirtyRef.current) return;
    applyFormData(participant.data || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant.data, draftLoading]);

  // Helper to check if a single field is filled against a given data object
  const checkFieldFilled = (
    f: FormField,
    data: Record<string, unknown>
  ): boolean => {
    const key = f.excelColumn || f.id;
    const val =
      data[key] !== undefined ? data[key] : data[f.id] ?? data[f.label];
    if (val === undefined || val === null) return false;
    if (typeof val === "string" && val.trim() === "") return false;
    if (f.type === "checkbox") {
      return val === true || val === "true" || val === "Ya" || val === 1;
    }
    return true;
  };

  // Helper to check if a single field is filled in current state
  const isFieldFilled = (f: FormField): boolean => checkFieldFilled(f, formData);

  // Calculate statistics (excluding section headers)
  const activeItems = useMemo(() => fields.filter((f) => f.active), [fields]);
  const activeInputFields = useMemo(
    () => activeItems.filter((f) => f.type !== "section"),
    [activeItems]
  );
  const requiredFields = useMemo(
    () => activeInputFields.filter((f) => f.required && f.editable !== false),
    [activeInputFields]
  );
  const filledRequiredCount = requiredFields.filter(isFieldFilled).length;
  const hasMissingRequired = filledRequiredCount < requiredFields.length;

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

  const scrollToAndFocusField = (fieldId: string) => {
    const cardEl = fieldCardRefs.current[fieldId];
    if (!cardEl) return;

    cardEl.scrollIntoView({ behavior: "smooth", block: "center" });

    const focusable = cardEl.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      focusable.focus({ preventScroll: true });
    }
  };

  const handleSave = async () => {
    if (!onUpdateParticipantData || saving || draftLoading) return;

    const currentData = formDataRef.current;
    const missingRequired = requiredFields.filter(
      (f) => !checkFieldFilled(f, currentData)
    );

    if (missingRequired.length > 0) {
      setInvalidFieldIds(new Set(missingRequired.map((f) => f.id)));

      const firstMissing = missingRequired[0];
      const containingGroup = sectionGroups.find((g) =>
        g.fields.some((item) => item.field.id === firstMissing.id)
      );

      if (containingGroup && collapsedSections[containingGroup.id]) {
        setCollapsedSections((prev) => ({
          ...prev,
          [containingGroup.id]: false,
        }));
        setTimeout(() => {
          scrollToAndFocusField(firstMissing.id);
        }, 80);
      } else {
        scrollToAndFocusField(firstMissing.id);
      }
      return;
    }

    setInvalidFieldIds(new Set());
    if (!dirtyRef.current) return;

    const sentVersion = versionRef.current;
    const sentData = formDataRef.current;
    setSaving(true);
    setSaveError(false);
    try {
      await onUpdateParticipantData(sentData);
      // Only clear the draft if the user did not edit while the request was in flight
      if (versionRef.current === sentVersion) {
        await deleteOfflineDraft(participant.id);
        dirtyRef.current = false;
        setDirty(false);
      }
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

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

  // Extract officer update history from participant.data
  const officerHistory: OfficerHistoryItem[] = useMemo(() => {
    const raw = participant.data?.["_officerHistory"];
    if (Array.isArray(raw)) {
      return raw as OfficerHistoryItem[];
    }
    if (participant.data?.["_lastUpdatedBy"]) {
      return [
        {
          officerName: String(participant.data["_lastUpdatedBy"]),
          officerEmail: String(participant.data["_lastUpdatedEmail"] || ""),
          timestamp: String(
            participant.data["_lastUpdatedAt"] || participant.updatedAt
          ),
          action: "Memperbarui Data Peserta",
        },
      ];
    }
    return [];
  }, [participant.data, participant.updatedAt]);

  const lastOfficer =
    officerHistory.length > 0
      ? officerHistory[officerHistory.length - 1]
      : null;

  // Update a single form field value
  const handleFieldValueChange = async (key: string, value: unknown) => {
    // Always build from the latest ref, never from a stale render closure
    const nextData = { ...formDataRef.current, [key]: value };
    versionRef.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    applyFormData(nextData);

    // Clear validation error for any field that is now filled
    setInvalidFieldIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set(prev);
      for (const f of requiredFields) {
        if (next.has(f.id) && checkFieldFilled(f, nextData)) {
          next.delete(f.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    try {
      await saveOfflineDraft({
        workspaceId: participant.workspaceId,
        participantId: participant.id,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
        userEmail: "",
        version: versionRef.current,
        data: nextData,
        responses: {},
      });
    } catch (err) {
      console.error("Failed to save local draft", err);
    }
  };

  // Upload file attachment (or image) — tries server (S3) first, falls back to IndexedDB
  // Enforces 1 file only: replaces existing file for the fieldKey
  const handleUploadAttachment = async (fieldKey: string, file: File, isImageField: boolean = false) => {
    // Validate file type
    if (isImageField) {
      if (!file.type.startsWith("image/")) {
        setUploadErrors((prev) => ({
          ...prev,
          [fieldKey]: "Format file tidak valid. Harap pilih file gambar (JPG, PNG, WebP).",
        }));
        return;
      }
    } else {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setUploadErrors((prev) => ({
          ...prev,
          [fieldKey]: "Format file tidak valid. Harap pilih file PDF (.pdf).",
        }));
        return;
      }
    }

    // Mark field as uploading & clear previous error
    setUploadingFields((prev) => new Set(prev).add(fieldKey));
    setUploadErrors((prev) => { const next = { ...prev }; delete next[fieldKey]; return next; });

    try {
      let uploadedFile: EvidenceFile;

      try {
        // Attempt server upload (S3)
        const result = await api.uploadEvidence(file);
        uploadedFile = {
          id: result.id,
          name: result.name,
          size: result.size,
          type: result.type,
          url: result.url,
        };
      } catch (serverErr) {
        console.warn("Server upload failed, falling back to IndexedDB:", serverErr);
        // Fallback: save to IndexedDB locally
        const fileId = `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        await saveEvidenceFile(fileId, file, file.name);
        uploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          localId: fileId,
        };
      }

      // Enforce 1 file only: replace previous file
      const updated: EvidenceFile[] = [uploadedFile];
      const evidenceJson = JSON.stringify(updated);
      const displayValue = uploadedFile.url || uploadedFile.name;

      handleFieldValueChange(fieldKey, displayValue);
      handleFieldValueChange(`_evidence_${fieldKey}`, evidenceJson);

      setEvidenceMap((prev) => ({
        ...prev,
        [fieldKey]: updated,
      }));
    } catch (err) {
      console.error("Failed to upload file", err);
      setUploadErrors((prev) => ({
        ...prev,
        [fieldKey]: "Gagal mengunggah file. Silakan coba lagi.",
      }));
    } finally {
      setUploadingFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
    }
  };

  // Remove uploaded attachment or clear file value
  const handleRemoveAttachment = async (fieldKey: string) => {
    handleFieldValueChange(fieldKey, "");
    handleFieldValueChange(`_evidence_${fieldKey}`, "");
    setEvidenceMap((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
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
    const isInvalid = invalidFieldIds.has(field.id);

    return (
      <div
        key={field.id}
        ref={(el) => {
          fieldCardRefs.current[field.id] = el;
        }}
        className={`space-y-1.5 p-2.5 rounded-md border transition-all ${
          isInvalid
            ? "border-rose-500/80 bg-rose-500/5 ring-2 ring-rose-500/20"
            : "border-transparent hover:bg-muted/40"
        }`}
      >
        {/* Field Header */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                isInvalid
                  ? "bg-rose-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {displayIndex}
            </span>
            <FieldLabel
              htmlFor={`form-input-${field.id}`}
              className={`text-xs font-semibold cursor-pointer truncate ${
                isInvalid
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              }`}
              title={field.label}
            >
              {field.label}
              {field.required && (
                <span className="text-rose-500 ml-0.5 font-bold">*</span>
              )}
            </FieldLabel>
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
                const isUploading = uploadingFields.has(fieldKey);
                const uploadError = uploadErrors[fieldKey];
                const attachments = evidenceMap[fieldKey] || [];
                const currentFile = attachments[0];

                return (
                  <div className="pt-1 space-y-2 max-w-lg">
                    {/* Compact Card jika sudah ada gambar/file */}
                    {strVal ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-xs group">
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() =>
                            handleOpenImageFieldPreview(fieldKey, field.label)
                          }
                          title="Klik untuk melihat foto"
                        >
                          {/* Sisi Kiri: Thumbnail Kotak */}
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                            <img
                              src={displayImg}
                              alt={field.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Detail Info File */}
                          <div className="min-w-0 truncate">
                            <p className="font-medium truncate text-foreground">
                              {currentFile?.name || (isDrive ? "Foto Google Drive" : "Foto Terlampir")}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              {currentFile?.size ? (
                                <span>{(currentFile.size / 1024).toFixed(0)} KB ·</span>
                              ) : null}
                              {currentFile?.url ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  Tersimpan di server (S3)
                                </span>
                              ) : isDrive ? (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Link Google Drive
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Gambar</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Sisi Kanan: Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleOpenImageFieldPreview(fieldKey, field.label)
                            }
                            className="h-7 text-xs text-primary px-2"
                            title="Buka / Preview"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>

                          {isEditable && (
                            <>
                              <div>
                                <input
                                  id={`upload-img-change-${field.id}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleUploadAttachment(fieldKey, file, true);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isUploading}
                                  onClick={() => document.getElementById(`upload-img-change-${field.id}`)?.click()}
                                  className="flex items-center gap-1 h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Ganti Foto (Unggah ke S3)"
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                  ) : (
                                    <>
                                      <Camera className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Ganti</span>
                                    </>
                                  )}
                                </Button>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAttachment(fieldKey)}
                                className="h-7 text-xs text-destructive px-2 opacity-70 hover:opacity-100"
                                title="Hapus foto"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Belum ada foto */
                      isEditable && (
                        <div className="flex items-center gap-3">
                          <div>
                            <input
                              id={`upload-img-new-${field.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadAttachment(fieldKey, file, true);
                                  e.target.value = "";
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUploading}
                              onClick={() => document.getElementById(`upload-img-new-${field.id}`)?.click()}
                              className="flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-md border border-input bg-background hover:bg-muted text-xs font-medium w-fit shadow-xs cursor-pointer"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                  Mengunggah...
                                </>
                              ) : (
                                <>
                                  <Camera className="w-3.5 h-3.5 text-primary" />
                                  Pilih Foto (Gambar)
                                </>
                              )}
                            </Button>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Hanya file gambar (JPG, PNG, WebP)
                          </span>
                        </div>
                      )
                    )}

                    {/* Upload error message */}
                    {uploadError && (
                      <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {uploadError}
                      </p>
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
                  <Label
                    key={opt}
                    className="flex items-center gap-2 text-xs cursor-pointer font-normal"
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
                  </Label>
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
                const isUploading = uploadingFields.has(fieldKey);
                const uploadError = uploadErrors[fieldKey];
                const attachments = evidenceMap[fieldKey] || [];
                const currentFile = attachments[0];

                return (
                  <div className="pt-1 space-y-2 max-w-lg">
                    {/* Compact Card jika sudah ada dokumen/file */}
                    {strVal ? (
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-xs group">
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() =>
                            handleOpenFileFieldPreview(fieldKey, field.label)
                          }
                          title="Klik untuk melihat dokumen"
                        >
                          {/* Sisi Kiri: Thumbnail Kotak Ikon PDF */}
                          <div className="w-12 h-12 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 shrink-0 flex flex-col items-center justify-center group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5 mb-0.5" />
                            <span className="text-[9px] font-bold tracking-wider uppercase leading-none">
                              PDF
                            </span>
                          </div>

                          {/* Detail Info File */}
                          <div className="min-w-0 truncate">
                            <p className="font-medium truncate text-foreground">
                              {currentFile?.name || (isDrive ? "Dokumen Google Drive" : "Dokumen Terlampir")}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              {currentFile?.size ? (
                                <span>{(currentFile.size / 1024).toFixed(0)} KB ·</span>
                              ) : null}
                              {currentFile?.url ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  Tersimpan di server (S3)
                                </span>
                              ) : isDrive ? (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Link Google Drive
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Dokumen PDF</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Sisi Kanan: Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleOpenFileFieldPreview(fieldKey, field.label)
                            }
                            className="h-7 text-xs text-primary px-2"
                            title="Buka / Preview"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>

                          {isEditable && (
                            <>
                              <div>
                                <input
                                  id={`upload-doc-change-${field.id}`}
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleUploadAttachment(fieldKey, file, false);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isUploading}
                                  onClick={() => document.getElementById(`upload-doc-change-${field.id}`)?.click()}
                                  className="flex items-center gap-1 h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Ganti Dokumen (Unggah PDF ke S3)"
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                  ) : (
                                    <>
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Ganti</span>
                                    </>
                                  )}
                                </Button>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAttachment(fieldKey)}
                                className="h-7 text-xs text-destructive px-2 opacity-70 hover:opacity-100"
                                title="Hapus dokumen"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Belum ada dokumen terunggah */
                      isEditable && (
                        <div className="flex items-center gap-3">
                          <div>
                            <input
                              id={`upload-doc-new-${field.id}`}
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadAttachment(fieldKey, file, false);
                                  e.target.value = "";
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUploading}
                              onClick={() => document.getElementById(`upload-doc-new-${field.id}`)?.click()}
                              className="flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-md border border-input bg-background hover:bg-muted text-xs font-medium w-fit shadow-xs cursor-pointer"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                  Mengunggah...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-3.5 h-3.5 text-primary" />
                                  Unggah Dokumen PDF
                                </>
                              )}
                            </Button>
                          </div>
                          {field.evidenceRequired ? (
                            <span className="text-[11px] text-rose-500 font-semibold">
                              * Dokumen PDF wajib diunggah
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Hanya format PDF (.pdf)
                            </span>
                          )}
                        </div>
                      )
                    )}

                    {/* Upload error message */}
                    {uploadError && (
                      <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {uploadError}
                      </p>
                    )}
                  </div>
                );
              })()}

            {isInvalid && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Wajib diisi terlebih dahulu sebelum menyimpan</span>
              </p>
            )}
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
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
              <span>{resolvedUniqueKeyLabel}: <span className="font-medium text-foreground">{uniqueKeyValue}</span></span>
            </div>
            {lastOfficer ? (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
                <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  Terakhir diubah oleh{" "}
                  <span className="font-semibold text-foreground">
                    {lastOfficer.officerName}
                  </span>{" "}
                  pada{" "}
                  <span className="font-medium text-foreground">
                    {new Date(lastOfficer.timestamp).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Belum ada riwayat perubahan oleh petugas</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress & Sync Status */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center flex-wrap">
          {/* Drawer Riwayat Petugas (Awal - Akhir) */}
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                />
              }
            >
              <History className="w-3.5 h-3.5 text-primary" />
              <span>Riwayat Petugas</span>
              {officerHistory.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 ml-0.5"
                >
                  {officerHistory.length}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Riwayat Petugas Pemeriksa
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Urutan riwayat petugas yang melakukan perubahan pada{" "}
                  <span className="font-semibold text-foreground">
                    {participantName}
                  </span>{" "}
                  dari awal hingga terakhir.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4">
                {officerHistory.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <History className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs font-medium">
                      Belum ada riwayat perubahan
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Nama petugas akan tercatat otomatis saat tombol Simpan ditekan.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {officerHistory.map((item, idx) => {
                      const isFirst = idx === 0;
                      const isLatest = idx === officerHistory.length - 1;
                      return (
                        <div
                          key={`${item.timestamp}-${idx}`}
                          className="relative flex flex-col gap-1 rounded-lg border border-border bg-card p-3 shadow-2xs"
                        >
                          <span
                            className={`absolute -left-[17px] top-3.5 w-2.5 h-2.5 rounded-full ring-4 ring-background ${
                              isLatest
                                ? "bg-emerald-500"
                                : isFirst
                                  ? "bg-primary"
                                  : "bg-muted-foreground/50"
                            }`}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {item.officerName}
                            </span>
                            <div className="flex items-center gap-1">
                              {isFirst && officerHistory.length > 1 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 h-4"
                                >
                                  Awal (#1)
                                </Badge>
                              )}
                              {isLatest ? (
                                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-600 hover:bg-emerald-600 text-white">
                                  Terakhir (#{idx + 1})
                                </Badge>
                              ) : (
                                !isFirst && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0 h-4"
                                  >
                                    #{idx + 1}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                          {item.officerEmail && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.officerEmail}
                            </span>
                          )}
                          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 mt-1 pt-1 border-t border-border/60">
                            <Clock className="w-3 h-3 text-primary shrink-0" />
                            <span>
                              {new Date(item.timestamp).toLocaleString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
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
          <div className="flex flex-col items-end gap-1">
            <AutosaveIndicator
              status={
                saveError
                  ? "error"
                  : saving
                    ? "syncing"
                    : dirty
                      ? "pending"
                      : syncStatus
              }
              onRetry={saveError ? handleSave : undefined}
            />
            {dirty && !saving && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                Belum disimpan ke server
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={(!dirty && !hasMissingRequired) || saving || draftLoading}
            className="h-8 text-xs"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* Main Form Fields Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 pb-24 md:pb-5">
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

      {/* Mobile Floating Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
        <Button
          size="sm"
          variant="outline"
          onClick={onPrevParticipant}
          disabled={!hasPrev || !onPrevParticipant}
          className="h-9 px-2.5 text-xs gap-1 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Sebelumnya</span>
        </Button>

        <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1">
          {participantIndexInfo && (
            <span className="text-[10px] font-semibold text-muted-foreground truncate">
              {participantIndexInfo}
            </span>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <AutosaveIndicator
              status={
                draftLoading
                  ? "saved"
                  : saving
                    ? "saving"
                    : dirty
                      ? "pending"
                      : syncStatus
              }
              onRetry={saveError ? handleSave : undefined}
            />
          </div>
        </div>

        <Button
          size="sm"
          variant="default"
          onClick={onNextParticipant}
          disabled={!hasNext || !onNextParticipant}
          className="h-9 px-2.5 text-xs gap-1 shrink-0"
        >
          <span className="hidden xs:inline">Berikutnya</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
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
