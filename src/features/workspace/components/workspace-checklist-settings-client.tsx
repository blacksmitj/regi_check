"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ChecklistItem } from "@/types/domain";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
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

export function WorkspaceChecklistSettingsClient({ workspaceId }: { workspaceId: string }) {
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

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems([...initialItems]);
    }
  }, [initialItems]);

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
    mutationFn: (updatedItems: ChecklistItem[]) =>
      api.saveWorkspaceChecklist(workspaceId, updatedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaceChecklist", workspaceId] });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
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
            <h1 className="text-xl font-bold tracking-tight">Checklist Builder Drag-and-Drop</h1>
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
          <span className="font-semibold">Drag and Drop: </span>
          Gunakan pegangan grip (titik enam) untuk menggeser urutan prioritas pemeriksaan. Urutan ini otomatis menjadi urutan form petugas dan kolom ekspor laporan.
        </div>
      </div>

      {/* DND Kit Sortable Context */}
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
  );
}

