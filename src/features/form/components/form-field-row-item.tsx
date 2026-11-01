"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FormField } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GripVertical,
  Settings,
  Trash2,
  FileSpreadsheet,
  PlusSquare,
  Camera,
  FolderKanban,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  FolderInput,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SectionOption {
  id: string; // "none" atau id dari section
  label: string;
}

interface FormFieldRowItemProps {
  item: FormField;
  index: number;
  fieldNumber?: number;
  isUnderSection?: boolean;
  sectionChildrenCount?: number;
  canMoveGroupUp?: boolean;
  canMoveGroupDown?: boolean;
  availableSections?: SectionOption[];
  currentSectionId?: string; // id section saat ini atau "none"
  onMoveGroupUp?: (sectionId: string) => void;
  onMoveGroupDown?: (sectionId: string) => void;
  onMoveToSection?: (itemId: string, targetSectionId: string) => void;
  onEdit: (item: FormField) => void;
  onDelete: (id: string) => void;
  onToggleActive?: (id: string, active: boolean) => void;
}

export function FormFieldRowItem({
  item,
  index,
  fieldNumber,
  isUnderSection = false,
  sectionChildrenCount = 0,
  canMoveGroupUp = false,
  canMoveGroupDown = false,
  availableSections = [],
  currentSectionId = "none",
  onMoveGroupUp,
  onMoveGroupDown,
  onMoveToSection,
  onEdit,
  onDelete,
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

  const isSection = item.type === "section";
  const isExcel = item.sourceType === "excel_column";

  if (isSection) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-all ${
          isDragging
            ? "border-primary ring-2 ring-primary/20 shadow-md bg-primary/10"
            : "border-primary/30 bg-primary/5 hover:border-primary/50"
        }`}
      >
        {/* Kiri: Drag Handle + Icon Section + Judul & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-primary/70 hover:text-primary touch-none rounded"
            title="Tarik untuk memindahkan posisi pembatas section saja"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
            <FolderKanban className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wide text-primary truncate max-w-[240px] sm:max-w-[340px]">
                {item.label || "Section Tanpa Judul"}
              </span>

              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 font-semibold bg-primary/15 text-primary border border-primary/20"
              >
                Grup Section • {sectionChildrenCount} Field
              </Badge>
            </div>

            {item.description ? (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {item.description}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">
                Semua field di bawah pembatas ini masuk ke dalam grup ini
              </p>
            )}
          </div>
        </div>

        {/* Kanan: Aksi Pindah 1 Grup Penuh + Edit + Hapus */}
        <div className="flex items-center gap-1 shrink-0">
          {(onMoveGroupUp || onMoveGroupDown) && (
            <div className="flex items-center bg-background/80 border border-border rounded-md p-0.5 mr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canMoveGroupUp}
                onClick={() => onMoveGroupUp?.(item.id)}
                className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30"
                title="Pindahkan seluruh grup beserta isinya ke atas"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canMoveGroupDown}
                onClick={() => onMoveGroupDown?.(item.id)}
                className="h-6 w-6 text-muted-foreground hover:text-primary disabled:opacity-30"
                title="Pindahkan seluruh grup beserta isinya ke bawah"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
            className="h-7 px-2 text-xs gap-1 bg-background"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Edit Grup</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Hapus pembatas section (field di bawahnya tetap aman)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between gap-3 p-3 bg-card border rounded-lg transition-all ${
        isUnderSection ? "ml-4 sm:ml-6 border-l-4 border-l-primary/40" : ""
      } ${
        isDragging
          ? "border-primary ring-2 ring-primary/20 shadow-md bg-accent/20"
          : "hover:border-border/80 hover:shadow-xs"
      }`}
    >
      {/* Kiri: Drag Handle + Nomor Urut + Nama/Tipe */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none rounded"
          title="Tarik untuk memindahkan urutan"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {isUnderSection && (
          <CornerDownRight className="w-3.5 h-3.5 text-primary/50 shrink-0 -ml-1 hidden sm:block" />
        )}

        <span className="w-6 h-6 rounded-md bg-muted/60 border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
          {fieldNumber ?? index + 1}
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

      {/* Kanan: Aksi (Pindah Grup, Edit Drawer, Hapus) */}
      <div className="flex items-center gap-1 shrink-0">
        {availableSections.length > 0 && onMoveToSection && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title="Pindahkan item langsung ke grup tertentu"
                />
              }
            >
              <FolderInput className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Pindah Grup</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Pindahkan ke Grup:
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onMoveToSection(item.id, "none")}
                  className="text-xs flex items-center justify-between cursor-pointer"
                >
                  <span className={currentSectionId === "none" ? "font-semibold text-primary" : ""}>
                    Tanpa Grup (Bagian Teratas)
                  </span>
                  {currentSectionId === "none" && (
                    <Check className="w-3.5 h-3.5 text-primary ml-2 shrink-0" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableSections.map((sec) => {
                  const isSelected = currentSectionId === sec.id;
                  return (
                    <DropdownMenuItem
                      key={sec.id}
                      onClick={() => onMoveToSection(item.id, sec.id)}
                      className="text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span className={`truncate max-w-[180px] ${isSelected ? "font-semibold text-primary" : ""}`}>
                        {sec.label}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary ml-2 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
