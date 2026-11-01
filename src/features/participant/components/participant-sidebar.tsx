"use client";

import { useState } from "react";
import { Participant, ParticipantStatus } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";

interface ParticipantSidebarProps {
  participants: Participant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ParticipantSidebar({
  participants,
  selectedId,
  onSelect,
}: ParticipantSidebarProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | ParticipantStatus>("all");

  const filtered = participants.filter((p) => {
    const name = String(p.data["Nama Lengkap"] || p.data["Nama"] || "");
    const nik = String(p.data["NIK"] || "");
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      nik.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Navigation prev / next
  const currentIndex = filtered.findIndex((p) => p.id === selectedId);
  const handlePrev = () => {
    if (currentIndex > 0) onSelect(filtered[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex < filtered.length - 1) onSelect(filtered[currentIndex + 1].id);
  };

  const counts = {
    all: participants.length,
    complete: participants.filter((p) => p.status === "complete").length,
    incomplete: participants.filter((p) => p.status === "incomplete").length,
    rejected: participants.filter((p) => p.status === "rejected").length,
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 border-r border-border bg-card/40 flex flex-col h-full shrink-0">
      {/* Search & Status Filters */}
      <div className="p-3.5 border-b border-border space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>

        {/* Status filter tabs */}
        <div className="grid grid-cols-4 gap-1 text-[11px]">
          <button
            onClick={() => setFilterStatus("all")}
            className={`py-1 rounded text-center font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => setFilterStatus("incomplete")}
            className={`py-1 rounded text-center font-medium transition-colors ${
              filterStatus === "incomplete"
                ? "bg-amber-500 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Belum ({counts.incomplete})
          </button>
          <button
            onClick={() => setFilterStatus("complete")}
            className={`py-1 rounded text-center font-medium transition-colors ${
              filterStatus === "complete"
                ? "bg-emerald-600 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Lengkap ({counts.complete})
          </button>
          <button
            onClick={() => setFilterStatus("rejected")}
            className={`py-1 rounded text-center font-medium transition-colors ${
              filterStatus === "rejected"
                ? "bg-rose-600 text-white font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Ditolak ({counts.rejected})
          </button>
        </div>

        {/* Prev & Next Toolbar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{filtered.length} peserta ditampilkan</span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              disabled={currentIndex <= 0}
              onClick={handlePrev}
              title="Peserta sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              disabled={currentIndex < 0 || currentIndex >= filtered.length - 1}
              onClick={handleNext}
              title="Peserta berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Participant List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Tidak ada peserta yang cocok.
          </div>
        ) : (
          filtered.map((p) => {
            const isSelected = p.id === selectedId;
            const name = String(p.data["Nama Lengkap"] || p.data["Nama"] || "Peserta Tanpa Nama");
            const nik = String(p.data["NIK"] || "");
            // Mask NIK for security (§15.1)
            const maskedNik = nik.length > 8 ? `${nik.slice(0, 4)}********${nik.slice(-4)}` : nik;

            return (
              <div
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`p-3 text-left cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {name}
                    </p>
                    {maskedNik && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        NIK: {maskedNik}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={p.status} className="text-[10px] py-0 px-1.5" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

