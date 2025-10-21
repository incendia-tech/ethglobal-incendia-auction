// ABI for the Auction contract
export const AUCTION_ABI = [
  {
    inputs: [
      {
        internalType: "uint256[2]",
        name: "proofA",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[2][2]",
        name: "proofB",
        type: "uint256[2][2]",
      },
      {
        internalType: "uint256[2]",
        name: "proofC",
        type: "uint256[2]",
      },
      {
        internalType: "uint256[2]",
        name: "publicSignals",
        type: "uint256[2]",
      },
    ],
    name: "submitBid",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "biddingDeadline",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "bidSubmissionDeadline",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "resultDeadline",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ceremonyId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

export interface ProofData {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  publicSignals: string[]
}
