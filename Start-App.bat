@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo Starting Kind Stitch...
echo.

REM Ensure Node.js is available (system install, or download portable copy into .tools\node)
set "NODE_BIN_FILE=%TEMP%\kindstitch-node-bin.txt"
set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%POWERSHELL%" set "POWERSHELL=powershell"
del "%NODE_BIN_FILE%" >nul 2>nul
"%POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-node.ps1" -BinPathOut "%NODE_BIN_FILE%"
if errorlevel 1 (
  echo.
  echo App failed to start. See messages above.
  pause
  exit /b 1
)
set "NODE_BIN="
if exist "%NODE_BIN_FILE%" (
  set /p NODE_BIN=<"%NODE_BIN_FILE%"
  del "%NODE_BIN_FILE%" >nul 2>nul
)
if defined NODE_BIN (
  if not "%NODE_BIN%"=="" (
    set "PATH=%NODE_BIN%;%PATH%"
  )
)

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm is still not available after setup.
  echo Install Node.js LTS from https://nodejs.org then try again.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v 2^>nul') do echo [ok] Using Node %%v
echo.

if not exist "node_modules\" (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 goto :failed
) else if not exist "node_modules\wait-on\" (
  echo Frontend deps look incomplete ^(missing wait-on^). Reinstalling...
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
echo NOTE: The storefront is http://localhost:5173 ^(not :4000 — that is only the API^).
echo Chrome will open http://localhost:5173 automatically when Vite is ready...
REM Launch opener in a separate process so it survives npm/concurrently output
start "KindStitch-OpenBrowser" /min cmd /c "set PATH=%PATH%&& set APP_URL=http://localhost:5173&& node scripts\wait-and-open.mjs"

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
