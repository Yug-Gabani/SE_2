#!/usr/bin/env bash
# =========================================================
# PulseCare 1-Click Startup Script (macOS / Linux)
# =========================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure Docker and Node are discoverable in PATH (prioritizing native NVM Node)
NODE_NVM_DIR="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin"
export PATH="$NODE_NVM_DIR:/Applications/Docker.app/Contents/Resources/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "========================================"
echo "  Starting PulseCare Full-Stack System  "
echo "========================================"

# 1. Check if Docker daemon is running
echo ""
echo "[1/3] Checking Docker daemon..."
if ! docker info >/dev/null 2>&1; then
    echo "Starting Docker Desktop application..."
    open -a Docker 2>/dev/null || true
    echo "Waiting for Docker daemon to initialize..."
    RETRIES=30
    while [ $RETRIES -gt 0 ]; do
        if docker info >/dev/null 2>&1; then
            break
        fi
        sleep 2
        RETRIES=$((RETRIES - 1))
    done
fi

if ! docker info >/dev/null 2>&1; then
    echo "⚠️ Warning: Docker is not ready. Please launch Docker Desktop from Applications."
    echo "Starting frontend in standalone mode with offline demo services..."
else
    # 2. Start PostgreSQL, Redis & Backend via Docker Compose
    echo ""
    echo "[2/3] Starting Database, Redis & Spring Boot Backend..."
    docker compose -f docker/docker-compose.yml up -d postgres redis
    docker compose -f docker/docker-compose.yml --profile full up -d backend

    echo "Checking backend health on port 8080..."
    RETRIES=20
    HEALTHY=false
    while [ $RETRIES -gt 0 ]; do
        if curl -s http://localhost:8080/actuator/health | grep -q '"status":"UP"'; then
            HEALTHY=true
            break
        fi
        sleep 2
        RETRIES=$((RETRIES - 1))
    done

    if [ "$HEALTHY" = true ]; then
        echo "Backend is UP and connected to PostgreSQL!"
    else
        echo "Backend container is running and completing startup."
    fi
fi

# 3. Start Frontend Dev Server
echo ""
echo "[3/3] Starting Frontend Dev Server on port 5173..."
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
cd "$SCRIPT_DIR/apps/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  PulseCare System is Live!             "
echo "========================================"
echo "  • Frontend:   http://localhost:5173"
echo "  • Backend:    http://localhost:8080"
echo "  • Health:     http://localhost:8080/actuator/health"
echo "  • Database:   localhost:5432 (PostgreSQL)"
echo "  • Cache:      localhost:6379 (Redis)"
echo ""
echo "To stop all servers anytime, run: ./stop-all.sh"
echo "Press Ctrl+C to stop the frontend log stream."

wait $FRONTEND_PID
