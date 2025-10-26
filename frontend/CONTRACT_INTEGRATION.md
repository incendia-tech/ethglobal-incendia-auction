# Contract Integration Setup

## Overview

The backend API now supports actual contract interaction using viem. When properly configured, it will submit real transactions to the auction contract on Sepolia testnet.

## Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

```bash
# Sepolia RPC URL (get from Infura, Alchemy, or other providers)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Private key for the account that will submit transactions
# WARNING: Never commit real private keys to version control!
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

## Getting Started

### 1. Get a Sepolia RPC URL
- Sign up for [Infura](https://infura.io/) or [Alchemy](https://alchemy.com/)
- Create a new project
- Copy the Sepolia RPC URL

### 2. Get a Test Account
- Create a new MetaMask wallet or use an existing one
- Export the private key (Settings → Security & Privacy → Reveal Private Key)
- Fund the account with Sepolia ETH from a [faucet](https://sepoliafaucet.com/)

### 3. Deploy the Contract
- Make sure the auction contract is deployed on Sepolia
- Update the contract address in your frontend

## How It Works

### Without Environment Variables (Demo Mode)
- Returns a mock transaction hash
- Shows "Mock transaction" message
- Perfect for development and testing

### With Environment Variables (Production Mode)
- Connects to Sepolia testnet
- Submits real transactions to the contract
- Waits for confirmation
- Returns actual transaction hash

## Contract Function

The API calls the `submitBid` function with these parameters:
- `proofA`: `uint256[2]` - First part of the ZK proof
- `proofB`: `uint256[2][2]` - Second part of the ZK proof  
- `proofC`: `uint256[2]` - Third part of the ZK proof
- `pubSignals`: `uint256[6]` - Public signals (6 values)
- `_bid`: `uint256` - Bid amount in wei

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider using a dedicated service account for production
- Monitor gas costs and transaction limits

## Troubleshooting

### Common Issues

1. **"Environment variables not configured"**
   - Create `.env.local` file with proper values
   - Restart the development server

2. **"Transaction failed"**
   - Check if account has enough Sepolia ETH
   - Verify contract address is correct
   - Check gas limit settings

3. **"RPC URL invalid"**
   - Verify the RPC URL is correct
   - Check if the service is working
   - Try a different provider

### Testing

1. Start with demo mode (no env vars)
2. Configure environment variables
3. Test with small amounts first
4. Monitor transaction status on Sepolia Etherscan

## Production Deployment

For production deployment:
1. Set environment variables in your deployment platform
2. Use a secure key management system
3. Monitor transaction costs and limits
4. Set up proper error handling and logging
