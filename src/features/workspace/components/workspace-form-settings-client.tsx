"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { FormField, Participant } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  FileCheck2,
  Plus,
  FolderPlus,
  PlusCircle,
  BookmarkPlus,
  BookmarkCheck,
  ChevronDown,
  Loader2,
  FolderTree,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnSourceList } from "@/features/form/components/column-source-list";
import { FormFieldRowItem } from "@/features/form/components/form-field-row-item";
import { FormFieldEditorDrawer } from "@/features/form/components/form-field-editor-drawer";
import { SectionDialog } from "@/features/form/components/section-dialog";
import { ApplyTemplateDialog } from "@/features/form/components/apply-template-dialog";
import { FormTemplate } from "@/types/domain";
import { detectFieldType } from "@/lib/domain/drive-detector";

export function WorkspaceFormSettingsClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Workspace detail
  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  // Associated template if workspace has templateId
  const { data: associatedTemplate } = useQuery({
    queryKey: ["template", workspace?.templateId],
    queryFn: () => (workspace?.templateId ? api.getTemplate(workspace.templateId) : null),
    enabled: Boolean(workspace?.templateId),
  });

  // Existing Form fields
  const { data: initialItems = [] } = useQuery({
    queryKey: ["workspaceForm", workspaceId],
    queryFn: () => api.getWorkspaceForm(workspaceId),
  });

  // All Templates list for "Pilih Template" feature
  const { data: allTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.getTemplates(),
  });

  // Participants data to detect Excel columns and sample values
  const { data: participants = [] } = useQuery({
    queryKey: ["participants", workspaceId],
    queryFn: () => api.getParticipants(workspaceId),
  });

  const [items, setItems] = useState<FormField[]>([]);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Section Modal State
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FormField | null>(null);
  const [pendingSectionInsertIndex, setPendingSectionInsertIndex] = useState<number | undefined>(undefined);

  // Save as Template Modal State
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateSavedNotice, setTemplateSavedNotice] = useState<string | null>(null);

  // Apply Template Modal State
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems([...initialItems]);
    }
  }, [initialItems]);

  // Extract unique columns from participant data (prioritizes workspace.importHeaders order if available)
  const { availableColumnsList, availableColumnNames } = useMemo(() => {
    const colMap = new Map<string, string>(); // colName -> sampleValue

    // Inisialisasi urutan awal dengan importHeaders asli jika ada
    if (workspace?.importHeaders && Array.isArray(workspace.importHeaders)) {
      workspace.importHeaders.forEach((h: string) => {
        if (!h.startsWith("_")) {
          colMap.set(h, "");
        }
      });
    }

    participants.forEach((p: Participant) => {
      if (p.data && typeof p.data === "object") {
        Object.entries(p.data).forEach(([key, val]) => {
          if (key.startsWith("_")) return;
          if (!colMap.has(key)) {
            colMap.set(key, val !== undefined && val !== null ? String(val) : "");
          } else if (!colMap.get(key) && val) {
            colMap.set(key, String(val));
          }
        });
      }
    });

    const usedColumnNames = new Set(
      items
        .filter((it) => it.sourceType === "excel_column" && it.excelColumn)
        .map((it) => it.excelColumn!)
    );

    const list = Array.from(colMap.entries()).map(([colName, sample]) => ({
      name: colName,
      sampleValue: sample,
      isUsed: usedColumnNames.has(colName),
    }));

    return {
      availableColumnsList: list,
      availableColumnNames: Array.from(colMap.keys()),
    };
  }, [participants, items]);

  const saveMutation = useMutation({
    mutationFn: (updatedItems: FormField[]) =>
      api.saveWorkspaceForm(workspaceId, updatedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceForm", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceChecklist", workspaceId] });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    },
  });

  const updateExistingTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!associatedTemplate) {
        throw new Error("Template tidak ditemukan");
      }
      const now = new Date().toISOString();
      const updatedTemplate = {
        ...associatedTemplate,
        sampleColumns: availableColumnNames,
        items: items.map((it, idx) => ({
          ...it,
          order: idx + 1,
        })),
        updatedAt: now,
      };
      return api.saveTemplate(updatedTemplate);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", data.id] });
      setTemplateSavedNotice(`Template "${data.name}" Berhasil Diperbarui!`);
      setTimeout(() => setTemplateSavedNotice(null), 4000);
    },
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const newTemplate = {
        id: `tpl-${Date.now().toString(36)}`,
        name: templateName.trim() || `Template dari ${workspace?.name || "Workspace"}`,
        description: templateDesc.trim() || undefined,
        sampleColumns: availableColumnNames,
        items: items.map((it) => ({
          ...it,
          id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        })),
        createdAt: now,
        updatedAt: now,
      };
      const created = await api.saveTemplate(newTemplate);
      // Hubungkan workspace ini dengan template baru
      if (workspaceId) {
        await api.updateWorkspace(workspaceId, { templateId: created.id });
      }
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["template", data.id] });
      setSaveTemplateDialogOpen(false);
      setTemplateSavedNotice(`Template Baru "${data.name}" Tersimpan!`);
      setTimeout(() => setTemplateSavedNotice(null), 4000);
    },
  });

  const handleOpenSaveTemplateModal = () => {
    setTemplateName(workspace?.name ? `Template ${workspace.name}` : "Template Form Baru");
    setTemplateDesc(workspace?.description ? `Dibuat dari workspace: ${workspace.name}` : "");
    setSaveTemplateDialogOpen(true);
  };

  // Handler to apply template
  const handleApplyTemplate = async (template: FormTemplate, mode: "replace" | "append") => {
    // Generate fresh IDs for items to avoid clashes
    const newItemsFromTemplate: FormField[] = (template.items || []).map((it) => ({
      ...it,
      id: `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    }));

    if (mode === "replace") {
      const finalItems = newItemsFromTemplate.map((it, idx) => ({ ...it, order: idx + 1 }));
      setItems(finalItems);
    } else {
      setItems((prev) => {
        const combined = [...prev, ...newItemsFromTemplate];
        return combined.map((it, idx) => ({ ...it, order: idx + 1 }));
      });
    }

    // Hubungkan workspace ini dengan template yang dipilih
    if (workspaceId && template.id) {
      try {
        await api.updateWorkspace(workspaceId, { templateId: template.id });
        queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["template", template.id] });
      } catch (err) {
        console.error("Gagal mengaitkan template ke workspace:", err);
      }
    }

    setTemplateSavedNotice(
      mode === "replace"
        ? `Template "${template.name}" Diterapkan (Ganti Form)`
        : `Template "${template.name}" Ditambahkan ke Form`
    );
    setTimeout(() => setTemplateSavedNotice(null), 4000);
  };

  // Helper to smoothly scroll moved item into view if near/outside viewport
  const smoothScrollToItem = (id: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`form-item-row-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  };

  // Move single item up or down
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

  // Helper to get sample values for a column
  const getColumnSamples = (columnName: string) => {
    return participants
      .map((p) => p.data?.[columnName])
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
      .slice(0, 10);
  };

  // Add column from left panel to form
  const handleAddColumn = (columnName: string) => {
    const samples = getColumnSamples(columnName);
    const detectedType = detectFieldType(columnName, samples);
    const newItem: FormField = {
      id: `field-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      label: columnName,
      type: detectedType,
      sourceType: "excel_column",
      excelColumn: columnName,
      required: true,
      editable: true,
      evidenceEnabled: false,
      evidenceRequired: false,
      order: items.length + 1,
      active: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add all unused columns to form
  const handleAddAllColumns = () => {
    const unused = availableColumnsList.filter((c) => !c.isUsed);
    if (unused.length === 0) return;

    const newItems: FormField[] = unused.map((col, idx) => {
      const samples = getColumnSamples(col.name);
      const detectedType = detectFieldType(col.name, samples);
      return {
        id: `field-${Date.now().toString(36)}-${idx}`,
        label: col.name,
        type: detectedType,
        sourceType: "excel_column",
        excelColumn: col.name,
        required: true,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: items.length + idx + 1,
        active: true,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  // Create brand new custom field at specific index (or at end if omitted)
  const handleCreateCustomField = (insertIndex?: number) => {
    const newItem: FormField = {
      id: `field-${Date.now().toString(36)}`,
      label: "Field Form Baru",
      type: "text",
      sourceType: "custom_field",
      required: true,
      editable: true,
      evidenceEnabled: false,
      evidenceRequired: false,
      order: insertIndex !== undefined ? insertIndex + 1 : items.length + 1,
      active: true,
    };
    setItems((prev) => {
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= prev.length) {
        const next = [...prev];
        next.splice(insertIndex, 0, newItem);
        return next;
      }
      return [...prev, newItem];
    });
    setEditingField(newItem);
    setDrawerOpen(true);
  };

  // Open Section modal to create brand new section header at specific index (or at end if omitted)
  const handleOpenCreateSectionModal = (insertIndex?: number) => {
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
      order: insertIndex !== undefined ? insertIndex + 1 : items.length + 1,
      active: true,
    };
    setPendingSectionInsertIndex(insertIndex);
    setEditingSection(tempSection);
    setSectionDialogOpen(true);
  };

  // Open Section modal to edit existing section
  const handleOpenEditSectionModal = (section: FormField) => {
    setPendingSectionInsertIndex(undefined);
    setEditingSection(section);
    setSectionDialogOpen(true);
  };

  // Save section data from modal
  const handleSaveSectionModal = (data: { label: string; description?: string }) => {
    if (editingSection && editingSection.id) {
      // Edit existing
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingSection.id
            ? { ...it, label: data.label, description: data.description }
            : it
        )
      );
    } else {
      // Create new
      const insertIndex = pendingSectionInsertIndex;
      const newSection: FormField = {
        id: `section-${Date.now().toString(36)}`,
        label: data.label,
        description: data.description,
        type: "section",
        sourceType: "custom_field",
        required: false,
        editable: false,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: insertIndex !== undefined ? insertIndex + 1 : items.length + 1,
        active: true,
      };

      setItems((prev) => {
        if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= prev.length) {
          const next = [...prev];
          next.splice(insertIndex, 0, newSection);
          return next;
        }
        return [...prev, newSection];
      });
    }
  };

  // Move an entire section group (the section header + all fields below it until the next section)
  const handleMoveSectionGroup = (sectionId: string, direction: "up" | "down") => {
    setItems((prev) => {
      // Split flat list into blocks: { isSectionBlock, items: FormField[] }
      const blocks: FormField[][] = [];
      let currentBlock: FormField[] = [];

      for (const item of prev) {
        if (item.type === "section") {
          if (currentBlock.length > 0) {
            blocks.push(currentBlock);
          }
          currentBlock = [item];
        } else {
          currentBlock.push(item);
        }
      }
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }

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

  // Move an individual item to a specific section group (or "none" for top of form)
  const handleMoveItemToSection = (itemId: string, targetSectionId: string) => {
    // Kunci posisi scroll semua container yang bisa di-scroll agar halaman tidak lompat
    const saved: Array<{ el: Element; top: number }> = [];
    let node: Element | null = document.getElementById(`form-item-row-${itemId}`);
    while (node) {
      if (node.scrollHeight > node.clientHeight) {
        saved.push({ el: node, top: node.scrollTop });
      }
      node = node.parentElement;
    }
    const scroller = document.scrollingElement;
    if (scroller && !saved.some((s) => s.el === scroller)) {
      saved.push({ el: scroller, top: scroller.scrollTop });
    }
    const restore = () => saved.forEach((s) => ((s.el as HTMLElement).scrollTop = s.top));
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
      setTimeout(restore, 80);
    });

    setItems((prev) => {
      const itemToMove = prev.find((it) => it.id === itemId);
      if (!itemToMove) return prev;

      // Filter out the item first
      const remaining = prev.filter((it) => it.id !== itemId);

      if (targetSectionId === "none") {
        // Move to the very top (before any section)
        const firstSectionIdx = remaining.findIndex((it) => it.type === "section");
        if (firstSectionIdx === -1) {
          // No section exists, append or place at end
          return [...remaining, itemToMove].map((it, idx) => ({ ...it, order: idx + 1 }));
        }
        // Insert right before first section
        const updated = [
          ...remaining.slice(0, firstSectionIdx),
          itemToMove,
          ...remaining.slice(firstSectionIdx),
        ];
        return updated.map((it, idx) => ({ ...it, order: idx + 1 }));
      }

      // Move into target section (at the end of that section's children)
      const targetSecIdx = remaining.findIndex((it) => it.id === targetSectionId);
      if (targetSecIdx === -1) return prev;

      // Find where this section ends (either the next section index or end of array)
      let nextSecIdx = remaining.findIndex(
        (it, idx) => idx > targetSecIdx && it.type === "section"
      );
      if (nextSecIdx === -1) {
        nextSecIdx = remaining.length;
      }

      const updated = [
        ...remaining.slice(0, nextSecIdx),
        itemToMove,
        ...remaining.slice(nextSecIdx),
      ];
      return updated.map((it, idx) => ({ ...it, order: idx + 1 }));
    });
  };

  // Compute section metadata for each item (indent state, field numbering, group move availability)
  const itemLayoutMeta = useMemo(() => {
    const meta = new Map<
      string,
      {
        fieldNumber: number;
        isUnderSection: boolean;
        sectionChildrenCount: number;
        canMoveGroupUp: boolean;
        canMoveGroupDown: boolean;
        currentSectionId: string;
      }
    >();

    // First build blocks to know group boundaries
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
    let currentSecId = "none";

    items.forEach((item) => {
      if (item.type === "section") {
        seenAnySection = true;
        currentSecId = item.id;
        const blockIdx = blocks.findIndex((b) => b[0]?.id === item.id);
        const childrenCount = blockIdx >= 0 ? blocks[blockIdx].length - 1 : 0;
        meta.set(item.id, {
          fieldNumber: 0,
          isUnderSection: false,
          sectionChildrenCount: childrenCount,
          canMoveGroupUp: blockIdx > 0,
          canMoveGroupDown: blockIdx >= 0 && blockIdx < blocks.length - 1,
          currentSectionId: item.id,
        });
      } else {
        fieldCounter += 1;
        meta.set(item.id, {
          fieldNumber: fieldCounter,
          isUnderSection: seenAnySection,
          sectionChildrenCount: 0,
          canMoveGroupUp: false,
          canMoveGroupDown: false,
          currentSectionId: currentSecId,
        });
      }
    });

    return meta;
  }, [items]);

  // List of available sections for dropdown
  const availableSections = useMemo(() => {
    return items
      .filter((it) => it.type === "section")
      .map((it) => ({
        id: it.id,
        label: it.label || "Section Tanpa Judul",
      }));
  }, [items]);

  // Open drawer editor for a field
  const handleOpenEditDrawer = (item: FormField) => {
    if (item.type === "section") {
      handleOpenEditSectionModal(item);
      return;
    }
    setEditingField(item);
    setDrawerOpen(true);
  };

  // Save drawer updates
  const handleSaveDrawerField = (updatedField: FormField) => {
    setItems((prev) =>
      prev.map((it) => (it.id === updatedField.id ? updatedField : it))
    );
  };

  // Delete field from form
  const handleDeleteField = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Duplicate an existing custom field right below it
  const handleDuplicateField = (itemToDuplicate: FormField) => {
    const originalLabel = itemToDuplicate.label || "Field";
    const duplicateLabel = `${originalLabel} (Salinan)`;
    const newFieldId = `field-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const duplicatedItem: FormField = {
      ...itemToDuplicate,
      id: newFieldId,
      label: duplicateLabel,
      options: itemToDuplicate.options ? [...itemToDuplicate.options] : undefined,
    };

    setItems((prev) => {
      const index = prev.findIndex((it) => it.id === itemToDuplicate.id);
      if (index === -1) {
        return [...prev, duplicatedItem].map((it, idx) => ({ ...it, order: idx + 1 }));
      }
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicatedItem);
      return updated.map((it, idx) => ({ ...it, order: idx + 1 }));
    });

    smoothScrollToItem(newFieldId);
  };

  const totalFieldsCount = items.filter((it) => it.type !== "section").length;
  const totalSectionsCount = items.filter((it) => it.type === "section").length;

  // Status status agregat untuk bulk switch
  const nonSectionItems = useMemo(() => items.filter((it) => it.type !== "section"), [items]);
  const allEditable = nonSectionItems.length > 0 && nonSectionItems.every((it) => it.editable !== false);
  const allRequired = nonSectionItems.length > 0 && nonSectionItems.every((it) => it.required === true);

  // Toggle semua editable
  const handleToggleAllEditable = (enable: boolean) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.type === "section") return it;
        return {
          ...it,
          editable: enable,
          // Jika no-edit (enable === false), otomatis no-required
          required: !enable ? false : it.required,
        };
      })
    );
  };

  // Toggle semua required
  const handleToggleAllRequired = (enable: boolean) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.type === "section") return it;
        // Jika field non-editable, required tidak boleh diaktifkan (tetap false)
        if (enable && it.editable === false) {
          return it;
        }
        return {
          ...it,
          required: enable,
        };
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-20">
      <div className="p-6 max-w-7xl mx-auto w-full space-y-5 flex-1">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Link href={`/workspaces/${workspaceId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Atur Form Workspace</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  Form Builder
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Workspace: <span className="font-semibold text-foreground">{workspace?.name}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {templateSavedNotice && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[220px] truncate">{templateSavedNotice}</span>
              </span>
            )}
            {isSavedNotice && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Perubahan Form Tersimpan!</span>
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApplyTemplateDialogOpen(true)}
              className="gap-1.5 text-xs shadow-xs"
              title="Pilih dan gunakan struktur dari template yang sudah ada"
            >
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              Pilih Template
            </Button>

            {associatedTemplate ? (
              <div className="flex items-center rounded-md border shadow-xs bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateExistingTemplateMutation.mutate()}
                  disabled={items.length === 0 || updateExistingTemplateMutation.isPending}
                  className="h-8 gap-1.5 text-xs rounded-r-none px-2.5 font-medium hover:bg-muted"
                  title={`Perbarui template yang terhubung: ${associatedTemplate.name}`}
                >
                  {updateExistingTemplateMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>Perbarui Template</span>
                </Button>
                <div className="w-[1px] h-4 bg-border" />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 rounded-l-none px-0 hover:bg-muted"
                        title="Opsi Template Lainnya"
                      />
                    }
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={handleOpenSaveTemplateModal}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                      <span>Simpan Sebagai Template Baru</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenSaveTemplateModal}
                disabled={items.length === 0}
                className="gap-1.5 text-xs shadow-xs"
                title="Simpan konfigurasi form saat ini sebagai Master Template"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                Simpan Jadi Template
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => saveMutation.mutate(items)}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Form"}
            </Button>
          </div>
        </div>

        {/* Two-Column Grid: Kiri List Kolom, Kanan Urutan & Setting */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kiri: List Kolom Sumber (4 kolom grid) */}
          <div className="lg:col-span-4 sticky top-6">
            <ColumnSourceList
              availableColumns={availableColumnsList}
              onAddColumn={handleAddColumn}
              onAddAllColumns={handleAddAllColumns}
              onCreateCustomField={handleCreateCustomField}
              onCreateSection={() => handleOpenCreateSectionModal()}
            />
          </div>

          {/* Kanan: Urutan & Pengaturan Form (8 kolom grid) */}
          <div className="lg:col-span-8 space-y-4">
          <Card className="border shadow-xs bg-card">
            <CardHeader className="p-4 pb-3 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  Urutan &amp; Pengelompokan (Section) Form Petugas
                </CardTitle>
                <CardDescription className="text-xs">
                  Tambahkan <strong>Section / Group</strong> untuk mengelompokkan field secara berurutan, atau gunakan tombol panah atas/bawah untuk mengatur posisi.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {nonSectionItems.length > 0 && (
                  <div className="flex items-center gap-3 bg-muted/40 border border-border/80 px-2.5 py-1.5 rounded-lg text-xs">
                    {/* Bulk Switch: Editable to All */}
                    <div className="flex items-center gap-1.5" title="Aktifkan/nonaktifkan edit untuk semua field. Jika non-editable, otomatis no required.">
                      <Switch
                        id="bulk-toggle-editable"
                        checked={allEditable}
                        onCheckedChange={handleToggleAllEditable}
                        className="scale-75 origin-center"
                      />
                      <Label
                        htmlFor="bulk-toggle-editable"
                        className="text-[11px] font-medium cursor-pointer select-none text-muted-foreground hover:text-foreground"
                      >
                        {allEditable ? "Semua Editable" : "Non-Editable Semua"}
                      </Label>
                    </div>

                    <div className="w-[1px] h-3.5 bg-border" />

                    {/* Bulk Switch: Required to All */}
                    <div className="flex items-center gap-1.5" title="Aktifkan/nonaktifkan wajib isi untuk semua field yang editable.">
                      <Switch
                        id="bulk-toggle-required"
                        checked={allRequired}
                        disabled={!allEditable && nonSectionItems.every((it) => it.editable === false)}
                        onCheckedChange={handleToggleAllRequired}
                        className="scale-75 origin-center"
                      />
                      <Label
                        htmlFor="bulk-toggle-required"
                        className={`text-[11px] font-medium cursor-pointer select-none ${
                          !allEditable && nonSectionItems.every((it) => it.editable === false)
                            ? "text-muted-foreground/50 cursor-not-allowed"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {allRequired ? "Semua Wajib" : "No Required Semua"}
                      </Label>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {totalSectionsCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {totalSectionsCount} Grup
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {totalFieldsCount} Field
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-16 px-4 border border-dashed rounded-lg text-xs text-muted-foreground space-y-3 bg-muted/20">
                  <p className="font-medium text-foreground">Belum ada field di form ini</p>
                  <p className="max-w-md mx-auto">
                    Pilih kolom dari panel sebelah kiri, buat Section Grup, atau klik tombol &quot;Field Baru&quot; untuk menyusun pertanyaan form peserta.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddAllColumns}
                      disabled={availableColumnsList.length === 0}
                      className="text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Gunakan Semua Kolom Excel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenCreateSectionModal()}
                      className="text-xs gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Buat Section Grup
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1" style={{ overflowAnchor: "none" }}>
                  {/* Insertion divider di posisi paling atas (index 0) */}
                  <InsertDivider
                    onAddCustomField={() => handleCreateCustomField(0)}
                    onAddSection={() => handleOpenCreateSectionModal(0)}
                  />

                  {items.map((item, idx) => {
                    const info = itemLayoutMeta.get(item.id);
                    return (
                      <div key={item.id} className="space-y-1">
                        <FormFieldRowItem
                          item={item}
                          index={idx}
                          fieldNumber={info?.fieldNumber}
                          isUnderSection={info?.isUnderSection}
                          sectionChildrenCount={info?.sectionChildrenCount}
                          canMoveUp={idx > 0}
                          canMoveDown={idx < items.length - 1}
                          onMoveUp={(id) => handleMoveItem(id, "up")}
                          onMoveDown={(id) => handleMoveItem(id, "down")}
                          canMoveGroupUp={info?.canMoveGroupUp}
                          canMoveGroupDown={info?.canMoveGroupDown}
                          availableSections={availableSections}
                          currentSectionId={info?.currentSectionId}
                          onMoveGroupUp={(secId) => handleMoveSectionGroup(secId, "up")}
                          onMoveGroupDown={(secId) => handleMoveSectionGroup(secId, "down")}
                          onMoveToSection={handleMoveItemToSection}
                          onEdit={handleOpenEditDrawer}
                          onDuplicate={handleDuplicateField}
                          onDelete={handleDeleteField}
                        />
                        {/* Insertion divider di bawah setiap item (index idx + 1) */}
                        <InsertDivider
                          onAddCustomField={() => handleCreateCustomField(idx + 1)}
                          onAddSection={() => handleOpenCreateSectionModal(idx + 1)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      {/* Fixed Bottom Bar Full Width */}
      <div className="fixed bottom-0 inset-x-0 z-30 w-full border-t border-border bg-background/95 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/workspaces/${workspaceId}`}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Button>
            </Link>

            <div className="h-4 w-px bg-border hidden sm:block" />

            <div className="text-xs text-muted-foreground hidden md:block">
              Total: <span className="font-semibold text-foreground">{totalFieldsCount}</span> field
              {totalSectionsCount > 0 && (
                <> &bull; <span className="font-semibold text-foreground">{totalSectionsCount}</span> seksi</>
              )}
            </div>
            {templateSavedNotice && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[200px] truncate">{templateSavedNotice}</span>
              </span>
            )}
            {isSavedNotice && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Perubahan Form Tersimpan!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setApplyTemplateDialogOpen(true)}
              className="gap-1.5 text-xs shadow-xs"
              title="Pilih dan gunakan struktur dari template yang sudah ada"
            >
              <FolderTree className="w-3.5 h-3.5 text-primary" />
              Pilih Template
            </Button>

            {associatedTemplate ? (
              <div className="flex items-center rounded-md border shadow-xs bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateExistingTemplateMutation.mutate()}
                  disabled={items.length === 0 || updateExistingTemplateMutation.isPending}
                  className="h-8 gap-1.5 text-xs rounded-r-none px-2.5 font-medium hover:bg-muted"
                  title={`Perbarui template yang terhubung: ${associatedTemplate.name}`}
                >
                  {updateExistingTemplateMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span>Perbarui Template</span>
                </Button>
                <div className="w-[1px] h-4 bg-border" />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 rounded-l-none px-0 hover:bg-muted"
                        title="Opsi Template Lainnya"
                      />
                    }
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={handleOpenSaveTemplateModal}
                      className="text-xs cursor-pointer gap-2"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                      <span>Simpan Sebagai Template Baru</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenSaveTemplateModal}
                disabled={items.length === 0}
                className="gap-1.5 text-xs shadow-xs"
                title="Simpan konfigurasi form saat ini sebagai Master Template"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Simpan Jadi</span> Template
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => saveMutation.mutate(items)}
              disabled={saveMutation.isPending}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Form"}
            </Button>
          </div>
        </div>
      </div>

      {/* Drawer Editor Panel Sisi Kanan (Untuk Field Input) */}
      <FormFieldEditorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        field={editingField}
        availableColumns={availableColumnNames}
        onSave={handleSaveDrawerField}
        onDelete={handleDeleteField}
      />

      {/* Modal Dialog Modular untuk Section / Group */}
      <SectionDialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        section={editingSection}
        onSave={handleSaveSectionModal}
        onDelete={handleDeleteField}
      />

      {/* Modal Dialog Simpan Sebagai Master Template */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-primary" />
              Simpan sebagai Master Template
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simpan seluruh susunan {items.length} item form dan pengaturannya sebagai template global. Template ini bisa dipakai kembali di workspace lain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="text-xs font-semibold">
                Nama Master Template <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Contoh: Form Registrasi Standar Peserta"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc" className="text-xs font-semibold">
                Deskripsi Singkat (Opsional)
              </Label>
              <Textarea
                id="tpl-desc"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Catatan tujuan atau petunjuk pemakaian template..."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="p-3 bg-muted/60 rounded-md border text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Ringkasan Konfigurasi:</p>
              <p>• {totalSectionsCount} Seksi / Grup</p>
              <p>• {totalFieldsCount} Input Checklist Form</p>
              <p>• {availableColumnNames.length} Kolom sampel referensi</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveTemplateDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveAsTemplateMutation.mutate()}
              disabled={!templateName.trim() || saveAsTemplateMutation.isPending}
              className="text-xs gap-1.5"
            >
              {saveAsTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Simpan Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <ApplyTemplateDialog
        open={applyTemplateDialogOpen}
        onOpenChange={setApplyTemplateDialogOpen}
        templates={allTemplates}
        isLoadingTemplates={isLoadingTemplates}
        currentItemsCount={items.length}
        currentTemplateId={workspace?.templateId}
        onApplyTemplate={handleApplyTemplate}
      />
    </div>
  );
}

// Backward compatibility export
export const WorkspaceChecklistSettingsClient = WorkspaceFormSettingsClient;

function InsertDivider({
  onAddCustomField,
  onAddSection,
}: {
  onAddCustomField: () => void;
  onAddSection: () => void;
}) {
  return (
    <div className="group/divider relative flex items-center justify-center py-1 my-[-4px] z-10 transition-all">
      {/* Garis indikator horizontal tipis yang menyala saat hover */}
      <div className="absolute inset-x-0 h-px bg-transparent group-hover/divider:bg-primary/30 transition-colors pointer-events-none" />

      {/* Trigger Button dengan Popover/Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative h-6 w-6 rounded-full opacity-0 group-hover/divider:opacity-100 transition-opacity bg-background border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground shadow-xs scale-90 hover:scale-100"
            />
          }
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="sr-only">Tambah Field atau Section</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" side="bottom" className="w-48">
          <DropdownMenuItem onClick={onAddCustomField} className="text-xs cursor-pointer gap-2">
            <PlusCircle className="h-4 w-4 text-primary" />
            <span>Field Baru</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddSection} className="text-xs cursor-pointer gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            <span>Section / Group Baru</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
