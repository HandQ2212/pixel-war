import { useState, useEffect } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import './App.css'

// Replace with your deployed package ID and game object ID
// Set MOCK_MODE = true to test UI without deployment
const MOCK_MODE = false
const PACKAGE_ID = '0xa4887ed1309c8d82b6be1d0052d564d9cba7d33889cf637837bc5693f5f0e9b0'
let GAME_ID = '0x8b09c6a4ca9ad8e32550e265b581f7a2159ab0675659884fd911702612ddc24e' // Will be updated automatically
const ADMIN_CAP_ID = '0x8fd0283fee52aba4a6c34d5cd6d6e4dbc110d520513e802f9bbd79558fa6a33b'
const CLOCK_ID = '0x6'
const REQUIRED_NETWORK = 'testnet' // Change to 'mainnet' if deployed on mainnet

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
  const [networkWarning, setNetworkWarning] = useState<string>('')
  const [autoCreateTimer, setAutoCreateTimer] = useState<number>(0)

  // Load game info
  useEffect(() => {
    loadGameInfo()
    const interval = setInterval(loadGameInfo, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [account?.address]) // Reload when account changes

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

  // Auto-create new game when current game ends
  useEffect(() => {
    if (!gameInfo) return
    
    const now = Date.now()
    const end = parseInt(gameInfo.endTime)
    const hasEnded = end <= now
    
    // Game has ended (either isActive=false or time ran out)
    if (!gameInfo.isActive || hasEnded) {
      if (autoCreateTimer === 0) {
        setAutoCreateTimer(5) // Start 5 second countdown
      }
      
      if (autoCreateTimer > 0) {
        const countdown = setTimeout(() => {
          setAutoCreateTimer(autoCreateTimer - 1)
        }, 1000)
        return () => clearTimeout(countdown)
      } else if (autoCreateTimer === 0 && hasEnded) {
        // Timer reached 0, create new game (but only once)
        setAutoCreateTimer(-1) // Prevent multiple calls
        createNewGame()
      }
    } else {
      setAutoCreateTimer(0) // Reset if game is active
    }
  }, [gameInfo, autoCreateTimer])

  const loadGameInfo = async () => {
    try {
      if (MOCK_MODE) {
        // Mock data for testing
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
        return
      }

      // Load from blockchain with longer timeout (30s instead of 10s)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )

      const gameObjectPromise = suiClient.getObject({
        id: GAME_ID,
        options: { showContent: true }
      })

      const gameObject = await Promise.race([gameObjectPromise, timeoutPromise]) as any

      if (!gameObject.data) {
        throw new Error(`Game not found. Make sure your wallet is connected to ${REQUIRED_NETWORK}.`)
      }

      if (gameObject.data && gameObject.data.content && 'fields' in gameObject.data.content) {
        const fields = gameObject.data.content.fields as any
        
        console.log('Game fields:', {
          start_time: fields.start_time,
          end_time: fields.end_time,
          current_time: Date.now(),
          is_active: fields.is_active,
          time_difference_ms: parseInt(fields.end_time) - Date.now()
        })
        
        // Check if game times are in the future (blockchain clock issue)
        const startTime = parseInt(fields.start_time)
        const endTime = parseInt(fields.end_time)
        const now = Date.now()
        
        // If start time is in the future, adjust to current time
        let adjustedStartTime = fields.start_time
        let adjustedEndTime = fields.end_time
        
        if (startTime > now) {
          console.warn('Game start time is in the future. Adjusting to current time.')
          const gameDuration = endTime - startTime
          adjustedStartTime = now.toString()
          adjustedEndTime = (now + gameDuration).toString()
        }
        
        setGameInfo({
          gameNumber: fields.game_number,
          canvasWidth: parseInt(fields.canvas_width),
          canvasHeight: parseInt(fields.canvas_height),
          startTime: adjustedStartTime,
          endTime: adjustedEndTime,
          isActive: fields.is_active,
          prizePool: fields.prize_pool,
          redTeamPixels: parseInt(fields.red_team_pixels),
          blueTeamPixels: parseInt(fields.blue_team_pixels),
        })
        setError('') // Clear any previous errors
        
        // Check if current user has joined a team
        if (account?.address && !selectedTeam) {
          try {
            const playerInfo = await suiClient.getDynamicFieldObject({
              parentId: GAME_ID,
              name: {
                type: 'address',
                value: account.address,
              },
            })
            
            if (playerInfo.data && 'content' in playerInfo.data && playerInfo.data.content) {
              const playerFields = (playerInfo.data.content as any).fields
              if (playerFields && playerFields.team) {
                setSelectedTeam(parseInt(playerFields.team))
                console.log('Player already joined team:', playerFields.team)
              }
            }
          } catch (err) {
            // Player hasn't joined yet, which is fine
            console.log('Player has not joined a team yet')
          }
        }
      } else {
        throw new Error('Game object not found or invalid format')
      }
    } catch (err: any) {
      console.error('Failed to load game info:', err)
      let errorMsg = err.message || 'Failed to connect to blockchain'
      
      // Check if it's a network mismatch error
      if (errorMsg.includes('does not exist') || errorMsg.includes('not found')) {
        errorMsg = `Game not found! Please make sure your wallet is connected to ${REQUIRED_NETWORK.toUpperCase()}.`
        setNetworkWarning(`⚠️ Required network: ${REQUIRED_NETWORK.toUpperCase()}`)
      }
      
      setError(`⚠️ ${errorMsg}`)
      
      // Set mock data as fallback to prevent infinite loading
      setGameInfo({
        gameNumber: '1',
        canvasWidth: CANVAS_SIZE,
        canvasHeight: CANVAS_SIZE,
        startTime: Date.now().toString(),
        endTime: (Date.now() + 600000).toString(),
        isActive: true,
        prizePool: '0',
        redTeamPixels: 0,
        blueTeamPixels: 0,
      })
    }
  }
  const createNewGame = async () => {
    try {
      console.log('Auto-creating new game...')
      
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        setGameInfo({
          gameNumber: (parseInt(gameInfo?.gameNumber || '1') + 1).toString(),
          canvasWidth: CANVAS_SIZE,
          canvasHeight: CANVAS_SIZE,
          startTime: Date.now().toString(),
          endTime: (Date.now() + 600000).toString(),
          isActive: true,
          prizePool: '0',
          redTeamPixels: 0,
          blueTeamPixels: 0,
        })
        setSelectedTeam(null)
        setPixels(new Map())
        alert('🎮 New game created! Join a team to play!')
        return
      }

      // Create new game using AdminCap
      setLoading(true)
      const tx = new Transaction()
      
      tx.moveCall({
        target: `${PACKAGE_ID}::pixel_war::create_game`,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(CLOCK_ID),
        ],
      })
      
      tx.setGasBudget(10000000)

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async (result) => {
            console.log('New game created:', result)
            
            // Extract new game ID from transaction effects
            const effects = result.effects as any
            if (effects?.created) {
              const gameObj = effects.created.find((obj: any) => 
                obj.reference?.type?.includes('Game')
              )
              if (gameObj) {
                const newGameId = gameObj.reference.objectId
                console.log('New game ID:', newGameId)
                GAME_ID = newGameId // Update global GAME_ID
                
                // Reset state for new game
                setSelectedTeam(null)
                setPixels(new Map())
                setAutoCreateTimer(0)
                
                // Load new game info
                await new Promise(resolve => setTimeout(resolve, 2000))
                await loadGameInfo()
                
                alert('🎮 New game created! Join a team to play!')
              }
            }
            setLoading(false)
          },
          onError: (err) => {
            console.error('Failed to create game:', err)
            setError('Failed to create new game. Admin may need to create manually.')
            setLoading(false)
          },
        }
      )
      
    } catch (err: any) {
      console.error('Failed to create new game:', err)
      setError('Failed to create new game. Please refresh.')
      setLoading(false)
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
      // Validate stake amount
      const stakeValue = parseFloat(stakeAmount)
      if (isNaN(stakeValue) || stakeValue < 0.1) {
        setError('Minimum stake amount is 0.1 SUI')
        setLoading(false)
        return
      }

      // MOCK MODE: Simulate joining team without actual transaction
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
        setSelectedTeam(team)
        setGameInfo(prev => prev ? {
          ...prev,
          prizePool: (parseInt(prev.prizePool) + Math.floor(stakeValue * 1_000_000_000)).toString()
        } : prev)
        alert(`✅ Successfully joined ${team === TEAM_RED ? 'Red 🔴' : 'Blue 🔵'} team! (Mock Mode)`)
        setLoading(false)
        return
      }

      const tx = new Transaction()
      // Ensure we're sending at least 0.1 SUI (100_000_000 MIST)
      const stakeAmountMist = BigInt(Math.floor(stakeValue * 1_000_000_000))
      
      console.log('Stake amount in SUI:', stakeValue)
      console.log('Stake amount in MIST:', stakeAmountMist.toString())
      
      // Split coins from gas for the stake
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(stakeAmountMist)])
      
      tx.moveCall({
        target: `${PACKAGE_ID}::pixel_war::join_team`,
        arguments: [
          tx.object(GAME_ID),
          tx.pure.u8(team),
          coin,
          tx.object(CLOCK_ID),
        ],
      })
      
      // Set higher gas budget
      tx.setGasBudget(10000000)

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async (result) => {
            console.log('Transaction submitted:', result)
            
            // Wait a bit for transaction to be processed
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Set team and reload game info
            setSelectedTeam(team)
            await loadGameInfo()
            
            alert(`✅ Successfully joined ${team === TEAM_RED ? 'Red 🔴' : 'Blue 🔵'} team!`)
            setLoading(false)
          },
          onError: (err) => {
            console.error('Transaction error:', err)
            let errorMsg = 'Failed to join team'
            
            // Parse common error codes
            if (err.message.includes('No valid gas coins') || err.message.includes('Insufficient gas')) {
              errorMsg = '❌ Insufficient SUI balance. You need at least ' + (stakeValue + 0.1) + ' SUI (stake + gas fees). Please get SUI from a faucet or exchange.'
            } else if (err.message.includes('EInsufficientStake') || err.message.includes('error code 3')) {
              errorMsg = 'Insufficient stake amount. Minimum is 0.1 SUI'
            } else if (err.message.includes('EAlreadyJoined') || err.message.includes('error code 4')) {
              errorMsg = 'You have already joined this game'
              // If already joined, try to detect which team
              setSelectedTeam(team)
            } else if (err.message.includes('EGameNotActive') || err.message.includes('error code 1')) {
              errorMsg = 'Game is not active or has ended'
            } else if (err.message.includes('rejected') || err.message.includes('User rejected')) {
              errorMsg = 'Transaction rejected by user'
            }
            
            setError(errorMsg)
            setLoading(false)
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

    // Optimistically update UI first
    const key = `${x},${y}`
    const currentPixel = pixels.get(key)
    const newPixels = new Map(pixels)
    newPixels.set(key, { team: selectedTeam, painter: account.address })
    setPixels(newPixels)
    
    // Update game stats optimistically
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

    try {
      // MOCK MODE: Just update locally
      if (MOCK_MODE) {
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
      
      // Set gas budget
      tx.setGasBudget(10000000)

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async () => {
            console.log('Pixel painted successfully')
            // Wait for transaction to finalize
            await new Promise(resolve => setTimeout(resolve, 1500))
            await loadGameInfo()
          },
          onError: (err) => {
            console.error('Paint pixel error:', err)
            
            // Revert optimistic update on error
            if (currentPixel) {
              const revertPixels = new Map(pixels)
              revertPixels.set(key, currentPixel)
              setPixels(revertPixels)
            } else {
              const revertPixels = new Map(pixels)
              revertPixels.delete(key)
              setPixels(revertPixels)
            }
            
            // Revert game stats
            setGameInfo(prev => {
              if (!prev) return prev
              let newRed = prev.redTeamPixels
              let newBlue = prev.blueTeamPixels
              
              if (currentPixel) {
                if (currentPixel.team !== selectedTeam) {
                  if (currentPixel.team === TEAM_RED) {
                    newRed++
                    newBlue--
                  } else {
                    newBlue++
                    newRed--
                  }
                }
              } else {
                if (selectedTeam === TEAM_RED) {
                  newRed--
                } else {
                  newBlue--
                }
              }
              
              return { ...prev, redTeamPixels: newRed, blueTeamPixels: newBlue }
            })
            let errorMsg = 'Failed to paint pixel'
            
            if (err.message.includes('ENotGameMember') || err.message.includes('error code 6')) {
              errorMsg = 'You must join a team first'
              setSelectedTeam(null) // Reset team selection
            } else if (err.message.includes('EInvalidCoordinates') || err.message.includes('error code 5')) {
              errorMsg = 'Invalid pixel coordinates'
            } else if (err.message.includes('EGameNotActive') || err.message.includes('error code 1')) {
              errorMsg = 'Game is not active'
            } else if (err.message.includes('EPowerUpNotActive') || err.message.includes('error code 10')) {
              errorMsg = 'This pixel is shielded'
            } else if (err.message.includes('rejected')) {
              errorMsg = 'Transaction rejected by user'
            }
            
            setError(errorMsg)
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
        { transaction: tx as any },
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
        { transaction: tx as any },
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

      {networkWarning && (
        <div style={{
          background: '#ff9800',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          margin: '10px 20px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.1em'
        }}>
          {networkWarning}
        </div>
      )}

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

      {!gameInfo?.isActive && autoCreateTimer > 0 && (
        <div style={{ 
          background: 'rgba(76, 175, 80, 0.2)', 
          border: '2px solid #4caf50', 
          borderRadius: '8px', 
          padding: '20px', 
          textAlign: 'center',
          margin: '20px',
          fontSize: '1.2em'
        }}>
          <strong>🎮 Game Ended!</strong>
          <div style={{ marginTop: '10px', fontSize: '1.5em', color: '#4caf50' }}>
            Creating new game in {autoCreateTimer} seconds...
          </div>
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
                  <small style={{ color: '#888', fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
                    💡 Minimum: 0.1 SUI + gas fees (~0.01 SUI)
                  </small>
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
