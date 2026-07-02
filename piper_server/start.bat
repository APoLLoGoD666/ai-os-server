@echo off
cd /d "%~dp0"
if not exist "piper\piper.exe" (
    echo Piper not set up. Running setup first...
    python setup.py
    if errorlevel 1 ( echo Setup failed. & pause & exit /b 1 )
)
echo.
echo Piper TTS server starting on http://localhost:5002
echo Leave this window open while using Apex voice.
echo.
python -m uvicorn server:app --host 127.0.0.1 --port 5002 --log-level warning
pause
