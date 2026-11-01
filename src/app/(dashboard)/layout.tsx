import { AppHeader } from "@/components/layout/app-header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

