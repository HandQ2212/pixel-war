#!/bin/bash

# PixelWar Deployment Script
# This script deploys the Move contracts and sets up the initial game

echo "🎨⚔️ PixelWar Deployment Script"
echo "================================"

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Sui CLI not found. Please install it first."
    exit 1
fi

echo "📦 Building Move package..."
cd move
sui move build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "🚀 Publishing package to Sui..."
PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json)

if [ $? -ne 0 ]; then
    echo "❌ Publish failed!"
    exit 1
fi

echo "✅ Package published!"
echo ""

# Extract package ID
PACKAGE_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.type == "published") | .packageId')
echo "📝 Package ID: $PACKAGE_ID"

# Extract AdminCap ID
ADMIN_CAP_ID=$(echo $PUBLISH_OUTPUT | jq -r '.objectChanges[] | select(.objectType | contains("AdminCap")) | .objectId')
echo "🔑 AdminCap ID: $ADMIN_CAP_ID"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update PACKAGE_ID in frontend/src/App.tsx"
echo "2. Create a game using: sui client call --package $PACKAGE_ID --module pixel_war --function create_game --args $ADMIN_CAP_ID 0x6 --gas-budget 10000000"
echo "3. Update GAME_ID in frontend/src/App.tsx with the created game object ID"
echo "4. Run: cd ../frontend && npm install && npm run dev"
echo ""
echo "Happy pixel battling! 🎨⚔️"
