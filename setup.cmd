@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo Install Node.js 24.17 or newer from https://nodejs.org, then try again.
    pause
    exit /b 1
)
call npm run setup
set "setup_result=%errorlevel%"
echo.
pause
exit /b %setup_result%
