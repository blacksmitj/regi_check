"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { FormTemplate } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Edit3,
  Copy,
  Trash2,
  Search,
  Layers,
  FileCheck2,
  Calendar,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";

export default function TemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Role guard: Only admin can access templates
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/access-denied");
    }
  }, [user, router]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.getTemplates(),
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (source: FormTemplate) => {
      const now = new Date().toISOString();
      const duplicated: FormTemplate = {
        ...source,
        id: `tpl-${Date.now().toString(36)}`,
        name: `${source.name} (Salinan)`,
        createdAt: now,
        updatedAt: now,
        items: source.items.map((it) => ({
          ...it,
          id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      };
      return api.saveTemplate(duplicated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsDeleting(true);
      await api.deleteTemplate(id);
      setIsDeleting(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setTemplateToDelete(null);
    },
    onError: () => {
      setIsDeleting(false);
    },
  });

  const filteredTemplates = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      t.items.some((it) => it.label.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Template Form Global</h1>
            <Badge variant="outline" className="text-xs">
              {templates.length} Template
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daftar master template konfigurasi form checklist. Anda dapat menduplikasi & mengedit template yang sudah ada, atau menyimpan susunan form langsung dari Workspace kegiatan.
          </p>
        </div>

        <Link href="/workspaces">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Layers className="w-4 h-4" />
            Buka Workspace
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Ingin membuat template baru?</span> Buat susunan form di dalam suatu{" "}
          <strong className="text-foreground">Workspace</strong> berdasarkan kolom Excel/CSV berkas peserta Anda, lalu klik tombol{" "}
          <strong className="text-foreground">"Simpan sebagai Template"</strong> pada halaman Atur Form. Atau gunakan tombol{" "}
          <strong className="text-foreground">"Duplikat"</strong> pada salah satu template di bawah ini untuk disesuaikan.
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
        <Input
          placeholder="Cari nama template atau field form..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Tidak ada template form"
          description={
            search
              ? "Tidak ditemukan template form yang sesuai kata kunci pencarian Anda."
              : "Belum ada template form yang terdaftar. Buat template pertama Anda sekarang."
          }
          actionLabel={!search ? "Buat Template Baru" : undefined}
          onAction={!search ? () => router.push("/templates/new") : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => (
            <Card
              key={tpl.id}
              className="border shadow-xs flex flex-col justify-between hover:border-foreground/20 transition-colors"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-semibold gap-1">
                      <FileCheck2 className="w-3 h-3 text-primary" />
                      {tpl.items.filter((i) => i.type !== "section").length} Field Form
                    </Badge>
                    {tpl.items.some((i) => i.type === "section") && (
                      <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/5">
                        {tpl.items.filter((i) => i.type === "section").length} Grup
                      </Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Diperbarui: {new Date(tpl.updatedAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold leading-snug">{tpl.name}</CardTitle>
                <CardDescription className="text-xs mt-1 line-clamp-2">
                  {tpl.description || "Tidak ada deskripsi tambahan."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">Susunan Form:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {tpl.items.map((it) =>
                      it.type === "section" ? (
                        <span
                          key={it.id}
                          className="px-2 py-0.5 rounded bg-primary/10 text-[10px] text-primary font-bold border border-primary/25 uppercase tracking-wide"
                        >
                          [{it.label}]
                        </span>
                      ) : (
                        <span
                          key={it.id}
                          className="px-2 py-0.5 rounded bg-muted text-[10px] text-foreground font-medium border border-border/50"
                        >
                          {it.label}
                          {it.required && <span className="text-destructive ml-0.5">*</span>}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(tpl)}
                      disabled={duplicateMutation.isPending}
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      title="Duplikat Template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplikat</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplateToDelete(tpl)}
                      className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10"
                      title="Hapus Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </Button>
                  </div>

                  <Link href={`/templates/${tpl.id}/edit`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Template</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      <AlertDialog
        open={Boolean(templateToDelete)}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Hapus Template Form?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Anda akan menghapus template{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{templateToDelete?.name}&rdquo;
                </span>
                . Tindakan ini tidak dapat dibatalkan.
              </p>
              <p className="bg-muted p-2 rounded text-[11px]">
                <strong>Catatan:</strong> Workspace yang sudah dibuat menggunakan template ini tetap aman dan tidak akan terpengaruh karena form di workspace bersifat snapshot independen.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (templateToDelete) {
                  deleteMutation.mutate(templateToDelete.id);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs gap-1.5"
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Hapus Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
