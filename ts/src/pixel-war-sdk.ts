import { SuiClient, SuiEvent } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'

export interface PixelWarConfig {
  packageId: string
  gameId: string
  suiClient: SuiClient
}

export interface GameInfo {
  gameNumber: bigint
  canvasWidth: number
  canvasHeight: number
  startTime: bigint
  endTime: bigint
  isActive: boolean
  prizePool: bigint
  redTeamPixels: number
  blueTeamPixels: number
}

export interface PlayerInfo {
  team: number
  stakeAmount: bigint
  pixelsPainted: number
  hasClaimed: boolean
}

export const TEAM_RED = 1
export const TEAM_BLUE = 2
export const CLOCK_ID = '0x6'

export class PixelWarSDK {
  private config: PixelWarConfig

  constructor(config: PixelWarConfig) {
    this.config = config
  }

  /**
   * Get game information
   */
  async getGameInfo(): Promise<GameInfo | null> {
    try {
      const gameObject = await this.config.suiClient.getObject({
        id: this.config.gameId,
        options: {
          showContent: true,
        },
      })

      if (!gameObject.data?.content || gameObject.data.content.dataType !== 'moveObject') {
        return null
      }

      const fields = gameObject.data.content.fields as any

      return {
        gameNumber: BigInt(fields.game_number),
        canvasWidth: Number(fields.canvas_width),
        canvasHeight: Number(fields.canvas_height),
        startTime: BigInt(fields.start_time),
        endTime: BigInt(fields.end_time),
        isActive: fields.is_active,
        prizePool: BigInt(fields.prize_pool),
        redTeamPixels: Number(fields.red_team_pixels),
        blueTeamPixels: Number(fields.blue_team_pixels),
      }
    } catch (error) {
      console.error('Failed to fetch game info:', error)
      return null
    }
  }

  /**
   * Create transaction to join a team
   */
  createJoinTeamTx(team: number, stakeAmountMist: bigint): Transaction {
    const tx = new Transaction()
    
    const [coin] = tx.splitCoins(tx.gas, [stakeAmountMist])
    
    tx.moveCall({
      target: `${this.config.packageId}::pixel_war::join_team`,
      arguments: [
        tx.object(this.config.gameId),
        tx.pure.u8(team),
        coin,
        tx.object(CLOCK_ID),
      ],
    })

    return tx
  }

  /**
   * Create transaction to paint a pixel
   */
  createPaintPixelTx(x: number, y: number): Transaction {
    const tx = new Transaction()
    
    tx.moveCall({
      target: `${this.config.packageId}::pixel_war::paint_pixel`,
      arguments: [
        tx.object(this.config.gameId),
        tx.pure.u32(x),
        tx.pure.u32(y),
        tx.object(CLOCK_ID),
      ],
    })

    return tx
  }

  /**
   * Create transaction to buy speed boost
   */
  createBuySpeedBoostTx(costMist: bigint = 50_000_000n): Transaction {
    const tx = new Transaction()
    
    const [coin] = tx.splitCoins(tx.gas, [costMist])
    
    tx.moveCall({
      target: `${this.config.packageId}::pixel_war::buy_speed_boost`,
      arguments: [
        tx.object(this.config.gameId),
        coin,
        tx.object(CLOCK_ID),
      ],
    })

    return tx
  }

  /**
   * Create transaction to buy bomb
   */
  createBuyBombTx(targetX: number, targetY: number, costMist: bigint = 100_000_000n): Transaction {
    const tx = new Transaction()
    
    const [coin] = tx.splitCoins(tx.gas, [costMist])
    
    tx.moveCall({
      target: `${this.config.packageId}::pixel_war::buy_bomb`,
      arguments: [
        tx.object(this.config.gameId),
        coin,
        tx.pure.u32(targetX),
        tx.pure.u32(targetY),
        tx.object(CLOCK_ID),
      ],
    })

    return tx
  }

  /**
   * Create transaction to buy shield
   */
  createBuyShieldTx(shieldX: number, shieldY: number, costMist: bigint = 150_000_000n): Transaction {
    const tx = new Transaction()
    
    const [coin] = tx.splitCoins(tx.gas, [costMist])
    
    tx.moveCall({
      target: `${this.config.packageId}::pixel_war::buy_shield`,
      arguments: [
        tx.object(this.config.gameId),
        coin,
        tx.pure.u32(shieldX),
        tx.pure.u32(shieldY),
        tx.object(CLOCK_ID),
      ],
    })

    return tx
  }

  /**
   * Create transaction to claim reward
   */
  createClaimRewardTx(): Transaction {
    const tx = new Transaction()
    
    tx.moveCall({
      target: `${this.config.packageId}::pixel_war::claim_reward`,
      arguments: [
        tx.object(this.config.gameId),
        tx.object(CLOCK_ID),
      ],
    })

    return tx
  }

  /**
   * Listen to game events
   */
  async subscribeToGameEvents(
    onEvent: (event: any) => void,
    eventTypes?: string[]
  ): Promise<() => void> {
    const subscription = await this.config.suiClient.subscribeEvent({
      filter: {
        MoveEventModule: {
          package: this.config.packageId,
          module: 'pixel_war',
        },
      },
      onMessage: (event: SuiEvent) => {
        const eventType = event.type.split('::').pop()
        if (!eventTypes || eventTypes.includes(eventType || '')) {
          onEvent(event)
        }
      },
    })

    return () => subscription()
  }

  /**
   * Get pixel data at coordinates
   */
  async getPixelData(x: number, y: number): Promise<{ exists: boolean; team: number; painter: string } | null> {
    try {
      // Query dynamic field for pixel
      // This would need to be implemented based on actual dynamic field structure
      return null
    } catch (error) {
      console.error('Failed to fetch pixel data:', error)
      return null
    }
  }

  /**
   * Calculate time remaining in milliseconds
   */
  calculateTimeRemaining(gameInfo: GameInfo): number {
    const now = Date.now()
    const endTime = Number(gameInfo.endTime)
    return Math.max(0, endTime - now)
  }

  /**
   * Format SUI amount from MIST
   */
  formatSUI(mistAmount: bigint): string {
    return (Number(mistAmount) / 1_000_000_000).toFixed(2)
  }

  /**
   * Parse SUI amount to MIST
   */
  parseSUI(suiAmount: string): bigint {
    return BigInt(Math.floor(parseFloat(suiAmount) * 1_000_000_000))
  }
}

export default PixelWarSDK
