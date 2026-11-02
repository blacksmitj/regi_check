"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileType,
  Settings2,
  AlertTriangle,
  Info,
  Users,
  Search,
  Check,
  RefreshCw,
  KeyRound,
  ShieldAlert,
  TableProperties,
  User,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Participant } from "@/types/domain";

interface AnalyzedRow {
  rowIdx: number;
  data: Record<string, unknown>;
  keyValue: string;
  isDuplicate: boolean;
  duplicateType?: "workspace" | "internal" | "both";
  existingId?: string;
  existingParticipant?: Participant;
  action: "create" | "overwrite" | "skip";
}

export function ImportParticipantsClient({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  const { data: existingParticipants = [] } = useQuery({
    queryKey: ["participants", workspaceId],
    queryFn: () => api.getParticipants(workspaceId),
  });

  // Flow Steps: 1 = Import Berkas & Kunci Unik, 2 = Cek Duplikasi, 3 = Finish
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // File parsing states
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedKeyField, setSelectedKeyField] = useState<string>("");
  const [selectedNameField, setSelectedNameField] = useState<string>("");
  const [selectedPhotoField, setSelectedPhotoField] = useState<string>("none");

  // File format & CSV delimiter
  const [fileName, setFileName] = useState<string>("");
  const [isCsv, setIsCsv] = useState<boolean>(false);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<string>(",");

  // Import source tab: "file" or "google_sheet"
  const [importSourceMode, setImportSourceMode] = useState<"file" | "google_sheet">("file");
  const [googleSheetInputUrl, setGoogleSheetInputUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [sheetFetchError, setSheetFetchError] = useState<string | null>(null);

  // Step 2: Duplication analysis state
  const [analyzedRows, setAnalyzedRows] = useState<AnalyzedRow[]>([]);
  const [filteredOutSummary, setFilteredOutSummary] = useState<{
    internalDuplicatesDiscarded: number;
    emptyKeyDiscarded: number;
  }>({ internalDuplicatesDiscarded: 0, emptyKeyDiscarded: 0 });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTab, setFilterTab] = useState<"all" | "duplicates" | "new">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Step 3: Result state
  const [importResult, setImportResult] = useState<{
    total: number;
    importedCount: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  } | null>(null);

  // Streaming Import Progress State
  const [streamProgress, setStreamProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    processed: number;
    total: number;
    percentage: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Detect CSV delimiter
  const detectDelimiter = (text: string): string => {
    const firstLine = text.split(/\r\n|\n/)[0] || "";
    const counts = {
      ",": (firstLine.match(/,/g) || []).length,
      ";": (firstLine.match(/;/g) || []).length,
      "\t": (firstLine.match(/\t/g) || []).length,
    };
    if (counts[";"] > counts[","] && counts[";"] > counts["\t"]) return ";";
    if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
    return ",";
  };

  const parseCsvText = (text: string, delim: string) => {
    try {
      const wb = XLSX.read(text, { type: "string", FS: delim });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        loadSheetData(wb, wb.SheetNames[0]);
      }
    } catch (err) {
      console.error("Gagal membaca file CSV:", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isFileCsv = file.name.toLowerCase().endsWith(".csv");
    setIsCsv(isFileCsv);

    if (isFileCsv) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = (evt.target?.result as string) || "";
        setCsvContent(text);
        const detectedDelim = detectDelimiter(text);
        setDelimiter(detectedDelim);
        parseCsvText(text, detectedDelim);
      };
      reader.readAsText(file, "UTF-8");
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          loadSheetData(wb, wb.SheetNames[0]);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleDelimiterChange = (newDelim: string) => {
    setDelimiter(newDelim);
    if (csvContent) {
      parseCsvText(csvContent, newDelim);
    }
  };

  const downloadSampleCsv = () => {
    const csvData = [
      "Nama Lengkap,NIK,Email,Nomor HP,Asal Kota",
      "Budi Santoso,3201234567890001,budi@example.com,08123456789,Jakarta",
      "Siti Rahma,3201234567890002,siti@example.com,08129876543,Bandung",
      "Ahmad Fauzi,3201234567890003,ahmad@example.com,08131122334,Surabaya",
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_peserta.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSampleExcel = () => {
    const wsData = [
      ["Nama Lengkap", "NIK", "Email", "Nomor HP", "Asal Kota"],
      ["Budi Santoso", "3201234567890001", "budi@example.com", "08123456789", "Jakarta"],
      ["Siti Rahma", "3201234567890002", "siti@example.com", "08129876543", "Bandung"],
      ["Ahmad Fauzi", "3201234567890003", "ahmad@example.com", "08131122334", "Surabaya"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Peserta");
    XLSX.writeFile(wb, "template_peserta.xlsx");
  };

  const handleFetchGoogleSheet = async () => {
    if (!googleSheetInputUrl.trim()) {
      setSheetFetchError("Masukkan URL Google Spreadsheet terlebih dahulu.");
      return;
    }

    setIsFetchingSheet(true);
    setSheetFetchError(null);

    try {
      // Direct client fetch to parse preview endpoint or Google directly
      const res = await api.parseGoogleSheetPreview(googleSheetInputUrl);
      if (!res.headers || res.headers.length === 0) {
        throw new Error("Dokumen Google Spreadsheet tidak memiliki kolom header atau data kosong.");
      }

      setFileName(`Google Spreadsheet (${res.spreadsheetId.slice(0, 8)}...)`);
      setIsCsv(true);

      // Fetch the full CSV text from exportUrl
      const csvRes = await fetch(res.exportUrl);
      if (!csvRes.ok) {
        throw new Error("Gagal mengunduh isi data spreadsheet dari Google.");
      }
      const text = await csvRes.text();
      setCsvContent(text);
      setDelimiter(",");
      parseCsvText(text, ",");
    } catch (err: any) {
      console.error("Gagal menarik data Google Sheets:", err);
      setSheetFetchError(
        err?.message ||
          "Gagal memuat Google Spreadsheet. Pastikan akses diatur ke 'Anyone with the link can view'."
      );
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    setSelectedSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    setRawRows(data);

    if (data.length > 0) {
      const cols = Object.keys(data[0]);
      setHeaders(cols);

      // Smart auto-detect key field (NIK, ID, etc.)
      let detectedKey = workspace?.uniqueKeyColumn && cols.includes(workspace.uniqueKeyColumn)
        ? workspace.uniqueKeyColumn
        : cols[0];
      const foundKey = cols.find((c) => {
        const l = c.toLowerCase();
        return l.includes("nik") || l.includes("ktp") || l.includes("id") || l.includes("nomor") || l.includes("nim");
      });
      if (foundKey) {
        detectedKey = foundKey;
      } else {
        const emailKey = cols.find((c) => c.toLowerCase().includes("email"));
        if (emailKey) detectedKey = emailKey;
      }
      setSelectedKeyField(detectedKey);

      // Smart auto-detect name field
      let detectedName = workspace?.nameColumn && cols.includes(workspace.nameColumn)
        ? workspace.nameColumn
        : "";
      if (!detectedName) {
        const foundName = cols.find((c) => {
          const l = c.toLowerCase();
          return l.includes("nama") || l.includes("name");
        });
        detectedName = foundName || cols[0];
      }
      setSelectedNameField(detectedName);

      // Smart auto-detect photo field
      let detectedPhoto = workspace?.photoColumn && (cols.includes(workspace.photoColumn) || workspace.photoColumn === "none")
        ? workspace.photoColumn
        : "none";
      if (detectedPhoto === "none") {
        const foundPhoto = cols.find((c) => {
          const l = c.toLowerCase();
          return l.includes("foto") || l.includes("photo") || l.includes("avatar") || l.includes("gambar");
        });
        if (foundPhoto) {
          detectedPhoto = foundPhoto;
        }
      }
      setSelectedPhotoField(detectedPhoto);
    }
  };

  // Compute duplicate analysis when advancing to Step 2
  const runDuplicationCheck = () => {
    // 1. Cari baris terakhir untuk setiap kunci unik (ambil baris kemunculan terakhir jika ada duplikat dalam berkas)
    // Sekaligus catat baris tanpa kunci unik.
    const lastOccurrenceByKey = new Map<string, number>();
    let emptyKeyDiscarded = 0;
    let internalDuplicatesDiscarded = 0;

    rawRows.forEach((row, rowIdx) => {
      const rawKeyValue = row[selectedKeyField] ?? "";
      const keyValue = String(rawKeyValue).trim();
      const lowerKey = keyValue.toLowerCase();

      if (!lowerKey) {
        emptyKeyDiscarded++;
        return;
      }

      if (lastOccurrenceByKey.has(lowerKey)) {
        internalDuplicatesDiscarded++;
      }
      // Menyimpan rowIdx terakhir untuk lowerKey ini
      lastOccurrenceByKey.set(lowerKey, rowIdx);
    });

    const keptIndices = new Set(lastOccurrenceByKey.values());

    // 2. Buat list baris yang lolos (hanya baris terakhir, mempertahankan urutan baris)
    const list: AnalyzedRow[] = [];

    rawRows.forEach((row, rowIdx) => {
      if (!keptIndices.has(rowIdx)) {
        return;
      }

      const data = { ...row };
      const rawKeyValue = row[selectedKeyField] ?? "";
      const keyValue = String(rawKeyValue).trim();
      const lowerKey = keyValue.toLowerCase();

      // Cek apakah ada di workspace existing participants
      const matchedParticipant = existingParticipants.find((p) => {
        const valInP = String(p.data[selectedKeyField] ?? "").trim().toLowerCase();
        return valInP !== "" && valInP === lowerKey;
      });

      const isDuplicate = !!matchedParticipant;
      const existingId = matchedParticipant?.id;
      const existingParticipant = matchedParticipant;

      list.push({
        rowIdx,
        data,
        keyValue,
        isDuplicate,
        duplicateType: isDuplicate ? "workspace" : undefined,
        existingId,
        existingParticipant,
        action: isDuplicate ? "overwrite" : "create",
      });
    });

    setFilteredOutSummary({
      internalDuplicatesDiscarded,
      emptyKeyDiscarded,
    });
    setAnalyzedRows(list);
    setSearchQuery("");
    setFilterTab("all");
    setCurrentPage(1);
    setStep(2);
  };

  // Bulk actions for duplicates
  const setAllDuplicatesAction = (action: "overwrite" | "skip") => {
    setAnalyzedRows((prev) =>
      prev.map((row) => (row.isDuplicate ? { ...row, action } : row))
    );
  };

  // Per-row action toggle
  const setRowAction = (rowIdx: number, action: "overwrite" | "skip") => {
    setAnalyzedRows((prev) =>
      prev.map((row) => (row.rowIdx === rowIdx ? { ...row, action } : row))
    );
  };

  // Counters for Step 2
  const duplicatesCount = useMemo(
    () => analyzedRows.filter((r) => r.isDuplicate).length,
    [analyzedRows]
  );
  const newCount = useMemo(
    () => analyzedRows.filter((r) => !r.isDuplicate).length,
    [analyzedRows]
  );
  const readyToImportCount = useMemo(
    () => analyzedRows.filter((r) => r.action !== "skip").length,
    [analyzedRows]
  );

  // Filtered rows for Step 2 table preview
  const filteredAnalyzedRows = useMemo(() => {
    return analyzedRows.filter((item) => {
      if (filterTab === "duplicates" && !item.isDuplicate) return false;
      if (filterTab === "new" && item.isDuplicate) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchKey = item.keyValue.toLowerCase().includes(q);
      const matchAnyData = Object.values(item.data).some((val) =>
        String(val || "").toLowerCase().includes(q)
      );
      return matchKey || matchAnyData;
    });
  }, [analyzedRows, filterTab, searchQuery]);

  // Pagination for Step 2 table preview
  const totalPages = Math.max(1, Math.ceil(filteredAnalyzedRows.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAnalyzedRows = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredAnalyzedRows.slice(start, start + pageSize);
  }, [filteredAnalyzedRows, validCurrentPage, pageSize]);

  // Secondary preview columns for Step 2 table (2-3 first columns other than the key)
  const secondaryPreviewHeaders = useMemo(() => {
    return headers.filter((h) => h !== selectedKeyField).slice(0, 3);
  }, [headers, selectedKeyField]);

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      setStreamError(null);
      const totalParticipants = analyzedRows.length;
      setStreamProgress({
        currentBatch: 0,
        totalBatches: Math.ceil(totalParticipants / 25) || 1,
        processed: 0,
        total: totalParticipants,
        percentage: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
      });

      // 1. Simpan konfigurasi pemetaan kolom identitas & urutan kolom import ke Workspace
      await api.updateWorkspace(workspaceId, {
        uniqueKeyColumn: selectedKeyField,
        nameColumn: selectedNameField,
        photoColumn: selectedPhotoField !== "none" ? selectedPhotoField : undefined,
        importHeaders: headers.length > 0 ? headers : undefined,
      });

      // 2. Import peserta dengan streaming progress
      const payload = analyzedRows.map((r) => ({
        data: r.data,
        action: r.action,
        existingId: r.existingId,
      }));

      return api.importParticipantsStream(workspaceId, payload, (progress) => {
        setStreamProgress(progress);
      });
    },
    onSuccess: (res) => {
      setImportResult(res);
      queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      setStreamProgress(null);
      setStep(3);
    },
    onError: (err: any) => {
      setStreamError(err?.message || "Terjadi kesalahan saat mengimpor peserta.");
    },
  });

  const resetImportFlow = () => {
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("");
    setRawRows([]);
    setHeaders([]);
    setSelectedKeyField("");
    setSelectedNameField("");
    setSelectedPhotoField("none");
    setFileName("");
    setCsvContent(null);
    setAnalyzedRows([]);
    setFilteredOutSummary({ internalDuplicatesDiscarded: 0, emptyKeyDiscarded: 0 });
    setImportResult(null);
    setStreamProgress(null);
    setStreamError(null);
    setStep(1);
  };

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      <fieldset disabled={importMutation.isPending} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="icon" disabled={importMutation.isPending}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Import Data Peserta</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workspace: <span className="font-semibold text-foreground">{workspace?.name || "..."}</span>
            </p>
          </div>
        </div>

        {step < 3 && rawRows.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetImportFlow}
            disabled={importMutation.isPending}
            className="text-xs"
          >
            Mulai Ulang Berkas
          </Button>
        )}
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${step === 1
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "bg-muted text-muted-foreground"
            }`}
        >
          <span className="w-4 h-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
            1
          </span>
          <span>Import Data Peserta</span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${step === 2
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "bg-muted text-muted-foreground"
            }`}
        >
          <span className="w-4 h-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
            2
          </span>
          <span>Cek Duplikasi (Timpa / Skip)</span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${step === 3
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "bg-muted text-muted-foreground"
            }`}
        >
          <span className="w-4 h-4 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
            3
          </span>
          <span>Finish (Selesai)</span>
        </div>
      </div>

      {/* =========================================================================
          LANGKAH 1: IMPORT DATA PESERTA & PILIH KUNCI IDENTITAS UNIK
      ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Card 1A: File Upload or Google Spreadsheet Link */}
          {rawRows.length === 0 ? (
            <div className="space-y-4">
              {/* Source Mode Toggle */}
              <div className="flex border-b border-border gap-2">
                <button
                  type="button"
                  onClick={() => setImportSourceMode("file")}
                  className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                    importSourceMode === "file"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Unggah Berkas (Excel / CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setImportSourceMode("google_sheet")}
                  className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                    importSourceMode === "google_sheet"
                      ? "border-emerald-600 text-emerald-600"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Link Google Spreadsheet
                </button>
              </div>

              {importSourceMode === "file" ? (
                <Card className="border shadow-xs">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base font-semibold">Pilih Berkas Peserta</CardTitle>
                        <CardDescription className="text-xs">
                          Mendukung file format <strong>.csv</strong>, <strong>.xlsx</strong>, dan <strong>.xls</strong>. Data akan disimpan langsung sesuai nama header berkas.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadSampleCsv}
                          className="text-xs gap-1.5 h-8"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          Template CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadSampleExcel}
                          className="text-xs gap-1.5 h-8"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          Template Excel
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center bg-card/40">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <FileType className="w-10 h-10 text-blue-600" />
                        <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                      </div>
                      <p className="text-sm font-semibold mb-1">Pilih File CSV atau Excel Peserta</p>
                      <p className="text-xs text-muted-foreground max-w-sm mb-5">
                        Data kolom akan disimpan persis sesuai nama header yang ada di dalam berkas Anda.
                      </p>
                      <div>
                        <input
                          id="upload-file-initial"
                          type="file"
                          accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          className="gap-2 cursor-pointer"
                          onClick={() => document.getElementById("upload-file-initial")?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Pilih & Unggah Berkas
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Google Spreadsheet Link Input Card */
                <Card className="border shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      Tarik Langsung dari Google Spreadsheet
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tanpa perlu download CSV manual. Masukkan link publik dokumen Google Spreadsheet Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground">
                        URL / Link Google Spreadsheet
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={googleSheetInputUrl}
                          onChange={(e) => setGoogleSheetInputUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit?usp=sharing"
                          className="text-xs font-mono"
                          disabled={isFetchingSheet}
                        />
                        <Button
                          size="sm"
                          onClick={handleFetchGoogleSheet}
                          disabled={isFetchingSheet || !googleSheetInputUrl.trim()}
                          className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                          {isFetchingSheet ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Menarik Data...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              Tarik Data
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {sheetFetchError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{sheetFetchError}</span>
                      </div>
                    )}

                    <div className="rounded-lg bg-muted/40 border p-3.5 space-y-1.5 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-primary" />
                        Panduan Berbagi Dokumen Google:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 pl-1">
                        <li>Buka spreadsheet Anda di Google Drive.</li>
                        <li>Klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas.</li>
                        <li>Ubah Akses umum menjadi: <strong>"Siapa saja yang memiliki link"</strong> (Pengakses lihat-saja).</li>
                        <li>Salin link dan tempelkan pada input di atas.</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Card 1B: File Details, Unique Key Selector, & Preview Table */
            <div className="space-y-5">
              <Card className="shadow-xs border">
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                          Informasi Berkas Peserta
                        </CardTitle>
                        <Badge variant={isCsv ? "secondary" : "default"} className="text-[10px]">
                          {isCsv ? "Format CSV" : "Format Excel"}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        Berkas: <span className="font-medium text-foreground">{fileName}</span> — {rawRows.length} baris data, {headers.length} kolom terdeteksi.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isCsv && (
                        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md border text-xs">
                          <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Pemisah Kolom:</span>
                          <Select
                            value={delimiter}
                            onValueChange={(val) => {
                              if (val) handleDelimiterChange(val);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs min-w-28 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value=",">Koma (,)</SelectItem>
                              <SelectItem value=";">Titik Koma (;)</SelectItem>
                              <SelectItem value="	">Tab (\t)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {!isCsv && sheetNames.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Pilih Sheet:</span>
                          <Select
                            value={selectedSheet}
                            onValueChange={(val) => {
                              if (val && workbook) loadSheetData(workbook, val);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs min-w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sheetNames.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <input
                          id="upload-file-secondary"
                          type="file"
                          accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 cursor-pointer"
                          onClick={() => document.getElementById("upload-file-secondary")?.click()}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Ganti File
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-5">
                  {/* Selectors: Unique Identifier, Name, & Photo Mapping */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Kunci Unik */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">
                            Kolom ID Unik <span className="text-rose-500">*</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Acuan identifier unik (misal: NIK, NIM, ID Peserta) untuk cek duplikasi & pencarian.
                        </p>
                      </div>

                      <Select
                        value={selectedKeyField}
                        onValueChange={(val) => {
                          if (val) setSelectedKeyField(val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Pilih Kolom ID" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((col) => (
                            <SelectItem key={col} value={col} className="text-xs">
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 2. Nama Peserta */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">
                            Kolom Nama <span className="text-rose-500">*</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Kolom nama lengkap untuk ditampilkan di header kartu profil form registrasi.
                        </p>
                      </div>

                      <Select
                        value={selectedNameField}
                        onValueChange={(val) => {
                          if (val) setSelectedNameField(val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Pilih Kolom Nama" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map((col) => (
                            <SelectItem key={col} value={col} className="text-xs">
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 3. Foto Peserta */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">
                            Kolom Foto / Avatar
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                            Opsional
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Link foto / Google Drive untuk foto avatar profil peserta di form registrasi.
                        </p>
                      </div>

                      <Select
                        value={selectedPhotoField}
                        onValueChange={(val) => {
                          if (val) setSelectedPhotoField(val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Pilih Kolom Foto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs italic text-muted-foreground">
                            -- Tidak Ada Foto / Lewati --
                          </SelectItem>
                          {headers.map((col) => (
                            <SelectItem key={col} value={col} className="text-xs">
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Mini Preview Table (First 5 rows, max 5 cols) */}
                  {(() => {
                    const MAX_PREVIEW_COLS = 5;
                    // Prioritaskan kolom kunci unik & nama, lalu sisanya dari awal header
                    const priorityCols = [selectedKeyField, selectedNameField].filter(Boolean);
                    const otherCols = headers.filter((h) => !priorityCols.includes(h));
                    const previewCols = [
                      ...priorityCols,
                      ...otherCols,
                    ].slice(0, MAX_PREVIEW_COLS);
                    const hiddenColCount = headers.length - previewCols.length;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <TableProperties className="w-3.5 h-3.5" />
                            <span>Pratinjau Data Berkas (5 Baris Pertama)</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Data disimpan sesuai header asli
                          </span>
                        </div>

                        <div className="rounded-lg border overflow-hidden bg-card">
                          <Table className="table-fixed w-full">
                            <TableHeader className="bg-muted/40">
                              <TableRow>
                                <TableHead className="w-8 text-[11px] font-bold">#</TableHead>
                                {previewCols.map((col) => (
                                  <TableHead
                                    key={col}
                                    className={`text-[11px] font-bold ${
                                      col === selectedKeyField ? "w-36" : "w-36"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="truncate block" title={col}>{col}</span>
                                      {col === selectedKeyField && (
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/15 text-primary border-0 shrink-0">
                                          ID
                                        </Badge>
                                      )}
                                      {col === selectedNameField && (
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-600 border-0 shrink-0">
                                          Nama
                                        </Badge>
                                      )}
                                      {col === selectedPhotoField && (
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-500/15 text-amber-600 border-0 shrink-0">
                                          Foto
                                        </Badge>
                                      )}
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rawRows.slice(0, 5).map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                  {previewCols.map((col) => (
                                    <TableCell
                                      key={col}
                                      className={`text-xs ${
                                        col === selectedKeyField
                                          ? "font-semibold text-foreground bg-primary/[0.03]"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      <span
                                        className="block truncate"
                                        title={String(row[col] ?? "-")}
                                      >
                                        {String(row[col] ?? "-")}
                                      </span>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {hiddenColCount > 0 && (
                          <p className="text-[11px] text-muted-foreground text-right">
                            Menampilkan <strong>{previewCols.length}</strong> dari <strong>{headers.length}</strong> kolom
                            <span className="ml-1 text-muted-foreground/60">({hiddenColCount} kolom lainnya disembunyikan)</span>
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>

                <CardFooter className="flex justify-between border-t border-border pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRawRows([]);
                      setHeaders([]);
                    }}
                    className="text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={runDuplicationCheck}
                    disabled={!selectedKeyField || !selectedNameField}
                    className="text-xs gap-1.5"
                  >
                    Lanjut ke Cek Duplikasi
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          LANGKAH 2: CEK DUPLIKASI (TIMPA ATAU SKIP)
      ========================================================================= */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Alert Informasi Penyaringan Berkas (Duplikat Internal / Kunci Kosong) */}
          {(filteredOutSummary.internalDuplicatesDiscarded > 0 ||
            filteredOutSummary.emptyKeyDiscarded > 0) && (
            <Alert className="border-blue-500/30 bg-blue-50/50 text-blue-900">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-xs font-semibold text-blue-900">
                Penyaringan Otomatis Berkas
              </AlertTitle>
              <AlertDescription className="text-xs text-blue-800 space-y-1">
                {filteredOutSummary.internalDuplicatesDiscarded > 0 && (
                  <p>
                    Ditemukan{" "}
                    <strong>{filteredOutSummary.internalDuplicatesDiscarded}</strong> baris duplikat di dalam berkas. Sistem secara otomatis hanya mengambil baris terakhir untuk setiap kunci{" "}
                    <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[11px]">
                      {selectedKeyField}
                    </code>
                    , sedangkan baris-baris sebelumnya telah disaring.
                  </p>
                )}
                {filteredOutSummary.emptyKeyDiscarded > 0 && (
                  <p>
                    Terdapat <strong>{filteredOutSummary.emptyKeyDiscarded}</strong> baris yang kolom{" "}
                    <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[11px]">
                      {selectedKeyField}
                    </code>
                    -nya kosong dan otomatis diabaikan karena kolom identitas unik wajib terisi.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Badges Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Data File</p>
                  <p className="text-xl font-bold">{analyzedRows.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data Baru</p>
                  <p className="text-xl font-bold text-emerald-600">{newCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Terdeteksi Duplikat</p>
                  <p className="text-xl font-bold text-amber-600">{duplicatesCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mass Action & Filter Toolbar */}
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-3 border-b space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-semibold">
                      Review Duplikasi & Tindakan
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-normal px-2 py-0.5 gap-1 bg-muted/40">
                      Acuan Kunci: <span className="font-semibold text-foreground">{selectedKeyField}</span>
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Tentukan apakah data yang terdeteksi duplikat ingin <strong>Ditimpa (Update)</strong> atau <strong>Dilewati (Skip)</strong>.
                  </CardDescription>
                </div>

                {/* Bulk Actions */}
                {duplicatesCount > 0 && (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span className="text-[11px] text-muted-foreground font-medium">Aksi Massal Duplikat:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllDuplicatesAction("overwrite")}
                      className="text-xs h-7 px-2.5 border-amber-500/40 text-amber-700 hover:bg-amber-50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1 text-amber-600" />
                      Timpa Semua
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllDuplicatesAction("skip")}
                      className="text-xs h-7 px-2.5 text-muted-foreground hover:bg-muted"
                    >
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      Lewati Semua
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border text-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTab("all");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors text-xs font-medium ${filterTab === "all"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Semua ({analyzedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTab("duplicates");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors text-xs font-medium ${filterTab === "duplicates"
                        ? "bg-background text-amber-600 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-amber-600"
                      }`}
                  >
                    Duplikat ({duplicatesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterTab("new");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors text-xs font-medium ${filterTab === "new"
                        ? "bg-background text-emerald-600 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-emerald-600"
                      }`}
                  >
                    Data Baru ({newCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder={`Cari ${selectedKeyField} atau data lainnya...`}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Table Preview */}
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-12 text-[11px] font-bold">#</TableHead>
                      <TableHead className="text-[11px] font-bold">{selectedKeyField} (Identifier)</TableHead>
                      {secondaryPreviewHeaders.map((col) => (
                        <TableHead key={col} className="text-[11px] font-bold whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                      <TableHead className="text-[11px] font-bold">Status Deteksi</TableHead>
                      <TableHead className="w-48 text-[11px] font-bold text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnalyzedRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4 + secondaryPreviewHeaders.length}
                          className="text-center py-8 text-xs text-muted-foreground"
                        >
                          Tidak ada data yang cocok dengan filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAnalyzedRows.map((row) => (
                        <TableRow
                          key={row.rowIdx}
                          className={row.isDuplicate ? "bg-amber-500/[0.03]" : ""}
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {row.rowIdx + 1}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium">
                            {row.keyValue}
                          </TableCell>
                          {secondaryPreviewHeaders.map((col) => (
                            <TableCell key={col} className="text-xs text-muted-foreground max-w-[150px] truncate">
                              {String(row.data[col] ?? "-")}
                            </TableCell>
                          ))}
                          <TableCell>
                            {!row.isDuplicate ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium border-emerald-500/40 text-emerald-600 bg-emerald-50/50"
                              >
                                Data Baru
                              </Badge>
                            ) : row.duplicateType === "workspace" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium border-amber-500/40 text-amber-700 bg-amber-50/60"
                              >
                                Ada di Workspace
                              </Badge>
                            ) : row.duplicateType === "internal" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium border-blue-500/40 text-blue-700 bg-blue-50/60"
                              >
                                Duplikat di Berkas
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium border-purple-500/40 text-purple-700 bg-purple-50/60"
                              >
                                Workspace & Berkas
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!row.isDuplicate ? (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Tambah Baru
                              </span>
                            ) : (
                              <div className="flex items-center justify-end">
                                <Select
                                  value={row.action}
                                  onValueChange={(val) => {
                                    if (val === "overwrite" || val === "skip") {
                                      setRowAction(row.rowIdx, val);
                                    }
                                  }}
                                >
                                  <SelectTrigger
                                    className={`h-7 text-xs min-w-32 ${row.action === "overwrite"
                                        ? "border-amber-400 text-amber-700 font-medium bg-amber-50/40"
                                        : "text-muted-foreground bg-muted/40"
                                      }`}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="overwrite" className="text-xs">
                                      Timpa (Update Data)
                                    </SelectItem>
                                    <SelectItem value="skip" className="text-xs text-muted-foreground">
                                      Lewati (Skip)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredAnalyzedRows.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground order-2 sm:order-1">
                    <span>
                      Menampilkan{" "}
                      <strong>
                        {Math.min(
                          (validCurrentPage - 1) * pageSize + 1,
                          filteredAnalyzedRows.length
                        )}
                      </strong>
                      {" - "}
                      <strong>
                        {Math.min(
                          validCurrentPage * pageSize,
                          filteredAnalyzedRows.length
                        )}
                      </strong>{" "}
                      dari <strong>{filteredAnalyzedRows.length}</strong> entri
                    </span>

                    <span className="text-muted-foreground/40">|</span>

                    <div className="flex items-center gap-1.5">
                      <span>Per hal:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(val) => {
                          setPageSize(Number(val));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-7 w-[68px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10" className="text-xs">
                            10
                          </SelectItem>
                          <SelectItem value="25" className="text-xs">
                            25
                          </SelectItem>
                          <SelectItem value="50" className="text-xs">
                            50
                          </SelectItem>
                          <SelectItem value="100" className="text-xs">
                            100
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage(1)}
                      disabled={validCurrentPage <= 1}
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={validCurrentPage <= 1}
                      title="Sebelumnya"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>

                    <span className="px-2.5 text-xs font-medium text-foreground">
                      Hal {validCurrentPage} dari {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={validCurrentPage >= totalPages}
                      title="Selanjutnya"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={validCurrentPage >= totalPages}
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs gap-1.5 w-full sm:w-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Berkas
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className="text-xs text-muted-foreground">
                  {readyToImportCount} data akan diproses
                </span>
                <Button
                  size="sm"
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending || readyToImportCount === 0}
                  className="text-xs gap-1.5 w-full sm:w-auto"
                >
                  {importMutation.isPending ? "Memproses Import..." : "Konfirmasi & Mulai Import"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* =========================================================================
          LANGKAH 3: FINISH (SELESAI & RANGKUMAN)
      ========================================================================= */}
      {step === 3 && importResult && (
        <Card className="border shadow-xs text-center py-8">
          <CardContent className="space-y-6 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <CardTitle className="text-xl font-bold">Import Peserta Berhasil Selesai!</CardTitle>
              <CardDescription className="text-xs max-w-md mx-auto mt-1.5">
                Data peserta telah berhasil diproses ke dalam workspace kegiatan sesuai instruksi duplikasi yang Anda tentukan.
              </CardDescription>
            </div>

            {/* 4 Statistik Ringkasan Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <p className="text-[11px] text-muted-foreground">Total Berkas:</p>
                <p className="text-lg font-bold mt-0.5">{importResult.total}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[11px] text-emerald-600 font-medium">Data Baru Ditambah:</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5">{importResult.createdCount}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-[11px] text-amber-700 font-medium">Data Ditimpa:</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{importResult.updatedCount}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <p className="text-[11px] text-muted-foreground">Dilewati (Skip):</p>
                <p className="text-lg font-bold text-muted-foreground mt-0.5">{importResult.skippedCount}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Link href={`/workspaces/${workspaceId}`}>
                <Button size="sm" className="gap-2 text-xs h-9 px-4">
                  <FileCheck className="w-4 h-4" />
                  Buka Form Workspace
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={resetImportFlow}
                className="gap-2 text-xs h-9 px-4"
              >
                <Upload className="w-4 h-4" />
                Import Berkas Lain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </fieldset>

      {/* =========================================================================
          MODAL PROGRESS BLOCKING SAAT IMPORT BERLANGSUNG
      ========================================================================= */}
      <Dialog
        open={importMutation.isPending || !!streamError}
        onOpenChange={(open) => {
          // Cegah dialog ditutup jika proses import masih pending
          if (!open && importMutation.isPending) return;
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md p-6 select-none"
        >
          <DialogHeader className="items-center text-center">
            {streamError ? (
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-1">
                <AlertTriangle className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1 animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            <DialogTitle className="text-base font-bold">
              {streamError ? "Gagal Mengimpor Peserta" : "Sedang Memproses Import..."}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {streamError
                ? streamError
                : "Mohon tunggu, data sedang disimpan ke server dalam beberapa batch. Jangan tutup halaman ini."}
            </DialogDescription>
          </DialogHeader>

          {!streamError && streamProgress && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    Batch {streamProgress.currentBatch} dari {streamProgress.totalBatches}
                  </span>
                  <span className="font-bold text-primary tabular-nums">
                    {streamProgress.percentage}%
                  </span>
                </div>
                <Progress value={streamProgress.percentage} className="w-full" />
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border/60 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Peserta diproses:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {streamProgress.processed} / {streamProgress.total}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Data baru ditambahkan:</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {streamProgress.createdCount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Data ditimpa:</span>
                  <span className="font-semibold text-amber-600 tabular-nums">
                    {streamProgress.updatedCount}
                  </span>
                </div>
                {streamProgress.skippedCount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Data dilewati (skip):</span>
                    <span className="font-semibold text-muted-foreground tabular-nums">
                      {streamProgress.skippedCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {streamError && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setStreamError(null);
                  setStreamProgress(null);
                }}
              >
                Tutup & Periksa Data
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
