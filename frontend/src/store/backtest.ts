import { create } from "zustand";
import type { BacktestConfig, BacktestResults } from "@/lib/api";

interface BacktestState {
  config: BacktestConfig;
  currentBacktestId: number | null;
  results: BacktestResults | null;
  isRunning: boolean;
  error: string | null;

  setConfig: (config: Partial<BacktestConfig>) => void;
  addFilter: (filter: BacktestConfig["filters"][0]) => void;
  removeFilter: (index: number) => void;
  addRankingMetric: (metric: BacktestConfig["ranking_metrics"][0]) => void;
  removeRankingMetric: (index: number) => void;
  updateRankingWeight: (index: number, weight: number) => void;
  reorderRankingMetrics: (metrics: BacktestConfig["ranking_metrics"]) => void;
  setCurrentBacktestId: (id: number | null) => void;
  setResults: (results: BacktestResults | null) => void;
  setIsRunning: (running: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultConfig: BacktestConfig = {
  name: "",
  start_date: "2020-01-01",
  end_date: "2024-12-31",
  rebalance_frequency: "quarterly",
  portfolio_size: 10,
  initial_capital: 100000,
  position_sizing: "equal_weight",
  metric_weight_field: "roe",
  filters: [],
  ranking_metrics: [{ metric: "roe", direction: "desc", weight: 1.0 }],
};

export const useBacktestStore = create<BacktestState>((set) => ({
  config: defaultConfig,
  currentBacktestId: null,
  results: null,
  isRunning: false,
  error: null,

  setConfig: (config) =>
    set((state) => ({ config: { ...state.config, ...config } })),

  addFilter: (filter) =>
    set((state) => ({ config: { ...state.config, filters: [...state.config.filters, filter] } })),

  removeFilter: (index) =>
    set((state) => ({
      config: { ...state.config, filters: state.config.filters.filter((_, i) => i !== index) },
    })),

  addRankingMetric: (metric) =>
    set((state) => ({
      config: { ...state.config, ranking_metrics: [...state.config.ranking_metrics, metric] },
    })),

  removeRankingMetric: (index) =>
    set((state) => ({
      config: {
        ...state.config,
        ranking_metrics: state.config.ranking_metrics.filter((_, i) => i !== index),
      },
    })),

  updateRankingWeight: (index, weight) =>
    set((state) => ({
      config: {
        ...state.config,
        ranking_metrics: state.config.ranking_metrics.map((m, i) =>
          i === index ? { ...m, weight } : m
        ),
      },
    })),

  reorderRankingMetrics: (metrics) =>
    set((state) => ({ config: { ...state.config, ranking_metrics: metrics } })),

  setCurrentBacktestId: (id) => set({ currentBacktestId: id }),
  setResults: (results) => set({ results }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setError: (error) => set({ error }),
  reset: () => set({ config: defaultConfig, currentBacktestId: null, results: null, error: null }),
}));
