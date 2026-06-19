# Equity Backtesting Framework

A production-ready, end-to-end equity backtesting platform for Indian markets (NSE/BSE). Build custom investment strategies, run historical backtests with no lookahead bias, and analyze performance with institutional-grade analytics.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│   FastAPI       │────▶│  PostgreSQL     │
│   Frontend      │     │   Backend       │     │  Database       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │  Celery Worker  │
                        │  + Redis Beat   │
                        └─────────────────┘
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, ShadCN UI, Recharts, React Hook Form, Zustand |
| Backend | Python FastAPI, Pandas, NumPy, SQLAlchemy, Pydantic, Celery |
| Database | PostgreSQL 16 |
| Data Sources | Yahoo Finance API (NSE `.NS` tickers) |
| Deployment | Docker, Docker Compose |

## Features

### Module 1: Data Collection Engine
- Historical OHLCV data for 100+ NSE-listed companies
- Fundamental data: P&L, Balance Sheet, Cash Flow
- Financial ratios: ROE, ROCE, PE, PB, PAT, Debt/Equity, EPS, Market Cap
- Automatic scheduled refresh (daily prices, weekly fundamentals)

### Module 2: Database Design
- Normalized PostgreSQL schema with indexed tables
- Companies, stock prices, financials, ratios, backtests, portfolio holdings

### Module 3: Backtest Engine
- Configurable date range and rebalancing (monthly/quarterly/half-yearly/yearly)
- Portfolio sizing (Top 10/20/50) with equal, market cap, or metric weighting
- Multi-filter screening (market cap, ROCE, PAT, etc.)
- Single and composite metric ranking
- No future data leakage, proper rebalancing, capital compounding

### Module 4: Performance Analytics
- CAGR, Total Return, Sharpe Ratio, Sortino Ratio, Max Drawdown, Volatility
- Win rate, best/worst trade tracking
- Equity curve and drawdown visualization

### Module 5: Frontend Dashboard
- Dashboard with portfolio overview
- Strategy Builder with drag-and-drop ranking
- Results page with interactive charts
- CSV, Excel, and PDF export

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### 1. Clone and Configure

```bash
git clone <repository-url>
cd equity-backtesting
cp .env.example .env
```

### 2. Start with Docker Compose

```bash
docker compose up -d
```

Services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 3. Seed Sample Data

Via the Dashboard UI, click **"Seed Sample Data"**, or via API:

```bash
curl -X POST http://localhost:8000/api/v1/data/seed
```

### 4. Run a Backtest

1. Navigate to **Strategy Builder** at http://localhost:3000/strategy
2. Configure parameters, filters, and ranking metrics
3. Click **Run Backtest**
4. View results with charts and export reports

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start PostgreSQL and Redis (or use Docker for just these services)
export DATABASE_URL=postgresql://backtest:backtest_secret@localhost:5432/equity_backtest

uvicorn app.main:app --reload --port 8000
```

Seed data locally:

```bash
python scripts/seed_data.py
```

Start Celery worker (separate terminal):

```bash
celery -A app.core.celery_app worker --loglevel=info
celery -A app.core.celery_app beat --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/stocks` | List companies |
| GET | `/api/v1/financials` | Financial statements |
| GET | `/api/v1/ratios` | Financial ratios |
| POST | `/api/v1/backtest/run` | Run backtest (async) |
| POST | `/api/v1/backtest/run/sync` | Run backtest (sync) |
| GET | `/api/v1/backtest/{id}` | Get backtest status |
| GET | `/api/v1/backtest/results/{id}` | Get backtest results |
| GET | `/api/v1/dashboard` | Dashboard statistics |
| GET | `/api/v1/export/csv?backtest_id=` | Export CSV |
| GET | `/api/v1/export/excel?backtest_id=` | Export Excel |
| GET | `/api/v1/export/pdf?backtest_id=` | Export PDF |
| POST | `/api/v1/data/seed` | Seed sample data |
| POST | `/api/v1/data/refresh` | Refresh market data |
| GET | `/health` | Health check |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── core/             # Config, database, Celery, logging
│   │   ├── engine/           # Backtest engine, filters, ranking, analytics
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic services
│   │   ├── tasks/            # Celery background tasks
│   │   └── data/             # NSE ticker list
│   ├── scripts/              # Seed and utility scripts
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # UI components, charts, layout
│   │   ├── lib/              # API client, utilities
│   │   └── store/            # Zustand state management
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Database Schema

| Table | Key Columns |
|-------|------------|
| `companies` | id, ticker, company_name, sector, market_cap |
| `stock_prices` | id, company_id, date, open, high, low, close, volume |
| `financials` | id, company_id, fiscal_year, revenue, profit, assets, liabilities, cashflow |
| `ratios` | id, company_id, roe, roce, pe, pb, eps, pat, debt_equity, market_cap |
| `backtests` | id, user_inputs (JSONB), results (JSONB), status |
| `portfolio_holdings` | id, backtest_id, stock, weight, entry_date, exit_date, returns |

All tables include performance indexes on frequently queried columns.

## Deployment

### Production Docker Compose

1. Update `.env` with production credentials
2. Set strong `POSTGRES_PASSWORD`
3. Configure `CORS_ORIGINS` for your domain
4. Run:

```bash
docker compose -f docker-compose.yml up -d --build
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `CELERY_BROKER_URL` | Celery broker URL | — |
| `LOG_LEVEL` | Logging level | INFO |
| `RATE_LIMIT` | API rate limit | 100/minute |
| `CORS_ORIGINS` | Allowed CORS origins | http://localhost:3000 |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | http://localhost:8000 |

## Security

- Pydantic input validation on all API endpoints
- Rate limiting via SlowAPI
- Global exception handling with structured error responses
- Request logging middleware
- Environment-based configuration (no hardcoded secrets)

## License

MIT


## Troubleshooting

### "Can't connect to server" / Frontend or API Docs won't load

The app requires **PostgreSQL**, **Redis**, and both **backend** and **frontend** servers to be running.

**Option 1 — One-command local start (no Docker):**

```bash
./scripts/start-dev.sh
```

**Option 2 — Docker Compose:**

```bash
docker compose up -d
```

**Option 3 — Manual start:**

```bash
# Terminal 1: Database
sudo service postgresql start
sudo service redis-server start

# Terminal 2: Backend
cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3: Frontend
cd frontend && npm run dev -- --hostname 0.0.0.0 --port 3000
```

**Verify services:**

```bash
curl http://localhost:8000/health   # Should return {"status":"healthy",...}
curl http://localhost:3000          # Should return HTML
```

**Common causes:**

| Error | Fix |
|-------|-----|
| Connection refused on :8000 | Backend not started, or PostgreSQL not running |
| Connection refused on :3000 | Frontend not started (`npm run dev`) |
| `psycopg2.OperationalError` | Start PostgreSQL and create the `equity_backtest` database |
| Docker not found | Install Docker or use `./scripts/start-dev.sh` instead |
