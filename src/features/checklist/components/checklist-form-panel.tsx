"use client";

import { useState, useEffect } from "react";
import {
  Participant,
  ChecklistItem,
  ChecklistResponse,
  SyncStatus,
  EvidenceFile,
} from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { StatusBadge } from "@/components/shared/status-badge";
import { saveEvidenceFile, getEvidenceBlobUrl } from "@/lib/storage/indexed-db";
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  XCircle,
  FileText,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface ChecklistFormPanelProps {
  participant: Participant;
  checklistItems: ChecklistItem[];
  initialResponses: ChecklistResponse[];
  onSaveResponse: (resp: Omit<ChecklistResponse, "id">) => Promise<void>;
  syncStatus: SyncStatus;
}

export function ChecklistFormPanel({
  participant,
  checklistItems,
  initialResponses,
  onSaveResponse,
  syncStatus,
}: ChecklistFormPanelProps) {
  // Local state for responses map: itemId -> ChecklistResponse
  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>({});
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Sync initial responses into local state
  useEffect(() => {
    const map: Record<string, ChecklistResponse> = {};
    initialResponses.forEach((r) => {
      map[r.checklistItemId] = r;
    });
    setResponses(map);
  }, [initialResponses, participant.id]);

  const participantName = String(
    participant.data["Nama Lengkap"] || participant.data["Nama"] || "Peserta"
  );

  // Handle value change
  const handleChangeValue = async (item: ChecklistItem, value: unknown) => {
    const isComplete = Boolean(value);
    const existing = responses[item.id];

    const updated: Omit<ChecklistResponse, "id"> = {
      participantId: participant.id,
      checklistItemId: item.id,
      value,
      status: isComplete ? "complete" : "incomplete",
      notes: existing?.notes || "",
      evidence: existing?.evidence || [],
    };

    setResponses((prev) => ({
      ...prev,
      [item.id]: { ...updated, id: existing?.id || "" },
    }));

    await onSaveResponse(updated);
  };

  // Handle file evidence upload to IndexedDB
  const handleUploadEvidence = async (item: ChecklistItem, file: File) => {
    try {
      const evidenceId = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await saveEvidenceFile(evidenceId, file, file.name);

      const existing = responses[item.id];
      const evidenceList: EvidenceFile[] = existing?.evidence ? [...existing.evidence] : [];

      evidenceList.push({
        id: evidenceId,
        name: file.name,
        size: file.size,
        type: file.type,
        localId: evidenceId,
      });

      const updated: Omit<ChecklistResponse, "id"> = {
        participantId: participant.id,
        checklistItemId: item.id,
        value: existing?.value ?? true,
        status: existing?.status || "complete",
        notes: existing?.notes || "",
        evidence: evidenceList,
      };

      setResponses((prev) => ({
        ...prev,
        [item.id]: { ...updated, id: existing?.id || "" },
      }));

      await onSaveResponse(updated);
    } catch (err) {
      console.error("Failed to upload evidence to IndexedDB", err);
    }
  };

  // Handle reject item (Requires reason according to PRD 5.6 & 19)
  const handleConfirmReject = async (item: ChecklistItem) => {
    if (!rejectReason.trim()) return;

    const existing = responses[item.id];
    const updated: Omit<ChecklistResponse, "id"> = {
      participantId: participant.id,
      checklistItemId: item.id,
      value: existing?.value ?? false,
      status: "rejected",
      notes: rejectReason,
      evidence: existing?.evidence || [],
    };

    setResponses((prev) => ({
      ...prev,
      [item.id]: { ...updated, id: existing?.id || "" },
    }));

    setRejectingItemId(null);
    setRejectReason("");

    await onSaveResponse(updated);
  };

  // Re-open item from rejection
  const handleResetRejection = async (item: ChecklistItem) => {
    const existing = responses[item.id];
    const updated: Omit<ChecklistResponse, "id"> = {
      participantId: participant.id,
      checklistItemId: item.id,
      value: existing?.value ?? false,
      status: existing?.value ? "complete" : "incomplete",
      notes: "",
      evidence: existing?.evidence || [],
    };

    setResponses((prev) => ({
      ...prev,
      [item.id]: { ...updated, id: existing?.id || "" },
    }));

    await onSaveResponse(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Participant Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 bg-card/60 p-4 rounded-xl border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{participantName}</h2>
            <StatusBadge status={participant.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
            {Object.entries(participant.data).map(([key, val]) => (
              <div key={key}>
                <span className="font-semibold text-foreground/80">{key}:</span> {String(val || "-")}
              </div>
            ))}
          </div>
        </div>

        {/* Autosave status indicator */}
        <div className="self-start sm:self-auto flex flex-col items-end gap-1">
          <AutosaveIndicator status={syncStatus} />
          <span className="text-[10px] text-muted-foreground">Autosave otomatis aktif</span>
        </div>
      </div>

      {/* Checklist Form Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Daftar Berkas & Persyaratan Registrasi ({checklistItems.length} Item)
          </h3>
          <span className="text-xs text-muted-foreground">
            * = Item Wajib Kelengkapan
          </span>
        </div>

        <div className="space-y-3">
          {checklistItems
            .filter((item) => item.active)
            .sort((a, b) => a.order - b.order)
            .map((item) => {
              const res = responses[item.id];
              const isRejected = res?.status === "rejected";
              const isComplete = res?.status === "complete";

              return (
                <Card
                  key={item.id}
                  className={`border transition-all shadow-xs ${
                    isRejected
                      ? "border-rose-400/80 bg-rose-50/30 dark:bg-rose-950/20"
                      : isComplete
                      ? "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10"
                      : "border-border"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                            {item.label}
                            {item.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>

                          {isRejected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              DITOLAK
                            </span>
                          )}
                          {isComplete && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              LENGKAP
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>

                      {/* Reject / Reset Button */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isRejected ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetRejection(item)}
                            className="text-xs h-7 text-muted-foreground"
                          >
                            Batalkan Penolakan
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRejectingItemId(item.id)}
                            className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-100/50"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Tolak Item
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Dialog / Inline form to reject item */}
                    {rejectingItemId === item.id && (
                      <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/40 space-y-2">
                        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                          Alasan Penolakan Berkas (Wajib):
                        </p>
                        <Textarea
                          placeholder="Tuliskan alasan penolakan, contoh: Foto KTP buram, materai belum ada..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          className="text-xs bg-background"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setRejectingItemId(null);
                              setRejectReason("");
                            }}
                            className="text-xs h-7"
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleConfirmReject(item)}
                            disabled={!rejectReason.trim()}
                            className="text-xs h-7"
                          >
                            Konfirmasi Tolak
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Notes if rejected */}
                    {isRejected && res.notes && (
                      <div className="p-2.5 rounded bg-rose-100/60 dark:bg-rose-900/30 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Alasan Penolakan: </span>
                          <span>{res.notes}</span>
                        </div>
                      </div>
                    )}

                    {/* Field input rendering according to Field Type */}
                    <div className="pt-1">
                      {item.type === "checkbox" && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`chk-${item.id}`}
                            checked={Boolean(res?.value)}
                            onCheckedChange={(checked) => handleChangeValue(item, checked)}
                          />
                          <Label
                            htmlFor={`chk-${item.id}`}
                            className="text-xs font-medium cursor-pointer"
                          >
                            Dokumen / Syarat Telah Terpenuhi & Sah
                          </Label>
                        </div>
                      )}

                      {item.type === "text" && (
                        <Input
                          placeholder="Masukkan teks..."
                          value={String(res?.value || "")}
                          onChange={(e) => handleChangeValue(item, e.target.value)}
                          className="text-xs h-8 max-w-md"
                        />
                      )}

                      {item.type === "textarea" && (
                        <Textarea
                          placeholder="Masukkan keterangan detail..."
                          value={String(res?.value || "")}
                          onChange={(e) => handleChangeValue(item, e.target.value)}
                          rows={2}
                          className="text-xs max-w-md"
                        />
                      )}

                      {item.type === "phone" && (
                        <Input
                          type="tel"
                          placeholder="08123456789"
                          value={String(res?.value || "")}
                          onChange={(e) => handleChangeValue(item, e.target.value)}
                          className="text-xs h-8 max-w-md"
                        />
                      )}

                      {item.type === "select" && (
                        <select
                          value={String(res?.value || "")}
                          onChange={(e) => handleChangeValue(item, e.target.value)}
                          className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs max-w-md shadow-xs"
                        >
                          <option value="">-- Pilih Opsi --</option>
                          {item.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Evidence Upload Section (IndexedDB backed) */}
                    {item.evidenceEnabled && (
                      <div className="border-t border-border/70 pt-2.5 mt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                            <UploadCloud className="w-3.5 h-3.5" />
                            Bukti File / Foto {item.evidenceRequired && <span className="text-rose-500">*</span>}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Disimpan aman di IndexedDB Lokal
                          </span>
                        </div>

                        {/* File upload input */}
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadEvidence(item, file);
                              }}
                            />
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-input bg-muted/30 hover:bg-muted text-xs font-medium cursor-pointer">
                              <FileCheck className="w-3.5 h-3.5 text-primary" />
                              Pilih Berkas Foto/Dokumen
                            </div>
                          </label>
                        </div>

                        {/* Uploaded Evidence list */}
                        {res?.evidence && res.evidence.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {res.evidence.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border text-xs max-w-md"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate font-medium">{ev.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({Math.round(ev.size / 1024)} KB)
                                  </span>
                                </div>
                                {ev.localId && (
                                  <button
                                    onClick={async () => {
                                      const url = await getEvidenceBlobUrl(ev.localId!);
                                      if (url) window.open(url, "_blank");
                                    }}
                                    className="text-primary hover:underline text-[11px] flex items-center gap-1 ml-2"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Lihat
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}

