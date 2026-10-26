@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
for /f "delims=" %%B in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set "HDND_BRANCH=%%B"
if /I not "%HDND_BRANCH%"=="integration/firebase-supabase-unified-20261026" (
 echo CHI CHAY TRONG BAN QA TICH HOP PR 77. Branch dang chon: %HDND_BRANCH%
 pause
 exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
 echo CHUA CAI npm ci TRONG source.
 pause
 exit /b 1
)
echo.
echo BENCHMARK CLOUD THUC -- CHI DOC, KHONG GHI DATABASE.
echo Firebase: production -- Supabase: staging -- localhost: 5184
echo.
start "HopHDND BENCHMARK - close after finishing" cmd /k "npm run dev:benchcloud"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5184/qa-benchmark.html"
echo Trang benchmark da duoc mo. Neu chua tai, nhan F5 trong trinh duyet.
