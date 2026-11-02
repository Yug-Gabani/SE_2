#!/usr/bin/env bash
# ==============================================================================
# TeleMeet 1-Click Startup Script (macOS / Linux)
# Starts Docker PostgreSQL, Python FastAPI Backend, and React Vite Frontend
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure Docker and Node are discoverable in PATH (prioritizing native NVM Node)
NODE_NVM_DIR="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin"
export PATH="$NODE_NVM_DIR:/Applications/Docker.app/Contents/Resources/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "========================================================"
echo "  Starting TeleMeet Video Consultation & AI Scribe System "
echo "========================================================"

# 1. Check Docker Daemon
echo ""
echo "[1/4] Checking Docker daemon..."
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
    echo "⚠️ Error: Docker is not running. Please launch Docker Desktop."
    exit 1
fi

# 2. Start PostgreSQL Container on Port 5433
echo ""
echo "[2/4] Starting PostgreSQL Database (Port 5433)..."
docker compose -f docker/docker-compose.yml up -d postgres

echo "Waiting for PostgreSQL database to be healthy..."
RETRIES=20
DB_HEALTHY=false
while [ $RETRIES -gt 0 ]; do
    if docker exec telemeet-postgres pg_isready -U telemeet_user -d telemeet_db >/dev/null 2>&1; then
        DB_HEALTHY=true
        break
    fi
    sleep 1
    RETRIES=$((RETRIES - 1))
done

if [ "$DB_HEALTHY" = true ]; then
    echo "PostgreSQL is healthy and ready on port 5433!"
else
    echo "PostgreSQL container is starting up."
fi

# 3. Setup & Start Python FastAPI Backend (Port 8000)
echo ""
echo "[3/4] Preparing Python FastAPI Backend & LangChain Pipeline..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment in backend/venv..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing backend Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Free port 8000 if occupied
lsof -ti :8000 | xargs kill -9 2>/dev/null || true

echo "Starting FastAPI Backend Server on port 8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend health
RETRIES=20
BACKEND_UP=false
while [ $RETRIES -gt 0 ]; do
    if curl -s http://localhost:8000/health | grep -q '"status":"UP"'; then
        BACKEND_UP=true
        break
    fi
    sleep 1
    RETRIES=$((RETRIES - 1))
done

if [ "$BACKEND_UP" = true ]; then
    echo "FastAPI & LangChain Pipeline is live on http://localhost:8000!"
fi

# 4. Setup & Start React Vite Frontend (Port 3000)
echo ""
echo "[4/4] Starting React Frontend on port 3000..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend npm packages..."
    npm install --silent
fi

# Free port 3000 if occupied
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo "  TeleMeet Video Consultation System is Live!           "
echo "========================================================"
echo "  • Frontend:     http://localhost:3000"
echo "  • API Backend:  http://localhost:8000"
echo "  • Health Check: http://localhost:8000/health"
echo "  • API Docs:     http://localhost:8000/docs (Swagger UI)"
echo "  • Database:     localhost:5433 (PostgreSQL)"
echo ""
echo "Demo Accounts Ready to Use:"
echo "  🩺 Doctor:   doctor@telecare.com   / Password123!"
echo "  👤 Patient:  patient@telecare.com  / Password123!"
echo "  (Or use the 1-click quick demo buttons on the login page!)"
echo ""
echo "To stop all services anytime, run: ./stop-app.sh"
echo "Press Ctrl+C to stop the log stream."
echo "========================================================"

wait $FRONTEND_PID
