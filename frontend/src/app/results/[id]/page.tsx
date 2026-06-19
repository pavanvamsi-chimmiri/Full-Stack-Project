"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { AppLayout } from "@/components/layout/sidebar";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { api, BacktestResults } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function ResultsPage() {
  const params = useParams();
  const id = Number(params.id);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchResults = async () => {
      try {
        const data = await api.getBacktestResults(id);
        setResults(data);
      } catch (e) {
        const bt = await api.getBacktest(id).catch(() => null);
        if (bt?.status === "running" || bt?.status === "pending") {
          setTimeout(fetchResults, 3000);
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-500">Running backtest analysis...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !results) {
    return (
      <AppLayout>
        <div className="text-center">
          <p className="text-red-600">{error || "Results not found"}</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { analytics } = results;

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {results.name || `Backtest #${results.id}`}
            </h1>
            <p className="text-slate-500">
              {formatCurrency(analytics.initial_capital)} → {formatCurrency(analytics.final_value)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={api.exportUrl("csv", id)} download>
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </a>
          <a href={api.exportUrl("excel", id)} download>
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>
          </a>
          <a href={api.exportUrl("pdf", id)} download>
            <Button variant="outline" size="sm">
              <FileText className="mr-1 h-4 w-4" /> PDF
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          title="CAGR"
          value={formatPercent(analytics.cagr)}
          trend={analytics.cagr > 0 ? "up" : "down"}
        />
        <MetricCard title="Total Return" value={formatPercent(analytics.total_return)} />
        <MetricCard title="Sharpe Ratio" value={analytics.sharpe_ratio.toFixed(2)} />
        <MetricCard
          title="Max Drawdown"
          value={`${analytics.max_drawdown.toFixed(2)}%`}
          trend="down"
        />
        <MetricCard title="Volatility" value={`${analytics.volatility.toFixed(2)}%`} />
        <MetricCard title="Win Rate" value={`${analytics.win_rate.toFixed(1)}%`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EquityCurveChart data={analytics.equity_curve} />
        <DrawdownChart data={analytics.drawdown_series} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-700">Top Winners</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2">Stock</th>
                  <th className="pb-2 text-right">Return</th>
                </tr>
              </thead>
              <tbody>
                {results.top_winners.map((w, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{w.stock}</td>
                    <td className="py-2 text-right text-emerald-600">
                      {formatPercent(w.returns ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Top Losers</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2">Stock</th>
                  <th className="pb-2 text-right">Return</th>
                </tr>
              </thead>
              <tbody>
                {results.top_losers.map((w, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{w.stock}</td>
                    <td className="py-2 text-right text-red-600">
                      {formatPercent(w.returns ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trade Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Best Trade</span>
              <span className="font-semibold text-emerald-600">
                {formatPercent(analytics.best_trade)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Worst Trade</span>
              <span className="font-semibold text-red-600">
                {formatPercent(analytics.worst_trade)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sortino Ratio</span>
              <span className="font-semibold">{analytics.sortino_ratio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Annual Return</span>
              <span className="font-semibold">{formatPercent(analytics.annual_return)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-3 pr-4">Stock</th>
                  <th className="pb-3 pr-4">Weight</th>
                  <th className="pb-3 pr-4">Entry Date</th>
                  <th className="pb-3 pr-4">Exit Date</th>
                  <th className="pb-3 text-right">Return</th>
                </tr>
              </thead>
              <tbody>
                {results.holdings.map((h, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium">{h.stock}</td>
                    <td className="py-2.5">{(h.weight * 100).toFixed(1)}%</td>
                    <td className="py-2.5">{h.entry_date}</td>
                    <td className="py-2.5">{h.exit_date || "—"}</td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        (h.returns ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {h.returns != null ? formatPercent(h.returns) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
