"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEED_USERS } from "@/mocks/seed";
import { ShieldCheck, UserCheck, AlertCircle, LogIn, Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, isLoading, error } = useAuthStore();
  const [selectedEmail, setSelectedEmail] = useState(SEED_USERS[0].email);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await loginAs(selectedEmail);
      // Petugas langsung diarahkan ke pemilihan workspace untuk registrasi check
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === "officer") {
        router.push("/workspaces");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("ACCESS_DENIED")) {
        router.push("/access-denied");
      } else {
        setAuthError(err instanceof Error ? err.message : "Terjadi kesalahan saat masuk");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            RC
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Registration Checklist</CardTitle>
          <CardDescription>
            Aplikasi verifikasi kelengkapan berkas registrasi peserta kegiatan.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {(error || authError) && (
            <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error || authError}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Pilih Akun Simulasi Google OAuth:
            </label>

            <div className="grid gap-2">
              {SEED_USERS.map((user) => {
                const isSelected = selectedEmail === user.email;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedEmail(user.email)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="mt-0.5">
                      {user.role === "admin" ? (
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      ) : user.email.includes("unknown") ? (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold truncate text-foreground">{user.name}</span>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                          {user.email.includes("unknown") ? "Akses Ditolak" : user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full gap-2 py-5 text-sm font-medium"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            Lanjutkan Masuk dengan Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Akun simulasi disediakan agar Anda dapat menguji seluruh hak akses Admin dan Petugas tanpa server OAuth eksternal.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

