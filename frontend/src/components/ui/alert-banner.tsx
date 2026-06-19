import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  message: string;
  variant?: "error" | "warning" | "success";
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({ message, variant = "error", onDismiss, className }: AlertBannerProps) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", styles[variant], className)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
