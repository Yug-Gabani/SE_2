#!/usr/bin/env bash
# ==============================================================================
# TeleMeet 1-Click Shutdown Script (macOS / Linux)
# Stops Frontend, Backend, and Docker PostgreSQL container
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="/Applications/Docker.app/Contents/Resources/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "========================================================"
echo "  Stopping TeleMeet Full-Stack System                   "
echo "========================================================"

# 1. Stop Frontend (Port 3000)
echo "[1/3] Stopping Frontend Dev Server on port 3000..."
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# 2. Stop Backend (Port 8000)
echo "[2/3] Stopping FastAPI Backend Server on port 8000..."
lsof -ti :8000 | xargs kill -9 2>/dev/null || true

# 3. Stop PostgreSQL Docker Container
echo "[3/3] Stopping Docker PostgreSQL container (telemeet-postgres)..."
docker stop telemeet-postgres 2>/dev/null || true

echo ""
echo "========================================================"
echo "  All TeleMeet services have been stopped cleanly!       "
echo "========================================================"
echo "To restart anytime, run: ./start-app.sh"
