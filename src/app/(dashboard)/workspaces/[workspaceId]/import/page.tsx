"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";

export default function ImportParticipantsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.workspaceId;
  const router = useRouter();

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  // Step 1: Upload, Step 2: Sheet & Mapping, Step 3: Preview & Confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<"add" | "update">("add");
  const [importResult, setImportResult] = useState<{ total: number; valid: number } | null>(null);

  // File parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        loadSheetData(wb, wb.SheetNames[0]);
      }
      setStep(2);
    };
    reader.readAsBinaryString(file);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    setSelectedSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    setRawRows(data);

    if (data.length > 0) {
      const cols = Object.keys(data[0]);
      setHeaders(cols);

      // Auto-detect mappings (§6.3)
      const mapping: Record<string, string> = {};
      cols.forEach((col) => {
        const lower = col.toLowerCase();
        if (lower.includes("nama")) mapping[col] = "Nama Lengkap";
        else if (lower.includes("nik") || lower.includes("ktp")) mapping[col] = "NIK";
        else if (lower.includes("email")) mapping[col] = "Email";
        else if (lower.includes("hp") || lower.includes("telepon") || lower.includes("wa"))
          mapping[col] = "Nomor HP";
        else if (lower.includes("kota") || lower.includes("asal")) mapping[col] = "Asal Kota";
        else mapping[col] = col; // default keep name
      });
      setColumnMapping(mapping);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const formatted = rawRows.map((row) => {
        const data: Record<string, unknown> = {};
        Object.entries(row).forEach(([colKey, val]) => {
          const targetField = columnMapping[colKey] || colKey;
          data[targetField] = val;
        });
        return { data };
      });

      return api.importParticipants(workspaceId, formatted);
    },
    onSuccess: (res) => {
      setImportResult({ total: rawRows.length, valid: res.importedCount });
      setStep(3);
    },
  });

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href={`/workspaces/${workspaceId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dynamic Excel Import Wizard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Workspace: <span className="font-semibold text-foreground">{workspace?.name}</span>
          </p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className={`px-2.5 py-1 rounded-md ${step === 1 ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
          1. Upload Berkas Excel
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={`px-2.5 py-1 rounded-md ${step === 2 ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
          2. Mapping Kolom & Tipe
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={`px-2.5 py-1 rounded-md ${step === 3 ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
          3. Selesai & Hasil
        </span>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <Card className="border shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pilih Berkas Spreadsheet</CardTitle>
            <CardDescription className="text-xs">
              Mendukung file .xlsx dan .xls dengan format kolom dinamis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center bg-card/40">
              <FileSpreadsheet className="w-12 h-12 text-emerald-600 mb-3" />
              <p className="text-sm font-semibold mb-1">Pilih File Excel Peserta</p>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Header kolom tidak harus baku. Anda dapat memetakan kolom di langkah selanjutnya.
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button size="sm" className="gap-2 pointer-events-none">
                  <Upload className="w-4 h-4" />
                  Unggah Berkas Excel
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Sheet Selector & Column Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">Pemetaan Kolom (Column Mapping)</CardTitle>
                  <CardDescription className="text-xs">
                    Cocokkan kolom Excel dengan atribut data peserta kegiatan.
                  </CardDescription>
                </div>

                {/* Sheet selector */}
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pilih Sheet:</span>
                    <select
                      value={selectedSheet}
                      onChange={(e) => {
                        if (workbook) loadSheetData(workbook, e.target.value);
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
                    >
                      {sheetNames.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {headers.map((col) => (
                  <div key={col} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate max-w-[150px]">{col}</span>
                      <Badge variant="outline" className="text-[9px]">
                        Excel
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Contoh: {String(rawRows[0]?.[col] || "-")}
                    </p>
                    <select
                      value={columnMapping[col] || col}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [col]: e.target.value })
                      }
                      className="w-full h-7 rounded border border-input bg-background px-2 text-xs shadow-xs"
                    >
                      <option value="Nama Lengkap">Nama Lengkap</option>
                      <option value="NIK">NIK (Identitas Utama)</option>
                      <option value="Email">Email</option>
                      <option value="Nomor HP">Nomor HP</option>
                      <option value="Asal Kota">Asal Kota / Wilayah</option>
                      <option value={col}>Tetap ({col})</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Import Mode: Add or Update (§6.5) */}
              <div className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">Mode Import:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={importMode === "add"}
                      onChange={() => setImportMode("add")}
                    />
                    <span>Mode 1 — Tambah Peserta Baru</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={importMode === "update"}
                      onChange={() => setImportMode("update")}
                    />
                    <span>Mode 2 — Update Data Peserta via NIK</span>
                  </label>
                </div>

                <span className="text-muted-foreground font-medium">
                  {rawRows.length} baris data siap diimpor
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t border-border pt-4">
              <Button size="sm" variant="outline" onClick={() => setStep(1)} className="text-xs">
                Ganti Berkas
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
                className="text-xs gap-1.5"
              >
                {importMutation.isPending ? "Memproses..." : "Konfirmasi & Mulai Import"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* STEP 3: Result (§6.6) */}
      {step === 3 && importResult && (
        <Card className="border shadow-xs text-center py-6">
          <CardContent className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Import Peserta Berhasil!</CardTitle>
              <CardDescription className="text-xs max-w-sm mx-auto mt-1">
                Data peserta telah berhasil dimasukkan ke dalam workspace kegiatan.
              </CardDescription>
            </div>

            <div className="inline-grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border text-left mx-auto">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Baris Excel:</p>
                <p className="text-base font-bold">{importResult.total}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Berhasil Dimasukkan:</p>
                <p className="text-base font-bold text-emerald-600">{importResult.valid}</p>
              </div>
            </div>

            <div className="pt-2">
              <Link href={`/workspaces/${workspaceId}`}>
                <Button size="sm" className="gap-2 text-xs">
                  <FileCheck className="w-4 h-4" />
                  Buka Checklist Workspace
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

