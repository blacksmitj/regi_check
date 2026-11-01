"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShieldCheck, UserCheck, ChevronDown, Eye, EyeOff } from "lucide-react";

interface SwitchUserOption {
  id: string;
  name: string;
  email: string;
  role: "admin" | "officer";
}

export function DevRoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, loginAs, isLoading } = useAuthStore();
  const [isMinimized, setIsMinimized] = useState(false);

  // Ambil daftar petugas aktif dari API mock
  const { data: officers = [] } = useQuery({
    queryKey: ["officers"],
    queryFn: () => api.getOfficers(),
    staleTime: 1000 * 60 * 5,
  });

  // Jangan render di environment production
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  // Bangun daftar opsi: Admin Utama + Petugas aktif
  const options: SwitchUserOption[] = [
    {
      id: "user-admin",
      name: "Admin Utama",
      email: "admin@regicheck.id",
      role: "admin",
    },
    ...officers
      .filter((o) => o.active)
      .map((o) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        role: "officer" as const,
      })),
  ];

  const handleSwitchUser = async (targetEmail: string, targetRole: "admin" | "officer") => {
    if (isLoading || user?.email === targetEmail) return;

    try {
      await loginAs(targetEmail);
      await queryClient.invalidateQueries();

      // Jika role berganti ke officer dan berada di halaman admin-only, redirect ke /workspaces
      const adminOnlyPaths = ["/templates", "/officers", "/dashboard", "/audit-logs"];
      const isCurrentAdminOnly = adminOnlyPaths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );

      if (targetRole !== "admin" && isCurrentAdminOnly) {
        router.push("/workspaces");
      }
    } catch (err) {
      console.error("Gagal mengganti user/role di dev mode:", err);
    }
  };

  if (isMinimized) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsMinimized(false)}
        title="Tampilkan Dev Role Switcher"
        className="size-8 border-dashed border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
      >
        <Eye className="size-3.5" />
      </Button>
    );
  }

  const currentRole = user?.role ?? "officer";

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-8 gap-1.5 px-2 border-dashed border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
            />
          }
        >
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 uppercase font-mono font-bold tracking-wider border-amber-500/60 bg-amber-500/20 text-amber-700 dark:text-amber-300"
          >
            DEV
          </Badge>
          <span className="text-xs font-medium capitalize max-w-[90px] truncate">
            {currentRole}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 p-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>Ganti Akun & Role (Dev)</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/60 text-amber-600 dark:text-amber-400">
                Mock
              </Badge>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {options.map((opt) => {
              const isCurrent = user?.email === opt.email;
              const Icon = opt.role === "admin" ? ShieldCheck : UserCheck;

              return (
                <DropdownMenuItem
                  key={opt.email}
                  onClick={() => handleSwitchUser(opt.email, opt.role)}
                  className="flex items-center justify-between text-xs py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon
                      className={`size-3.5 shrink-0 ${
                        opt.role === "admin"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex flex-col truncate">
                      <span className="font-medium truncate">{opt.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {opt.email}
                      </span>
                    </div>
                  </div>
                  {isCurrent && <Check className="size-3.5 text-primary shrink-0 ml-1.5" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setIsMinimized(true)}
              className="text-xs text-muted-foreground py-1.5 cursor-pointer flex items-center gap-2"
            >
              <EyeOff className="size-3.5" />
              <span>Sembunyikan Switcher</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

