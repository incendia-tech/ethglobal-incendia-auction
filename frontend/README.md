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
- **MetaMask Submission**: Users submit proofs directly through MetaMask

### 🚀 **Advanced Features**
- **Direct MetaMask Integration**: Users control all transactions through their wallet
- **Automatic Proof Loading**: Proof data loads from data folder automatically
- **Real Contract Interaction**: Live transactions on Sepolia testnet
- **Comprehensive Error Handling**: Detailed error messages and debugging
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
- Sepolia testnet ETH
- Environment variables configured (optional for contract reading)

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

### 3. **Submit Proof via MetaMask**
- Proof data loads automatically from `data/` folder
- Click "Submit Bid via MetaMask"
- MetaMask popup appears for transaction confirmation
- Confirm transaction in MetaMask
- View transaction hash and status

## 📁 Project Structure

```
frontend/
├── app/
│   ├── api/submit-proof/     # API fallback for mock transactions
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
- **`app/api/submit-proof/route.ts`**: API fallback for mock transactions
- **`lib/proof-loader.ts`**: Proof data loading and submission
- **`lib/contracts/factory.ts`**: Contract interaction utilities

## 🔄 Transaction Flow

### Complete User Flow
1. **Connect Wallet**: User connects MetaMask to the application
2. **Execute Burn Transaction**: User submits burn transaction via MetaMask
3. **Load Proof Data**: System automatically loads proof data from `data/` folder
4. **Submit Bid**: User clicks "Submit Bid via MetaMask"
5. **MetaMask Confirmation**: MetaMask popup appears for transaction confirmation
6. **Transaction Success**: User confirms and transaction is submitted to contract
7. **Verification**: User can verify transaction on Etherscan

### Key Features
- **User Control**: All transactions go through MetaMask (no private keys needed)
- **Automatic Loading**: Proof data loads automatically from local files
- **Real Blockchain**: All transactions are real and verifiable on Sepolia
- **Gas Optimization**: Proper gas limits for ZK proof verification (500,000 gas)
- **No Backend Dependencies**: Users control their own transactions

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
- Check gas limits (should be 500,000 for ZK proof verification)
- Ensure you're on Sepolia testnet
- Check browser console for detailed error messages

### Debug Mode

Enable detailed logging by checking browser console and server logs for transaction details.

## 🔒 Security Notes

- **Never commit private keys** to version control
- **Use test accounts only** for development
- **Verify contract addresses** before mainnet deployment
- **Keep environment variables secure** in production

## 📚 API Reference

### MetaMask Transaction Flow

Users submit transactions directly through MetaMask, not via API.

**Transaction Parameters:**
```javascript
{
  from: "0x...", // User's wallet address
  to: "0x...",   // Auction contract address
  value: "0x0",  // No ETH value (bid is in function parameter)
  data: "0x...", // Encoded submitBid function call
  gas: "0x7a120" // 500,000 gas limit for ZK proof verification
}
```

**Function Call:**
```solidity
submitBid(
  uint256[2] proofA,
  uint256[2][2] proofB, 
  uint256[2] proofC,
  uint256[6] pubSignals,
  uint256 _bid
)
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
