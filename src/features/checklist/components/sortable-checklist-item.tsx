"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChecklistItem, ChecklistFieldType } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GripVertical, Trash2 } from "lucide-react";

interface SortableChecklistItemProps {
  item: ChecklistItem;
  index: number;
  onUpdate: (id: string, updates: Partial<ChecklistItem>) => void;
  onDelete: (id: string) => void;
}

export function SortableChecklistItem({
  item,
  index,
  onUpdate,
  onDelete,
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border shadow-xs ${isDragging ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-card"}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            {/* Drag Handle */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground touch-none"
                title="Tarik untuk mengubah urutan item"
              >
                <GripVertical className="w-4 h-4" />
              </button>
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
            </div>

            {/* Field Inputs */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Nama Persyaratan / Label</Label>
                <Input
                  value={item.label}
                  onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Tipe Input</Label>
                <select
                  value={item.type}
                  onChange={(e) =>
                    onUpdate(item.id, { type: e.target.value as ChecklistFieldType })
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
                  onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(item.id)}
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
                onCheckedChange={(c) => onUpdate(item.id, { required: Boolean(c) })}
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
                  onUpdate(item.id, { evidenceEnabled: Boolean(c) })
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
                    onUpdate(item.id, { evidenceRequired: Boolean(c) })
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
    </div>
  );
}

