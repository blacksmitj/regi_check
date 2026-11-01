"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FormField } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  GripVertical,
  Settings,
  Trash2,
  FileSpreadsheet,
  PlusSquare,
  Camera,
  CheckCircle2,
} from "lucide-react";

interface FormFieldRowItemProps {
  item: FormField;
  index: number;
  onEdit: (item: FormField) => void;
  onDelete: (id: string) => void;
  onToggleActive?: (id: string, active: boolean) => void;
}

export function FormFieldRowItem({
  item,
  index,
  onEdit,
  onDelete,
  onToggleActive,
}: FormFieldRowItemProps) {
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
    opacity: isDragging ? 0.6 : 1,
  };

  const isExcel = item.sourceType === "excel_column";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between gap-3 p-3 bg-card border rounded-lg transition-all ${
        isDragging
          ? "border-primary ring-2 ring-primary/20 shadow-md bg-accent/20"
          : "hover:border-border/80 hover:shadow-xs"
      }`}
    >
      {/* Kiri: Drag Handle + Nomor Urut + Nama/Tipe */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none rounded"
          title="Tarik untuk memindahkan urutan"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="w-6 h-6 rounded-md bg-muted/60 border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground truncate max-w-[220px] sm:max-w-[320px]">
              {item.label || "Tanpa Nama"}
            </span>

            {isExcel ? (
              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 font-normal">
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                Kolom: {item.excelColumn || item.label}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 font-normal">
                <PlusSquare className="w-3 h-3 text-primary" />
                Field Baru
              </Badge>
            )}

            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase text-muted-foreground font-mono">
              {item.type}
            </Badge>

            {item.required && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-medium">
                Wajib
              </Badge>
            )}

            {item.evidenceEnabled && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                <Camera className="w-2.5 h-2.5" />
                Bukti Foto
              </Badge>
            )}
          </div>

          {item.description && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Kanan: Aksi (Edit Drawer, Hapus) */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(item)}
          className="h-7 px-2 text-xs gap-1 text-foreground"
        >
          <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Setting</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Hapus field dari form"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

