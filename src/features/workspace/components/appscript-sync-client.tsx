"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Code2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Lock,
  Unlock,
  Save,
  HelpCircle,
} from "lucide-react";
import { generateAppScriptCode } from "@/lib/sheets/appscript-generator";

export function AppScriptSyncClient({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  // Fetch AppScript config & logs
  const { data: syncData, isLoading, refetch } = useQuery({
    queryKey: ["appscriptSync", workspaceId],
    queryFn: () => api.getAppScriptSync(workspaceId),
    refetchInterval: 8000, // Poll log every 8 seconds
  });

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  // Local state form generator
  const [sheetName, setSheetName] = useState("Data Peserta");
  const [lockSheet, setLockSheet] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (syncData?.config && !initialized) {
      setSheetName(syncData.config.sheetName || "Data Peserta");
      setLockSheet(Boolean(syncData.config.lockSheet));
      setInitialized(true);
    }
  }, [syncData, initialized]);

  // Construct absolute API Data URL
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const apiDataUrl = `${origin}/api/workspaces/${workspaceId}/appscript-sync/data`;
  const currentApiKey = syncData?.config?.apiKey || "";

  // Generate Google Apps Script code dynamically
  const generatedCode = useMemo(() => {
    return generateAppScriptCode({
      apiUrl: apiDataUrl,
      apiKey: currentApiKey,
      sheetName: sheetName || "Data Peserta",
      lockSheet: lockSheet,
    });
  }, [apiDataUrl, currentApiKey, sheetName, lockSheet]);

  // Mutation: Save Configuration
  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateAppScriptSyncConfig(workspaceId, {
        sheetName,
        lockSheet,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appscriptSync", workspaceId] });
      toast.add({
        type: "success",
        title: "Pengaturan berhasil disimpan.",
      });
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: err?.message || "Gagal menyimpan pengaturan.",
      });
    },
  });

  // Mutation: Regenerate API Key
  const regenerateKeyMutation = useMutation({
    mutationFn: () => api.regenerateAppScriptApiKey(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appscriptSync", workspaceId] });
      toast.add({
        type: "success",
        title: "API Key berhasil diperbarui.",
        description: "Pastikan untuk memperbarui kode Apps Script di spreadsheet Anda.",
      });
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: err?.message || "Gagal memperbarui API Key.",
      });
    },
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopiedCode(true);
      toast.add({
        type: "success",
        title: "Kode AppScript berhasil disalin!",
        description: "Buka Extensions > Apps Script di Google Sheets lalu tempel kode ini.",
      });
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      toast.add({ type: "error", title: "Gagal menyalin kode" });
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(apiDataUrl);
      setCopiedUrl(true);
      toast.add({ type: "success", title: "URL Endpoint disalin." });
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(currentApiKey);
      setCopiedKey(true);
      toast.add({ type: "success", title: "API Key disalin." });
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
      {/* Header Sticky */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                AppScript Sync & Generator
              </h1>
              <Badge variant="outline" className="text-[10px] py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                Live Data API
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {workspace?.name || "Workspace"} • Sinkronisasi otomatis ke Google Spreadsheet via Apps Script
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>

          <Button
            size="sm"
            onClick={handleCopyCode}
            className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin Kode AppScript</span>
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner Panduan Cepat */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-foreground">
                Cara Menggunakan Kode Google Apps Script
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              1. Buka Google Sheet target Anda &gt; Menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
              <br />
              2. Tempelkan seluruh kode generator di bawah ini, lalu simpan (Ctrl+S).
              <br />
              3. Kembali ke Spreadsheet dan jalankan menu baru <strong>&quot;⚡ RegiCheck Sync &gt; Tarik Data Sekarang&quot;</strong>.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs shrink-0"
            onClick={() => window.open("https://sheets.new", "_blank")}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Buka Spreadsheet Baru
            <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
          </Button>
        </div>

        {/* Grid: Pengaturan & Kredensial */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Konfigurasi & Generator Options */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card Konfigurasi Target Sheet */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  Pengaturan Sheet & Proteksi
                </CardTitle>
                <CardDescription className="text-xs">
                  Tentukan nama sheet tujuan dan proteksi kunci sheet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="text-xs font-medium">Nama Tab/Sheet Target</FieldLabel>
                    <Input
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="Contoh: Data Peserta"
                      className="text-xs h-9 mt-1"
                    />
                    <FieldDescription className="text-[11px]">
                      Jika tab belum ada di spreadsheet, Apps Script otomatis membuatnya.
                    </FieldDescription>
                  </Field>

                  {/* Toggle Lock Sheet */}
                  <div className="p-3.5 border rounded-lg bg-muted/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {lockSheet ? (
                          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-foreground">Kunci Sheet (Lock Sheet)</p>
                          <p className="text-[11px] text-muted-foreground">
                            Cegah perubahan atau penghapusan isi data oleh editor lain di spreadsheet.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={lockSheet}
                        onCheckedChange={setLockSheet}
                      />
                    </div>
                    {lockSheet && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                        🛡️ Sheet akan diproteksi menggunakan hak akses pemilik skrip (Owner Only). Editor spreadsheet lainnya hanya dapat membaca data.
                      </p>
                    )}
                  </div>
                </FieldGroup>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="text-xs h-8 gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card Kredensial & API Key */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Kredensial & Endpoint API
                </CardTitle>
                <CardDescription className="text-xs">
                  Akses rahasia untuk memvalidasi permintaan dari Google Apps Script.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">API Sync Endpoint URL</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      readOnly
                      value={apiDataUrl}
                      className="text-xs font-mono bg-muted/30 h-8"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={handleCopyUrl}
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Workspace API Secret Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {showKey ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      readOnly
                      type={showKey ? "text" : "password"}
                      value={currentApiKey}
                      className="text-xs font-mono bg-muted/30 h-8"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      onClick={handleCopyKey}
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Key terlindungi aman
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Apakah Anda yakin ingin membuat API Key baru? Script lama di spreadsheet yang menggunakan key lama harus diperbarui.")) {
                        regenerateKeyMutation.mutate();
                      }
                    }}
                    disabled={regenerateKeyMutation.isPending}
                    className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${regenerateKeyMutation.isPending ? "animate-spin" : ""}`} />
                    Regenerate Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kolom Kanan: Preview Code Generator */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="flex flex-col h-full border-border">
              <CardHeader className="pb-3 border-b bg-muted/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Kode Google Apps Script Siap Tempel
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kode ini diperbarui secara otomatis berdasarkan token dan preferensi di sebelah kiri.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleCopyCode}
                  className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Tersalin!" : "Salin Kode"}</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative min-h-[380px] bg-slate-950 rounded-b-xl overflow-hidden">
                <pre className="p-4 text-[11px] font-mono leading-relaxed text-slate-200 overflow-x-auto max-h-[500px]">
                  <code>{generatedCode}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabel Riwayat Pengambilan Data (History Log) */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Riwayat Pengambilan Data (AppScript Sync Log)
              </CardTitle>
              <CardDescription className="text-xs">
                Mencatat setiap kali skrip Google Spreadsheet menarik data dari workspace ini.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              Total {syncData?.logs?.length || 0} Riwayat
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-y text-muted-foreground font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Waktu</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Nama Sheet</th>
                    <th className="py-2.5 px-4">Baris Dikirim</th>
                    <th className="py-2.5 px-4">Durasi</th>
                    <th className="py-2.5 px-4">IP Address / Client</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Memuat riwayat...
                      </td>
                    </tr>
                  )}

                  {!isLoading && (!syncData?.logs || syncData.logs.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat penarikan data oleh Google Apps Script.
                      </td>
                    </tr>
                  )}

                  {syncData?.logs?.map((log) => {
                    const isSuccess = log.status === "success";
                    const formattedDate = new Date(log.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-foreground">
                          {formattedDate}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Sukses
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                              <XCircle className="w-3 h-3" />
                              Gagal
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {log.sheetName || "Data Peserta"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap font-semibold">
                          {isSuccess ? `${log.totalRowsSent} baris` : "-"}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground">
                          {log.durationMs ? `${log.durationMs} ms` : "-"}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          {log.errorMessage ? (
                            <span className="text-destructive font-sans">{log.errorMessage}</span>
                          ) : (
                            log.ipAddress || "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
