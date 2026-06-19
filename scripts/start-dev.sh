#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting PostgreSQL and Redis..."
if command -v service >/dev/null 2>&1; then
  sudo service postgresql start 2>/dev/null || true
  sudo service redis-server start 2>/dev/null || true
fi

if ! command -v pg_isready >/dev/null 2>&1 || ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "ERROR: PostgreSQL is not running on localhost:5432"
  echo ""
  echo "Option A - Local install:"
  echo "  sudo apt install postgresql postgresql-contrib redis-server"
  echo "  sudo service postgresql start"
  echo ""
  echo "Option B - Docker:"
  echo "  docker compose up -d postgres redis"
  exit 1
fi

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  cp "$ROOT/.env.example" "$ROOT/backend/.env"
fi

if command -v sudo >/dev/null 2>&1 && sudo -u postgres psql -tc "SELECT 1" >/dev/null 2>&1; then
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='backtest'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER backtest WITH PASSWORD 'backtest_secret';"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='equity_backtest'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE equity_backtest OWNER backtest;"
  sudo -u postgres psql -d equity_backtest -c "GRANT ALL ON SCHEMA public TO backtest;" 2>/dev/null || true
fi

TMUX_CONF=""
[ -f /exec-daemon/tmux.portal.conf ] && TMUX_CONF="-f /exec-daemon/tmux.portal.conf"

start_tmux() {
  local name="$1" dir="$2" cmd="$3"
  tmux $TMUX_CONF has-session -t "=$name" 2>/dev/null && tmux $TMUX_CONF kill-session -t "=$name"
  tmux $TMUX_CONF new-session -d -s "$name" -c "$dir" -- bash -lc "$cmd"
}

echo "==> Starting backend on http://localhost:8000"
start_tmux backend-api "$ROOT/backend" "python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo "==> Starting frontend on http://localhost:3000"
start_tmux frontend-dev "$ROOT/frontend" "BACKEND_URL=http://127.0.0.1:8000 npm run dev -- --hostname 0.0.0.0 --port 3000"

sleep 4

curl -sf http://localhost:8000/health >/dev/null && \
  echo "Backend:  http://localhost:8000 (healthy)" && \
  echo "API Docs: http://localhost:8000/docs" || \
  echo "WARNING: Backend not responding. Run: tmux attach -t backend-api"

curl -sf http://localhost:3000 >/dev/null && \
  echo "Frontend: http://localhost:3000" || \
  echo "WARNING: Frontend not responding. Run: tmux attach -t frontend-dev"

echo ""
echo "Seed data: curl -X POST http://localhost:8000/api/v1/data/seed"
