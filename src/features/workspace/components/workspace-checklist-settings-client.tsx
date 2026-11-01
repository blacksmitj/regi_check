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
import { ColumnSourceList } from "@/features/form/components/column-source-list";
import { FormFieldRowItem } from "@/features/form/components/form-field-row-item";
import { FormFieldEditorDrawer } from "@/features/form/components/form-field-editor-drawer";
import { detectFieldType } from "@/lib/domain/drive-detector";

export function WorkspaceFormSettingsClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Workspace detail
  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });

  // Existing Form fields
  const { data: initialItems = [] } = useQuery({
    queryKey: ["workspaceForm", workspaceId],
    queryFn: () => api.getWorkspaceForm(workspaceId),
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

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems([...initialItems]);
    }
  }, [initialItems]);

  // Extract unique columns from participant data
  const { availableColumnsList, availableColumnNames } = useMemo(() => {
    const colMap = new Map<string, string>(); // colName -> sampleValue
    participants.forEach((p: Participant) => {
      if (p.data && typeof p.data === "object") {
        Object.entries(p.data).forEach(([key, val]) => {
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
    mutationFn: (updatedItems: FormField[]) =>
      api.saveWorkspaceForm(workspaceId, updatedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceForm", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaceChecklist", workspaceId] });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    },
  });

  // Drag End handler
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

  // Create brand new custom field
  const handleCreateCustomField = () => {
    const newItem: FormField = {
      id: `field-${Date.now().toString(36)}`,
      label: "Field Form Baru",
      type: "text",
      sourceType: "custom_field",
      required: true,
      editable: true,
      evidenceEnabled: false,
      evidenceRequired: false,
      order: items.length + 1,
      active: true,
    };
    setItems((prev) => [...prev, newItem]);
    setEditingField(newItem);
    setDrawerOpen(true);
  };

  // Create brand new section header
  const handleCreateSection = () => {
    const sectionCount = items.filter((it) => it.type === "section").length + 1;
    const newSection: FormField = {
      id: `section-${Date.now().toString(36)}`,
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
    setItems((prev) => [...prev, newSection]);
    setEditingField(newSection);
    setDrawerOpen(true);
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

      const swappedBlocks = arrayMove(blocks, blockIdx, targetIdx);
      return swappedBlocks.flat().map((it, idx) => ({ ...it, order: idx + 1 }));
    });
  };

  // Move an individual item to a specific section group (or "none" for top of form)
  const handleMoveItemToSection = (itemId: string, targetSectionId: string) => {
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

  const totalFieldsCount = items.filter((it) => it.type !== "section").length;
  const totalSectionsCount = items.filter((it) => it.type === "section").length;

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-5">
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

        <div className="flex items-center gap-2">
          {isSavedNotice && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Perubahan Form Tersimpan!
            </span>
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
            onCreateSection={handleCreateSection}
          />
        </div>

        {/* Kanan: Urutan & Pengaturan Form (8 kolom grid) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border shadow-xs bg-card">
            <CardHeader className="p-4 pb-3 border-b border-border/70 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  Urutan &amp; Pengelompokan (Section) Form Petugas
                </CardTitle>
                <CardDescription className="text-xs">
                  Tambahkan <strong>Section / Group</strong> untuk mengelompokkan field secara berurutan, atau geser dengan grip titik enam.
                </CardDescription>
              </div>
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
                      onClick={handleCreateSection}
                      className="text-xs gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Buat Section Grup
                    </Button>
                  </div>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((it) => it.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2.5">
                      {items.map((item, idx) => {
                        const info = itemLayoutMeta.get(item.id);
                        return (
                          <FormFieldRowItem
                            key={item.id}
                            item={item}
                            index={idx}
                            fieldNumber={info?.fieldNumber}
                            isUnderSection={info?.isUnderSection}
                            sectionChildrenCount={info?.sectionChildrenCount}
                            canMoveGroupUp={info?.canMoveGroupUp}
                            canMoveGroupDown={info?.canMoveGroupDown}
                            availableSections={availableSections}
                            currentSectionId={info?.currentSectionId}
                            onMoveGroupUp={(secId) => handleMoveSectionGroup(secId, "up")}
                            onMoveGroupDown={(secId) => handleMoveSectionGroup(secId, "down")}
                            onMoveToSection={handleMoveItemToSection}
                            onEdit={handleOpenEditDrawer}
                            onDelete={handleDeleteField}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Bottom Action Buttons: Add Section or Add Custom Field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCreateSection}
                  className="py-4 border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 text-xs gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  Tambah Section / Group Baru
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCreateCustomField}
                  className="py-4 border-dashed border-2 text-xs gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Field Form Baru
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drawer Editor Panel Sisi Kanan */}
      <FormFieldEditorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        field={editingField}
        availableColumns={availableColumnNames}
        onSave={handleSaveDrawerField}
        onDelete={handleDeleteField}
      />
    </div>
  );
}

// Backward compatibility export
export const WorkspaceChecklistSettingsClient = WorkspaceFormSettingsClient;
