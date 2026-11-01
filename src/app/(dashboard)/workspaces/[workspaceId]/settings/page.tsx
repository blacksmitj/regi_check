"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ChecklistItem, ChecklistFieldType } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

export default function WorkspaceChecklistSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.workspaceId;
  const queryClient = useQueryClient();

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  const { data: initialItems = [] } = useQuery({
    queryKey: ["workspaceChecklist", workspaceId],
    queryFn: () => api.getWorkspaceChecklist(workspaceId),
  });

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Sync initial items when loaded
  if (items.length === 0 && initialItems.length > 0) {
    setItems([...initialItems]);
  }

  const saveMutation = useMutation({
    mutationFn: (updatedItems: ChecklistItem[]) =>
      api.saveWorkspaceChecklist(workspaceId, updatedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceChecklist", workspaceId] });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    },
  });

  const handleAddItem = () => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now().toString(36)}`,
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

  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    const temp = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = temp;
    // update order numbers
    reordered.forEach((it, i) => (it.order = i + 1));
    setItems(reordered);
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${workspaceId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pengaturan Checklist Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workspace: <span className="font-semibold text-foreground">{workspace?.name}</span>
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
          <Button size="sm" onClick={() => saveMutation.mutate(items)} className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" />
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Catatan PRD §5.3 & §19: </span>
          Perubahan item checklist di sini bersifat independen khusus workspace ini, tidak mengubah template global, dan jawaban lama peserta tetap dipertahankan saat status kelengkapan dihitung ulang.
        </div>
      </div>

      {/* Checklist items list */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <Card key={item.id} className="border shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      disabled={idx === items.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Nama Persyaratan / Label</Label>
                    <Input
                      value={item.label}
                      onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Tipe Input</Label>
                    <select
                      value={item.type}
                      onChange={(e) =>
                        handleUpdateItem(item.id, { type: e.target.value as ChecklistFieldType })
                      }
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
                    >
                      <option value="checkbox">Checkbox (Ya / Tidak)</option>
                      <option value="text">Teks Singkat</option>
                      <option value="textarea">Teks Panjang</option>
                      <option value="phone">Nomor Telepon</option>
                      <option value="number">Angka</option>
                      <option value="date">Tanggal</option>
                      <option value="select">Pilihan Dropdown</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-[11px]">Petunjuk Pengisian</Label>
                    <Input
                      value={item.description || ""}
                      placeholder="Instruksi verifikasi..."
                      onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  title="Hapus Item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Toggles: Required & Evidence */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60 text-xs">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`req-${item.id}`}
                    checked={item.required}
                    onCheckedChange={(c) => handleUpdateItem(item.id, { required: Boolean(c) })}
                  />
                  <Label htmlFor={`req-${item.id}`} className="cursor-pointer font-medium">
                    Wajib Lengkap (Required)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`evi-${item.id}`}
                    checked={item.evidenceEnabled}
                    onCheckedChange={(c) =>
                      handleUpdateItem(item.id, { evidenceEnabled: Boolean(c) })
                    }
                  />
                  <Label htmlFor={`evi-${item.id}`} className="cursor-pointer font-medium">
                    Upload Berkas Bukti (IndexedDB)
                  </Label>
                </div>

                {item.evidenceEnabled && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`evireq-${item.id}`}
                      checked={item.evidenceRequired}
                      onCheckedChange={(c) =>
                        handleUpdateItem(item.id, { evidenceRequired: Boolean(c) })
                      }
                    />
                    <Label htmlFor={`evireq-${item.id}`} className="cursor-pointer text-rose-600 font-medium">
                      Bukti Wajib Diunggah
                    </Label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

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

