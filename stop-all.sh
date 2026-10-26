#!/usr/bin/env bash
# =========================================================
# PulseCare 1-Click Shutdown Script (macOS / Linux)
# =========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/Applications/Docker.app/Contents/Resources/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "========================================"
echo "  Stopping PulseCare Full-Stack System  "
echo "========================================"

# 1. Stop Frontend
echo ""
echo "[1/2] Stopping Frontend Dev Server on port 5173..."
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# 2. Stop Docker Containers
echo ""
echo "[2/2] Stopping Docker Containers (healthcare-backend, postgres, redis)..."
docker compose -f "$SCRIPT_DIR/docker/docker-compose.yml" --profile full down 2>/dev/null || \
docker stop healthcare-backend healthcare-postgres healthcare-redis 2>/dev/null || true

echo ""
echo "========================================"
echo "  All PulseCare servers stopped cleanly! "
echo "========================================"
echo "To start everything again, run: ./start-all.sh"
