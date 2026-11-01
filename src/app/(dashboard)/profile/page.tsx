"use client";

import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Shield, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [resetDone, setResetDone] = useState(false);

  const handleResetDemoData = () => {
    if (confirm("Reset seluruh data mock kembali ke pengaturan awal seed demo?")) {
      api.resetMockDB();
      setResetDone(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Profil Pengguna</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Informasi sesi akun saat ini dan preferensi simulasi.
        </p>
      </div>

      <Card className="border shadow-xs">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="w-16 h-16 border">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-lg">{user?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">{user?.name || "Pengguna"}</CardTitle>
            <CardDescription className="text-xs">{user?.email}</CardDescription>
            <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
              Hak Akses: {user?.role || "Petugas"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 border-t border-border">
          <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-xs">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              Status Autentikasi Simulasi
            </p>
            <p className="text-muted-foreground">
              Aplikasi ini berjalan dalam mode <span className="font-semibold text-foreground">Frontend-Only</span> dengan centralized mock API client dan local storage persistence.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold">Pengaturan Data Mocking</h4>
            <p className="text-[11px] text-muted-foreground">
              Jika Anda ingin mengembalikan kondisi data (peserta, checklist responses, dan workspace) ke kondisi awal sebelum pengujian:
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDemoData}
              className="gap-2 text-xs text-rose-600 hover:text-rose-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resetDone ? "Data Telah Direset!" : "Reset Data Demo (Seed Awal)"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

