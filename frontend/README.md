# 🔥 Incendia Auction Frontend

A modern, full-featured frontend for the Incendia Zero-Knowledge Proof Auction system. This application provides a complete user interface for participating in privacy-preserving auctions using Groth16 proofs and proof-of-burn mechanisms.

## ✨ Features

### 🎯 **Core Auction Functionality**
- **Wallet Integration**: Seamless MetaMask connection with EIP-6963 support
- **Burn Transactions**: Execute proof-of-burn transactions for auction participation
- **Proof Submission**: Automatic ZK proof loading and contract submission
- **Real-time Status**: Live transaction tracking and confirmation

### 🔐 **Zero-Knowledge Proof Integration**
- **Automatic Proof Loading**: Loads proof data from local JSON files
- **Proof Format Conversion**: Converts Groth16 proofs for Solidity compatibility
- **Public Signals Processing**: Handles 6-element public signal arrays
- **Contract Verification**: Submits proofs to on-chain verifier contracts

### 🚀 **Advanced Features**
- **Real Contract Interaction**: Live transactions on Sepolia testnet
- **Mock Mode**: Development-friendly fallback for testing
- **Error Handling**: Comprehensive error management and user feedback
- **Responsive Design**: Mobile-first, modern UI with Tailwind CSS
- **Type Safety**: Full TypeScript implementation

## 🛠️ Technology Stack

- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI components
- **Blockchain**: Viem for Ethereum interaction
- **ZK Proofs**: Groth16 proof format support
- **Wallet**: MetaMask integration with EIP-6963

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MetaMask wallet
- Sepolia testnet ETH (for real transactions)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Sepolia RPC URL (required for real transactions)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Private key for transaction signing (required for real transactions)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Factory contract address (from your deployment)
FACTORY_ADDRESS=0xe7f1725e7734ce288f8367e1bb143e90bb3f0512

# Verifier contract address (from your deployment)
VERIFIER_ADDRESS=0x5fbdb2315678afecb367f032d93f642f64180aa3
```

### Getting Credentials

1. **RPC URL**: Sign up at [Alchemy](https://alchemy.com/) or [Infura](https://infura.io/)
2. **Private Key**: Export from MetaMask (Settings → Security → Export Private Key)
3. **Test ETH**: Get Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com/)

## 🎮 Usage

### 1. **Connect Wallet**
- Click "Connect MetaMask" button
- Approve connection in MetaMask
- Switch to Sepolia testnet

### 2. **Execute Burn Transaction**
- Enter burn amount (in ETH)
- Enter bid amount (in ETH)
- Click "Execute Burn Transaction"
- Confirm transaction in MetaMask

### 3. **Submit Proof**
- Proof data loads automatically from `data/` folder
- Click "Submit Bid to Contract"
- Transaction submits to auction contract
- View transaction hash and status

## 📁 Project Structure

```
frontend/
├── app/
│   ├── api/submit-proof/     # Backend API for proof submission
│   ├── auction/[id]/         # Auction page component
│   └── layout.tsx            # Root layout
├── components/ui/            # Reusable UI components
├── lib/
│   ├── contracts/           # Contract interaction utilities
│   ├── ethereum/            # Wallet connection logic
│   └── proof-loader.ts      # Proof data management
├── data/                    # Mock proof data files
└── .env.local              # Environment configuration
```

## 🔧 Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Key Components

- **`app/auction/[id]/page.tsx`**: Main auction interface
- **`app/api/submit-proof/route.ts`**: Backend API for contract interaction
- **`lib/proof-loader.ts`**: Proof data loading and submission
- **`lib/contracts/factory.ts`**: Contract interaction utilities

## 🔄 Transaction Flow

### Real Transaction Mode (Production)
1. User connects wallet
2. Executes burn transaction on Sepolia
3. Proof data loads from local files
4. Backend submits to auction contract
5. Real transaction hash returned
6. User can verify on Etherscan

### Mock Transaction Mode (Development)
1. User connects wallet
2. Simulates burn transaction
3. Proof data loads from local files
4. Backend returns mock transaction hash
5. No actual blockchain interaction

## 🐛 Troubleshooting

### Common Issues

**"Environment variables not configured"**
- Ensure `.env.local` file exists with correct values
- Restart development server after changes

**"Failed to connect wallet"**
- Check MetaMask is installed and unlocked
- Ensure you're on Sepolia testnet
- Try refreshing the page

**"Transaction failed"**
- Verify account has sufficient Sepolia ETH
- Check gas limits and network congestion
- Ensure contract addresses are correct

### Debug Mode

Enable detailed logging by checking browser console and server logs for transaction details.

## 🔒 Security Notes

- **Never commit private keys** to version control
- **Use test accounts only** for development
- **Verify contract addresses** before mainnet deployment
- **Keep environment variables secure** in production

## 📚 API Reference

### POST `/api/submit-proof`

Submits a ZK proof to the auction contract.

**Request Body:**
```json
{
  "contractAddress": "0x...",
  "burnTxHash": "0x...",
  "bidAmount": "1000000000000000000",
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "message": "Bid submitted successfully to contract",
  "proofData": { ... }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Incendia Auction system. See the main repository for license details.

---

**Built with ❤️ for the Ethereum community**
