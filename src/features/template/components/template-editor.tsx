"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { FormField, FormTemplate } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
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
  FolderPlus,
} from "lucide-react";
import { SortableFormFieldItem } from "@/features/form/components/sortable-form-field-item";
import { SectionDialog } from "@/features/form/components/section-dialog";
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
  const [sampleColumns, setSampleColumns] = useState<string[]>([]);
  const [newColumnInput, setNewColumnInput] = useState("");
  const [items, setItems] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Section Modal State
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FormField | null>(null);

  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name);
      setDescription(initialTemplate.description || "");
      setSampleColumns(initialTemplate.sampleColumns || []);
      setItems(initialTemplate.items || []);
    } else if (!isEditing && items.length === 0) {
      // Provide default starting items for new template
      setSampleColumns([
        "Foto Profil",
        "NIK",
        "Nama Lengkap",
        "Nomor HP",
        "Email",
        "Nominal Pembayaran",
      ]);
      setItems([
        {
          id: `item-${Date.now().toString(36)}-1`,
          label: "Foto Profil Peserta",
          type: "image",
          sourceType: "excel_column",
          excelColumn: "Foto Profil",
          required: false,
          editable: true,
          evidenceEnabled: false,
          evidenceRequired: false,
          order: 1,
          active: true,
        },
        {
          id: `item-${Date.now().toString(36)}-2`,
          label: "NIK Peserta",
          type: "text",
          sourceType: "excel_column",
          excelColumn: "NIK",
          required: true,
          editable: true,
          evidenceEnabled: false,
          evidenceRequired: false,
          order: 2,
          active: true,
        },
        {
          id: `item-${Date.now().toString(36)}-3`,
          label: "Nama Lengkap",
          type: "text",
          sourceType: "excel_column",
          excelColumn: "Nama Lengkap",
          required: true,
          editable: true,
          evidenceEnabled: false,
          evidenceRequired: false,
          order: 3,
          active: true,
        },
        {
          id: `item-${Date.now().toString(36)}-4`,
          label: "Pemeriksaan KTP Fisik",
          type: "checkbox",
          sourceType: "checklist_input",
          required: true,
          editable: true,
          evidenceEnabled: true,
          evidenceRequired: true,
          order: 4,
          active: true,
        },
      ]);
    }
  }, [initialTemplate, isEditing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Nama template wajib diisi.");
      }
      if (items.length === 0) {
        throw new Error("Template harus memiliki minimal 1 field form.");
      }

      const id = templateId || `tpl-${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const payload: FormTemplate = {
        id,
        name: name.trim(),
        description: description.trim(),
        sampleColumns,
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

  const smoothScrollToItem = (id: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`form-item-row-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  };

  const handleMoveItem = (id: string, direction: "up" | "down") => {
    setItems((prev) => {
      const index = prev.findIndex((it) => it.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated.map((it, idx) => ({ ...it, order: idx + 1 }));
    });
    smoothScrollToItem(id);
  };

  const handleOpenCreateSectionModal = () => {
    const sectionCount = items.filter((it) => it.type === "section").length + 1;
    const tempSection: FormField = {
      id: "",
      label: `Bagian ${sectionCount}: Judul Grup Baru`,
      description: "",
      type: "section",
      sourceType: "custom_field",
      required: false,
      editable: false,
      evidenceEnabled: false,
      evidenceRequired: false,
      order: items.length + 1,
      active: true,
    };
    setEditingSection(tempSection);
    setSectionDialogOpen(true);
  };

  const handleOpenEditSectionModal = (section: FormField) => {
    setEditingSection(section);
    setSectionDialogOpen(true);
  };

  const handleSaveSectionModal = (data: { label: string; description?: string }) => {
    if (editingSection && editingSection.id) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingSection.id
            ? { ...it, label: data.label, description: data.description }
            : it
        )
      );
    } else {
      const newSection: FormField = {
        id: `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        label: data.label,
        description: data.description,
        type: "section",
        sourceType: "custom_field",
        required: false,
        editable: false,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: items.length + 1,
        active: true,
      };
      setItems((prev) => [...prev, newSection]);
    }
  };

  const handleAddItem = (
    source: "custom_field" | "excel_column" | "checklist_input" | "section" = "custom_field"
  ) => {
    if (source === "section") {
      handleOpenCreateSectionModal();
      return;
    }

    const newItem: FormField = {
      id: `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label: source === "excel_column" ? "Kolom Profil Peserta" : "Field Form Baru",
      type: source === "excel_column" ? "text" : "text",
      sourceType: source === "excel_column" ? "excel_column" : "custom_field",
      excelColumn: source === "excel_column" && sampleColumns.length > 0 ? sampleColumns[0] : undefined,
      required: true,
      editable: true,
      evidenceEnabled: false,
      evidenceRequired: false,
      order: items.length + 1,
      active: true,
    };
    setItems([...items, newItem]);
  };

  const handleMoveSectionGroup = (sectionId: string, direction: "up" | "down") => {
    setItems((prev) => {
      const blocks: FormField[][] = [];
      let currentBlock: FormField[] = [];

      for (const item of prev) {
        if (item.type === "section") {
          if (currentBlock.length > 0) blocks.push(currentBlock);
          currentBlock = [item];
        } else {
          currentBlock.push(item);
        }
      }
      if (currentBlock.length > 0) blocks.push(currentBlock);

      const blockIdx = blocks.findIndex((b) => b[0]?.id === sectionId);
      if (blockIdx === -1) return prev;

      const targetIdx = direction === "up" ? blockIdx - 1 : blockIdx + 1;
      if (targetIdx < 0 || targetIdx >= blocks.length) return prev;

      const updatedBlocks = [...blocks];
      const [movedBlock] = updatedBlocks.splice(blockIdx, 1);
      updatedBlocks.splice(targetIdx, 0, movedBlock);
      return updatedBlocks.flat().map((it, idx) => ({ ...it, order: idx + 1 }));
    });
    smoothScrollToItem(sectionId);
  };

  const itemLayoutMeta = useMemo(() => {
    const meta = new Map<
      string,
      {
        fieldNumber: number;
        isUnderSection: boolean;
        canMoveGroupUp: boolean;
        canMoveGroupDown: boolean;
      }
    >();

    const blocks: FormField[][] = [];
    let currentBlock: FormField[] = [];
    for (const item of items) {
      if (item.type === "section") {
        if (currentBlock.length > 0) blocks.push(currentBlock);
        currentBlock = [item];
      } else {
        currentBlock.push(item);
      }
    }
    if (currentBlock.length > 0) blocks.push(currentBlock);

    let fieldCounter = 0;
    let seenAnySection = false;

    items.forEach((item) => {
      if (item.type === "section") {
        seenAnySection = true;
        const blockIdx = blocks.findIndex((b) => b[0]?.id === item.id);
        meta.set(item.id, {
          fieldNumber: 0,
          isUnderSection: false,
          canMoveGroupUp: blockIdx > 0,
          canMoveGroupDown: blockIdx >= 0 && blockIdx < blocks.length - 1,
        });
      } else {
        fieldCounter += 1;
        meta.set(item.id, {
          fieldNumber: fieldCounter,
          isUnderSection: seenAnySection,
          canMoveGroupUp: false,
          canMoveGroupDown: false,
        });
      }
    });

    return meta;
  }, [items]);

  const handleUpdateItem = (id: string, updates: Partial<FormField>) => {
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
                {isEditing ? "Edit Template Form" : "Buat Template Form Baru"}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola cetak biru form standar yang dapat digunakan pada berbagai workspace kegiatan.
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
            Informasi Template Form
          </CardTitle>
          <CardDescription className="text-xs">
            Beri nama dan tentukan kolom-kolom Excel yang ingin dimapping menjadi tampilan foto, profil, atau field isian form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup className="gap-4">
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="tpl-name" className="text-xs">
                Nama Template <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="tpl-name"
                placeholder="Contoh: Formulir Pendaftaran & Data Peserta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
              />
            </Field>
            <Field className="space-y-1.5">
              <FieldLabel htmlFor="tpl-desc" className="text-xs">
                Deskripsi Template (Opsional)
              </FieldLabel>
              <Textarea
                id="tpl-desc"
                placeholder="Jelaskan peruntukan template ini..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </Field>

            {/* Kolom Contoh Excel untuk Mapping */}
            <Field className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <FieldLabel className="text-xs font-semibold">Daftar Kolom Excel yang Tersedia</FieldLabel>
                  <p className="text-[11px] text-muted-foreground">
                    Nama header kolom dari Excel (misal: Foto, NIK, Nama, Omset). Memudahkan mapping ke field di bawah.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                {sampleColumns.map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
                  >
                    {col}
                    <button
                      type="button"
                      onClick={() => setSampleColumns(sampleColumns.filter((c) => c !== col))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}

                <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                  <Input
                    placeholder="Tambah nama kolom..."
                    value={newColumnInput}
                    onChange={(e) => setNewColumnInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newColumnInput.trim()) {
                        e.preventDefault();
                        if (!sampleColumns.includes(newColumnInput.trim())) {
                          setSampleColumns([...sampleColumns, newColumnInput.trim()]);
                        }
                        setNewColumnInput("");
                      }
                    }}
                    className="text-xs h-7 w-44"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      if (newColumnInput.trim() && !sampleColumns.includes(newColumnInput.trim())) {
                        setSampleColumns([...sampleColumns, newColumnInput.trim()]);
                        setNewColumnInput("");
                      }
                    }}
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Form Fields Builder */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Daftar Field Form</h2>
            <p className="text-xs text-muted-foreground">
              Total {items.length} field terdaftar (kombinasi mapping Excel dan field tambahan admin).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleAddItem("section")}
              className="gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              + Section / Group
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddItem("excel_column")}
              className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/5"
            >
              <Plus className="w-3.5 h-3.5" />
              + Kolom Excel
            </Button>
            <Button
              size="sm"
              onClick={() => handleAddItem("custom_field")}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              + Field Form Baru
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex items-start gap-2.5 text-xs text-foreground">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <div>
            <span className="font-semibold">Urutan &amp; Section Group: </span>
            Tambahkan <strong>Section / Group</strong> untuk mengelompokkan field secara berurutan, atau gunakan tombol panah atas/bawah untuk mengatur posisi setiap item.
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const info = itemLayoutMeta.get(item.id);
            return (
              <SortableFormFieldItem
                key={item.id}
                item={item}
                index={idx}
                fieldNumber={info?.fieldNumber}
                isUnderSection={info?.isUnderSection}
                canMoveUp={idx > 0}
                canMoveDown={idx < items.length - 1}
                onMoveUp={(id) => handleMoveItem(id, "up")}
                onMoveDown={(id) => handleMoveItem(id, "down")}
                canMoveGroupUp={info?.canMoveGroupUp}
                canMoveGroupDown={info?.canMoveGroupDown}
                onMoveGroupUp={(secId) => handleMoveSectionGroup(secId, "up")}
                onMoveGroupDown={(secId) => handleMoveSectionGroup(secId, "down")}
                availableColumns={sampleColumns}
                onUpdate={handleUpdateItem}
                onEditSection={handleOpenEditSectionModal}
                onDelete={handleDeleteItem}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => handleAddItem("section")}
            className="py-4 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 text-xs gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            Tambah Section / Group
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddItem("excel_column")}
            className="py-4 border-dashed border-2 text-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Kolom Mapping Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAddItem("custom_field")}
            className="py-4 border-dashed border-2 text-xs gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Field Form Baru
          </Button>
        </div>
      </div>

      {/* Modal Dialog Modular untuk Section / Group */}
      <SectionDialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        section={editingSection}
        onSave={handleSaveSectionModal}
        onDelete={handleDeleteItem}
      />
    </div>
  );
}

