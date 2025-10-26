// Auction contract interaction utilities

import type { ProofData } from "./auction-abi"
import { sendTransaction, waitForTransaction, encodeUint256, encodeUint256Array } from "../ethereum/transactions"
import { encodeFunctionData } from "viem"

// Auction contract ABI for submitBid function
const AUCTION_ABI = [
  {
    inputs: [
      { internalType: "uint256[2]", name: "proofA", type: "uint256[2]" },
      { internalType: "uint256[2][2]", name: "proofB", type: "uint256[2][2]" },
      { internalType: "uint256[2]", name: "proofC", type: "uint256[2]" },
      { internalType: "uint256[6]", name: "pubSignals", type: "uint256[6]" },
      { internalType: "uint256", name: "_bid", type: "uint256" }
    ],
    name: "submitBid",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
] as const

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
  publicSignals: string[],
  bidAmount: string
): Promise<string> {
  try {
    // Create the transaction data using proper viem encoding
    const data = createBidTransactionData(proof, publicSignals, bidAmount)
    
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

function createBidTransactionData(proof: Groth16Proof, publicSignals: string[], bidAmount: string): string {
  try {
    console.log("Creating bid transaction data with:", {
      proof: {
        pi_a: proof.pi_a,
        pi_a_length: proof.pi_a?.length,
        pi_b: proof.pi_b,
        pi_b_length: proof.pi_b?.length,
        pi_c: proof.pi_c,
        pi_c_length: proof.pi_c?.length
      },
      publicSignals,
      publicSignals_length: publicSignals?.length,
      bidAmount
    })

    // Validate proof structure
    if (!proof.pi_a || !Array.isArray(proof.pi_a) || proof.pi_a.length < 2) {
      throw new Error(`Invalid proof.pi_a structure: expected array with at least 2 elements, got ${proof.pi_a?.length || 'undefined'}`)
    }
    if (!proof.pi_b || !Array.isArray(proof.pi_b) || proof.pi_b.length < 2) {
      throw new Error(`Invalid proof.pi_b structure: expected array with at least 2 elements, got ${proof.pi_b?.length || 'undefined'}`)
    }
    if (!proof.pi_c || !Array.isArray(proof.pi_c) || proof.pi_c.length < 2) {
      throw new Error(`Invalid proof.pi_c structure: expected array with at least 2 elements, got ${proof.pi_c?.length || 'undefined'}`)
    }
    if (!publicSignals || !Array.isArray(publicSignals) || publicSignals.length !== 6) {
      throw new Error("Invalid publicSignals structure")
    }

    // Convert proof format for Solidity (G2 element conversion)
    const convertedProof = convertG2Format(proof)
    
    console.log("Converted proof:", convertedProof)
    
    // Encode the function call using viem
    const functionData = encodeFunctionData({
      abi: AUCTION_ABI,
      functionName: 'submitBid',
      args: [
        convertedProof.pi_a.map(BigInt) as [bigint, bigint], // proofA
        convertedProof.pi_b.map(row => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]], // proofB
        convertedProof.pi_c.map(BigInt) as [bigint, bigint], // proofC
        publicSignals.map(BigInt) as [bigint, bigint, bigint, bigint, bigint, bigint], // pubSignals
        BigInt(bidAmount) // _bid
      ]
    })
    
    console.log("Encoded function data:", functionData)
    return functionData
  } catch (error: any) {
    console.error("Error encoding function data:", error)
    console.error("Error details:", {
      proof: proof,
      publicSignals: publicSignals,
      bidAmount: bidAmount
    })
    throw new Error(`Failed to encode transaction data: ${error.message || error}`)
  }
}

function convertG2Format(proof: Groth16Proof): Groth16Proof {
  return {
    pi_a: proof.pi_a.slice(0, 2), // Take first 2 elements
    pi_b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]], // Swap x0,x1 and y0,y1
      [proof.pi_b[1][1], proof.pi_b[1][0]]
    ],
    pi_c: proof.pi_c.slice(0, 2), // Take first 2 elements
    protocol: proof.protocol,
    curve: proof.curve
  }
}
