# 🚀 Deployment Guide for PixelWar

This guide will walk you through deploying the PixelWar smart contracts to Sui blockchain.

## Prerequisites

1. **Sui CLI installed**
   ```bash
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
   ```

2. **Sui Wallet with testnet tokens**
   ```bash
   sui client new-address ed25519
   sui client faucet
   ```

3. **Node.js 18+** for frontend

## Deployment Steps

### Step 1: Build and Test Contracts

```bash
cd move
sui move build
sui move test
```

### Step 2: Publish to Sui

**Option A: Using PowerShell Script (Windows)**
```powershell
.\deploy.ps1
```

**Option B: Using Bash Script (Linux/Mac)**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Option C: Manual Deployment**
```bash
cd move
sui client publish --gas-budget 100000000
```

### Step 3: Save Deployment Info

After publishing, save these values:
- **Package ID**: The published package address
- **AdminCap ID**: The admin capability object ID

Example output:
```
Published Objects:
- Package ID: 0xabcd1234...
- AdminCap ID: 0xef567890...
```

### Step 4: Create Initial Game

Use the AdminCap to create the first game:

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module pixel_war \
  --function create_game \
  --args <ADMIN_CAP_ID> 0x6 \
  --gas-budget 10000000
```

The Clock object ID is always `0x6` on Sui.

Save the **Game Object ID** from the output.

### Step 5: Configure Frontend

Update [frontend/src/App.tsx](frontend/src/App.tsx):

```typescript
const PACKAGE_ID = '0xYOUR_PACKAGE_ID_HERE'
const GAME_ID = '0xYOUR_GAME_ID_HERE'
```

### Step 6: Install and Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser!

## Testing the Game

1. **Connect Wallet**: Click "Connect Sui Wallet" button
2. **Join Team**: Choose Red or Blue team and stake SUI
3. **Paint Pixels**: Click on canvas to paint pixels
4. **Buy Power-ups**: Try speed boost, bomb, or shield
5. **Wait for Game End**: Game lasts 10 minutes
6. **Claim Rewards**: After game ends, claim your share!

## Troubleshooting

### Build Errors

If you get dependency errors:
```bash
cd move
sui move build --skip-fetch-latest-git-deps
```

### Gas Budget Too Low

Increase gas budget:
```bash
sui client publish --gas-budget 200000000
```

### Network Issues

Switch to devnet:
```bash
sui client switch --env devnet
sui client faucet
```

## Network Configuration

### Testnet (Recommended)
```bash
sui client switch --env testnet
```

### Devnet (Development)
```bash
sui client switch --env devnet
```

### Mainnet (Production - use with real SUI!)
```bash
sui client switch --env mainnet
```

## Smart Contract Addresses

After deployment, update this section:

- **Testnet Package**: `0x...`
- **Testnet Game**: `0x...`
- **Devnet Package**: `0x...`
- **Devnet Game**: `0x...`

## Admin Functions

### Create New Game
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module pixel_war \
  --function create_game \
  --args <ADMIN_CAP_ID> 0x6 \
  --gas-budget 10000000
```

### End Game Early
```bash
sui client call \
  --package <PACKAGE_ID> \
  --module pixel_war \
  --function end_game \
  --args <ADMIN_CAP_ID> <GAME_ID> 0x6 \
  --gas-budget 10000000
```

## Monitoring

### Check Game State
```bash
sui client object <GAME_ID>
```

### View Events
```bash
sui client events \
  --module pixel_war \
  --package <PACKAGE_ID>
```

## Cost Estimates

- **Contract Deployment**: ~0.05-0.1 SUI
- **Create Game**: ~0.001 SUI
- **Join Team**: 0.1+ SUI (your stake)
- **Paint Pixel**: ~0.0003 SUI (gas only)
- **Speed Boost**: 0.05 SUI + gas
- **Bomb**: 0.1 SUI + gas
- **Shield**: 0.15 SUI + gas

## Security Notes

- Keep your AdminCap private - it controls game creation
- Test thoroughly on testnet before mainnet
- Prize pool is automatically managed by contract
- Players can only claim rewards once
- Pixels can be overwritten unless shielded

## Next Steps

1. Deploy to testnet and test thoroughly
2. Gather feedback from players
3. Add more power-ups (speed boost duration, bigger bombs)
4. Implement NFT minting for canvas artwork
5. Add leaderboard and player profiles
6. Create tournament system with multiple games
7. Deploy to mainnet when ready!

---

**Need help?** Check the main [README.md](README.md) or open an issue!

Happy deploying! 🚀
