# Read CURRENT 50+ actual rows through Firebase CLI and create PRIVATE staging SQL.
# NO production write, NO automatic Supabase SQL execution.
param([string]$ExistingItemsJson = "")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repo = (Resolve-Path (Join-Path $root "..")).Path
$branch = (& git -C $repo rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne "integration/firebase-supabase-unified-20261026") {
    throw "Chi chay tren branch QA tich hop #77. Khong chay trong checkout production."
}
$privateRoot = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "HopHDND-Private-QA"
$folder = Join-Path $privateRoot ("parity-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$items = if ($ExistingItemsJson) { (Resolve-Path -LiteralPath $ExistingItemsJson).Path } else { Join-Path $folder "firebase-live-items.json" }
if (!$ExistingItemsJson) {
    $firebase = Join-Path $root "node_modules\.bin\firebase.cmd"
    if (!(Test-Path -LiteralPath $firebase)) { throw "Chay npm ci tai thu muc source truoc." }
    Write-Host "Tai 50+ dong THUC tu Firebase (CHI DOC)." -ForegroundColor Cyan
    & $firebase database:get /hdnd/items --project hophdnd-8b7b2 --instance hophdnd-8b7b2-default-rtdb --output $items
    if ($LASTEXITCODE -ne 0) { throw "Firebase CLI chua duoc cap quyen. Chay npx firebase login va thu lai." }
}
$out = Join-Path $folder "STAGING-PRIVATE-REAL-PARITY.sql"
& node (Join-Path $root "scripts\generate-private-supabase-parity-sql.mjs") $items $out
if ($LASTEXITCODE -ne 0) { throw "File JSON khong dung dang hoac khong du 50 dong; khong tao SQL." }
Write-Host "HOAN THANH: $out" -ForegroundColor Green
Write-Host "Chua ghi Supabase. Phai kiem tra RLS admin-only, sau do mo SQL trong Dashboard staging."
Write-Host "KHONG dua file JSON/SQL len GitHub, chat cong khai hoac email."
