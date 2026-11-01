import { redirect } from "next/navigation";
import { getCurrentUser, isUserRegistered } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 1. Jika belum login sama sekali -> lempar ke login
  if (!user) {
    redirect("/login");
  }

  // 2. Jika sudah login tetapi belum terdaftar (bukan admin & bukan officer aktif) -> lempar ke pending-approval
  const registered = await isUserRegistered(user.email);
  if (!registered) {
    redirect("/pending-approval");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
