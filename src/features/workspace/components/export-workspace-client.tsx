"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as XLSX from "xlsx";
import { Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import { ParticipantStatus, OfficerHistoryItem } from "@/types/domain";

export function ExportWorkspaceClient({ workspaceId }: { workspaceId: string }) {
  const [filterStatus, setFilterStatus] = useState<"all" | ParticipantStatus>("all");
  const [isExported, setIsExported] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["participants", workspaceId],
    queryFn: () => api.getParticipants(workspaceId),
  });

  const { data: formFields = [] } = useQuery({
    queryKey: ["workspaceForm", workspaceId],
    queryFn: () => api.getWorkspaceForm(workspaceId),
  });

  const filtered = participants.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  const resolveParticipantName = (data: Record<string, unknown>): string => {
    if (workspace?.nameColumn && data[workspace.nameColumn] !== undefined && String(data[workspace.nameColumn]).trim() !== "") {
      return String(data[workspace.nameColumn]);
    }
    if (data["Nama Lengkap"] !== undefined && String(data["Nama Lengkap"]).trim() !== "") {
      return String(data["Nama Lengkap"]);
    }
    if (data["Nama"] !== undefined && String(data["Nama"]).trim() !== "") {
      return String(data["Nama"]);
    }
    const matchedKey = Object.keys(data).find(
      (k) => !k.startsWith("_") && /nama|name/i.test(k) && String(data[k] ?? "").trim() !== ""
    );
    return matchedKey ? String(data[matchedKey]) : "-";
  };

  const resolveParticipantNikOrKey = (data: Record<string, unknown>): string => {
    if (workspace?.uniqueKeyColumn && data[workspace.uniqueKeyColumn] !== undefined && String(data[workspace.uniqueKeyColumn]).trim() !== "") {
      return String(data[workspace.uniqueKeyColumn]);
    }
    if (data["NIK"] !== undefined && String(data["NIK"]).trim() !== "") {
      return String(data["NIK"]);
    }
    const matchedKey = Object.keys(data).find(
      (k) => !k.startsWith("_") && /nik|ktp|nim|id|nomor/i.test(k) && String(data[k] ?? "").trim() !== ""
    );
    return matchedKey ? String(data[matchedKey]) : "-";
  };

  const resolveFieldValue = (data: Record<string, unknown>, field: (typeof formFields)[number]): unknown => {
    const candidates = [field.excelColumn, field.id, field.label].filter(Boolean) as string[];
    for (const candidate of candidates) {
      if (data[candidate] !== undefined && data[candidate] !== null && String(data[candidate]).trim() !== "") {
        return data[candidate];
      }
    }
    // Case-insensitive lookup against participant.data keys
    const dataKeys = Object.keys(data).filter((k) => !k.startsWith("_"));
    for (const candidate of candidates) {
      const lowerCandidate = candidate.trim().toLowerCase();
      const matchedKey = dataKeys.find((k) => k.trim().toLowerCase() === lowerCandidate);
      if (matchedKey && data[matchedKey] !== undefined && data[matchedKey] !== null && String(data[matchedKey]).trim() !== "") {
        return data[matchedKey];
      }
    }
    return undefined;
  };

  const handleExportExcel = () => {
    const exportRows = filtered.map((p, idx) => {
      const resolvedName = resolveParticipantName(p.data);
      const resolvedNik = resolveParticipantNikOrKey(p.data);

      const row: Record<string, unknown> = {
        No: idx + 1,
        Nama: resolvedName,
        NIK: resolvedNik,
        Status: p.status === "complete" ? "Lengkap" : p.status === "rejected" ? "Ditolak" : "Belum Lengkap",
      };

      formFields
        .filter((i) => i.active && i.type !== "section")
        .forEach((field) => {
          const val = resolveFieldValue(p.data, field);
          const formattedVal = val !== undefined && val !== null && String(val).trim() !== "" ? String(val) : "-";

          // Hindari menimpa kolom dasar Nama / NIK yang sudah terisi dengan "-" jika ada field form berlabel sama yang kosong
          if ((field.label === "NIK" || field.label === "Nama") && formattedVal === "-" && row[field.label] && row[field.label] !== "-") {
            return;
          }

          row[field.label] = formattedVal;
        });

      const historyRaw = p.data["_officerHistory"];
      const historyList: OfficerHistoryItem[] = Array.isArray(historyRaw)
        ? (historyRaw as OfficerHistoryItem[])
        : [];
      const lastUpdatedBy = p.data["_lastUpdatedBy"]
        ? String(p.data["_lastUpdatedBy"])
        : historyList.length > 0
          ? historyList[historyList.length - 1].officerName
          : "-";
      const lastUpdatedAtRaw = p.data["_lastUpdatedAt"]
        ? String(p.data["_lastUpdatedAt"])
        : historyList.length > 0
          ? historyList[historyList.length - 1].timestamp
          : "";
      const lastUpdatedAtFormatted = lastUpdatedAtRaw
        ? new Date(lastUpdatedAtRaw).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";

      const historyFormatted =
        historyList.length > 0
          ? historyList
              .map((h) => {
                const timeStr = new Date(h.timestamp).toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return `${h.officerName} (${timeStr})`;
              })
              .join(" → ")
          : lastUpdatedBy !== "-"
            ? `${lastUpdatedBy} (${lastUpdatedAtFormatted})`
            : "-";

      row["Terakhir Diubah Oleh"] = lastUpdatedBy;
      row["Waktu Update Terakhir"] = lastUpdatedAtFormatted;
      row["Riwayat Petugas (Awal - Akhir)"] = historyFormatted;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Registrasi");

    const filename = `Laporan_${workspace?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Registrasi"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);

    setIsExported(true);
    setTimeout(() => setIsExported(false), 4000);
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href={`/workspaces/${workspaceId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Export Laporan Registrasi ke Excel</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Workspace: <span className="font-semibold text-foreground">{workspace?.name}</span>
          </p>
        </div>
      </div>

      <Card className="border shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pilih Kriteria Data Peserta</CardTitle>
          <CardDescription className="text-xs">
            Header kolom file Excel akan otomatis mengikuti konfigurasi form workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Filter Kelayakan Peserta:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "all", label: "Semua Peserta", count: participants.length },
                {
                  id: "complete",
                  label: "Hanya Lengkap",
                  count: participants.filter((p) => p.status === "complete").length,
                },
                {
                  id: "incomplete",
                  label: "Belum Lengkap",
                  count: participants.filter((p) => p.status === "incomplete").length,
                },
                {
                  id: "rejected",
                  label: "Ditolak",
                  count: participants.filter((p) => p.status === "rejected").length,
                },
              ].map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
                  className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${filterStatus === tab.id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                    }`}
                >
                  <p className="text-xs font-semibold text-foreground">{tab.label}</p>
                  <p className="text-sm font-bold text-muted-foreground mt-0.5">{tab.count} Orang</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-foreground">
                Siap mengunduh {filtered.length} baris peserta
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Format: .xlsx • Menyertakan tanggal pembuatan otomatis
              </p>
            </div>

            <Button onClick={handleExportExcel} className="gap-2 text-xs">
              <Download className="w-3.5 h-3.5" />
              Download Spreadsheet Excel
            </Button>
          </div>

          {isExported && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              File Excel berhasil dibuat dan diunduh ke komputer Anda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

