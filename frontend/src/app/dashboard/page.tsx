"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { AppLayout } from "@/components/layout/sidebar";
import { AlertBanner } from "@/components/ui/alert-banner";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError, DashboardData } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const result = await api.getDashboard();
      setData(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    setSeedMessage(null);
    try {
      const result = await api.seedData();
      setSeedMessage(result.message || "Data seeding started successfully.");
      await loadDashboard();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to seed data");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const stats = data?.stats;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">Portfolio analytics and backtest overview</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSeed} disabled={seeding || !!error}>
            {seeding ? "Seeding..." : "Seed Sample Data"}
          </Button>
          <Link href="/strategy">
            <Button>New Strategy</Button>
          </Link>
        </div>
      </div>

      {error && (
        <AlertBanner message={error} onDismiss={() => setError(null)} className="mb-6" />
      )}
      {seedMessage && !error && (
        <AlertBanner message={seedMessage} variant="success" onDismiss={() => setSeedMessage(null)} className="mb-6" />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Backtests" value={String(stats?.total_backtests ?? 0)} icon={BarChart3} />
        <MetricCard
          title="Average CAGR"
          value={stats?.avg_cagr != null ? formatPercent(stats.avg_cagr) : "—"}
          icon={TrendingUp}
          trend={stats?.avg_cagr && stats.avg_cagr > 0 ? "up" : "neutral"}
        />
        <MetricCard
          title="Portfolio Value"
          value={stats?.latest_portfolio_value ? formatCurrency(stats.latest_portfolio_value) : "—"}
          icon={IndianRupee}
        />
        <MetricCard
          title="Listed Companies"
          value={String(stats?.total_companies ?? 0)}
          subtitle={`${stats?.active_strategies ?? 0} active strategies`}
          icon={Building2}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Recent Backtests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.recent_backtests?.length ? (
              <p className="py-8 text-center text-slate-400">
                No backtests yet. Create your first strategy to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recent_backtests.map((bt) => (
                  <Link
                    key={bt.id}
                    href={bt.status === "completed" ? `/results/${bt.id}` : "#"}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{bt.name || `Backtest #${bt.id}`}</p>
                      <p className="text-xs text-slate-400">{new Date(bt.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          bt.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : bt.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {bt.status}
                      </span>
                      {bt.cagr != null && (
                        <p className="mt-1 text-sm font-semibold text-emerald-600">{formatPercent(bt.cagr)}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900">1. Seed Data</h3>
              <p className="mt-1 text-sm text-blue-700">Load 100+ NSE companies with historical prices and fundamentals.</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <h3 className="font-semibold text-emerald-900">2. Build Strategy</h3>
              <p className="mt-1 text-sm text-emerald-700">Configure filters, ranking metrics, and portfolio parameters.</p>
            </div>
            <div className="rounded-lg bg-violet-50 p-4">
              <h3 className="font-semibold text-violet-900">3. Run Backtest</h3>
              <p className="mt-1 text-sm text-violet-700">Analyze performance with equity curves, drawdowns, and exports.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
