// Use same-origin proxy in browser so remote/cloud access works.
function getApiBase(): string {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("equity-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit, auth = true): Promise<T> {
  const base = getApiBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (auth) {
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/v1${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Cannot reach the backend API. Start the server with ./scripts/start-dev.sh"
    );
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("equity-auth");
      document.cookie = "auth_token=; path=/; max-age=0";
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }));
    const detail = typeof error.detail === "string" ? error.detail : `HTTP ${res.status}`;
    throw new ApiError(detail, res.status);
  }

  return res.json();
}

export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
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
  ranking_metrics: Array<{ metric: string; direction: string; weight: number }>;
}

export interface BacktestResults {
  id: number;
  name: string;
  status: string;
  analytics: Record<string, unknown> & {
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
  register: (email: string, password: string, full_name: string) =>
    fetchAPI<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }, false),

  login: (email: string, password: string) =>
    fetchAPI<TokenResponse>("/auth/login/json", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false),

  getMe: () => fetchAPI<AuthUser>("/auth/me"),

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

  /** Canonical: POST /backtest */
  postBacktest: (config: BacktestConfig) =>
    fetchAPI<{ id: number; status: string; name: string; results: Record<string, unknown> | null }>("/backtest", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  /** Canonical: GET /results?backtest_id= */
  getResults: (backtestId: number) =>
    fetchAPI<BacktestResults>(`/results?backtest_id=${backtestId}`),

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

  async downloadExport(type: "csv" | "excel" | "pdf", backtestId: number) {
    const token = getAuthToken();
    const res = await fetch(`${getApiBase()}/api/v1/export/${type}?backtest_id=${backtestId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Export failed", res.status);
    const blob = await res.blob();
    const ext = type === "excel" ? "xlsx" : type;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${backtestId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
