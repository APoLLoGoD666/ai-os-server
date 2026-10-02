@echo off
setlocal enabledelayedexpansion
title APEX AI OS

echo.
echo  ===========================================
echo    APEX AI OS  ^|  Starting
echo  ===========================================
echo.

cd /d "%~dp0"

REM ── Check Node.js ──────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)

REM ── Install PM2 if missing ──────────────────────────────────────
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Installing PM2...
    call npm install -g pm2
)

REM ── Install dependencies if needed ─────────────────────────────
if not exist "node_modules\electron\" (
    echo [SETUP] Installing dependencies...
    call npm install
    echo.
)

REM ── Ensure logs directory exists ────────────────────────────────
if not exist "logs\" mkdir logs

REM ── Start or restart PM2 server ────────────────────────────────
pm2 describe apex >nul 2>&1
if %errorlevel% equ 0 (
    pm2 restart apex --update-env >nul 2>&1
) else (
    pm2 start ecosystem.config.js >nul 2>&1
)

REM ── Wait for server to initialise ──────────────────────────────
echo [APEX] Server starting...
timeout /t 3 /nobreak >nul

REM ── Open the desktop app window ────────────────────────────────
echo [APEX] Opening desktop app...
start "" "node_modules\.bin\electron.cmd" apex-electron.js

echo.
echo  ===========================================
echo    APEX AI OS is running
echo    Logs:   pm2 logs apex
echo    Stop:   stop-apex.bat
echo    Update: update-apex.bat
echo  ===========================================
echo.
