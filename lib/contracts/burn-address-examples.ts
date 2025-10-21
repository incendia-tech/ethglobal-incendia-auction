import { BurnAddressCalculator, AuctionUtils, AuctionParams } from './burn-address-calculator';

/**
 * Example usage of the BurnAddressCalculator
 * Demonstrates different scenarios from the auction protocol
 */

// Example 1: Registration Phase - Token Burn for Anonymous Registration
function exampleRegistrationBurn() {
  console.log('=== Registration Phase Example ===');
  
  const params: AuctionParams = {
    userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Bidder's wallet address
    auctionId: 'auction_2024_001', // Unique auction identifier
    beta: AuctionUtils.generateRandomBeta() // Random blinding factor
  };

  console.log('Parameters:');
  console.log('  User ID:', params.userId);
  console.log('  Auction ID:', params.auctionId);
  console.log('  Beta (blinding factor):', params.beta);

  // Calculate burn address for registration
  const result = BurnAddressCalculator.calculateRegistrationResult(params);
  
  console.log('\nResults:');
  console.log('  Burn Address (Λ):', result.burnAddress);
  console.log('  Nullifier (η):', result.nullifier);
  
  return result;
}

// Example 2: Burn-to-Bid (B2B) Mechanism
function exampleBurnToBid() {
  console.log('\n=== Burn-to-Bid (B2B) Example ===');
  
  const params: AuctionParams = {
    userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    auctionId: 'auction_2024_001',
    bidValue: AuctionUtils.stringToBigInt('1000000000000000000'), // 1 ETH in wei
    beta: AuctionUtils.generateRandomBeta()
  };

  console.log('Parameters:');
  console.log('  User ID:', params.userId);
  console.log('  Auction ID:', params.auctionId);
  console.log('  Bid Value:', AuctionUtils.bigIntToString(params.bidValue!), 'wei');
  console.log('  Beta (blinding factor):', params.beta);

  // Calculate burn address for bid
  const result = BurnAddressCalculator.calculateBidResult(params);
  
  console.log('\nResults:');
  console.log('  Burn Address (Λ):', result.burnAddress);
  console.log('  Nullifier (η):', result.nullifier);
  
  return result;
}

// Example 3: Deposit Phase - Commitment Calculation
function exampleDepositCommitment() {
  console.log('\n=== Deposit Phase Example ===');
  
  const params: AuctionParams = {
    userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    auctionId: 'auction_2024_001',
    amount: AuctionUtils.stringToBigInt('5000000000000000000'), // 5 ETH collateral
    beta: AuctionUtils.generateRandomBeta()
  };

  console.log('Parameters:');
  console.log('  User ID:', params.userId);
  console.log('  Auction ID:', params.auctionId);
  console.log('  Deposit Amount:', AuctionUtils.bigIntToString(params.amount!), 'wei');
  console.log('  Beta (blinding factor):', params.beta);

  // Calculate commitment
  const result = BurnAddressCalculator.calculateDepositResult(params);
  
  console.log('\nResults:');
  console.log('  Commitment (c):', result.commitment);
  console.log('  Nullifier (η):', result.nullifier);
  
  return result;
}

// Example 4: Validation Example
function exampleValidation() {
  console.log('\n=== Validation Example ===');
  
  const params: AuctionParams = {
    userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    auctionId: 'auction_2024_001',
    beta: 'abc123def456' // Fixed beta for demonstration
  };

  // Calculate expected burn address
  const expectedBurnAddress = BurnAddressCalculator.calculateRegistrationBurnAddress(params);
  console.log('Expected burn address:', expectedBurnAddress);

  // Validate the burn address
  const isValid = BurnAddressCalculator.validateBurnAddress(
    expectedBurnAddress,
    params,
    false // This is a registration burn, not a bid burn
  );

  console.log('Validation result:', isValid ? 'VALID' : 'INVALID');
  
  // Test with wrong parameters
  const wrongParams = { ...params, beta: 'wrong_beta' };
  const isInvalid = BurnAddressCalculator.validateBurnAddress(
    expectedBurnAddress,
    wrongParams,
    false
  );
  
  console.log('Validation with wrong params:', isInvalid ? 'VALID' : 'INVALID');
}

// Example 5: Multiple Bidders Scenario
function exampleMultipleBidders() {
  console.log('\n=== Multiple Bidders Example ===');
  
  const auctionId = 'auction_2024_001';
  const bidders = [
    { userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', bidValue: '1000000000000000000' },
    { userId: '0x8ba1f109551bD432803012645Hac136c', bidValue: '2000000000000000000' },
    { userId: '0x1234567890123456789012345678901234567890', bidValue: '1500000000000000000' }
  ];

  console.log(`Processing ${bidders.length} bidders for auction: ${auctionId}`);
  
  const results = bidders.map((bidder, index) => {
    const params: AuctionParams = {
      userId: bidder.userId,
      auctionId,
      bidValue: AuctionUtils.stringToBigInt(bidder.bidValue),
      beta: AuctionUtils.generateRandomBeta()
    };

    const result = BurnAddressCalculator.calculateBidResult(params);
    
    console.log(`\nBidder ${index + 1}:`);
    console.log('  User ID:', bidder.userId);
    console.log('  Bid Value:', bidder.bidValue, 'wei');
    console.log('  Burn Address:', result.burnAddress);
    console.log('  Nullifier:', result.nullifier);
    
    return { bidder: bidder.userId, result };
  });

  return results;
}

// Example 6: Deterministic vs Random Beta
function exampleDeterministicBeta() {
  console.log('\n=== Deterministic vs Random Beta Example ===');
  
  const baseParams = {
    userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    auctionId: 'auction_2024_001'
  };

  // Using deterministic beta
  const deterministicParams: AuctionParams = {
    ...baseParams,
    beta: 'fixed_beta_value_123'
  };

  // Using random beta
  const randomParams: AuctionParams = {
    ...baseParams,
    beta: AuctionUtils.generateRandomBeta()
  };

  const deterministicResult = BurnAddressCalculator.calculateRegistrationResult(deterministicParams);
  const randomResult = BurnAddressCalculator.calculateRegistrationResult(randomParams);

  console.log('Deterministic Beta:');
  console.log('  Beta:', deterministicParams.beta);
  console.log('  Burn Address:', deterministicResult.burnAddress);
  console.log('  Nullifier:', deterministicResult.nullifier);

  console.log('\nRandom Beta:');
  console.log('  Beta:', randomParams.beta);
  console.log('  Burn Address:', randomResult.burnAddress);
  console.log('  Nullifier:', randomResult.nullifier);

  console.log('\nNote: Deterministic beta produces the same result every time,');
  console.log('while random beta produces different results for each execution.');
}

// Main execution function
function main() {
  console.log('Burn Address Calculator Examples');
  console.log('================================\n');

  try {
    // Run all examples
    exampleRegistrationBurn();
    exampleBurnToBid();
    exampleDepositCommitment();
    exampleValidation();
    exampleMultipleBidders();
    exampleDeterministicBeta();

    console.log('\n=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export for use in other modules
export {
  exampleRegistrationBurn,
  exampleBurnToBid,
  exampleDepositCommitment,
  exampleValidation,
  exampleMultipleBidders,
  exampleDeterministicBeta
};

// Run examples if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

