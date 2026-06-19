"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/sidebar";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError, DashboardData } from "@/lib/api";
import { formatPercent } from "@/lib/utils";

export default function ResultsListPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load results"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Backtest Results</h1>
        <p className="mt-1 text-slate-500">View and analyze completed backtests</p>
      </div>

      {error && <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-6" />}

      <Card>
        <CardHeader>
          <CardTitle>All Backtests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : !data?.recent_backtests?.length ? (
            <p className="py-8 text-center text-slate-400">No backtests found.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_backtests.map((bt) => (
                <Link
                  key={bt.id}
                  href={bt.status === "completed" ? `/results/${bt.id}` : "#"}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium">{bt.name || `Backtest #${bt.id}`}</p>
                    <p className="text-xs text-slate-400">{new Date(bt.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {bt.cagr != null && (
                      <span className="font-semibold text-emerald-600">{formatPercent(bt.cagr)}</span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        bt.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {bt.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
