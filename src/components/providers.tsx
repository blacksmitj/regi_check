"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, ReactNode, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { useAuthStore } from "@/stores/auth-store";
import { Toaster } from "@/components/ui/toast";

// Suppress React 19 false-positive warning for next-themes inline script injection
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag while rendering React component")) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 mins
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const initAuth = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Periodic background sheet sync runner (runs every 60 seconds when app is active)
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const interval = setInterval(() => {
      fetch("/api/cron/sync-sheets").catch(() => {
        // Silent background trigger
      });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

