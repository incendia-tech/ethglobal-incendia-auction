// Auction contract interaction utilities

import type { ProofData } from "./auction-abi"
import { sendTransaction, waitForTransaction, encodeUint256, encodeUint256Array } from "../ethereum/transactions"

export interface Groth16Proof {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}

export function parseGroth16Proof(proofData: string): Groth16Proof {
  try {
    const parsed = JSON.parse(proofData)
    return {
      pi_a: parsed.pi_a,
      pi_b: parsed.pi_b,
      pi_c: parsed.pi_c,
      protocol: parsed.protocol || "groth16",
      curve: parsed.curve || "bn128"
    }
  } catch (error) {
    throw new Error("Invalid proof format")
  }
}

export async function submitBidToContract(
  contractAddress: string,
  proof: Groth16Proof,
  bidAmount: string
): Promise<string> {
  try {
    // Encode the proof data for the contract call
    const proofData = encodeProofForContract(proof)
    
    // Create the transaction data
    const data = createBidTransactionData(proofData, bidAmount)
    
    // Send the transaction
    const txHash = await sendTransaction(contractAddress, "0x0", data)
    
    // Wait for confirmation
    await waitForTransaction(txHash)
    
    return txHash
  } catch (error: any) {
    throw new Error(`Bid submission failed: ${error.message}`)
  }
}

function encodeProofForContract(proof: Groth16Proof): string {
  // Encode pi_a (2 elements)
  const pi_a_encoded = encodeUint256Array(proof.pi_a)
  
  // Encode pi_b (2x2 matrix)
  const pi_b_encoded = proof.pi_b.flat().map(encodeUint256).join("")
  
  // Encode pi_c (2 elements)
  const pi_c_encoded = encodeUint256Array(proof.pi_c)
  
  return pi_a_encoded + pi_b_encoded + pi_c_encoded
}

function createBidTransactionData(proofData: string, bidAmount: string): string {
  // This would be the actual function selector and encoded parameters
  // For now, return a placeholder
  return "0x" + proofData.slice(2) + encodeUint256(bidAmount).slice(2)
}
