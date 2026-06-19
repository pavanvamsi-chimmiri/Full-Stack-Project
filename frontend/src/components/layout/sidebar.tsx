"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, LineChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategy", label: "Strategy Builder", icon: Settings },
  { href: "/results", label: "Results", icon: LineChart },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <BarChart3 className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-sm font-bold tracking-wide">EQUITY ALPHA</h1>
          <p className="text-xs text-slate-400">Backtesting Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-500">NSE/BSE Equity Backtesting</p>
        <p className="text-xs text-slate-600">v1.0.0</p>
      </div>
    </aside>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
