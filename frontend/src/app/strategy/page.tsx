"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, Play } from "lucide-react";
import { AppLayout } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBacktestStore } from "@/store/backtest";
import { api } from "@/lib/api";

const FILTER_FIELDS = ["market_cap", "roce", "pat", "roe", "pe", "pb", "debt_equity", "eps"];
const FILTER_OPERATORS = [
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "between", label: "Between" },
];
const RANKING_METRICS = ["roe", "roce", "pe", "pb", "eps", "market_cap", "pat"];

export default function StrategyPage() {
  const router = useRouter();
  const {
    config,
    isRunning,
    error,
    setConfig,
    addFilter,
    removeFilter,
    addRankingMetric,
    removeRankingMetric,
    updateRankingWeight,
    reorderRankingMetrics,
    setCurrentBacktestId,
    setIsRunning,
    setError,
  } = useBacktestStore();

  const [newFilter, setNewFilter] = useState({
    field: "roe",
    operator: "gt",
    value: "",
    min_value: "",
    max_value: "",
  });

  const moveMetric = (index: number, direction: "up" | "down") => {
    const metrics = [...config.ranking_metrics];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= metrics.length) return;
    [metrics[index], metrics[target]] = [metrics[target], metrics[index]];
    reorderRankingMetrics(metrics);
  };

  const handleAddFilter = () => {
    const filter =
      newFilter.operator === "between"
        ? {
            field: newFilter.field,
            operator: newFilter.operator,
            min_value: parseFloat(newFilter.min_value) || 0,
            max_value: parseFloat(newFilter.max_value) || 0,
          }
        : {
            field: newFilter.field,
            operator: newFilter.operator,
            value: parseFloat(newFilter.value) || 0,
          };
    addFilter(filter);
    setNewFilter({ field: "roe", operator: "gt", value: "", min_value: "", max_value: "" });
  };

  const handleRunBacktest = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await api.runBacktestSync({
        ...config,
        name: config.name || undefined,
      });
      setCurrentBacktestId(result.id);
      router.push(`/results/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Strategy Builder</h1>
          <p className="mt-1 text-slate-500">Configure filters, ranking, and portfolio parameters</p>
        </div>
        <Button onClick={handleRunBacktest} disabled={isRunning}>
          <Play className="mr-2 h-4 w-4" />
          {isRunning ? "Running..." : "Run Backtest"}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Settings</CardTitle>
            <CardDescription>Define backtest period and capital allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Strategy Name</Label>
              <Input
                id="name"
                placeholder="My Value Strategy"
                value={config.name}
                onChange={(e) => setConfig({ name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={config.start_date}
                  onChange={(e) => setConfig({ start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={config.end_date}
                  onChange={(e) => setConfig({ end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rebalance Frequency</Label>
                <Select
                  value={config.rebalance_frequency}
                  onValueChange={(v) => setConfig({ rebalance_frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="half_yearly">Half Yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Position Sizing</Label>
                <Select
                  value={config.position_sizing}
                  onValueChange={(v) => setConfig({ position_sizing: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal_weight">Equal Weight</SelectItem>
                    <SelectItem value="market_cap_weight">Market Cap Weight</SelectItem>
                    <SelectItem value="metric_weight">Metric Weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="portfolio_size">Portfolio Size</Label>
                <Input
                  id="portfolio_size"
                  type="number"
                  min={1}
                  max={100}
                  value={config.portfolio_size}
                  onChange={(e) => setConfig({ portfolio_size: parseInt(e.target.value) || 10 })}
                />
              </div>
              <div>
                <Label htmlFor="initial_capital">Initial Capital (INR)</Label>
                <Input
                  id="initial_capital"
                  type="number"
                  min={1000}
                  value={config.initial_capital}
                  onChange={(e) => setConfig({ initial_capital: parseFloat(e.target.value) || 100000 })}
                />
              </div>
            </div>
            {config.position_sizing === "metric_weight" && (
              <div>
                <Label>Metric Weight Field</Label>
                <Select
                  value={config.metric_weight_field || "roe"}
                  onValueChange={(v) => setConfig({ metric_weight_field: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKING_METRICS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Filters</CardTitle>
            <CardDescription>Screen stocks by fundamental criteria (no lookahead bias)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.filters.length === 0 ? (
              <p className="text-sm text-slate-400">No filters applied. All stocks will be considered.</p>
            ) : (
              <div className="space-y-2">
                {config.filters.map((filter, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {filter.field.toUpperCase()} {filter.operator}{" "}
                      {filter.operator === "between"
                        ? `${filter.min_value} - ${filter.max_value}`
                        : filter.value}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => removeFilter(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-dashed border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Field</Label>
                  <Select value={newFilter.field} onValueChange={(v) => setNewFilter({ ...newFilter, field: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operator</Label>
                  <Select
                    value={newFilter.operator}
                    onValueChange={(v) => setNewFilter({ ...newFilter, operator: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {newFilter.operator === "between" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={newFilter.min_value}
                    onChange={(e) => setNewFilter({ ...newFilter, min_value: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={newFilter.max_value}
                    onChange={(e) => setNewFilter({ ...newFilter, max_value: e.target.value })}
                  />
                </div>
              ) : (
                <Input
                  type="number"
                  placeholder="Value"
                  value={newFilter.value}
                  onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                />
              )}
              <Button variant="outline" size="sm" onClick={handleAddFilter}>
                <Plus className="mr-1 h-4 w-4" /> Add Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ranking Metrics</CardTitle>
              <CardDescription>Composite score from weighted metrics (reorder via arrows)</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addRankingMetric({ metric: "roce", direction: "desc", weight: 0.5 })}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Metric
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {config.ranking_metrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <GripVertical className="h-5 w-5 text-slate-300" />
                <Select
                  value={metric.metric}
                  onValueChange={(v) => {
                    const metrics = [...config.ranking_metrics];
                    metrics[index] = { ...metrics[index], metric: v };
                    reorderRankingMetrics(metrics);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKING_METRICS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={metric.direction}
                  onValueChange={(v) => {
                    const metrics = [...config.ranking_metrics];
                    metrics[index] = { ...metrics[index], direction: v };
                    reorderRankingMetrics(metrics);
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Higher</SelectItem>
                    <SelectItem value="asc">Lower</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500">Weight</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-20"
                    value={metric.weight}
                    onChange={(e) => updateRankingWeight(index, parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveMetric(index, "up")} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moveMetric(index, "down")}
                    disabled={index === config.ranking_metrics.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  {config.ranking_metrics.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRankingMetric(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
