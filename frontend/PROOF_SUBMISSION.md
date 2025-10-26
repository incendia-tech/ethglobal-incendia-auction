# Proof Submission Flow

## Overview

The frontend automatically loads proof data from the `data` folder and submits it directly via MetaMask, giving users full control over their transactions in proof-of-burn auctions.

## How It Works

### 1. Automatic Proof Loading
- After a successful burn transaction, the frontend automatically loads proof data from `../data/proof.json` and `../data/public.json`
- No manual input required from the user
- Proof data is validated and converted to the correct format for Solidity

### 2. MetaMask Transaction Submission
- **Method**: Direct MetaMask transaction
- **Purpose**: Users submit proofs directly through their wallet
- **Control**: Full user control over transaction parameters

### 3. Proof Format Conversion
- Automatically converts G2 element format from snarkjs to Solidity format
- Handles the coordinate swapping required for Groth16 proofs
- Validates proof structure before submission

## User Flow

1. **Connect Wallet** → User connects MetaMask
2. **Enter Bid Details** → User enters burn amount and bid amount
3. **Execute Burn** → User sends ETH to calculated burn address via MetaMask
4. **Auto-Load Proof** → System automatically loads proof data from data folder
5. **Submit via MetaMask** → User clicks "Submit Bid via MetaMask"
6. **MetaMask Confirmation** → MetaMask popup appears for transaction confirmation
7. **Transaction Success** → User confirms and transaction is submitted to contract

## Files Modified

- `app/auction/[id]/page.tsx` - Updated auction page with automatic proof loading and MetaMask submission
- `lib/proof-loader.ts` - Utility for loading proof data from data folder
- `lib/contracts/auction.ts` - MetaMask transaction creation and submission
- `lib/ethereum/transactions.ts` - MetaMask transaction utilities

## Benefits

- **User Control**: All transactions go through MetaMask (no private keys needed)
- **Streamlined UX**: No manual proof data entry required
- **Error Reduction**: Automatic validation and format conversion
- **Consistency**: Uses the same proof data for all submissions
- **Real-time Status**: Shows loading and submission progress
- **No Backend Dependencies**: Users control their own transactions

## Technical Details

### Proof Data Structure
```typescript
interface ProofData {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}
```

### MetaMask Transaction Format
```javascript
{
  from: "0x...", // User's wallet address
  to: "0x...",   // Auction contract address
  value: "0x0",  // No ETH value (bid is in function parameter)
  data: "0x...", // Encoded submitBid function call
  gas: "0x7a120" // 500,000 gas limit for ZK proof verification
}
```

### Function Call
```solidity
submitBid(
  uint256[2] proofA,
  uint256[2][2] proofB, 
  uint256[2] proofC,
  uint256[6] pubSignals,
  uint256 _bid
)
```

## Status Tracking

The UI shows real-time status updates:
- `idle` - Ready to submit
- `loading` - Submitting via MetaMask
- `success` - Transaction confirmed
- `error` - Transaction failed

This creates a smooth, user-controlled experience for proof-of-burn auctions where users maintain full control over their transactions.
