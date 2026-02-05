# Auto-create new game every time the current game ends
# Run this script to automatically monitor and create new games

$PACKAGE_ID = "0xa4887ed1309c8d82b6be1d0052d564d9cba7d33889cf637837bc5693f5f0e9b0"
$GAME_ID = "0x5eb488038e7b4a47c265fb32a6adae51f325f544745e7ff1d14bb2197868c2be"
$ADMIN_CAP_ID = "0x8fd0283fee52aba4a6c34d5cd6d6e4dbc110d520513e802f9bbd79558fa6a33b"
$CLOCK_ID = "0x6"

Write-Host "🤖 Auto Game Creator Started" -ForegroundColor Green
Write-Host "Monitoring game: $GAME_ID" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

$lastGameNumber = 0

while ($true) {
    try {
        # Check game status
        $gameData = sui client object $GAME_ID --json 2>$null | ConvertFrom-Json
        
        if ($gameData -and $gameData.data -and $gameData.data.content -and $gameData.data.content.fields) {
            $fields = $gameData.data.content.fields
            $isActive = $fields.is_active
            $gameNumber = [int]$fields.game_number
            $endTime = [long]$fields.end_time
            $currentTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            
            $remainingMs = $endTime - $currentTime
            $remainingSec = [Math]::Max(0, [Math]::Floor($remainingMs / 1000))
            
            Write-Host "$(Get-Date -Format 'HH:mm:ss') | Game #$gameNumber | Active: $isActive | Time left: $remainingSec`s" -ForegroundColor Gray
            
            # Check if game ended
            if (!$isActive -or $remainingMs -le 0) {
                # Only create if this is a new ended game (not already processed)
                if ($gameNumber -ne $lastGameNumber) {
                    Write-Host ""
                    Write-Host "🎮 Game #$gameNumber ended! Creating new game in 5 seconds..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 5
                    
                    Write-Host "📝 Creating new game..." -ForegroundColor Cyan
                    $result = sui client call `
                        --package $PACKAGE_ID `
                        --module pixel_war `
                        --function create_game `
                        --args $ADMIN_CAP_ID $CLOCK_ID `
                        --gas-budget 10000000 `
                        --json 2>&1
                    
                    if ($LASTEXITCODE -eq 0) {
                        $resultObj = $result | ConvertFrom-Json
                        $newGameObj = ($resultObj.objectChanges | Where-Object { 
                            $_.objectType -like "*Game*" -and $_.type -eq "created" 
                        }).objectId
                        
                        if ($newGameObj) {
                            Write-Host "✅ New game created: $newGameObj" -ForegroundColor Green
                            Write-Host "🔄 Update GAME_ID in frontend to: $newGameObj" -ForegroundColor Yellow
                            $GAME_ID = $newGameObj
                            $lastGameNumber = $gameNumber
                        } else {
                            Write-Host "⚠️  Game created but ID not found in response" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "❌ Failed to create game: $result" -ForegroundColor Red
                    }
                    Write-Host ""
                }
            }
        }
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
    
    # Check every 5 seconds
    Start-Sleep -Seconds 5
}
