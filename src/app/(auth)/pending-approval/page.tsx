"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

function PendingApprovalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, init, user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("from") || "/";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await init();
      // Refresh router untuk memeriksa status server kembali
      router.refresh();
      // Arahkan ke callbackUrl yang dituju jika sudah diapprove
      router.push(callbackUrl);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-amber-200 dark:border-amber-900 text-center">
      <CardHeader className="space-y-3 pb-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Akun Sedang Ditinjau
        </CardTitle>
        <CardDescription className="text-sm">
          {user?.email ? (
            <span>
              Email <strong>{user.email}</strong> berhasil masuk, namun belum terdaftar atau belum aktif dalam sistem.
            </span>
          ) : (
            "Akun Anda berhasil masuk, namun belum terdaftar sebagai Petugas atau Admin dalam sistem ini."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-xs text-muted-foreground bg-muted/30 p-4 mx-6 rounded-lg border border-border text-left">
        <p>
          Akun Anda memerlukan persetujuan atau pendaftaran terlebih dahulu oleh Administrator.
        </p>
        <p>
          Jika Anda sudah didaftarkan oleh Admin, silakan klik tombol <strong>Perbarui Status</strong> di bawah untuk langsung menuju ruang kerja.
        </p>
      </CardContent>

      <CardFooter className="pt-6 flex flex-col gap-2.5">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoggingOut}
          className="w-full gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Memeriksa status..." : "Perbarui Status"}
        </Button>

        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={isRefreshing || isLoggingOut}
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<div className="w-full max-w-md h-72 animate-pulse bg-muted rounded-xl" />}>
        <PendingApprovalContent />
      </Suspense>
    </div>
  );
}
