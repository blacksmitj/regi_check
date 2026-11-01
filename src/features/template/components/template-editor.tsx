"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ChecklistItem, ChecklistTemplate } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableChecklistItem } from "@/features/checklist/components/sortable-checklist-item";
import { useAuthStore } from "@/stores/auth-store";

interface TemplateEditorProps {
  templateId?: string; // If provided, mode is edit; otherwise new
}

export function TemplateEditor({ templateId }: TemplateEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isEditing = Boolean(templateId);

  // Role guard
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/access-denied");
    }
  }, [user, router]);

  const { data: initialTemplate, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => (templateId ? api.getTemplate(templateId) : null),
    enabled: isEditing,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name);
      setDescription(initialTemplate.description || "");
      setItems(initialTemplate.items || []);
    } else if (!isEditing && items.length === 0) {
      // Provide default starting items for new template
      setItems([
        {
          id: `item-${Date.now().toString(36)}-1`,
          label: "Kartu Tanda Penduduk (KTP / Identitas)",
          type: "checkbox",
          required: true,
          editable: false,
          evidenceEnabled: true,
          evidenceRequired: true,
          order: 1,
          active: true,
        },
        {
          id: `item-${Date.now().toString(36)}-2`,
          label: "Konfirmasi Kehadiran Fisik",
          type: "checkbox",
          required: true,
          editable: false,
          evidenceEnabled: false,
          evidenceRequired: false,
          order: 2,
          active: true,
        },
      ]);
    }
  }, [initialTemplate, isEditing]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Nama template wajib diisi.");
      }
      if (items.length === 0) {
        throw new Error("Template harus memiliki minimal 1 item checklist.");
      }

      const id = templateId || `tpl-${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const payload: ChecklistTemplate = {
        id,
        name: name.trim(),
        description: description.trim(),
        items: items.map((it, idx) => ({ ...it, order: idx + 1 })),
        createdAt: initialTemplate ? initialTemplate.createdAt : now,
        updatedAt: now,
      };

      return api.saveTemplate(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: ["template", templateId] });
      }
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);

      if (!isEditing) {
        router.push("/templates");
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Gagal menyimpan template");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex((it) => it.id === active.id);
        const newIndex = prevItems.findIndex((it) => it.id === over.id);
        const reordered = arrayMove(prevItems, oldIndex, newIndex);
        return reordered.map((it, idx) => ({ ...it, order: idx + 1 }));
      });
    }
  };

  const handleAddItem = () => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label: "Item Persyaratan Baru",
      type: "checkbox",
      required: true,
      editable: true,
      evidenceEnabled: false,
      evidenceRequired: false,
      order: items.length + 1,
      active: true,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setItems(items.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  if (isEditing && isLoadingTemplate) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">
                {isEditing ? "Edit Template Checklist" : "Buat Template Checklist Baru"}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola cetak biru checklist standar yang dapat digunakan pada berbagai workspace kegiatan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSavedNotice && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersimpan!
            </span>
          )}
          <Link href="/templates">
            <Button variant="outline" size="sm" className="text-xs">
              Kembali
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              saveMutation.mutate();
            }}
            disabled={saveMutation.isPending}
            className="gap-1.5 text-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isEditing ? "Simpan Perubahan" : "Buat Template"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {/* Metadata Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Informasi Template
          </CardTitle>
          <CardDescription className="text-xs">
            Beri nama dan deskripsi yang jelas agar mudah dipilih saat pembuatan workspace baru.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name" className="text-xs">
              Nama Template <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              placeholder="Contoh: Checklist Standar Registrasi Seminar / Workshop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc" className="text-xs">
              Deskripsi Template (Opsional)
            </Label>
            <Textarea
              id="tpl-desc"
              placeholder="Jelaskan peruntukan template ini, misal untuk verifikasi berkas teknis, identitas, atau kit peserta..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Daftar Item Persyaratan Checklist</h2>
            <p className="text-xs text-muted-foreground">
              Total {items.length} item checklist terdaftar.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Tambah Item
          </Button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Drag and Drop: </span>
            Gunakan grip (titik enam) untuk mengatur urutan prioritas verifikasi. Urutan ini akan disalin otomatis saat template dipilih di workspace baru.
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  index={idx}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="outline"
          onClick={handleAddItem}
          className="w-full py-4 border-dashed border-2 text-xs gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Item Checklist Baru
        </Button>
      </div>
    </div>
  );
}

