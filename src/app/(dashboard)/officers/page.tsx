"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
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
  ClipboardList,
  Search,
  UserCheck,
  UserX,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function OfficersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const { data: officers = [], isLoading } = useQuery({
    queryKey: ["officers"],
    queryFn: () => api.getOfficers(),
  });

  const saveOfficersMutation = useMutation({
    mutationFn: (updated: Officer[]) => api.saveOfficers(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officers"] });
    },
  });

  const handleToggleActive = (officer: Officer) => {
    const updated = officers.map((o) =>
      o.id === officer.id ? { ...o, active: !o.active } : o
    );
    saveOfficersMutation.mutate(updated);
  };

  const handleDelete = (id: string) => {
    const updated = officers.filter((o) => o.id !== id);
    saveOfficersMutation.mutate(updated);
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const newOfficer: Officer = {
      id: `off-${Date.now().toString(36)}`,
      name: newName.trim() || newEmail.split("@")[0],
      email: newEmail.trim().toLowerCase(),
      active: true,
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
          createdAt: new Date().toISOString(),
        });
      }
    });

    saveOfficersMutation.mutate([...newItems, ...officers]);
    setPasteInput("");
  };

  const filtered = officers.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Petugas Registrasi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Petugas yang emailnya terdaftar di sini dapat langsung masuk dan memeriksa checklist peserta.
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

      {/* Method 2: Batch Paste Email (§7) */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Metode Cepat: Copy-Paste Daftar Email Petugas
          </CardTitle>
          <CardDescription className="text-xs">
            Tempel daftar email petugas (satu email per baris) untuk mendaftarkan secara massal.
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

      {/* Officers List Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email petugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {filtered.length} petugas terdaftar
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada petugas ditemukan"
            description="Daftarkan email petugas untuk memberikan akses pemeriksaan checklist kegiatan."
            icon={Users2}
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3">Nama Petugas</th>
                  <th className="p-3">Email Google</th>
                  <th className="p-3">Status Akses</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((off) => (
                  <tr key={off.id} className="hover:bg-muted/20">
                    <td className="p-3 font-semibold text-foreground">{off.name}</td>
                    <td className="p-3 text-muted-foreground font-mono">{off.email}</td>
                    <td className="p-3">
                      <Badge
                        variant={off.active ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {off.active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right space-x-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

