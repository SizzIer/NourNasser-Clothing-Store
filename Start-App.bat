@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo Starting Kind Stitch...
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm was not found on PATH.
  echo Install Node.js LTS from https://nodejs.org then try again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 goto :failed
) else (
  echo [ok] Frontend dependencies already installed.
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo [ok] Created .env from .env.example
    echo      Add your PayPal sandbox client ID for checkout.
  ) else (
    echo [warn] .env.example not found — create .env manually.
  )
) else (
  echo [ok] .env already exists.
)

if not exist "server\.env" (
  if exist "server\.env.example" (
    copy /Y "server\.env.example" "server\.env" >nul
    echo [ok] Created server\.env from server\.env.example
    echo      Add SESSION_SECRET and PayPal sandbox credentials.
  ) else (
    echo [warn] server\.env.example not found — create server\.env manually.
  )
) else (
  echo [ok] server\.env already exists.
)

echo.
echo Stopping any previous dev servers still using ports 5173 or 4000...
node scripts\stop-dev-servers.mjs
timeout /t 2 /nobreak >nul

echo.
echo Preparing database ^(server deps, migrations, seed^)...
call npm run setup
if errorlevel 1 goto :failed

echo.
echo Will open Chrome at http://127.0.0.1:5173 when the app is ready...
start /b "" node scripts\wait-and-open.mjs

echo Starting dev servers ^(Ctrl+C to stop^)...
call npm start
if errorlevel 1 goto :failed

goto :done

:failed
echo.
echo App failed to start. See messages above.
pause
exit /b 1

:done
echo.
echo App stopped.
pause
