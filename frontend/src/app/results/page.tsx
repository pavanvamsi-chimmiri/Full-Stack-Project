"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, DashboardData } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function ResultsListPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  const backtests = data?.recent_backtests ?? [];

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Backtest Results</h1>
          <p className="mt-1 text-slate-500">View and export completed strategy backtests</p>
        </div>
        <Link href="/strategy">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            All Backtests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backtests.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">No backtests yet.</p>
              <Link href="/strategy">
                <Button className="mt-4">Create Your First Strategy</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4 text-right">CAGR</th>
                    <th className="pb-3 text-right">Final Value</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backtests.map((bt) => (
                    <tr key={bt.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {bt.name || `Backtest #${bt.id}`}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {new Date(bt.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4">
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
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        {bt.cagr != null ? (
                          <span className={bt.cagr >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {formatPercent(bt.cagr)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 text-right text-slate-700">
                        {bt.final_value != null ? formatCurrency(bt.final_value) : "-"}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {bt.status === "completed" ? (
                          <Link href={`/results/${bt.id}`}>
                            <Button variant="outline" size="sm">
                              View Results
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
