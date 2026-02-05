# PixelWar Deployment Script for Windows PowerShell
# This script deploys the Move contracts and sets up the initial game

Write-Host "🎨⚔️ PixelWar Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if sui CLI is installed
$suiCommand = Get-Command sui -ErrorAction SilentlyContinue
if (-not $suiCommand) {
    Write-Host "❌ Sui CLI not found. Please install it first." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Building Move package..." -ForegroundColor Yellow
Set-Location move
sui move build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Publishing package to Sui..." -ForegroundColor Yellow
$publishOutput = sui client publish --gas-budget 100000000 --json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Package published!" -ForegroundColor Green
Write-Host ""

# Extract package ID
$packageId = ($publishOutput.objectChanges | Where-Object { $_.type -eq "published" }).packageId
Write-Host "📝 Package ID: $packageId" -ForegroundColor Cyan

# Extract AdminCap ID
$adminCapId = ($publishOutput.objectChanges | Where-Object { $_.objectType -like "*AdminCap*" }).objectId
Write-Host "🔑 AdminCap ID: $adminCapId" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Update PACKAGE_ID in frontend/src/App.tsx to: $packageId"
Write-Host "2. Create a game using:" -ForegroundColor Yellow
Write-Host "   sui client call --package $packageId --module pixel_war --function create_game --args $adminCapId 0x6 --gas-budget 10000000" -ForegroundColor White
Write-Host "3. Update GAME_ID in frontend/src/App.tsx with the created game object ID"
Write-Host "4. Run: cd ../frontend; npm install; npm run dev"
Write-Host ""
Write-Host "Happy pixel battling! 🎨⚔️" -ForegroundColor Magenta

Set-Location ..
