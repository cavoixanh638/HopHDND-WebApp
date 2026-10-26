@echo off
title HopHDND - Network stability 60 minutes
echo.
echo Measuring GitHub Pages, Cloudflare baseline, Firebase, Supabase staging and localhost
echo 720 rounds, once every 5 seconds (default). Do not close this window.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0network-stability-1h.ps1" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" echo Monitor exited with error %EXITCODE%.
echo.
pause
exit /b %EXITCODE%
