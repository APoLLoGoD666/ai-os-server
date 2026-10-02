@echo off
title APEX AI OS — Stop
cd /d "%~dp0"

echo.
echo [APEX] Stopping APEX AI OS...
pm2 stop apex 2>&1
echo [APEX] Stopped.
echo [APEX] To start again: start-apex.bat
echo.
