# =========================================================
# PulseCare 1-Click Startup Script (PowerShell)
# =========================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting PulseCare Full-Stack System   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start Docker Containers (Postgres, Redis)
Write-Host "`n[1/3] Starting PostgreSQL and Redis containers..." -ForegroundColor Yellow
docker start healthcare-postgres healthcare-redis 2>$null
if ($LASTEXITCODE -ne 0) {
    # If containers were removed or not created, use docker-compose
    Write-Host "Starting via docker-compose..." -ForegroundColor Gray
    docker compose -f "$PSScriptRoot\docker\docker-compose.yml" up -d postgres redis
}

# 2. Start Backend Container
Write-Host "`n[2/3] Starting Spring Boot Backend container..." -ForegroundColor Yellow
docker start healthcare-backend 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting backend via docker-compose..." -ForegroundColor Gray
    docker compose -f "$PSScriptRoot\docker\docker-compose.yml" --profile full up -d backend
}

# Wait for backend health
Write-Host "Checking backend health on port 8080..." -ForegroundColor Gray
$retries = 20
$healthy = $false
while ($retries -gt 0) {
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -TimeoutSec 2 -ErrorAction Stop
        if ($res.status -eq "UP") {
            $healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
        $retries--
    }
}

if ($healthy) {
    Write-Host "Backend is UP and connected to PostgreSQL!" -ForegroundColor Green
} else {
    Write-Host "Backend container is running (still completing startup initialization)." -ForegroundColor Yellow
}

# 3. Start Frontend (Vite) in a new window
Write-Host "`n[3/3] Starting Frontend Dev Server..." -ForegroundColor Yellow
$frontendDir = Join-Path $PSScriptRoot "apps\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'PulseCare Frontend Server (Port 5173)' -ForegroundColor Cyan; Set-Location '$frontendDir'; npm run dev"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  PulseCare System is Live!             " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  • Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "  • Backend:    http://localhost:8080" -ForegroundColor White
Write-Host "  • Health:     http://localhost:8080/actuator/health" -ForegroundColor White
Write-Host "  • Database:   localhost:5432 (PostgreSQL)" -ForegroundColor White
Write-Host "  • Cache:      localhost:6379 (Redis)" -ForegroundColor White
Write-Host "`nTo stop all servers anytime, run: .\stop-all.ps1 or double-click stop-all.bat" -ForegroundColor Cyan
