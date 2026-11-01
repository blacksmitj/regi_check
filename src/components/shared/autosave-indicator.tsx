import { SyncStatus } from "@/types/domain";
import { Loader2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutosaveIndicatorProps {
  status: SyncStatus;
  className?: string;
  onRetry?: () => void;
}

export function AutosaveIndicator({ status, className, onRetry }: AutosaveIndicatorProps) {
  switch (status) {
    case "saving":
      return (
        <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Menyimpan lokal...</span>
        </div>
      );
    case "saved":
      return (
        <div className={cn("flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium", className)}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tersimpan lokal</span>
        </div>
      );
    case "pending":
      return (
        <div className={cn("flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400", className)}>
          <Clock className="w-3.5 h-3.5" />
          <span>Menunggu sinkronisasi</span>
        </div>
      );
    case "syncing":
      return (
        <div className={cn("flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400", className)}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Menyinkronkan ke server...</span>
        </div>
      );
    case "synced":
      return (
        <div className={cn("flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400", className)}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tersimpan di server</span>
        </div>
      );
    case "error":
      return (
        <div className={cn("flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400", className)}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Gagal menyimpan</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline font-semibold hover:text-rose-700 ml-1 cursor-pointer"
            >
              Coba lagi
            </button>
          )}
        </div>
      );
    default:
      return null;
  }
}

