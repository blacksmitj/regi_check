import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getCurrentUser, isUserRegistered } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { AuthSync } from "@/components/shared/auth-sync";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Dapatkan URL saat ini untuk callback redirect setelah login
  const headersList = await headers();
  const currentPath =
    headersList.get("x-pathname") ||
    headersList.get("x-invoke-path") ||
    "";

  // 1. Jika belum login sama sekali -> bersihkan sisa cookie invalid lalu lempar ke login
  if (!user) {
    const cookieStore = await cookies();
    cookieStore.delete("better-auth.session_token");
    cookieStore.delete("__Secure-better-auth.session_token");

    if (currentPath && currentPath.startsWith("/workspaces/")) {
      redirect(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
    }
    redirect("/login");
  }

  // 2. Jika sudah login tetapi belum terdaftar (bukan admin & bukan officer aktif) -> lempar ke pending-approval
  const registered = await isUserRegistered(user.email);
  if (!registered) {
    if (currentPath && currentPath.startsWith("/workspaces/")) {
      redirect(`/pending-approval?callbackUrl=${encodeURIComponent(currentPath)}`);
    }
    redirect("/pending-approval");
  }

  const clientUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.image || undefined,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AuthSync user={clientUser} />
      <AppHeader user={user} />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
