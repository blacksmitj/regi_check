"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceConfirmationDialog } from "./workspace-confirmation-dialog";
import { toast } from "@/components/ui/toast";
import { clearWorkspaceOfflineDrafts } from "@/lib/storage/indexed-db";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  FileText,
  Calendar,
  KeyRound,
  User,
  Image as ImageIcon,
} from "lucide-react";

export function WorkspaceGeneralSettingsClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "clean_data" | "delete_workspace";
  }>({
    open: false,
    type: "clean_data",
  });

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [uniqueKeyColumn, setUniqueKeyColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [photoColumn, setPhotoColumn] = useState("");
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (workspace && !initialized) {
    setName(workspace.name || "");
    setDescription(workspace.description || "");
    setStartDate(workspace.startDate || "");
    setEndDate(workspace.endDate || "");
    setStatus(workspace.status || "active");
    setUniqueKeyColumn(workspace.uniqueKeyColumn || "");
    setNameColumn(workspace.nameColumn || "");
    setPhotoColumn(workspace.photoColumn || "");
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: (updatedData: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      status?: "active" | "archived";
      uniqueKeyColumn?: string;
      nameColumn?: string;
      photoColumn?: string;
    }) =>
      api.updateWorkspace(workspaceId, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      description,
      startDate,
      endDate,
      status,
      uniqueKeyColumn: uniqueKeyColumn.trim() || undefined,
      nameColumn: nameColumn.trim() || undefined,
      photoColumn: photoColumn.trim() || undefined,
    });
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pengaturan Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola informasi umum dan manajemen data workspace{" "}
              <span className="font-semibold text-foreground">{workspace?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/workspaces/${workspaceId}/form-settings`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Buka Atur Form
            </Button>
          </Link>
        </div>
      </div>

      {/* Form Informasi Umum Workspace */}
      <Card className="border shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-border/60">
          <CardTitle className="text-base font-semibold">Informasi Umum Workspace</CardTitle>
          <CardDescription className="text-xs">
            Ubah nama kegiatan, deskripsi, dan jadwal pelaksanaan workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSave} className="space-y-4">
            <FieldGroup className="gap-4">
              {/* Status Workspace Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/80 bg-muted/20">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Status Publikasi Workspace
                    </span>
                    <Badge variant={status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {status === "active" ? "Aktif" : "Diarsipkan"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {status === "active"
                      ? "Workspace aktif dan dapat dilihat serta diakses oleh seluruh petugas untuk pengecekan peserta."
                      : "Workspace dinonaktifkan (diarsipkan). Workspace ini disembunyikan dan tidak dapat dilihat oleh petugas lain."}
                  </p>
                </div>
                <Switch
                  checked={status === "active"}
                  onCheckedChange={(checked) => setStatus(checked ? "active" : "archived")}
                />
              </div>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="ws-name" className="text-xs font-semibold">Nama Workspace / Acara</FieldLabel>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Registrasi Seminar Nasional 2026"
                  required
                  className="text-xs h-9"
                />
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="ws-desc" className="text-xs font-semibold">Deskripsi</FieldLabel>
                <Textarea
                  id="ws-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan atau keterangan kegiatan..."
                  rows={3}
                  className="text-xs"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="ws-start" className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Tanggal Mulai
                  </FieldLabel>
                  <Input
                    id="ws-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </Field>

                <Field className="space-y-1.5">
                  <FieldLabel htmlFor="ws-end" className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Tanggal Selesai
                  </FieldLabel>
                  <Input
                    id="ws-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </Field>
              </div>

              {/* Pemetaan Kolom Profil Peserta */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Pemetaan Kolom Identitas Peserta
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tentukan nama kolom dari berkas import yang dijadikan acuan NIK/ID unik, nama, dan foto pada kartu profil peserta.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
                  <Field className="space-y-1">
                    <FieldLabel htmlFor="ws-uniquekey" className="text-[11px] font-semibold flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-primary" />
                      Kolom Kunci ID Unik
                    </FieldLabel>
                    <Input
                      id="ws-uniquekey"
                      value={uniqueKeyColumn}
                      onChange={(e) => setUniqueKeyColumn(e.target.value)}
                      placeholder="Contoh: NIK, NIM, ID"
                      className="text-xs h-8 bg-background"
                    />
                    <FieldDescription className="text-[10px] text-muted-foreground">Header kolom unik di berkas peserta</FieldDescription>
                  </Field>

                  <Field className="space-y-1">
                    <FieldLabel htmlFor="ws-namecol" className="text-[11px] font-semibold flex items-center gap-1">
                      <User className="w-3 h-3 text-primary" />
                      Kolom Nama Lengkap
                    </FieldLabel>
                    <Input
                      id="ws-namecol"
                      value={nameColumn}
                      onChange={(e) => setNameColumn(e.target.value)}
                      placeholder="Contoh: Nama Lengkap"
                      className="text-xs h-8 bg-background"
                    />
                    <FieldDescription className="text-[10px] text-muted-foreground">Header kolom nama di berkas peserta</FieldDescription>
                  </Field>

                  <Field className="space-y-1">
                    <FieldLabel htmlFor="ws-photocol" className="text-[11px] font-semibold flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-primary" />
                      Kolom Foto Avatar
                    </FieldLabel>
                    <Input
                      id="ws-photocol"
                      value={photoColumn}
                      onChange={(e) => setPhotoColumn(e.target.value)}
                      placeholder="Contoh: Foto, Link Foto"
                      className="text-xs h-8 bg-background"
                    />
                    <FieldDescription className="text-[10px] text-muted-foreground">Header kolom foto / link Google Drive</FieldDescription>
                  </Field>
                </div>
              </div>
            </FieldGroup>

            <div className="flex items-center justify-between pt-2">
              <div>
                {isSavedNotice && (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Perubahan berhasil disimpan!
                  </span>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-destructive/20 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Zona Bahaya (Danger Zone)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tindakan berisiko tinggi terhadap data peserta dan keberadaan workspace ini.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                Bersihkan Data Form Peserta
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Reset seluruh isian form peserta menjadi belum lengkap, tanpa menghapus daftar peserta.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs gap-1.5"
                onClick={() => setConfirmModal({ open: true, type: "clean_data" })}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Bersihkan Data Form
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Hapus Workspace
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Hapus permanen workspace ini beserta seluruh data peserta, riwayat checklist, dan berkas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={() => setConfirmModal({ open: true, type: "delete_workspace" })}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Workspace Ini
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <WorkspaceConfirmationDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        type={confirmModal.type}
        workspaceName={workspace?.name || ""}
        onConfirm={async () => {
          if (confirmModal.type === "clean_data") {
            try {
              await api.cleanWorkspaceResponses(workspaceId);
              await clearWorkspaceOfflineDrafts(workspaceId);
              await queryClient.invalidateQueries({ queryKey: ["participants", workspaceId] });
              await queryClient.invalidateQueries({ queryKey: ["responses"] });
              toast.success("Data form berhasil dibersihkan & di-reset ke kondisi awal");
            } catch (err) {
              console.error(err);
              toast.error("Gagal membersihkan data form workspace");
            }
          } else {
            await api.deleteWorkspace(workspaceId);
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            router.push("/workspaces");
          }
        }}
      />
    </div>
  );
}

