@echo off
REM Change to the directory of this script
cd /d "%~dp0"

REM Check if server is already running
curl --silent --head http://localhost:3000 >nul 2>&1
IF %ERRORLEVEL%==0 (
    echo Server is already running.
) ELSE (
    REM Start Next.js dev server in a new command window
    start cmd /k "npm run start"
    
    REM Wait until server is ready
    echo Waiting for server to start...
    :waitloop
    curl --silent --head http://localhost:3000 >nul 2>&1
    IF %ERRORLEVEL% NEQ 0 (
        timeout /t 2 >nul
        goto waitloop
    )
)

REM Open Chrome as PWA pointing to localhost:3000
REM Adjust path if Chrome is not in PATH
start chrome --app=http://localhost:3000
exit
