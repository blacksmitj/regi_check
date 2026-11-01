"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Plus, Search, Calendar, ArrowRight, Copy } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { EmptyState } from "@/components/shared/empty-state";

export default function WorkspacesPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.getWorkspaces(),
  });

  const filtered = workspaces.filter((ws) => {
    const matchSearch = ws.name.toLowerCase().includes(search.toLowerCase()) ||
      (ws.description && ws.description.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || ws.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user?.role === "officer" ? "Pilih Kegiatan Registrasi" : "Manajemen Workspace Kegiatan"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user?.role === "officer"
              ? "Pilih kegiatan untuk langsung memulai pengisian dan pengecekan form peserta."
              : "Kelola daftar kegiatan registrasi, peserta, dan form isian."}
          </p>
        </div>

        {user?.role === "admin" && (
          <Link href="/workspaces/create">
            <Button className="gap-2 shadow-xs">
              <Plus className="w-4 h-4" />
              Buat Workspace
            </Button>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama kegiatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(["all", "active", "archived"] as const).map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className="text-xs capitalize h-8"
            >
              {st === "all" ? "Semua Status" : st === "active" ? "Aktif" : "Diarsipkan"}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada workspace ditemukan"
          description="Coba ubah kata kunci pencarian atau buat workspace kegiatan baru."
          icon={FolderKanban}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ws) => (
            <Card key={ws.id} className="hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={ws.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {ws.status === "active" ? "Aktif" : "Diarsipkan"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {ws.startDate}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold leading-snug line-clamp-1">{ws.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {ws.description || "Tidak ada deskripsi kegiatan."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="border-t border-border pt-4 mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Selesai: {ws.endDate}
                  </span>
                  <Link href={`/workspaces/${ws.id}`}>
                    <Button size="sm" variant={user?.role === "officer" ? "default" : "outline"} className="gap-1.5 text-xs">
                      <span>{user?.role === "officer" ? "Buka Registrasi Check" : "Buka"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

