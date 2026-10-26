# HopHDND: safe launch of the fully isolated Firebase staging environment.
# Production credentials and production Firebase project are NEVER used.
# Run after updating the QA clone to the requested PR #72 branch.
$ErrorActionPreference = "Stop"

$source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repo = (Resolve-Path (Join-Path $source "..")).Path
$allowedBranches = @(
    "feat/exclusive-cell-leases-admin-freeze-20261025",
    "integration/firebase-supabase-unified-20261026"
)
$currentBranch = (& git -C $repo rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $currentBranch -notin $allowedBranches) {
    throw "Dang o sai branch: $currentBranch. Chi cho phep PR #72 hoac unified PR #77."
}
Write-Host "QA branch: $currentBranch (staging/emulators only)" -ForegroundColor Cyan
$firebase = Join-Path $source "node_modules\.bin\firebase.cmd"
$config = Join-Path $source "firebase.staging.json"
$seed = Join-Path $source "scripts\seed-local-staging.mjs"
if (!(Test-Path -LiteralPath $firebase -PathType Leaf)) { throw "Thieu firebase.cmd; chay npm ci trong source." }
if (!(Test-Path -LiteralPath $config -PathType Leaf)) { throw "Thieu firebase.staging.json." }
if (!(Test-Path -LiteralPath $seed -PathType Leaf)) { throw "Thieu script du lieu MAU." }
if (!(Get-Command java -ErrorAction SilentlyContinue)) { throw "Khong tim thay Java 21 trong PATH." }
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw "Khong tim thay Node.js trong PATH." }

Write-Host "=== HOPHDND STAGING: LOCAL DATA ONLY ===" -ForegroundColor Cyan
Write-Host "Project: demo-hdnd (KHONG phai Firebase production)" -ForegroundColor Yellow
Write-Host "Mau: 3 dong, trang thai primary, anonymous chi doc" -ForegroundColor Yellow
Write-Host "Mo Chrome va Edge tai http://127.0.0.1:5173/pages.html" -ForegroundColor Green
Write-Host "Dung staging bang Ctrl+C tai cua so nay." -ForegroundColor Cyan

Push-Location $source
try {
    & $firebase emulators:exec `
        --project demo-hdnd `
        --only auth,database `
        --config firebase.staging.json `
        "node scripts/seed-local-staging.mjs && node node_modules/vite/bin/vite.js --mode pages-test --host 127.0.0.1 --port 5173 --strictPort"
    if ($LASTEXITCODE -ne 0) { throw "Staging local FAILED. KHONG thao tac production." }
} finally {
    Pop-Location
}
