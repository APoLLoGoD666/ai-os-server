@echo off
title APEX AI OS — Update
cd /d "%~dp0"

echo.
echo  ===========================================
echo    APEX AI OS  ^|  Update
echo  ===========================================
echo.

REM ── Pull latest changes ─────────────────────────────────────────
echo [UPDATE] Pulling latest from GitHub...
git pull
if %errorlevel% neq 0 (
    echo [ERROR] git pull failed. Check your connection and try again.
    pause
    exit /b 1
)

REM ── Install any new dependencies ────────────────────────────────
echo [UPDATE] Installing dependencies...
call npm install

REM ── Restart the running server ──────────────────────────────────
echo [UPDATE] Restarting server...
pm2 restart apex

REM ── Wait and open dashboard ─────────────────────────────────────
timeout /t 3 /nobreak >nul
start "" http://localhost:3000

echo.
echo [UPDATE] Done. Dashboard: http://localhost:3000
echo.
