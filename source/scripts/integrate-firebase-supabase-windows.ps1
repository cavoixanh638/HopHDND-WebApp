# HopHDND — safe, local one-time integration. Never touches main/prod.
# Invoke from the integration branch's script: .\source\scripts\integrate-firebase-supabase-windows.ps1 -Push
param([switch]$Push)
$ErrorActionPreference = "Stop"
$repo = "https://github.com/cavoixanh638/HopHDND-WebApp.git"
$branch = "integration/firebase-supabase-unified-20261026"
$firebaseSha = "259c36acaa3d35367459204fda81a58bff7abc32"
$supabaseSha = "afb10fe2e5371a81a54fa736ecac403bb7fe57b2"
$baseRoot = if (Test-Path -LiteralPath "D:\") { "D:\" } else { $env:USERPROFILE }
$workDir = Join-Path $baseRoot ("HopHDND-Integration-QA-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
if (Test-Path -LiteralPath $workDir) { throw "Khong duoc ghi de workspace." }
foreach ($binary in @("git","node","npm","java")) {
    if (!(Get-Command $binary -ErrorAction SilentlyContinue)) {
        throw "Thieu $binary. Dung; khong thay production."
    }
}
Write-Host "TEST GHEP FIREBASE + SUPABASE TRONG CLONE MOI: $workDir" -ForegroundColor Cyan
& git clone $repo $workDir
if ($LASTEXITCODE -ne 0) { throw "Git clone failed." }
try {
    & git -C $workDir switch --track "origin/$branch"
    if ($LASTEXITCODE -ne 0) { throw "Checkout integration branch failed." }
    & git -C $workDir cat-file -e "$supabaseSha^{commit}"
    if ($LASTEXITCODE -ne 0) { throw "Khong tim thay commit Supabase pinned." }
    & git -C $workDir merge-base --is-ancestor $firebaseSha HEAD
    if ($LASTEXITCODE -ne 0) { throw "Nhanh khong ke thua Firebase pinned." }
    & git -C $workDir merge-base --is-ancestor $supabaseSha HEAD
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Nhanh da co Supabase commit. Khong merge lai." -ForegroundColor Green
        return
    }
    Write-Host "MERGE BA CHIEU - KHONG OURS/THEIRS TOAN FILE" -ForegroundColor Cyan
    & git -C $workDir merge --no-ff --no-commit $supabaseSha
    if ($LASTEXITCODE -ne 0) {
        $conflicts = & git -C $workDir diff --name-only --diff-filter=U
        throw ("Git conflict - KHONG PUSH:" + [Environment]::NewLine + ($conflicts -join [Environment]::NewLine))
    }
    Push-Location (Join-Path $workDir "source")
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci FAILED." }
        npm run build:pages:test
        if ($LASTEXITCODE -ne 0) { throw "Build FAILED." }
        npm test
        if ($LASTEXITCODE -ne 0) { throw "Unit tests FAILED." }
        npm run test:firebase
        if ($LASTEXITCODE -ne 0) { throw "Firebase Auth+RTDB Emulator tests FAILED." }
    } finally { Pop-Location }
    & git -C $workDir -c user.name="HopHDND Integration Operator" -c user.email="integration@users.noreply.github.com" commit -m "merge(integration): preserve PR 72 and PR 73/75 history; QA passed"
    if ($LASTEXITCODE -ne 0) { throw "Merge commit failed." }
    $merged = (& git -C $workDir rev-parse HEAD).Trim()
    Write-Host "INTEGRATION_LOCAL_PASS $merged" -ForegroundColor Green
    if ($Push) {
        # Only Draft branch, never main. No force push or direct deployments.
        & git -C $workDir push origin "HEAD:refs/heads/$branch"
        if ($LASTEXITCODE -ne 0) {
            throw "Git push declined (perhaps workflows permission). No force push; inspect credentials."
        }
        Write-Host "INTEGRATION_BRANCH_PUSH_PASS (NO PRODUCTION DEPLOY)" -ForegroundColor Green
    } else {
        Write-Host "Dry preparation complete. Pass -Push to upload ONLY integration branch." -ForegroundColor Yellow
    }
} finally {
    Write-Host "QA logs/source remain in: $workDir"
}