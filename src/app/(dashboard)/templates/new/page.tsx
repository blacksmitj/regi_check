"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NewTemplatePage() {
  const router = useRouter();

  useEffect(() => {
    // Alur pembuatan template baru diarahkan via Atur Form di Workspace atau Duplikasi Template
    router.replace("/templates");
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <p>Mengarahkan kembali ke daftar template...</p>
    </div>
  );
}


