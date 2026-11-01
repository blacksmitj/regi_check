"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { Officer } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Users2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  Search,
  UserCheck,
  UserX,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function OfficersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/workspaces");
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const { data: officers = [], isLoading } = useQuery({
    queryKey: ["officers"],
    queryFn: () => api.getOfficers(),
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.getWorkspaces(),
  });

  const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));

  const updateOfficerMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Officer> }) =>
      api.updateOfficer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officers"] });
    },
  });

  const deleteOfficerMutation = useMutation({
    mutationFn: (id: string) => api.deleteOfficer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officers"] });
    },
  });

  const saveOfficersMutation = useMutation({
    mutationFn: (updated: Officer[]) => api.saveOfficers(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officers"] });
    },
  });

  // Approval actions
  const handleApprove = (officer: Officer) => {
    updateOfficerMutation.mutate({
      id: officer.id,
      updates: {
        active: true,
        status: "active",
      },
    });
  };

  const handleReject = (officer: Officer) => {
    updateOfficerMutation.mutate({
      id: officer.id,
      updates: {
        active: false,
        status: "rejected",
      },
    });
  };

  const handleToggleActive = (officer: Officer) => {
    const nextActive = !officer.active;
    updateOfficerMutation.mutate({
      id: officer.id,
      updates: {
        active: nextActive,
        status: nextActive ? "active" : "rejected",
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus petugas ini?")) {
      deleteOfficerMutation.mutate(id);
    }
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const newOfficer: Officer = {
      id: `off-${Date.now().toString(36)}`,
      name: newName.trim() || newEmail.split("@")[0],
      email: newEmail.trim().toLowerCase(),
      active: true,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    saveOfficersMutation.mutate([newOfficer, ...officers]);
    setNewName("");
    setNewEmail("");
    setIsAdding(false);
  };

  // Method 2: Copy Paste list of emails (§7)
  const handleBatchPaste = () => {
    const emails = pasteInput
      .split("\n")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@") && e.includes("."));

    if (emails.length === 0) return;

    const existingEmails = new Set(officers.map((o) => o.email.toLowerCase()));
    const newItems: Officer[] = [];

    emails.forEach((em) => {
      if (!existingEmails.has(em)) {
        existingEmails.add(em);
        newItems.push({
          id: `off-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: em.split("@")[0],
          email: em,
          active: true,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }
    });

    saveOfficersMutation.mutate([...newItems, ...officers]);
    setPasteInput("");
  };

  const pendingCount = officers.filter(
    (o) => o.status === "pending" || (!o.active && o.status !== "rejected" && o.status !== "active")
  ).length;

  const filtered = officers.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const isPending = o.status === "pending" || (!o.active && o.status !== "rejected" && o.status !== "active");
    if (activeTab === "pending") return isPending;
    if (activeTab === "active") return o.active && o.status !== "pending";
    if (activeTab === "inactive") return !o.active && !isPending;
    return true;
  });

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Petugas Registrasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Petugas yang mendaftar melalui link share workspace atau didaftarkan manual dapat dikelola dan disetujui di sini.
          </p>
        </div>

        <Button onClick={() => setIsAdding(!isAdding)} size="sm" className="gap-2 text-xs">
          <Plus className="w-4 h-4" />
          Tambah Petugas Baru
        </Button>
      </div>

      {/* Add Single Form */}
      {isAdding && (
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Daftarkan Petugas Baru</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form onSubmit={handleAddSingle} className="grid sm:grid-cols-3 gap-3">
              <Input
                placeholder="Nama Petugas..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="email"
                placeholder="email.petugas@gmail.com *"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="text-xs h-8"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" className="text-xs h-8">
                  Simpan Petugas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Method 2: Batch Paste Email */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Metode Cepat: Copy-Paste Daftar Email Petugas
          </CardTitle>
          <CardDescription className="text-xs">
            Tempel daftar email petugas (satu email per baris) untuk mendaftarkan secara massal langsung aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-2">
          <Textarea
            rows={2}
            placeholder="petugas1@kegiatan.com&#10;petugas2@kegiatan.com"
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            className="text-xs font-mono"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={!pasteInput.trim()}
              onClick={handleBatchPaste}
              className="text-xs"
            >
              Proses Tambah Daftar Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Filter and Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg w-fit border border-border">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({officers.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "pending"
                  ? "bg-amber-500 text-white shadow-xs font-semibold"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Menunggu Approval</span>
              {pendingCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === "pending" ? "bg-white text-amber-600" : "bg-amber-500 text-white"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "active"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aktif ({officers.filter((o) => o.active && o.status !== "pending").length})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "inactive"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ditolak / Nonaktif
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email petugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              activeTab === "pending"
                ? "Tidak ada permohonan petugas yang menunggu persetujuan"
                : "Tidak ada petugas ditemukan"
            }
            description={
              activeTab === "pending"
                ? "Saat ada petugas baru yang membuka link share workspace, permintaan persetujuan mereka akan muncul di sini."
                : "Daftarkan email petugas untuk memberikan akses pengelolaan form kegiatan."
            }
            icon={activeTab === "pending" ? Clock : Users2}
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Nama & Detail Petugas</th>
                  <th className="p-3">Email Google</th>
                  <th className="p-3">Asal Permintaan</th>
                  <th className="p-3">Status Akses</th>
                  <th className="p-3 text-right">Aksi Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((off) => {
                  const isPending =
                    off.status === "pending" || (!off.active && off.status !== "rejected" && off.status !== "active");
                  const isRejected = off.status === "rejected" || (!off.active && !isPending);
                  const requestedWsName = off.requestedWorkspaceId
                    ? workspaceMap.get(off.requestedWorkspaceId) || off.requestedWorkspaceId
                    : null;

                  return (
                    <tr
                      key={off.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isPending ? "bg-amber-500/5 dark:bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span>{off.name}</span>
                          {isPending && (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                            >
                              Baru
                            </Badge>
                          )}
                        </div>
                        {off.requestedAt && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Diminta: {new Date(off.requestedAt).toLocaleString("id-ID")}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">{off.email}</td>
                      <td className="p-3">
                        {requestedWsName ? (
                          <div className="text-foreground text-[11px] font-medium flex items-center gap-1">
                            <span className="truncate max-w-[160px]">{requestedWsName}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {isPending ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 text-[10px]"
                          >
                            Menunggu Persetujuan
                          </Badge>
                        ) : isRejected ? (
                          <Badge
                            variant="outline"
                            className="text-rose-600 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-[10px]"
                          >
                            Ditolak / Nonaktif
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                          >
                            Aktif
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(off)}
                                className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(off)}
                                className="text-xs h-7 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleActive(off)}
                                className="text-xs h-7"
                              >
                                {off.active ? (
                                  <span className="text-amber-600 flex items-center gap-1">
                                    <UserX className="w-3.5 h-3.5" /> Nonaktifkan
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5" /> Aktifkan
                                  </span>
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(off.id)}
                                className="text-rose-500 hover:text-rose-600 h-7 w-7"
                                title="Hapus Petugas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

