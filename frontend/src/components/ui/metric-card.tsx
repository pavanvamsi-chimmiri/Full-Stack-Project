import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-slate-400" />}
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-bold tracking-tight",
          trend === "up" && "text-emerald-600",
          trend === "down" && "text-red-600",
          !trend && "text-slate-900"
        )}
      >
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
