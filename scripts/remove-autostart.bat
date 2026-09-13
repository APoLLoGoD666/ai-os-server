@echo off
title APEX AI OS — Remove Auto-start
cd /d "%~dp0"

echo.
echo [APEX] Removing auto-start task...
schtasks /delete /tn "APEX AI OS" /f

if %errorlevel% equ 0 (
    echo [OK] Auto-start removed. APEX will no longer start on login.
) else (
    echo [INFO] Task not found or already removed.
)

echo.
pause
