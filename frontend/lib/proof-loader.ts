// Utility functions for loading and managing proof data

export interface ProofData {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}

export interface PublicSignals {
  [key: number]: string
}

export interface LoadedProofData {
  proof: ProofData
  publicSignals: string[]
}

// Load proof data from the data folder
export async function loadProofData(): Promise<LoadedProofData> {
  try {
    // In a real implementation, you might want to fetch from a backend endpoint
    // For now, we'll return the data directly since it's static
    const proofData: ProofData = {
      "pi_a": [
        "15735234741036841031785444279490969598560196843641202116530397007303416185676",
        "18150691990194341536057655269208744335697765123953767493612463362207859936053",
        "1"
      ],
      "pi_b": [
        [
          "10496723520671847229028022026343553242445142007883043464366930756731799554837",
          "13266005699425396071609737237474717092791047403386583977505335368316493653834"
        ],
        [
          "7737754626396588929108482656761721100100553711177325925043050569539144715458",
          "3995591568799800093966694878544427925521265551962048650602930242215399447150"
        ],
        [
          "1",
          "0"
        ]
      ],
      "pi_c": [
        "1002095530778988323297856129135406269799571698438808857309929901200889493124",
        "13059467832921364130052777072151339381043283688520739469674524537959352978453",
        "1"
      ],
      "protocol": "groth16",
      "curve": "bn128"
    }

    const publicSignals: string[] = [
      "16580658621263755616398168707812265815499667385403522275332483037094862039449",
      "9891682204978241203411276824529809676739256861554734859603992321540123681204",
      "7496824597605666358",
      "1",
      "0",
      "2460315761077221111371079137112756400365219279656913426802070198701997759860"
    ]

    return {
      proof: proofData,
      publicSignals: publicSignals
    }
  } catch (error) {
    throw new Error('Failed to load proof data')
  }
}

// Convert G2 element format from snarkjs to Solidity format
export function convertG2Format(proof: ProofData): ProofData {
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

// Submit proof to backend
export async function submitProofToBackend(
  contractAddress: string,
  burnTxHash: string,
  bidAmount: string,
  walletAddress: string
): Promise<{ success: boolean; transactionHash?: string; error?: string; message?: string }> {
  try {
    const response = await fetch('/api/submit-proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractAddress,
        burnTxHash,
        bidAmount,
        walletAddress
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit proof')
    }

    return {
      success: true,
      transactionHash: result.transactionHash
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}
