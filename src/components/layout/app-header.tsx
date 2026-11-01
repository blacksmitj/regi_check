"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  FileCheck2,
  History,
  User,
  LogOut,
  ShieldAlert,
  Menu,
  Sun,
  Moon,
  Laptop,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: true },
  { label: "Pilih Kegiatan (Workspace)", href: "/workspaces", icon: FolderKanban },
  { label: "Template Form", href: "/templates", icon: FileCheck2, adminOnly: true },
  { label: "Petugas", href: "/officers", icon: Users2, adminOnly: true },
  { label: "Audit Log", href: "/audit-logs", icon: History, adminOnly: true },
];

interface AppHeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role?: "admin" | "officer" | string;
    image?: string | null;
  } | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background h-16 flex items-center px-4 md:px-6 justify-between">
          <div className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shadow-sm">
              RC
            </div>
            <span className="text-base hidden sm:inline-block">RegiCheck</span>
          </div>
        </header>
      }
    >
      <AppHeaderInner serverUser={user} />
    </Suspense>
  );
}

function AppHeaderInner({ serverUser }: { serverUser?: AppHeaderProps["user"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user: clientUser, logout } = useAuthStore();
  const user = serverUser
    ? {
        id: serverUser.id,
        name: serverUser.name,
        email: serverUser.email,
        role: (serverUser.role as "admin" | "officer") || "officer",
        avatarUrl: serverUser.image || undefined,
      }
    : clientUser;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: officers = [] } = useQuery({
    queryKey: ["officers"],
    queryFn: () => api.getOfficers(),
    enabled: user?.role === "admin",
    staleTime: 1000 * 30, // 30 detik
  });

  const pendingCount =
    user?.role === "admin"
      ? officers.filter(
          (o) =>
            o.status === "pending" ||
            (!o.active && o.status !== "rejected" && o.status !== "active")
        ).length
      : 0;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Gagal keluar:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && user?.role !== "admin") return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6 justify-between gap-4">
        {/* Left: Brand & Mobile Nav */}
        <div className="flex items-center gap-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                  RC
                </div>
                <span className="font-semibold text-sm">RegiCheck</span>
              </div>
              <nav className="space-y-1">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const showPendingBadge = item.href === "/officers" && pendingCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {showPendingBadge && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {user && (
                <div className="pt-4 mt-6 border-t border-border">
                  <div className="flex items-center gap-2.5 px-2 mb-3">
                    <Avatar className="w-8 h-8 border border-border">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                      <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-xs font-semibold leading-tight truncate">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    disabled={isLoggingOut}
                    className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-2.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? "Keluar..." : "Keluar (Logout)"}</span>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <Link href={user?.role === "officer" ? "/workspaces" : "/dashboard"} className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shadow-sm">
              RC
            </div>
            <span className="text-base hidden sm:inline-block">RegiCheck</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 pl-4">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const showPendingBadge = item.href === "/officers" && pendingCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive
                      ? "bg-secondary text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {showPendingBadge && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2.5 px-2 py-1.5 h-auto rounded-lg hover:bg-accent/60 transition-colors"
                  />
                }
              >
                <Avatar className="w-8 h-8 border border-border">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold leading-tight">{user.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="text-[9px] px-1.5 py-0 uppercase tracking-wider font-semibold"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2">
                {/* User Info Header */}
                <div className="flex items-center gap-3 px-2 py-2 mb-1 rounded-md bg-muted/50">
                  <Avatar className="w-9 h-9 border border-border shrink-0">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback className="text-xs font-bold">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="text-[9px] px-1.5 py-0 uppercase tracking-wider font-semibold w-fit mt-1"
                    >
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Menu Items */}
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="gap-2.5 px-2 py-2 rounded-md cursor-pointer"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Profil Saya</span>
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2.5 px-2 py-2 rounded-md cursor-pointer">
                      {theme === "dark" ? (
                        <Moon className="w-4 h-4 text-indigo-400" />
                      ) : theme === "light" ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Laptop className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span>Tema Tampilan</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-40 p-1.5">
                      <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                        <DropdownMenuRadioItem value="light" className="gap-2.5 px-2 py-2 rounded-md cursor-pointer">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>Terang</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark" className="gap-2.5 px-2 py-2 rounded-md cursor-pointer">
                          <Moon className="w-4 h-4 text-indigo-400" />
                          <span>Gelap</span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system" className="gap-2.5 px-2 py-2 rounded-md cursor-pointer">
                          <Laptop className="w-4 h-4 text-muted-foreground" />
                          <span>Sistem</span>
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2.5 px-2 py-2 rounded-md cursor-pointer"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className={`w-4 h-4 ${isLoggingOut ? "animate-pulse" : ""}`} />
                  <span>{isLoggingOut ? "Keluar..." : "Keluar (Logout)"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline" className="gap-2 text-xs">
                <ShieldAlert className="w-3.5 h-3.5" />
                Masuk
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
