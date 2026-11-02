"use client";

import { useState, useEffect } from "react";
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
  RefreshCw,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
  Activity,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Play,
  RotateCw,
} from "lucide-react";
import { SheetSyncLog } from "@/types/domain";

export function SheetSyncMonitoringClient({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  // 1. Fetch Sync Data (config + logs)
  const { data: syncData, isLoading, refetch } = useQuery({
    queryKey: ["sheetSync", workspaceId],
    queryFn: () => api.getSheetSync(workspaceId),
    refetchInterval: 10000, // auto-refresh polling every 10s
  });

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  // Local form state
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(5);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (syncData?.config && !initialized) {
      setGoogleSheetUrl(syncData.config.googleSheetUrl || "");
      setAutoSyncEnabled(Boolean(syncData.config.autoSyncEnabled));
      setSyncIntervalMinutes(syncData.config.syncIntervalMinutes || 5);
      setInitialized(true);
    }
  }, [syncData, initialized]);

  // 2. Mutation: Save Config
  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateSheetSyncConfig(workspaceId, {
        googleSheetUrl,
        autoSyncEnabled,
        syncIntervalMinutes: Number(syncIntervalMinutes),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheetSync", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      toast.add({
        type: "success",
        title: "Pengaturan sinkronisasi spreadsheet berhasil disimpan.",
      });
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: err?.message || "Gagal menyimpan konfigurasi.",
      });
    },
  });

  // 3. Mutation: Trigger Sync Now
  const triggerMutation = useMutation({
    mutationFn: () => api.triggerSheetSync(workspaceId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["sheetSync", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });

      if (res.success) {
        toast.add({
          type: "success",
          title:
            res.newAddedCount > 0
              ? `Sinkronisasi berhasil! +${res.newAddedCount} peserta baru ditambahkan.`
              : `Sinkronisasi selesai. Tidak ada peserta baru (${res.skippedCount} dilewati).`,
        });
      } else {
        toast.add({
          type: "error",
          title: `Sinkronisasi gagal: ${res.message || res.error}`,
        });
      }
    },
    onError: (err: any) => {
      toast.add({
        type: "error",
        title: err?.message || "Terjadi kesalahan saat memicu sinkronisasi.",
      });
    },
  });

  const config = syncData?.config;
  const logs = syncData?.logs || [];

  // Calculate today's total added
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const totalAddedToday = logs
    .filter((l) => new Date(l.createdAt).getTime() >= todayStart.getTime() && l.status === "success")
    .reduce((acc, curr) => acc + (curr.newAddedCount || 0), 0);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const isTriggering = triggerMutation.isPending || config?.lastSyncStatus === "running";

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Link href={`/workspaces/${workspaceId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Monitoring Google Spreadsheet Sync
                </h1>
                <Badge variant="outline" className="text-xs">
                  {workspace?.name}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sinkronisasi otomatis peserta baru langsung dari Google Sheets tanpa download CSV manual.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs gap-1.5 h-8"
              disabled={isLoading}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Log
            </Button>
            <Button
              size="sm"
              onClick={() => triggerMutation.mutate()}
              disabled={isTriggering || !googleSheetUrl}
              className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Play className={`w-3.5 h-3.5 ${isTriggering ? "animate-spin" : ""}`} />
              {isTriggering ? "Sedang Sinkron..." : "Sinkronkan Sekarang"}
            </Button>
          </div>
        </div>

        {/* Warning if unique key column is not set */}
        {workspace && !workspace.uniqueKeyColumn && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">Kunci Unik Workspace Belum Ditetapkan</p>
              <p>
                Untuk mencegah duplikasi data, tetapkan kolom Kunci Unik (seperti NIK atau Email) di{" "}
                <Link
                  href={`/workspaces/${workspaceId}/settings`}
                  className="underline font-semibold hover:text-foreground"
                >
                  Setting Workspace
                </Link>{" "}
                atau saat melakukan import awal.
              </p>
            </div>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Status Terakhir</span>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                {config?.lastSyncStatus === "success" && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600">Berhasil</span>
                  </>
                )}
                {config?.lastSyncStatus === "failed" && (
                  <>
                    <XCircle className="w-4 h-4 text-destructive" />
                    <span className="text-destructive">Gagal</span>
                  </>
                )}
                {config?.lastSyncStatus === "running" && (
                  <>
                    <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-primary">Memproses...</span>
                  </>
                )}
                {!config?.lastSyncStatus && <span className="text-muted-foreground">Belum Pernah</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground truncate" title={config?.lastSyncMessage}>
                {config?.lastSyncMessage || "Belum ada eksekusi"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Terakhir Sinkron</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-sm font-semibold">
                {formatDate(config?.lastSyncedAt)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">
                Kunci Unik: <span className="font-semibold">{config?.uniqueKeyColumn || "-"}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Peserta Baru Hari Ini</span>
                <Layers className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-xl font-bold text-emerald-600">
                +{totalAddedToday}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">Dari seluruh eksekusi hari ini</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs flex items-center justify-between">
                <span>Mode Auto-Sync</span>
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </CardDescription>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                {config?.autoSyncEnabled ? (
                  <Badge variant="default" className="text-[10px] bg-emerald-600">
                    Aktif ({config.syncIntervalMinutes}m)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Nonaktif
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-[11px] text-muted-foreground">
                {config?.autoSyncEnabled ? "Cron berjalan otomatis di server" : "Hanya via tombol manual"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Panel */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              Konfigurasi Google Spreadsheet
            </CardTitle>
            <CardDescription className="text-xs">
              Masukkan tautan Google Spreadsheet publik dan tentukan interval sinkronisasi otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel className="text-xs font-semibold">
                  URL / Tautan Google Spreadsheet
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit?usp=sharing"
                    className="text-xs font-mono"
                  />
                  {googleSheetUrl && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={() => window.open(googleSheetUrl, "_blank")}
                      title="Buka Spreadsheet di Tab Baru"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <FieldDescription className="text-[11px]">
                  Pastikan opsi berbagi dokumen di Google Sheets diatur ke:{" "}
                  <span className="font-semibold text-foreground">
                    "Siapa saja yang memiliki link dapat melihat" (Viewer)
                  </span>
                  .
                </FieldDescription>
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <Field className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5 pr-4">
                    <FieldLabel className="text-xs font-semibold">Aktifkan Auto-Sync Berkala</FieldLabel>
                    <FieldDescription className="text-[11px]">
                      Sistem server akan otomatis memeriksa baris data baru secara berkala.
                    </FieldDescription>
                  </div>
                  <Switch checked={autoSyncEnabled} onCheckedChange={setAutoSyncEnabled} />
                </Field>

                <Field>
                  <FieldLabel className="text-xs font-semibold">Interval Pengecekan</FieldLabel>
                  <select
                    value={syncIntervalMinutes}
                    onChange={(e) => setSyncIntervalMinutes(Number(e.target.value))}
                    disabled={!autoSyncEnabled}
                    aria-label="Pilih Interval Pengecekan"
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value={1}>Setiap 1 Menit (Sangat Cepat)</option>
                    <option value={5}>Setiap 5 Menit (Rekomendasi)</option>
                    <option value={15}>Setiap 15 Menit</option>
                    <option value={30}>Setiap 30 Menit</option>
                    <option value={60}>Setiap 1 Jam</option>
                  </select>
                  <FieldDescription className="text-[11px]">
                    Hanya data dengan Kunci Unik baru yang akan diimport.
                  </FieldDescription>
                </Field>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="text-xs gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Sync History Logs Table */}
        <Card className="bg-card shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Riwayat Eksekusi Sinkronisasi (Log Cron)
              </CardTitle>
              <CardDescription className="text-xs">
                Catatan riwayat sinkronisasi otomatis maupun manual serta status penambahan peserta.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px]">
              {logs.length} Log Terakhir
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Belum ada riwayat sinkronisasi</p>
                <p>Klik tombol "Sinkronkan Sekarang" di atas untuk mencoba sinkronisasi pertama kali.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-4">Waktu Eksekusi</th>
                      <th className="py-2.5 px-4">Trigger</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Peserta Baru</th>
                      <th className="py-2.5 px-4 text-right">Dilewati</th>
                      <th className="py-2.5 px-4 text-right">Durasi</th>
                      <th className="py-2.5 px-4">Keterangan / Pesan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log: SheetSyncLog) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {log.triggeredBy.startsWith("manual") ? (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                              Manual
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                              Cron (Otomatis)
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          {log.status === "success" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Sukses
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-destructive font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" />
                              Gagal
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold whitespace-nowrap">
                          {log.newAddedCount > 0 ? (
                            <span className="text-emerald-600">+{log.newAddedCount}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground whitespace-nowrap">
                          {log.skippedCount}
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                          {log.durationMs} ms
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate" title={log.errorMessage || "Berhasil"}>
                          {log.status === "failed" ? (
                            <span className="text-destructive font-medium">{log.errorMessage}</span>
                          ) : log.newAddedCount > 0 ? (
                            <span className="text-foreground">Berhasil mengimpor {log.newAddedCount} data baru</span>
                          ) : (
                            <span>Data sudah sinkron (nihil baris baru)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
