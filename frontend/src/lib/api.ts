// Use same-origin proxy in browser so remote/cloud access works.
// Next.js rewrites /api/v1/* -> backend (see next.config.ts).
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  let res: Response;

  try {
    res = await fetch(`${base}/api/v1${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the backend API. Start the server with ./scripts/start-dev.sh or docker compose up -d"
    );
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }));
    throw new ApiError(typeof error.detail === "string" ? error.detail : `HTTP ${res.status}`);
  }

  return res.json();
}

export interface DashboardData {
  stats: {
    total_backtests: number;
    avg_cagr: number | null;
    latest_portfolio_value: number | null;
    active_strategies: number;
    total_companies: number;
    last_data_refresh: string | null;
  };
  recent_backtests: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    cagr?: number;
    final_value?: number;
  }>;
}

export interface BacktestConfig {
  name?: string;
  start_date: string;
  end_date: string;
  rebalance_frequency: string;
  portfolio_size: number;
  initial_capital: number;
  position_sizing: string;
  metric_weight_field?: string;
  filters: Array<{
    field: string;
    operator: string;
    value?: number;
    min_value?: number;
    max_value?: number;
  }>;
  ranking_metrics: Array<{
    metric: string;
    direction: string;
    weight: number;
  }>;
}

export interface BacktestResults {
  id: number;
  name: string;
  status: string;
  analytics: {
    total_return: number;
    cagr: number;
    annual_return: number;
    volatility: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    win_rate: number;
    best_trade: number;
    worst_trade: number;
    final_value: number;
    initial_capital: number;
    equity_curve: Array<{ date: string; value: number }>;
    drawdown_series: Array<{ date: string; drawdown: number }>;
  };
  holdings: Array<{
    stock: string;
    weight: number;
    entry_date: string;
    exit_date: string | null;
    returns: number | null;
  }>;
  top_winners: Array<{ stock: string; returns: number; weight: number }>;
  top_losers: Array<{ stock: string; returns: number; weight: number }>;
  user_inputs: BacktestConfig;
}

export const api = {
  getDashboard: () => fetchAPI<DashboardData>("/dashboard"),

  getStocks: (page = 1, pageSize = 50) =>
    fetchAPI<{ companies: Array<{ id: number; ticker: string; company_name: string; sector: string | null }>; total: number }>(
      `/stocks?page=${page}&page_size=${pageSize}`
    ),

  runBacktest: (config: BacktestConfig) =>
    fetchAPI<{ id: number; status: string; message: string }>("/backtest/run", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  runBacktestSync: (config: BacktestConfig) =>
    fetchAPI<{ id: number; status: string }>("/backtest/run/sync", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  getBacktest: (id: number) => fetchAPI<{ id: number; status: string; name: string }>(`/backtest/${id}`),

  getBacktestResults: (id: number) => fetchAPI<BacktestResults>(`/backtest/results/${id}`),

  seedData: () =>
    fetchAPI<{ message: string; stats: Record<string, number> }>("/data/seed", { method: "POST" }),

  exportUrl: (type: "csv" | "excel" | "pdf", backtestId: number) =>
    `/api/v1/export/${type}?backtest_id=${backtestId}`,
};
