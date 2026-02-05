import { useState, useEffect } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import './App.css'

// Replace with your deployed package ID and game object ID
// Set MOCK_MODE = true to test UI without deployment
const MOCK_MODE = true
const PACKAGE_ID = '0xYOUR_PACKAGE_ID'
const GAME_ID = '0xYOUR_GAME_ID'
const CLOCK_ID = '0x6'

const TEAM_RED = 1
const TEAM_BLUE = 2
const CANVAS_SIZE = 50

interface PixelData {
  team: number
  painter: string
}

interface GameInfo {
  gameNumber: string
  canvasWidth: number
  canvasHeight: number
  startTime: string
  endTime: string
  isActive: boolean
  prizePool: string
  redTeamPixels: number
  blueTeamPixels: number
}

function App() {
  const account = useCurrentAccount()
  const { mutate: signAndExecute } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()

  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [pixels, setPixels] = useState<Map<string, PixelData>>(new Map())
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [stakeAmount, setStakeAmount] = useState('0.1')
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Load game info
  useEffect(() => {
    loadGameInfo()
    const interval = setInterval(loadGameInfo, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  // Update timer
  useEffect(() => {
    if (!gameInfo) return
    const interval = setInterval(() => {
      const now = Date.now()
      const end = parseInt(gameInfo.endTime)
      const remaining = Math.max(0, end - now)
      
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameInfo])

  const loadGameInfo = async () => {
    try {
      // In production, load actual game data from contract
      // For now, mock data
      setGameInfo({
        gameNumber: '1',
        canvasWidth: CANVAS_SIZE,
        canvasHeight: CANVAS_SIZE,
        startTime: Date.now().toString(),
        endTime: (Date.now() + 600000).toString(),
        isActive: true,
        prizePool: '1000000000',
        redTeamPixels: 150,
        blueTeamPixels: 120,
      })
    } catch (err) {
      console.error('Failed to load game info:', err)
    }
  }

  const joinTeam = async (team: number) => {
    if (!account) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError('')

    try {
      // MOCK MODE: Simulate joining team without actual transaction
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
        setSelectedTeam(team)
        setGameInfo(prev => prev ? {
          ...prev,
          prizePool: (parseInt(prev.prizePool) + Math.floor(parseFloat(stakeAmount) * 1_000_000_000)).toString()
        } : prev)
        alert(`✅ Successfully joined ${team === TEAM_RED ? 'Red 🔴' : 'Blue 🔵'} team! (Mock Mode)`)
        setLoading(false)
        return
      }

      const tx = new Transaction()
      const stakeAmountMist = Math.floor(parseFloat(stakeAmount) * 1_000_000_000)
      
      const [coin] = tx.splitCoins(tx.gas, [stakeAmountMist])
      
      tx.moveCall({
        target: `${PACKAGE_ID}::pixel_war::join_team`,
        arguments: [
          tx.object(GAME_ID),
          tx.pure.u8(team),
          coin,
          tx.object(CLOCK_ID),
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            setSelectedTeam(team)
            loadGameInfo()
            alert(`Successfully joined ${team === TEAM_RED ? 'Red' : 'Blue'} team!`)
          },
          onError: (err) => {
            setError(`Failed to join team: ${err.message}`)
          },
        }
      )
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const paintPixel = async (x: number, y: number) => {
    if (!account || !selectedTeam) {
      setError('Please join a team first')
      return
    }

    try {
      // MOCK MODE: Update pixels locally
      if (MOCK_MODE) {
        const key = `${x},${y}`
        const newPixels = new Map(pixels)
        const currentPixel = newPixels.get(key)
        
        // Update pixel state
        newPixels.set(key, { team: selectedTeam, painter: account.address })
        setPixels(newPixels)
        
        // Update game stats
        setGameInfo(prev => {
          if (!prev) return prev
          let newRed = prev.redTeamPixels
          let newBlue = prev.blueTeamPixels
          
          if (currentPixel) {
            if (currentPixel.team !== selectedTeam) {
              if (currentPixel.team === TEAM_RED) {
                newRed--
                newBlue++
              } else {
                newBlue--
                newRed++
              }
            }
          } else {
            if (selectedTeam === TEAM_RED) {
              newRed++
            } else {
              newBlue++
            }
          }
          
          return { ...prev, redTeamPixels: newRed, blueTeamPixels: newBlue }
        })
        return
      }

      const tx = new Transaction()
      
      tx.moveCall({
        target: `${PACKAGE_ID}::pixel_war::paint_pixel`,
        arguments: [
          tx.object(GAME_ID),
          tx.pure.u32(x),
          tx.pure.u32(y),
          tx.object(CLOCK_ID),
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            // Update local pixel state
            const key = `${x},${y}`
            const newPixels = new Map(pixels)
            newPixels.set(key, { team: selectedTeam, painter: account.address })
            setPixels(newPixels)
            loadGameInfo()
          },
          onError: (err) => {
            setError(`Failed to paint pixel: ${err.message}`)
          },
        }
      )
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    }
  }

  const buySpeedBoost = async () => {
    if (!account) return

    try {
      // MOCK MODE: Just show alert
      if (MOCK_MODE) {
        alert('🚀 Speed Boost activated for 30 seconds! (Mock Mode)')
        return
      }

      const tx = new Transaction()
      const cost = 50_000_000 // 0.05 SUI
      
      const [coin] = tx.splitCoins(tx.gas, [cost])
      
      tx.moveCall({
        target: `${PACKAGE_ID}::pixel_war::buy_speed_boost`,
        arguments: [
          tx.object(GAME_ID),
          coin,
          tx.object(CLOCK_ID),
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            alert('Speed Boost activated for 30 seconds!')
          },
          onError: (err) => {
            setError(`Failed to buy power-up: ${err.message}`)
          },
        }
      )
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    }
  }

  const claimReward = async () => {
    if (!account) return

    setLoading(true)
    try {
      // MOCK MODE: Just show alert
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        alert('💰 Reward claimed successfully! You won 0.15 SUI! (Mock Mode)')
        setLoading(false)
        return
      }

      const tx = new Transaction()
      
      tx.moveCall({
        target: `${PACKAGE_ID}::pixel_war::claim_reward`,
        arguments: [
          tx.object(GAME_ID),
          tx.object(CLOCK_ID),
        ],
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            alert('Reward claimed successfully!')
            loadGameInfo()
          },
          onError: (err) => {
            setError(`Failed to claim reward: ${err.message}`)
          },
        }
      )
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const renderCanvas = () => {
    const grid = []
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const key = `${x},${y}`
        const pixel = pixels.get(key)
        let className = 'pixel pixel-empty'
        
        if (pixel) {
          className = pixel.team === TEAM_RED ? 'pixel pixel-red' : 'pixel pixel-blue'
        }

        grid.push(
          <div
            key={key}
            className={className}
            onClick={() => paintPixel(x, y)}
            title={`(${x}, ${y})`}
          />
        )
      }
    }
    return grid
  }

  const prizePoolSUI = gameInfo ? (parseInt(gameInfo.prizePool) / 1_000_000_000).toFixed(2) : '0'
  const redPercentage = gameInfo ? Math.round((gameInfo.redTeamPixels / (gameInfo.redTeamPixels + gameInfo.blueTeamPixels || 1)) * 100) : 0
  const bluePercentage = gameInfo ? Math.round((gameInfo.blueTeamPixels / (gameInfo.redTeamPixels + gameInfo.blueTeamPixels || 1)) * 100) : 0

  return (
    <div className="app">
      <div className="header">
        <h1>🎨⚔️ PixelWar</h1>
        <p>Battle for canvas dominance! Paint pixels, win SUI!</p>
      </div>

      <div className="wallet-section">
        <ConnectButton />
      </div>

      {error && (
        <div className="error">
          ⚠️ {error}
          <button 
            onClick={() => setError('')} 
            style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {MOCK_MODE && (
        <div style={{ 
          background: 'rgba(255, 215, 0, 0.2)', 
          border: '2px solid gold', 
          borderRadius: '8px', 
          padding: '15px', 
          textAlign: 'center',
          margin: '10px 0'
        }}>
          <strong>🧪 MOCK MODE</strong> - Testing UI without blockchain. Set MOCK_MODE=false in App.tsx after deploying contracts.
        </div>
      )}

      {!account ? (
        <div className="loading">
          Connect your wallet to start playing! 👆
        </div>
      ) : !gameInfo ? (
        <div className="loading">Loading game... ⏳</div>
      ) : (
        <div className="game-container">
          {/* Left Sidebar - Team Selection */}
          <div className="sidebar">
            <h2>🎯 Join Team</h2>
            {!selectedTeam ? (
              <>
                <div className="input-group">
                  <label>Stake Amount (SUI)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.1"
                  />
                </div>
                <div className="team-selection">
                  <button
                    className="btn btn-red"
                    onClick={() => joinTeam(TEAM_RED)}
                    disabled={loading}
                  >
                    🔴 Join Red Team
                  </button>
                  <button
                    className="btn btn-blue"
                    onClick={() => joinTeam(TEAM_BLUE)}
                    disabled={loading}
                  >
                    🔵 Join Blue Team
                  </button>
                </div>
              </>
            ) : (
              <div className="stat-item">
                <div className="stat-label">Your Team</div>
                <div className="stat-value">
                  {selectedTeam === TEAM_RED ? '🔴 Red' : '🔵 Blue'}
                </div>
              </div>
            )}

            <h2 style={{ marginTop: '30px' }}>📊 Stats</h2>
            <div className="team-stats">
              <div className="stat-item">
                <div className="stat-label">Prize Pool</div>
                <div className="stat-value">{prizePoolSUI} SUI</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">🔴 Red Pixels</div>
                <div className="stat-value">{gameInfo.redTeamPixels} ({redPercentage}%)</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">🔵 Blue Pixels</div>
                <div className="stat-value">{gameInfo.blueTeamPixels} ({bluePercentage}%)</div>
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="canvas-container">
            <div className="timer">
              ⏱️ Time Remaining: {timeRemaining}
            </div>
            <div className="canvas-wrapper">
              <div
                className="pixel-canvas"
                style={{
                  gridTemplateColumns: `repeat(${CANVAS_SIZE}, 10px)`,
                  gridTemplateRows: `repeat(${CANVAS_SIZE}, 10px)`,
                }}
              >
                {renderCanvas()}
              </div>
            </div>
            <div style={{ marginTop: '20px', color: '#666' }}>
              <p>Click on pixels to paint them with your team color!</p>
              {!gameInfo.isActive && (
                <button className="btn btn-success" onClick={claimReward} disabled={loading}>
                  💰 Claim Reward
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar - Power-ups */}
          <div className="sidebar">
            <h2>⚡ Power-Ups</h2>
            <div className="powerups-section">
              <button
                className="powerup-btn"
                onClick={buySpeedBoost}
                disabled={!selectedTeam || loading}
              >
                <div className="powerup-info">
                  <span className="powerup-name">🚀 Speed Boost</span>
                  <span className="powerup-desc">Paint faster for 30s</span>
                </div>
                <span className="powerup-cost">0.05 SUI</span>
              </button>

              <button
                className="powerup-btn"
                disabled={!selectedTeam || loading}
              >
                <div className="powerup-info">
                  <span className="powerup-name">💣 Bomb</span>
                  <span className="powerup-desc">Erase 3x3 area</span>
                </div>
                <span className="powerup-cost">0.1 SUI</span>
              </button>

              <button
                className="powerup-btn"
                disabled={!selectedTeam || loading}
              >
                <div className="powerup-info">
                  <span className="powerup-name">🛡️ Shield</span>
                  <span className="powerup-desc">Protect pixels</span>
                </div>
                <span className="powerup-cost">0.15 SUI</span>
              </button>
            </div>

            <h2 style={{ marginTop: '30px' }}>📖 How to Play</h2>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.6', opacity: 0.9 }}>
              <p>1. Join Red or Blue team</p>
              <p>2. Click pixels to paint</p>
              <p>3. Buy power-ups to gain advantage</p>
              <p>4. Team with most pixels wins!</p>
              <p>5. Winners split the prize pool</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
