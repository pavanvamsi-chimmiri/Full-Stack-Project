#!/usr/bin/env bash
# End-to-end demo script for Equity Backtesting Platform
set -euo pipefail

API="${API_URL:-http://localhost:8000}"
EMAIL="${DEMO_EMAIL:-demo@equity.com}"
PASS="${DEMO_PASS:-demo1234}"

echo "=============================================="
echo "  Equity Backtesting Platform - E2E Demo"
echo "=============================================="
echo ""

# 1. Health check
echo "[1/7] Health check..."
curl -sf "$API/health" | python3 -m json.tool
echo ""

# 2. Register or login
echo "[2/7] Authenticating..."
TOKEN=$(curl -sf -X POST "$API/api/v1/auth/login/json" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null) || \
TOKEN=$(curl -sf -X POST "$API/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"full_name\":\"Demo User\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Token obtained."
echo ""

AUTH="Authorization: Bearer $TOKEN"

# 3. Seed data (skip if already seeded or in progress)
echo "[3/7] Seeding sample data (226+ NSE companies)..."
curl -sf --max-time 5 -X POST "$API/api/v1/data/seed" -H "$AUTH" | python3 -m json.tool 2>/dev/null || echo "(data already seeded or seed running in background)"
echo ""

# 4. GET /stocks
echo "[4/7] GET /api/v1/stocks..."
STOCKS=$(curl -sf "$API/api/v1/stocks?page_size=5" -H "$AUTH")
echo "$STOCKS" | python3 -m json.tool | head -20
echo ""

# 5. POST /backtest
echo "[5/7] POST /api/v1/backtest..."
BACKTEST=$(curl -sf -X POST "$API/api/v1/backtest" -H "$AUTH" -H "Content-Type: application/json" -d '{
  "name": "E2E Demo Strategy",
  "start_date": "2022-01-01",
  "end_date": "2024-12-31",
  "rebalance_frequency": "quarterly",
  "portfolio_size": 10,
  "initial_capital": 100000,
  "position_sizing": "equal_weight",
  "filters": [{"field": "roce", "operator": "gt", "value": 10}],
  "ranking_metrics": [{"metric": "roe", "direction": "desc", "weight": 0.6}, {"metric": "roce", "direction": "desc", "weight": 0.4}]
}')
echo "$BACKTEST" | python3 -m json.tool
BT_ID=$(echo "$BACKTEST" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Backtest ID: $BT_ID"
echo ""

# 6. GET /results
echo "[6/7] GET /api/v1/results?backtest_id=$BT_ID..."
curl -sf "$API/api/v1/results?backtest_id=$BT_ID" -H "$AUTH" -o /tmp/e2e_results.json
python3 << 'PY'
import json
with open("/tmp/e2e_results.json") as f:
    r = json.load(f)
a = r.get("analytics", {})
print(f"  CAGR:          {a.get('cagr')}%")
print(f"  Sharpe Ratio:  {a.get('sharpe_ratio')}")
print(f"  Max Drawdown:  {a.get('max_drawdown')}%")
print(f"  Final Value:   {a.get('final_value')}")
print(f"  Holdings:      {len(r.get('holdings', []))} records")
print(f"  Top Winners:   {len(r.get('top_winners', []))}")
PY
echo ""

# 7. Export CSV
echo "[7/7] Export CSV..."
curl -sf "$API/api/v1/export/csv?backtest_id=$BT_ID" -H "$AUTH" -o "/tmp/backtest_${BT_ID}.csv"
echo "Saved: /tmp/backtest_${BT_ID}.csv ($(wc -c < /tmp/backtest_${BT_ID}.csv) bytes)"
echo ""
echo "=============================================="
echo "  E2E Demo Complete!"
echo "  Frontend: http://localhost:3000"
echo "  Login:    $EMAIL / $PASS"
echo "=============================================="
