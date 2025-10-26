# Deployment Scripts

This directory contains deployment scripts for the Auction system contracts.

## Available Scripts


### Deployment (`deploy.ts`)
Deploys all contracts including an Auction contract through the Factory.

```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

**Output:**
- Groth16Verifier contract address
- Factory contract address  
- Auction contract address
- Deployment verification details

## Networks

The scripts support the following networks:

- `hardhat` - Local Hardhat network (for testing)
- `hardhatMainnet` - Hardhat simulated mainnet
- `hardhatOp` - Hardhat simulated Optimism
- `sepolia` - Sepolia testnet (requires environment variables)

## Environment Variables (for Sepolia)

For Sepolia deployment, set these environment variables:

```bash
export SEPOLIA_RPC_URL="your_sepolia_rpc_url"
export SEPOLIA_PRIVATE_KEY="your_private_key"
```

## Usage Examples

### Deploy to Hardhat (local testing)
```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

### Deploy to Sepolia testnet
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Contract Addresses

After deployment, you'll get contract addresses like:
- Groth16Verifier: `0x5fbdb2315678afecb367f032d93f642f64180aa3`
- Factory: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`
- Auction: `0x0274CF8a7BcD9c60fFd50f5AA1598117EBd0530c`

## Manual Auction Deployment

To deploy additional Auction contracts using the Factory:

```solidity
// Using the deployed Factory contract
factory.deployAuctionContract(
    salt,                    // bytes32 unique salt
    CeremonyType.Auction,    // 0 for Auction
    verifierAddress,         // Groth16Verifier address
    biddingDeadline,        // uint256 timestamp
    submissionDeadline,     // uint256 timestamp  
    resultDeadline,         // uint256 timestamp
    ceremonyId,             // uint256 ceremony ID
    maxWinners              // uint256 max winners
);
```

## Notes

- Each Auction deployment requires a unique salt
- Deadlines are Unix timestamps
- The Factory uses CREATE2 for deterministic addresses
- All contracts are properly initialized after deployment
