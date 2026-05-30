@echo off
setlocal enabledelayedexpansion
title APEX AI OS

echo.
echo  ===========================================
echo    APEX AI OS  ^|  Local Runtime
echo  ===========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM ── Check Node.js ──────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found on PATH.
    echo         Install from https://nodejs.org and retry.
    pause
    exit /b 1
)

REM ── Install PM2 if missing ──────────────────────────────────────
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] PM2 not found — installing globally...
    call npm install -g pm2
    if !errorlevel! neq 0 (
        echo [ERROR] PM2 install failed.
        pause
        exit /b 1
    )
    echo [SETUP] PM2 installed.
    echo.
)

REM ── Install npm dependencies if node_modules missing ────────────
if not exist "node_modules\" (
    echo [SETUP] Installing npm dependencies...
    call npm install
    echo.
)

REM ── Install Playwright Chromium if missing ──────────────────────
if not exist "node_modules\playwright\.local-chromium" (
    if not exist "node_modules\playwright\.local-browsers" (
        echo [SETUP] Installing Playwright Chromium...
        call npx playwright install chromium
        echo.
    )
)

REM ── Ensure logs directory exists ────────────────────────────────
if not exist "logs\" mkdir logs

REM ── Stop any existing apex process ─────────────────────────────
pm2 describe apex >nul 2>&1
if %errorlevel% equ 0 (
    echo [APEX] Restarting existing process...
    pm2 restart apex
) else (
    echo [APEX] Starting APEX AI OS...
    pm2 start ecosystem.config.js
)

REM ── Wait for server to initialise ──────────────────────────────
echo [APEX] Waiting for server to initialise...
timeout /t 4 /nobreak >nul

REM ── Open dashboard in default browser ──────────────────────────
echo [APEX] Opening dashboard...
start "" http://localhost:3000

echo.
echo  ===========================================
echo    APEX AI OS is running
echo    Dashboard:  http://localhost:3000
echo    Logs:       pm2 logs apex
echo    Stop:       stop-apex.bat
echo    Update:     update-apex.bat
echo  ===========================================
echo.

REM ── Auto-boot hint (run once as admin) ─────────────────────────
pm2 list | findstr "apex" >nul 2>&1
echo [TIP] To auto-start on Windows login, run as Administrator:
echo       pm2 startup windows
echo       pm2 save
echo.
