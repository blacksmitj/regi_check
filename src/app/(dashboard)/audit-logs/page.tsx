"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Search, Filter } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export default function AuditLogsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/workspaces");
    }
  }, [user, router]);

  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => api.getAuditLogs(),
  });

  const filtered = logs.filter(
    (l) =>
      l.officerName.toLowerCase().includes(search.toLowerCase()) ||
      (l.participantName && l.participantName.toLowerCase().includes(search.toLowerCase())) ||
      (l.checklistItemLabel && l.checklistItemLabel.toLowerCase().includes(search.toLowerCase())) ||
      l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Audit Log Aktivitas Form & Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Riwayat pencatatan aktivitas pengisian dan perubahan data form oleh petugas.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama petugas, peserta, atau item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {filtered.length} riwayat tercatat
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum ada audit log"
          description="Aktivitas verifikasi berkas oleh petugas akan otomatis dicatat di sini."
          icon={History}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3">Waktu</th>
                <th className="p-3">Petugas</th>
                <th className="p-3">Peserta</th>
                <th className="p-3">Field Form</th>
                <th className="p-3">Aktivitas & Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="p-3 text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 font-semibold text-foreground">
                    <div>{log.officerName}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{log.officerEmail}</div>
                  </td>
                  <td className="p-3 font-medium text-foreground">
                    {log.participantName || "-"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {log.checklistItemLabel || "-"}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={log.action.includes("Tolak") ? "destructive" : "secondary"}
                      className="text-[10px] mr-2"
                    >
                      {log.action}
                    </Badge>
                    {Boolean(log.newValue) && (
                      <span className="text-xs text-muted-foreground">{String(log.newValue)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
