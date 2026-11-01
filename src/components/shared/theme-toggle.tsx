"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 opacity-50 select-none">
        <Sun className="size-4 text-muted-foreground" />
        <div className="h-[18.4px] w-[32px] rounded-full bg-input/40 animate-pulse" />
        <Moon className="size-4 text-muted-foreground" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border/60">
      <Sun
        className={`size-4 transition-colors ${
          !isDark ? "text-amber-500" : "text-muted-foreground/60"
        }`}
      />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon
        className={`size-4 transition-colors ${
          isDark ? "text-indigo-400" : "text-muted-foreground/60"
        }`}
      />
    </div>
  );
}

