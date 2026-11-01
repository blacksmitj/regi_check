"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, LogIn, Loader2, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("admin@regicheck.id");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setAuthError("Silakan masukkan alamat email.");
      return;
    }

    setAuthError(null);
    try {
      await loginAs(email.trim());
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
          <CardTitle className="text-2xl font-bold tracking-tight">Registration Form</CardTitle>
          <CardDescription>
            Aplikasi pengelolaan form dan registrasi peserta kegiatan.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {(error || authError) && (
              <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error || authError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Pengguna
              </label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Default Admin: <strong className="text-foreground">admin@regicheck.id</strong></span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full gap-2 py-5 text-sm font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Masuk ke Aplikasi
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Masukkan email Admin atau email Petugas yang telah ditugaskan pada workspace.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
