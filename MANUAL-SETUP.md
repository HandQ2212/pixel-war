# Simple manual instructions for creating a game

Write-Host @"
🎮 Manual Game Creation Guide
================================

Your deployed package: 0xd5a2b2e2f149ca48f768da6ae4df39e91c551ed97e98523e5a5a643fd35c0035
Your wallet: 0x42b9ab1a460a4ebd4a2484b561afa2c7a9991893a5c7df96f00956b54108f3c4

OPTION 1: Use Sui Explorer (Easiest when CLI doesn't work)
----------------------------------------------------------
1. Go to: https://suiscan.xyz/testnet/account/$env:YOUR_ADDRESS/objects
   Replace YOUR_ADDRESS with: 0x42b9ab1a460a4ebd4a2484b561afa2c7a9991893a5c7df96f00956b54108f3c4

2. Find the AdminCap object (type will be like 0x...::pixel_war::AdminCap)

3. Go to Sui Wallet and use Programmable Transaction Block:
   - Function: 0xd5a2b2e2f149ca48f768da6ae4df39e91c551ed97e98523e5a5a643fd35c0035::pixel_war::create_game
   - Arguments:
     * AdminCap object ID (from step 2)
     * Clock: 0x6

4. After transaction succeeds, copy the new Game object ID

5. Update App.tsx:
   const MOCK_MODE = false
   const GAME_ID = 'YOUR_NEW_GAME_ID'


OPTION 2: Use CLI when network works
-------------------------------------
sui client objects  # Find AdminCap ID
sui client call --package 0xd5a2b2e2f149ca48f768da6ae4df39e91c551ed97e98523e5a5a643fd35c0035 --module pixel_war --function create_game --args <ADMIN_CAP_ID> 0x6 --gas-budget 10000000


OPTION 3: Try again later when Sui RPC is stable
-------------------------------------------------
The network seems congested right now. Wait 30-60 minutes and try again.


TEMPORARY: Keep using MOCK_MODE
---------------------------------
Your UI is currently set to MOCK_MODE=true, which works without blockchain.
You can test the full UI functionality this way while waiting for network to stabilize.

"@
