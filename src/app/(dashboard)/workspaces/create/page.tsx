"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
  const [templateId, setTemplateId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.getTemplates(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama kegiatan wajib diisi.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    try {
      setIsSubmitting(true);
      const newWs = await api.createWorkspace({
        name,
        description,
        startDate,
        endDate,
        templateId: templateId || undefined,
      });
      router.push(`/workspaces/${newWs.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat workspace.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/workspaces">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Buat Workspace Kegiatan Baru</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin dapat mengonfigurasi kegiatan dan memilih template checklist bawaan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Informasi Kegiatan</CardTitle>
            <CardDescription className="text-xs">
              Sesuai PRD: Checklist workspace akan disalin independen dari template yang dipilih.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg text-xs font-medium bg-destructive/10 text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">
                Nama Kegiatan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Contoh: Pelatihan Digital Marketing 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs">
                  Tanggal Mulai <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs">
                  Tanggal Selesai <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template" className="text-xs">
                Template Checklist Bawaan (Opsional)
              </Label>
              <select
                id="template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih Template Checklist --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.items.length} item checklist)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Jika tidak memilih, template checklist pertama akan digunakan secara otomatis.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs">
                Deskripsi Kegiatan
              </Label>
              <Textarea
                id="desc"
                placeholder="Tuliskan keterangan singkat mengenai kegiatan ini..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
            <Link href="/workspaces">
              <Button type="button" variant="outline" size="sm" className="text-xs">
                Batal
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs gap-1.5">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan Workspace
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

