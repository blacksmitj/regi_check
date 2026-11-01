"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Save, Trash2, Check } from "lucide-react";

const PRESETS_STORAGE_KEY = "regicheck_mapping_presets";

export interface MappingPreset {
  id: string;
  name: string;
  mapping: Record<string, string>;
}

interface MappingPresetsBarProps {
  currentMapping: Record<string, string>;
  onApplyPreset: (mapping: Record<string, string>) => void;
}

export function MappingPresetsBar({
  currentMapping,
  onApplyPreset,
}: MappingPresetsBarProps) {
  const [presetName, setPresetName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  // Load presets from localStorage
  const loadPresets = (): MappingPreset[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    // Default preset example
    return [
      {
        id: "preset-pendaftaran-umum",
        name: "Format Google Form / Pendaftaran Umum",
        mapping: {
          "Nama Lengkap": "Nama Lengkap",
          "NIK": "NIK",
          "Email": "Email",
          "Nomor WhatsApp": "Nomor HP",
          "Kota Domisili": "Asal Kota",
        },
      },
    ];
  };

  const [presets, setPresets] = useState<MappingPreset[]>(loadPresets);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    const newPreset: MappingPreset = {
      id: `preset-${Date.now().toString(36)}`,
      name: presetName.trim(),
      mapping: { ...currentMapping },
    };
    const updated = [newPreset, ...presets];
    setPresets(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    }
    setPresetName("");
    setIsSaving(false);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const handleSelectPreset = (preset: MappingPreset) => {
    onApplyPreset(preset.mapping);
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2000);
  };

  return (
    <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-2 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-primary" />
          Preset Mapping Kolom:
        </span>

        {!isSaving ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSaving(true)}
            className="text-[11px] h-7 gap-1"
          >
            <Save className="w-3 h-3" />
            Simpan Konfigurasi Ini Sebagai Preset
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Nama preset, misal: Excel Kemendag..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="text-xs h-7 w-56"
            />
            <Button size="sm" onClick={handleSavePreset} className="text-[11px] h-7">
              Simpan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsSaving(false)}
              className="text-[11px] h-7"
            >
              Batal
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border bg-background shadow-2xs"
          >
            <button
              onClick={() => handleSelectPreset(preset)}
              className="font-medium hover:text-primary cursor-pointer flex items-center gap-1"
            >
              {appliedPresetId === preset.id && <Check className="w-3 h-3 text-emerald-600" />}
              <span>{preset.name}</span>
            </button>
            <button
              onClick={() => handleDeletePreset(preset.id)}
              className="text-muted-foreground hover:text-rose-500 ml-1 cursor-pointer"
              title="Hapus Preset"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

