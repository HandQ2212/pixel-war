# 🎨⚔️ PixelWar - Realtime Pixel Battle Game on Sui

A competitive pixel art game where two teams battle for canvas dominance using SUI tokens!

## 🎮 Game Concept

Two teams (Red 🔴 vs Blue 🔵) compete to paint more pixels on a shared canvas. The team with the most pixels when time expires wins the entire SUI prize pool!

## ⚡ Key Features

- **Team-Based Gameplay**: Join Red or Blue team by staking SUI
- **Pixel Warfare**: Paint pixels to claim territory (costs gas)
- **Power-Ups**: Spend SUI for advantages:
  - 🚀 Speed Boost: Paint faster
  - 💣 Bomb: Erase enemy pixels
  - 🛡️ Shield: Protect your pixels temporarily
- **Winner Takes All**: Winning team splits the SUI pool
- **NFT Reward**: Final canvas minted as NFT with royalties to both teams
- **Realtime Updates**: Live canvas state via Sui events

## 🏗️ Architecture

### Smart Contracts (Move)
- `pixel_war.move` - Main game logic, team management, winner calculation
- `pixel.move` - Pixel data structure with dynamic fields
- `powerup.move` - Power-up items and effects
- `canvas_nft.move` - Final artwork NFT minting

### Patterns Used
- ✅ Hot Potato (force complete game actions)
- ✅ Dynamic Fields (store pixel state)
- ✅ Event Emission (realtime updates)
- ✅ Capability Pattern (admin control)
- ✅ Coin Integration (SUI staking & rewards)
- ✅ Display Pattern (NFT metadata)

## 📁 Project Structure

```
pixel-war/
├── move/                   # Sui Move smart contracts
│   ├── sources/
│   │   ├── pixel_war.move
│   │   ├── pixel.move
│   │   ├── powerup.move
│   │   └── canvas_nft.move
│   ├── tests/
│   │   └── pixel_war_tests.move
│   └── Move.toml
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── ts/                     # TypeScript SDK
│   ├── src/
│   │   └── pixel-war.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### 1. Deploy Smart Contracts

```bash
cd move
sui move build
sui client publish --gas-budget 100000000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Play!

1. Open http://localhost:5173
2. Connect your Sui Wallet
3. Join a team by staking SUI (minimum 0.1 SUI)
4. Start painting pixels!
5. Buy power-ups to gain advantage
6. Wait for game to end and claim rewards!

## 🎯 Game Rules

- **Canvas Size**: 50x50 pixels (2,500 pixels total)
- **Game Duration**: 10 minutes per round
- **Entry Fee**: 0.1 SUI minimum to join team
- **Pixel Cost**: Gas fees only (no extra cost)
- **Power-Up Costs**:
  - Speed Boost (30s): 0.05 SUI
  - Bomb (erase 5 pixels): 0.1 SUI
  - Shield (protect area): 0.15 SUI
- **Victory**: Team with most pixels wins entire prize pool
- **Prize Split**: Winners get proportional share based on contribution

## 🛠️ Tech Stack

- **Blockchain**: Sui (Move language)
- **Frontend**: React 18, TypeScript, Vite
- **Wallet**: Sui dApp Kit (@mysten/dapp-kit)
- **State**: Sui SDK (@mysten/sui.js)
- **Styling**: CSS3 with animations

## 📝 Development

### Build Move Contracts
```bash
cd move
sui move build
sui move test
```

### Run Frontend Dev Server
```bash
cd frontend
npm run dev
```

### Run TypeScript Tests
```bash
cd ts
npm test
```

## 🎨 Gameplay Flow

1. **Create Game**: Admin creates new game round with canvas size
2. **Join Team**: Players stake SUI to join Red or Blue team
3. **Paint Phase**: Players paint pixels, buy power-ups
4. **End Game**: Timer expires or admin ends game
5. **Calculate Winner**: Smart contract counts pixels per team
6. **Distribute Rewards**: Winners claim their share
7. **Mint NFT**: Canvas becomes tradeable NFT

## 🔒 Security Features

- Hot Potato pattern ensures atomic operations
- Capability-based admin functions
- Reentrancy protection on prize distribution
- Timestamp-based game state validation

## 📊 Events Emitted

- `GameCreated` - New game started
- `PlayerJoined` - Player joined team
- `PixelPainted` - New pixel placed
- `PowerUpUsed` - Power-up activated
- `GameEnded` - Game finished with winner
- `RewardClaimed` - Player claimed prize

## 🎓 Learning Outcomes

This project demonstrates:
- Complex game state management on-chain
- Team-based mechanics with token staking
- Real-time event-driven frontend
- Dynamic NFT generation
- Fair reward distribution algorithms

## 📄 License

MIT License - Built for Sui Move Bootcamp

---

**Ready to battle? Let the pixel war begin! 🎨⚔️**
