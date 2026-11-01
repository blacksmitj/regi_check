"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, Plus, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export default function TemplatesPage() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.getTemplates(),
  });

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Template Checklist Global</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola template standar yang dapat disalin sebagai konfigurasi awal saat membuat workspace baru.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="border shadow-xs flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {tpl.items.length} Item Dokumen
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  Diperbarui: {new Date(tpl.updatedAt).toLocaleDateString("id-ID")}
                </span>
              </div>
              <CardTitle className="text-base font-semibold">{tpl.name}</CardTitle>
              <CardDescription className="text-xs mt-1">{tpl.description}</CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0">
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Item Termasuk:</p>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.items.map((it) => (
                    <span
                      key={it.id}
                      className="px-2 py-0.5 rounded bg-muted/60 text-[10px] text-foreground font-medium"
                    >
                      {it.label}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

