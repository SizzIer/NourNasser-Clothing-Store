@echo off
setlocal

cd /d "%~dp0"

echo Starting NourNasser Clothing Store...
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 run.py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python run.py
  ) else (
    echo Python was not found on PATH.
    echo Please install Python 3 and try again.
    pause
    exit /b 1
  )
)

if not %errorlevel%==0 (
  echo.
  echo App failed to start. See messages above.
  pause
  exit /b %errorlevel%
)

echo.
echo App stopped.
pause
