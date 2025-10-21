import { keccak256, toHex } from 'viem'

// Utility functions for the auction protocol
export class AuctionUtils {
  static generateRandomBeta(): string {
    // In a real application, this would be a cryptographically secure random number
    // For demonstration, a simple random string is used
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  static stringToBigInt(value: string): bigint {
    return BigInt(value)
  }

  static bigIntToString(value: bigint): string {
    return value.toString()
  }
}

// Parameters for auction calculations
export interface AuctionParams {
  userId: string // Bidder's wallet address
  auctionId: string // Unique auction identifier (e.g., contract address + ceremonyId)
  beta: string // Random blinding factor
  bidValue?: bigint // Bid amount in wei (for bid phase)
  amount?: bigint // Deposit amount in wei (for deposit phase)
}

// Results of burn address calculations
export interface BurnResult {
  burnAddress: string
  nullifier: string
  commitment?: string
}

/**
 * Burn Address Calculator for the auction protocol
 */
export class BurnAddressCalculator {
  /**
   * Calculate burn address for registration phase
   * Λ = H(userId || auctionId || beta)
   */
  static calculateRegistrationBurnAddress(params: AuctionParams): string {
    const { userId, auctionId, beta } = params
    const input = `${userId}${auctionId}${beta}`
    const hash = keccak256(toHex(input))
    // Convert hash to valid Ethereum address format (take last 20 bytes)
    return `0x${hash.slice(-40)}`
  }

  /**
   * Calculate burn address for bid phase
   * Λ = H(userId || auctionId || bidValue || beta)
   */
  static calculateBidBurnAddress(params: AuctionParams): string {
    const { userId, auctionId, bidValue, beta } = params
    if (!bidValue) {
      throw new Error('Bid value is required for bid burn address calculation')
    }
    const input = `${userId}${auctionId}${bidValue.toString()}${beta}`
    const hash = keccak256(toHex(input))
    // Convert hash to valid Ethereum address format (take last 20 bytes)
    return `0x${hash.slice(-40)}`
  }

  /**
   * Calculate nullifier
   * η = H(userId || auctionId || beta)
   */
  static calculateNullifier(params: AuctionParams): string {
    const { userId, auctionId, beta } = params
    const input = `${userId}${auctionId}${beta}`
    return keccak256(toHex(input))
  }

  /**
   * Calculate commitment for deposit phase
   * c = H(userId || auctionId || amount || beta)
   */
  static calculateCommitment(params: AuctionParams): string {
    const { userId, auctionId, amount, beta } = params
    if (!amount) {
      throw new Error('Amount is required for commitment calculation')
    }
    const input = `${userId}${auctionId}${amount.toString()}${beta}`
    return keccak256(toHex(input))
  }

  /**
   * Generate burn address for current auction context
   * This is the main function to use in the auction flow
   */
  static generateBurnAddress(
    userAddress: string,
    auctionAddress: string,
    ceremonyId: number,
    burnAmount?: string
  ): string {
    const params: AuctionParams = {
      userId: userAddress,
      auctionId: `${auctionAddress}_${ceremonyId}`,
      beta: AuctionUtils.generateRandomBeta(),
      bidValue: burnAmount ? BigInt(burnAmount) : undefined
    }

    if (burnAmount) {
      return this.calculateBidBurnAddress(params)
    } else {
      return this.calculateRegistrationBurnAddress(params)
    }
  }

  /**
   * Calculate complete registration result
   */
  static calculateRegistrationResult(params: AuctionParams): BurnResult {
    const burnAddress = this.calculateRegistrationBurnAddress(params)
    const nullifier = this.calculateNullifier(params)
    return { burnAddress, nullifier }
  }

  /**
   * Calculate complete bid result
   */
  static calculateBidResult(params: AuctionParams): BurnResult {
    const burnAddress = this.calculateBidBurnAddress(params)
    const nullifier = this.calculateNullifier(params)
    return { burnAddress, nullifier }
  }

  /**
   * Calculate complete deposit result
   */
  static calculateDepositResult(params: AuctionParams): BurnResult {
    const commitment = this.calculateCommitment(params)
    const nullifier = this.calculateNullifier(params)
    
    return {
      burnAddress: '', // No burn address for deposits
      nullifier,
      commitment
    }
  }

  /**
   * Validate a burn address against given parameters
   */
  static validateBurnAddress(
    burnAddress: string,
    params: AuctionParams,
    isBidBurn: boolean = false
  ): boolean {
    try {
      const expectedBurnAddress = isBidBurn 
        ? this.calculateBidBurnAddress(params)
        : this.calculateRegistrationBurnAddress(params)
      
      return burnAddress.toLowerCase() === expectedBurnAddress.toLowerCase()
    } catch (error) {
      console.error("Error validating burn address:", error)
      return false
    }
  }
}
