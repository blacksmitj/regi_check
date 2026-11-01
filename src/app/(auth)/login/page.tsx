"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import {
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  FileSpreadsheet,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS = [
  {
    icon: FolderKanban,
    title: "Ruang Kerja Kegiatan (Workspace)",
    desc: "Pengelolaan registrasi per kegiatan secara terpisah dan terorganisir.",
  },
  {
    icon: FileSpreadsheet,
    title: "Impor Data Peserta dari Excel",
    desc: "Sinkronisasi daftar peserta dan ekspor status kelengkapan otomatis.",
  },
  {
    icon: ClipboardCheck,
    title: "Verifikasi Checklist & Bukti Berkas",
    desc: "Validasi berkas persyaratan di lapangan dengan bukti lampiran foto/dokumen.",
  },
  {
    icon: ShieldCheck,
    title: "Audit Log & Rekap Real-time",
    desc: "Riwayat pemeriksaan transparan beserta waktu dan identitas petugas.",
  },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ambil callbackUrl dari parameter (mendukung callbackUrl atau from)
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("from") || "/";

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch (err) {
      console.error(err);
      setError("Gagal menghubungkan ke layanan Google Sign In. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Masuk ke Akun
        </h2>
        <p className="text-sm text-muted-foreground">
          Silakan login menggunakan akun Google Anda untuk mengakses aplikasi.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full gap-3 h-11 text-sm font-medium border-input hover:bg-muted"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>{loading ? "Mengalihkan..." : "Lanjutkan dengan Google"}</span>
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Catatan Akses:</p>
        <p className="leading-relaxed">
          Hanya akun email yang telah didaftarkan oleh Administrator sebagai Petugas atau Admin yang dapat mengakses sistem.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Kolom Kiri: Presentasi & Penjelasan Aplikasi */}
      <div className="relative flex-1 bg-muted/40 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border overflow-hidden">
        {/* Subtle Decorative Pattern */}
        <div className="absolute inset-0 bg-radial from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shadow-xs">
            RC
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block text-foreground leading-tight">
              RegiCheck
            </span>
            <span className="text-xs text-muted-foreground">
              Aplikasi Kelengkapan Registrasi Peserta
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 my-12 lg:my-auto max-w-xl space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background/80 text-xs text-muted-foreground font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sistem Verifikasi & Manajemen Form
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Permudah pemeriksaan dan verifikasi registrasi dalam satu tempat.
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              RegiCheck dirancang untuk membantu administrator dan petugas memeriksa berkas,
              mencatat formulir kelengkapan administrasi peserta di lapangan, serta memantau
              progres pendaftaran secara akurat dan real-time.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 pt-2">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-background border border-border shrink-0 text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; RegiCheck System</span>
          <span>Versi 1.0</span>
        </div>
      </div>

      {/* Kolom Kanan: Login Card */}
      <div className="flex-1 lg:max-w-md xl:max-w-lg flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-background">
        <Suspense fallback={<div className="w-full max-w-sm h-64 animate-pulse bg-muted rounded-xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
