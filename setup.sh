#!/bin/bash

echo "🚀 Setting up Auction Frontend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Add your environment variables here
NEXT_PUBLIC_FACTORY_ADDRESS=0xac2aec9290bf46c4dc0f5f4933ef33c11d4803b2
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia.publicnode.com
EOF
fi

echo "✅ Setup complete!"
echo "Run 'npm run dev' to start the development server"
