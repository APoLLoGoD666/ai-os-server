@echo off
title APEX AI OS — Setup Auto-start
cd /d "%~dp0"

echo.
echo  ===========================================
echo    APEX AI OS  ^|  Auto-start Setup
echo  ===========================================
echo.
echo  This registers APEX to start automatically
echo  every time you log in to Windows.
echo.

REM Build full path to start-apex.bat
set "SCRIPT_PATH=%~dp0start-apex.bat"

REM Register a scheduled task that runs start-apex.bat at logon
schtasks /create ^
    /tn "APEX AI OS" ^
    /tr "\"%SCRIPT_PATH%\"" ^
    /sc onlogon ^
    /ru "%USERNAME%" ^
    /rl highest ^
    /f

if %errorlevel% equ 0 (
    echo.
    echo [OK] Auto-start registered successfully.
    echo      APEX will start automatically on next Windows login.
    echo.
    echo [TIP] To remove auto-start, run: remove-autostart.bat
) else (
    echo.
    echo [WARN] Scheduled task creation failed.
    echo        Try running this file as Administrator.
    echo.
    echo [ALT]  Manual alternative — copy start-apex.bat to:
    echo        %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
)

echo.
pause
