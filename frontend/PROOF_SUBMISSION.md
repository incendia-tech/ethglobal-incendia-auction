# Proof Submission Flow

## Overview

The frontend now automatically loads proof data from the `data` folder and submits it to a backend API endpoint, streamlining the user experience for proof-of-burn auctions.

## How It Works

### 1. Automatic Proof Loading
- After a successful burn transaction, the frontend automatically loads proof data from `../data/proof.json` and `../data/public.json`
- No manual input required from the user
- Proof data is validated and converted to the correct format for Solidity

### 2. Backend API Endpoint
- **Endpoint**: `/api/submit-proof`
- **Method**: POST
- **Purpose**: Handles proof submission and processing
- **Location**: `app/api/submit-proof/route.ts`

### 3. Proof Format Conversion
- Automatically converts G2 element format from snarkjs to Solidity format
- Handles the coordinate swapping required for Groth16 proofs
- Validates proof structure before submission

## User Flow

1. **Connect Wallet** → User connects MetaMask
2. **Enter Bid Details** → User enters burn amount and bid amount
3. **Execute Burn** → User sends ETH to calculated burn address
4. **Auto-Load Proof** → System automatically loads proof data from data folder
5. **Submit to Backend** → Proof is submitted to backend API
6. **Confirmation** → User sees transaction hash and success message

## Files Modified

- `app/auction/[id]/page.tsx` - Updated auction page with automatic proof loading
- `lib/proof-loader.ts` - New utility for loading and submitting proof data
- `app/api/submit-proof/route.ts` - New backend API endpoint

## Benefits

- **Streamlined UX**: No manual proof data entry required
- **Error Reduction**: Automatic validation and format conversion
- **Consistency**: Uses the same proof data for all submissions
- **Real-time Status**: Shows loading and submission progress
- **Backend Integration**: Centralized proof processing

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

### API Request Format
```json
{
  "contractAddress": "0x...",
  "burnTxHash": "0x...",
  "bidAmount": "1000000000000000000",
  "walletAddress": "0x..."
}
```

### API Response Format
```json
{
  "success": true,
  "transactionHash": "0x...",
  "message": "Proof submitted successfully",
  "proofData": { ... }
}
```

## Status Tracking

The UI shows real-time status updates:
- `idle` - Ready to submit
- `loading` - Submitting to backend
- `success` - Submission successful
- `error` - Submission failed

This creates a smooth, automated experience for users participating in proof-of-burn auctions.
