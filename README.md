# Equity Backtesting Platform

Production-ready full-stack platform for backtesting equity investment strategies on Indian markets (NSE/BSE).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, Pandas, NumPy, yfinance |
| Database | PostgreSQL |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Recharts |
| Auth | JWT + bcrypt |
| Deploy | Docker Compose |

---

## Complete End-to-End Setup (15 minutes)

### Step 1: Clone and configure

```bash
git clone <repo-url>
cd equity-backtesting
cp .env.example .env
cp .env.example backend/.env
```

### Step 2: Start all services

**Option A — One command (recommended):**
```bash
chmod +x scripts/start-dev.sh scripts/e2e-demo.sh
./scripts/start-dev.sh
```

**Option B — Docker:**
```bash
docker compose up -d --build
```

### Step 3: Sign in

Open **http://localhost:3000**

- Click **Sign up** to create an account, OR
- Use demo credentials: `demo@equity.com` / `demo1234`

### Step 4: Load sample data

On the Dashboard, click **"Seed Sample Data"** (loads 226+ NSE companies with OHLCV, fundamentals, ratios).

Or via terminal:
```bash
# Get token first by signing in, then:
curl -X POST http://localhost:8000/api/v1/data/seed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Or run the seed script:
```bash
cd backend && python3 scripts/seed_data.py
```

### Step 5: Run a backtest

1. Go to **Strategy Builder** (`/strategy`)
2. Set date range (e.g. 2022-01-01 to 2024-12-31)
3. Choose rebalance frequency (Monthly / Quarterly / Yearly)
4. Set portfolio size (e.g. Top 10)
5. Add filters (Market Cap, ROCE, PAT)
6. Configure ranking metrics (ROE, ROCE, PE)
7. Click **Run Backtest**

### Step 6: View results

Results page shows:
- Equity curve chart
- Drawdown chart
- CAGR, Sharpe Ratio, Max Drawdown, Volatility
- Top winners and losers
- Portfolio holdings log
- CSV / Excel / PDF export

### Step 7: Run automated E2E demo

```bash
./scripts/e2e-demo.sh
```

This script authenticates, seeds data, runs a backtest, fetches results, and exports CSV.

---

## API Endpoints (Canonical)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login/json` | Sign in |
| GET | `/api/v1/auth/me` | Current user |
| **POST** | **`/api/v1/backtest`** | **Run backtest** |
| **GET** | **`/api/v1/results?backtest_id=`** | **Get results** |
| **GET** | **`/api/v1/stocks`** | **List stocks** |
| GET | `/api/v1/dashboard` | Dashboard stats |
| GET | `/api/v1/financials` | Financial statements |
| GET | `/api/v1/ratios` | Financial ratios |
| GET | `/api/v1/export/csv?backtest_id=` | Export CSV |
| GET | `/api/v1/export/excel?backtest_id=` | Export Excel |
| GET | `/api/v1/export/pdf?backtest_id=` | Export PDF |
| POST | `/api/v1/data/seed` | Seed sample data |
| GET | `/health` | Health check |

Interactive docs: **http://localhost:8000/docs**

---

## Backtest Engine Features

| Feature | Supported |
|---------|-----------|
| Start / End Date | Yes |
| Rebalancing | Monthly, Quarterly, Half-Yearly, Yearly |
| Portfolio Size | Top N stocks (1-100) |
| Position Sizing | Equal Weight, Market Cap Weight, Metric Weight |
| Filters | Market Cap, ROCE, PAT, ROE, PE, PB |
| Ranking | Single metric or multi-factor composite |
| Compounding | Yes |
| No Future Data Leakage | Yes |
| Transaction Logging | Yes |
| Portfolio Tracking | Yes |

---

## Database Schema

```
companies          → id, ticker, company_name, sector, market_cap
stock_prices       → id, company_id, date, open, high, low, close, volume
financials         → id, company_id, fiscal_year, revenue, profit, assets, liabilities, cashflow
ratios             → id, company_id, roe, roce, pe, pb, eps, pat, debt_equity, market_cap
backtests          → id, user_id, user_inputs (JSONB), results (JSONB), status
portfolio_holdings → id, backtest_id, stock, weight, entry_date, exit_date, returns
users              → id, email, hashed_password, full_name
```

---

## Project Structure

```
backend/
  app/
    api/routes/     → FastAPI endpoints
    core/           → Config, database, security, JWT
    engine/         → Backtest engine, filters, ranking, analytics
    models/         → SQLAlchemy ORM models
    schemas/        → Pydantic validation
    services/       → Business logic
    tasks/          → Celery background jobs
    data/           → 226+ NSE ticker list
  scripts/          → seed_data.py

frontend/
  src/
    app/            → Pages (dashboard, strategy, results, login, signup)
    components/     → UI, charts, auth forms
    lib/            → API client
    store/          → Zustand state (auth, backtest)

scripts/
  start-dev.sh      → Start everything locally
  e2e-demo.sh       → Automated end-to-end demo

docker-compose.yml  → PostgreSQL, Redis, Backend, Frontend, Celery
```

---

## Sample Data

The platform includes 226+ NSE-listed companies:

| Data | Source | Records (after seed) |
|------|--------|---------------------|
| Companies | NSE ticker list | 226 |
| OHLCV prices | Yahoo Finance (.NS) | ~295,000 |
| Financials | Yahoo Finance + synthetic | 226 |
| Ratios (5yr history) | Yahoo Finance + synthetic | 1,130 |

Synthetic fallback ensures demo works even if Yahoo Finance API is unavailable.

---

## Environment Variables

```env
DATABASE_URL=postgresql://backtest:backtest_secret@localhost:5432/equity_backtest
JWT_SECRET_KEY=change-this-in-production
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_URL=http://127.0.0.1:8000
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to server | Run `./scripts/start-dev.sh` |
| Failed to fetch (frontend) | Backend not running; restart services |
| 401 Unauthorized | Sign in first at `/login` |
| Empty backtest results | Seed data first, then run backtest |
| PostgreSQL connection refused | `sudo service postgresql start` |

---

## License

MIT
