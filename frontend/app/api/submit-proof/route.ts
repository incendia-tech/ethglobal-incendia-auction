// This API route is a fallback for mock transactions when environment variables are not configured
// The primary submission flow is now via MetaMask in the frontend
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

// Auction contract ABI
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

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, burnTxHash, bidAmount, walletAddress } = await request.json()

    // Validate required fields
    if (!contractAddress || !burnTxHash || !bidAmount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Load proof data from data folder
    const dataDir = path.join(process.cwd(), '..', 'data')
    const proofPath = path.join(dataDir, 'proof.json')
    const publicPath = path.join(dataDir, 'public.json')

    let proofData, publicSignals

    try {
      proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'))
      publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'))
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to load proof data from data folder' },
        { status: 500 }
      )
    }

    // Validate proof format
    if (!proofData.pi_a || !proofData.pi_b || !proofData.pi_c) {
      return NextResponse.json(
        { error: 'Invalid proof format' },
        { status: 400 }
      )
    }

    if (!Array.isArray(publicSignals) || publicSignals.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid public signals format' },
        { status: 400 }
      )
    }

    // Convert proof format for Solidity (G2 element conversion)
    const convertedProof = convertG2Format(proofData)

    // Check if environment variables are configured
    const rpcUrl = process.env.SEPOLIA_RPC_URL
    const privateKey = process.env.PRIVATE_KEY
    const factoryAddress = process.env.FACTORY_ADDRESS
    const verifierAddress = process.env.VERIFIER_ADDRESS

    if (!rpcUrl || !privateKey || privateKey === '0x' + '0'.repeat(64)) {
      // Fallback to mock transaction for demo purposes
      console.log('Environment variables not configured, using mock transaction')
      const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`
      
      return NextResponse.json({
        success: true,
        transactionHash: mockTxHash,
        message: 'Mock transaction (configure environment variables for real contract interaction)',
        proofData: {
          pi_a: convertedProof.pi_a,
          pi_b: convertedProof.pi_b,
          pi_c: convertedProof.pi_c,
          publicSignals: publicSignals
        }
      })
    }

    // Set up viem clients
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl)
    })

    const account = privateKeyToAccount(privateKey as `0x${string}`)
    
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl)
    })

    // Prepare the function call data
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

    // Submit the transaction to the contract
    const txHash = await walletClient.sendTransaction({
      to: contractAddress as `0x${string}`,
      value: parseEther('0'), // No ETH value, just the bid amount in the function
      data: functionData,
      gas: BigInt(500000), // Set appropriate gas limit
    })

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1
    })

    // Log the submission for debugging
    console.log('Contract submission:', {
      contractAddress,
      burnTxHash,
      bidAmount,
      walletAddress,
      txHash,
      status: receipt.status
    })

    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      message: 'Bid submitted successfully to contract',
      proofData: {
        pi_a: convertedProof.pi_a,
        pi_b: convertedProof.pi_b,
        pi_c: convertedProof.pi_c,
        publicSignals: publicSignals
      }
    })

  } catch (error) {
    console.error('Proof submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Convert G2 element format from snarkjs to Solidity format
function convertG2Format(proof: any) {
  return {
    pi_a: proof.pi_a.slice(0, 2), // Take first 2 elements
    pi_b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]], // Swap x0,x1 and y0,y1
      [proof.pi_b[1][1], proof.pi_b[1][0]]
    ],
    pi_c: proof.pi_c.slice(0, 2) // Take first 2 elements
  }
}
