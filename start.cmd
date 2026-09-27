@echo off
setlocal
cd /d "%~dp0"
if not exist "dist\index.js" (
    echo Run setup.cmd first.
    pause
    exit /b 1
)
echo Keep this window open. Press Ctrl+C to stop the bot.
call npm start
set "start_result=%errorlevel%"
echo.
pause
exit /b %start_result%
