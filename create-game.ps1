# Script to create a new game for PixelWar
# Package already published on testnet

$PACKAGE_ID = "0xd5a2b2e2f149ca48f768da6ae4df39e91c551ed97e98523e5a5a643fd35c0035"
$CLOCK_ID = "0x6"

Write-Host "🎮 Creating new game..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  You need AdminCap ID. Finding it..." -ForegroundColor Yellow

# Try to find AdminCap from objects
$objects = sui client objects --json 2>$null | ConvertFrom-Json

if ($objects) {
    $adminCap = $objects | Where-Object { $_.data.type -like "*AdminCap*" } | Select-Object -First 1
    
    if ($adminCap) {
        $ADMIN_CAP_ID = $adminCap.data.objectId
        Write-Host "✅ Found AdminCap: $ADMIN_CAP_ID" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Creating game with command:" -ForegroundColor Cyan
        Write-Host "sui client call --package $PACKAGE_ID --module pixel_war --function create_game --args $ADMIN_CAP_ID $CLOCK_ID --gas-budget 10000000" -ForegroundColor White
        Write-Host ""
        
        # Execute
        sui client call --package $PACKAGE_ID --module pixel_war --function create_game --args $ADMIN_CAP_ID $CLOCK_ID --gas-budget 10000000 --json | Tee-Object -Variable result
        
        if ($LASTEXITCODE -eq 0) {
            $resultObj = $result | ConvertFrom-Json
            $gameObj = ($resultObj.objectChanges | Where-Object { $_.objectType -like "*Game*" -and $_.type -eq "created" }).objectId
            
            if ($gameObj) {
                Write-Host ""
                Write-Host "✅ Game created successfully!" -ForegroundColor Green
                Write-Host "🎯 Game ID: $gameObj" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "📝 Update these in frontend/src/App.tsx:" -ForegroundColor Yellow
                Write-Host "const MOCK_MODE = false" -ForegroundColor White
                Write-Host "const PACKAGE_ID = '$PACKAGE_ID'" -ForegroundColor White
                Write-Host "const GAME_ID = '$gameObj'" -ForegroundColor White
            }
        }
    } else {
        Write-Host "❌ AdminCap not found in your objects" -ForegroundColor Red
        Write-Host "You may need to redeploy or use a different wallet that has AdminCap" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not connect to Sui network" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again" -ForegroundColor Yellow
}
