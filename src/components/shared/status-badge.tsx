import { ParticipantStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: ParticipantStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "complete":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 font-medium",
            className
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Lengkap
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 gap-1.5 font-medium",
            className
          )}
        >
          <XCircle className="w-3.5 h-3.5" />
          Ditolak
        </Badge>
      );
    case "incomplete":
    default:
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1.5 font-medium",
            className
          )}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Belum Lengkap
        </Badge>
      );
  }
}

