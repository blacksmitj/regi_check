"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-rose-200 dark:border-rose-900 text-center">
        <CardHeader className="space-y-3 pb-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Akses Ditolak
          </CardTitle>
          <CardDescription className="text-sm">
            Email Google yang Anda gunakan belum didaftarkan sebagai Petugas atau Admin dalam sistem ini.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-xs text-muted-foreground bg-muted/30 p-4 mx-6 rounded-lg border border-border">
          <p>
            Sesuai ketentuan PRD: Petugas hanya dapat mengakses aplikasi setelah didaftarkan oleh Admin melalui menu Petugas.
          </p>
          <p>
            Silakan hubungi administrator kegiatan untuk memasukkan alamat email Anda ke daftar petugas yang berwenang.
          </p>
        </CardContent>

        <CardFooter className="pt-6">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Halaman Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

