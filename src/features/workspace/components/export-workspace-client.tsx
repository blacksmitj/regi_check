"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as XLSX from "xlsx";
import { Download, ArrowLeft, CheckCircle2, FileSpreadsheet, LayoutList } from "lucide-react";
import { ParticipantStatus, OfficerHistoryItem } from "@/types/domain";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";

type ExportColumnMode = "import_order" | "form_order";

export function ExportWorkspaceClient({ workspaceId }: { workspaceId: string }) {
  const [filterStatus, setFilterStatus] = useState<"all" | ParticipantStatus>("all");
  const [columnMode, setColumnMode] = useState<ExportColumnMode>("import_order");
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

  // Kumpulan key kolom original ketika di-import (diprioritaskan dari workspace.importHeaders asli)
  const importOriginalKeys = useMemo(() => {
    // 1. Jika workspace sudah menyimpan urutan importHeaders asli, prioritaskan itu
    if (workspace?.importHeaders && Array.isArray(workspace.importHeaders) && workspace.importHeaders.length > 0) {
      const keysSet = new Set<string>(workspace.importHeaders);
      // Tambahkan key lain jika ada peserta yang memiliki key tambahan di luar header awal
      participants.forEach((p) => {
        if (p.data) {
          Object.keys(p.data).forEach((key) => {
            if (!key.startsWith("_")) {
              keysSet.add(key);
            }
          });
        }
      });
      return Array.from(keysSet);
    }

    // 2. Fallback untuk data lama yang belum memiliki importHeaders di workspace
    const keysSet = new Set<string>();
    participants.forEach((p) => {
      if (p.data) {
        Object.keys(p.data).forEach((key) => {
          if (!key.startsWith("_")) {
            keysSet.add(key);
          }
        });
      }
    });
    return Array.from(keysSet);
  }, [workspace, participants]);

  // Urutan form fields terurut berdasarkan order & hanya yang aktif non-section
  const activeSortedFormFields = useMemo(() => {
    return [...formFields]
      .filter((f) => f.active && f.type !== "section")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [formFields]);

  // Helper untuk mendapatkan label judul kolom yang user-friendly
  const resolveColumnTitle = (rawKey: string): string => {
    // Cari field form yang cocok baik dari id, excelColumn, atau label
    const matchedField = formFields.find(
      (f) =>
        f.id === rawKey ||
        f.excelColumn === rawKey ||
        f.label.trim().toLowerCase() === rawKey.trim().toLowerCase()
    );
    if (matchedField && matchedField.label) {
      return matchedField.label;
    }
    return rawKey;
  };

  // Helper untuk format nilai cell agar aman dan tidak melebihi batas 32.767 karakter Excel
  const formatCellValue = (val: unknown): string => {
    if (val === undefined || val === null) return "-";
    const str = String(val).trim();
    if (str === "") return "-";
    // Jika berupa base64 data URI (misal foto/dokumen/tanda tangan base64)
    if (str.startsWith("data:image/") || str.startsWith("data:application/")) {
      return "[File/Gambar]";
    }
    // Batas karakter sel Excel adalah 32.767 karakter
    if (str.length > 32767) {
      return str.slice(0, 32764) + "...";
    }
    return str;
  };

  const handleExportExcel = () => {
    const exportRows = filtered.map((p) => {
      const row: Record<string, unknown> = {};

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

      const statusText =
        p.status === "complete"
          ? "Lengkap"
          : p.status === "rejected"
            ? "Ditolak"
            : "Belum Lengkap";

      if (columnMode === "import_order") {
        // Mode 1: Sesuai urutan kolom saat import asli + field form tambahan yang belum ada di raw data
        const addedHeaders = new Set<string>();

        // 1. Kolom dari data import asli (diberi nama UI label jika merupakan custom field)
        importOriginalKeys.forEach((key) => {
          const columnHeader = resolveColumnTitle(key);
          const val = p.data[key];
          row[columnHeader] = formatCellValue(val);
          addedHeaders.add(columnHeader);
        });

        // 2. Kolom tambahan dari form workspace yang belum ada di tabel raw import
        activeSortedFormFields.forEach((field) => {
          if (!addedHeaders.has(field.label)) {
            const val = resolveFieldValue(p.data, field);
            row[field.label] = formatCellValue(val);
            addedHeaders.add(field.label);
          }
        });

        // Kolom status verifikasi
        row["Status"] = statusText;

        // Kolom validasi info petugas di paling belakang
        row["Terakhir Diubah Oleh"] = formatCellValue(lastUpdatedBy);
        row["Waktu Update Terakhir"] = formatCellValue(lastUpdatedAtFormatted);
        row["Riwayat Petugas (Awal - Akhir)"] = formatCellValue(historyFormatted);
      } else {
        // Mode 2: Murni sesuai urutan atur form workspace
        activeSortedFormFields.forEach((field) => {
          const val = resolveFieldValue(p.data, field);
          row[field.label] = formatCellValue(val);
        });

        // Kolom status registrasi
        row["Status"] = statusText;

        // Kolom validasi info petugas di paling belakang
        row["Terakhir Diubah Oleh"] = formatCellValue(lastUpdatedBy);
        row["Waktu Update Terakhir"] = formatCellValue(lastUpdatedAtFormatted);
        row["Riwayat Petugas (Awal - Akhir)"] = formatCellValue(historyFormatted);
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Registrasi");

    const modeSuffix = columnMode === "import_order" ? "Format_Import" : "Format_Form";
    const filename = `Laporan_${workspace?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Registrasi"}_${modeSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
          <CardTitle className="text-base font-semibold">Pengaturan Export Excel</CardTitle>
          <CardDescription className="text-xs">
            Sesuaikan filter status data dan susunan urutan kolom file Excel yang akan diunduh.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <FieldGroup className="gap-6">
            {/* Pilihan Susunan Urutan Kolom */}
            <Field className="gap-2.5">
              <FieldLabel className="text-xs font-semibold text-foreground">Susunan Urutan Kolom:</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div
                  onClick={() => setColumnMode("import_order")}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    columnMode === "import_order"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <FileSpreadsheet className={`w-4 h-4 mt-0.5 shrink-0 ${columnMode === "import_order" ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Sesuai Urutan Import Asli</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Menampilkan semua kolom tabel Excel sesuai urutan ketika di-import, ditambah status & informasi validasi petugas di akhir.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                    {importOriginalKeys.length} kolom import terdeteksi + validasi info
                  </div>
                </div>

                <div
                  onClick={() => setColumnMode("form_order")}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    columnMode === "form_order"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <LayoutList className={`w-4 h-4 mt-0.5 shrink-0 ${columnMode === "form_order" ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Sesuai Urutan Atur Form Workspace</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Murni mengikuti urutan susunan field form yang diatur di Form Settings, ditambah status & informasi validasi petugas di akhir.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                    {activeSortedFormFields.length} field form aktif + validasi info
                  </div>
                </div>
              </div>
            </Field>

            <Field className="gap-2">
              <FieldLabel className="text-xs font-semibold text-foreground">Filter Kelayakan Peserta:</FieldLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
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
            </Field>
          </FieldGroup>

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

