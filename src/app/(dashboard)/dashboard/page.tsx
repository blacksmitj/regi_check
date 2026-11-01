"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Plus,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: workspaces = [], isLoading: loadingWs } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.getWorkspaces(),
  });

  // Calculate overall metrics
  const activeWorkspaces = workspaces.filter((w) => w.status === "active");

  // Query participants for active workspace to display summary
  const currentWorkspace = activeWorkspaces[0] || workspaces[0];
  const { data: participants = [] } = useQuery({
    queryKey: ["participants", currentWorkspace?.id],
    queryFn: () => (currentWorkspace ? api.getParticipants(currentWorkspace.id) : []),
    enabled: !!currentWorkspace,
  });

  const totalParticipants = participants.length;
  const completeCount = participants.filter((p) => p.status === "complete").length;
  const rejectedCount = participants.filter((p) => p.status === "rejected").length;
  const incompleteCount = participants.filter((p) => p.status === "incomplete").length;
  const progressPercent = totalParticipants > 0 ? Math.round((completeCount / totalParticipants) * 100) : 0;

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Ringkasan Registrasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Selamat datang kembali, <span className="font-semibold text-foreground">{user?.name}</span> ({user?.role === "admin" ? "Administrator" : "Petugas"})
          </p>
        </div>

        {user?.role === "admin" && (
          <Link href="/workspaces/create">
            <Button className="gap-2 shadow-xs">
              <Plus className="w-4 h-4" />
              Buat Workspace Baru
            </Button>
          </Link>
        )}
      </div>

      {/* 8 PRD Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Workspace</CardTitle>
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{workspaces.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold">{activeWorkspaces.length}</span> aktif berjalan
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Peserta Terdaftar</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Di workspace aktif saat ini
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Peserta Lengkap</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600">{completeCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {progressPercent}% dari total peserta
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Belum Lengkap / Ditolak</CardTitle>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              <span className="text-amber-600">{incompleteCount}</span>
              <span className="text-muted-foreground text-sm font-normal mx-1">/</span>
              <span className="text-rose-600">{rejectedCount}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Perlu pemeriksaan & tindak lanjut
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Featured Workspace Highlight */}
      {currentWorkspace ? (
        <Card className="border-primary/20 bg-primary/[0.02] shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    Workspace Unggulan
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {currentWorkspace.startDate} s/d {currentWorkspace.endDate}
                  </span>
                </div>
                <CardTitle className="text-lg font-bold mt-1 text-foreground">{currentWorkspace.name}</CardTitle>
                <CardDescription className="text-xs">{currentWorkspace.description}</CardDescription>
              </div>

              <Link href={`/workspaces/${currentWorkspace.id}`}>
                <Button size="sm" className="gap-1.5 self-start">
                  Buka Checklist Registrasi
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progres Kelengkapan Berkas:</span>
                <span className="font-bold text-foreground">{progressPercent}% ({completeCount}/{totalParticipants} Peserta)</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Belum ada workspace"
          description="Buat workspace kegiatan pertama Anda untuk memulai pemeriksaan checklist registrasi peserta."
        />
      )}

      {/* List of All Workspaces */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Daftar Seluruh Workspace</h2>
          <Link href="/workspaces" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            Lihat Semua Workspace
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="hover:border-primary/50 transition-colors shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant={ws.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {ws.status === "active" ? "Aktif" : "Diarsipkan"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{ws.startDate}</span>
                </div>
                <CardTitle className="text-sm font-semibold leading-snug line-clamp-1">{ws.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">{ws.description || "Tidak ada deskripsi kegiatan."}</CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <Link href={`/workspaces/${ws.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs justify-between">
                    <span>Detail & Peserta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

