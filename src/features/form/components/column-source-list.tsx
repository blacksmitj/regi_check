"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Search,
  Plus,
  Check,
  FileSpreadsheet,
  PlusSquare,
  Sparkles,
  Layers,
  FolderPlus,
} from "lucide-react";

interface AvailableColumnItem {
  name: string;
  isUsed: boolean;
  sampleValue?: string;
}

interface ColumnSourceListProps {
  availableColumns: AvailableColumnItem[];
  onAddColumn: (columnName: string) => void;
  onAddAllColumns: () => void;
  onCreateCustomField: () => void;
  onCreateSection?: () => void;
}

export function ColumnSourceList({
  availableColumns,
  onAddColumn,
  onAddAllColumns,
  onCreateCustomField,
  onCreateSection,
}: ColumnSourceListProps) {
  const [search, setSearch] = useState("");

  const filteredColumns = availableColumns.filter((col) =>
    col.name.toLowerCase().includes(search.toLowerCase())
  );

  const unusedCount = availableColumns.filter((c) => !c.isUsed).length;

  return (
    <Card className="border shadow-xs flex flex-col h-full bg-card">
      <CardHeader className="p-4 pb-3 border-b border-border/70 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Daftar Kolom Sumber
            </CardTitle>
            <CardDescription className="text-xs">
              Kolom dari Excel atau field kustom
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] font-mono">
            {availableColumns.length} Kolom
          </Badge>
        </div>

        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama kolom..."
            className="pl-8 h-8 text-xs bg-muted/40"
          />
        </div>

        {/* Quick action buttons */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAddAllColumns}
              disabled={unusedCount === 0}
              className="flex-1 text-[11px] h-7 gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Tambah Semua ({unusedCount})
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onCreateCustomField}
              className="text-[11px] h-7 gap-1"
            >
              <PlusSquare className="w-3 h-3" />
              Field Baru
            </Button>
          </div>

          {onCreateSection && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onCreateSection}
              className="w-full text-[11px] h-7 gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              + Section / Group Baru
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5 min-h-[300px] max-h-[calc(100vh-280px)]">
        {filteredColumns.length === 0 ? (
          <div className="text-center py-10 px-4 text-xs text-muted-foreground">
            {search ? (
              <p>Tidak ada kolom yang cocok dengan kata kunci &quot;{search}&quot;</p>
            ) : (
              <p>Belum ada data kolom Excel. Anda dapat membuat field baru dengan tombol di atas.</p>
            )}
          </div>
        ) : (
          filteredColumns.map((col) => (
            <div
              key={col.name}
              className={`flex items-center justify-between p-2.5 rounded-md border text-xs transition-colors ${
                col.isUsed
                  ? "bg-muted/30 border-border/50 opacity-75"
                  : "bg-background hover:bg-muted/40 border-border"
              }`}
            >
              <div className="min-w-0 flex-1 mr-2">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium truncate text-foreground">{col.name}</span>
                </div>
                {col.sampleValue && (
                  <p className="text-[10px] text-muted-foreground truncate pl-5 mt-0.5">
                    Contoh: &quot;{col.sampleValue}&quot;
                  </p>
                )}
              </div>

              {col.isUsed ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] gap-1 px-1.5 py-0.5 font-normal text-muted-foreground bg-muted"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  Dipakai
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddColumn(col.name)}
                  className="h-6 px-2 text-[11px] gap-1 hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus className="w-3 h-3" />
                  Pakai
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

