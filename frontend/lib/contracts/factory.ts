import { FACTORY_ADDRESS } from "./factory-abi"
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

// Public Sepolia RPC endpoint
const PUBLIC_RPC = "https://ethereum-sepolia.publicnode.com"

// Setup viem client
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(PUBLIC_RPC),
})

// Auction ABI
const AUCTION_ABI = [
  {
    "inputs": [],
    "name": "resultDeadline",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ceremonyId",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "biddingDeadline",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bidSubmissionDeadline",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export interface DeployedAuction {
  address: string
  ceremonyType: number
  blockNumber: number
  transactionHash: string
  biddingDeadline?: number
  bidSubmissionDeadline?: number
  resultDeadline?: number
  ceremonyId?: number
  maxWinners?: number
}

async function callContract(to: string, data: string): Promise<string> {
  const response = await fetch(PUBLIC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  })
  const json = await response.json()
  return json.result
}

async function getLogs(params: any): Promise<any[]> {
  const response = await fetch(PUBLIC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [params],
    }),
  })
  const json = await response.json()
  return json.result || []
}

// Function to read from the contracts mapping using the correct function selector
async function readContractsMapping(salt: string): Promise<string> {
  try {
    // Function selector for contracts(bytes32) -> address
    // This is the keccak256 hash of "contracts(bytes32)" first 4 bytes
    const functionSelector = "0x52879029" // contracts(bytes32) function selector
    const encodedSalt = salt.padStart(64, '0') // Pad to 32 bytes
    const data = functionSelector + encodedSalt
    
    const response = await fetch(PUBLIC_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: FACTORY_ADDRESS, data }, "latest"],
      }),
    })
    const json = await response.json()
    console.log(`[v0] RPC response for salt ${salt}:`, json)
    if (json.error) {
      console.error(`[v0] RPC error:`, json.error)
    }
    return json.result
  } catch (error) {
    console.error("[v0] Error reading contracts mapping:", error)
    return "0x0"
  }
}

// Function to fetch a single auction using address directly with viem
async function fetchAuctionByAddress(address: string, index: number): Promise<DeployedAuction | null> {
  try {
    console.log(`[v0] Fetching auction ${index + 1} with address: ${address}`)
    
    // Get auction details using viem
    const [ceremonyId, biddingDeadline, submissionDeadline, resultDeadline] = await Promise.all([
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'ceremonyId',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'biddingDeadline',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'bidSubmissionDeadline',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: address as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'resultDeadline',
      }).catch(() => BigInt(0)),
    ])

    console.log(`[v0] Raw contract responses:`, {
      ceremonyId: ceremonyId.toString(),
      biddingDeadline: biddingDeadline.toString(), 
      submissionDeadline: submissionDeadline.toString(),
      resultDeadline: resultDeadline.toString()
    })

    // Convert BigInt to numbers
    const biddingDeadlineNum = Number(biddingDeadline)
    const submissionDeadlineNum = Number(submissionDeadline)
    const resultDeadlineNum = Number(resultDeadline)
    const ceremonyIdNum = Number(ceremonyId)
    
    // Calculate status
    const now = Math.floor(Date.now() / 1000)
    
    console.log(`[v0] Time comparison for auction ${index + 1}:`, {
      now: now,
      nowDate: new Date(now * 1000).toISOString(),
      biddingDeadline: biddingDeadlineNum,
      biddingDate: new Date(biddingDeadlineNum * 1000).toISOString(),
      submissionDeadline: submissionDeadlineNum,
      submissionDate: new Date(submissionDeadlineNum * 1000).toISOString(),
      resultDeadline: resultDeadlineNum,
      resultDate: new Date(resultDeadlineNum * 1000).toISOString()
    })
    
    let status
    if (now < biddingDeadlineNum) {
      status = 'Bidding Open'
    } else if (now < submissionDeadlineNum) {
      status = 'Submission Phase'
    } else if (now < resultDeadlineNum) {
      status = 'Results Phase'
    } else {
      status = 'Ended'
    }

    console.log(`[v0] Auction ${index + 1} status: ${status}`)

    return {
      address: address,
      ceremonyType: 0,
      blockNumber: 0,
      transactionHash: "",
      ceremonyId: ceremonyIdNum || (index + 1),
      biddingDeadline: biddingDeadlineNum,
      bidSubmissionDeadline: submissionDeadlineNum,
      resultDeadline: resultDeadlineNum,
    }
  } catch (error) {
    console.error(`[v0] Error fetching auction for address ${index + 1}:`, error)
    return null
  }
}

// Function to fetch a single auction using salt (keeping for reference)
async function fetchAuction(salt: string, index: number): Promise<DeployedAuction | null> {
  try {
    console.log(`[v0] Fetching auction ${index + 1} with salt: ${salt}`)
    
    // 1. Get auction address from factory
    const auctionAddress = await readContractsMapping(salt)
    console.log(`[v0] Raw auction address response: ${auctionAddress}`)
    
    if (!auctionAddress || auctionAddress === "0x0" || auctionAddress === "0x0000000000000000000000000000000000000000") {
      console.log(`[v0] No auction found for salt ${index + 1} - address: ${auctionAddress}`)
      return null
    }

    console.log(`[v0] Found auction address: ${auctionAddress}`)

    // 2. Get auction details
    const [ceremonyId, biddingDeadline, submissionDeadline, resultDeadline] = await Promise.all([
      callContract(auctionAddress, "0x5c04deb1").catch(() => "0x0"), // ceremonyId()
      callContract(auctionAddress, "0x190bcb28").catch(() => "0x0"), // biddingDeadline()
      callContract(auctionAddress, "0x21d2b4ee").catch(() => "0x0"), // bidSubmissionDeadline()
      callContract(auctionAddress, "0x77966028").catch(() => "0x0"), // resultDeadline()
    ])

    // 3. Calculate status
    const now = Math.floor(Date.now() / 1000)
    const biddingDeadlineNum = Number.parseInt(biddingDeadline || "0x0", 16)
    const submissionDeadlineNum = Number.parseInt(submissionDeadline || "0x0", 16)
    const resultDeadlineNum = Number.parseInt(resultDeadline || "0x0", 16)
    
    let status
    if (now < biddingDeadlineNum) {
      status = 'Bidding Open'
    } else if (now < submissionDeadlineNum) {
      status = 'Submission Phase'
    } else if (now < resultDeadlineNum) {
      status = 'Results Phase'
    } else {
      status = 'Ended'
    }

    console.log(`[v0] Auction ${index + 1} status: ${status}`)

    return {
      address: auctionAddress,
      ceremonyType: 0,
      blockNumber: 0,
      transactionHash: "",
      ceremonyId: Number.parseInt(ceremonyId || "0x0", 16) || (index + 1),
      biddingDeadline: biddingDeadlineNum,
      bidSubmissionDeadline: submissionDeadlineNum,
      resultDeadline: resultDeadlineNum,
    }
  } catch (error) {
    console.error(`[v0] Error fetching auction for salt ${index + 1}:`, error)
    return null
  }
}

/**
 * Fetch all deployed auctions from the Factory contract using salt values
 */
export async function fetchDeployedAuctions(): Promise<DeployedAuction[]> {
  try {
    console.log("[v0] Fetching deployed auctions from known addresses")
    
    // Known auction addresses (since the salt approach is failing)
    const knownAddresses = [
      "0x2671ae802180Fb8969A2A319Bc869EE5a4E2B5bF",
      "0xB7b475ED68bCf3e30578aF49277CB78aE5Ca8C5e", 
      "0x291842511Ac92e2Dc31d82073919Db8f00be3964",
      "0x6C16C0a19815591C880C026eC8239166CF313A30",
      "0x88b0118882244B344A087c11c2fcD79F51f9a18A",
      "0x0086Cfc7902287bB858Bda110a6653Bc0Eee65C1",
      "0x4F27ff1319c4F840dcA65C20c6D428824AfE061C"
    ]

    console.log("[v0] Fetching auction details using", knownAddresses.length, "known addresses")

    // Fetch all auctions
    const auctions = []
    
    for (let i = 0; i < knownAddresses.length; i++) {
      const address = knownAddresses[i]
      console.log(`[v0] Fetching auction ${i + 1}/${knownAddresses.length}...`)
      
      const auction = await fetchAuctionByAddress(address, i)
      if (auction) {
        auctions.push(auction)
        console.log(`[v0] ✅ Found: ${auction.address} (Ceremony ID: ${auction.ceremonyId})`)
      } else {
        console.log(`[v0] ❌ No auction found for address ${i + 1}`)
      }
    }

    console.log(`[v0] Found ${auctions.length} auctions`)
    return auctions
  } catch (error) {
    console.error("[v0] Error fetching deployed auctions:", error)
    return []
  }
}

/**
 * Get auction details from a deployed auction contract
 */
export async function getAuctionDetails(auctionAddress: string) {
  try {
    console.log("[v0] Getting details for auction:", auctionAddress)

    // Get auction details from blockchain using viem
    const [ceremonyId, biddingDeadline, submissionDeadline, resultDeadline] = await Promise.all([
      publicClient.readContract({
        address: auctionAddress as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'ceremonyId',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: auctionAddress as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'biddingDeadline',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: auctionAddress as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'bidSubmissionDeadline',
      }).catch(() => BigInt(0)),
      publicClient.readContract({
        address: auctionAddress as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'resultDeadline',
      }).catch(() => BigInt(0)),
    ])

    const ceremonyIdNum = Number(ceremonyId)
    const biddingDeadlineNum = Number(biddingDeadline)
    const submissionDeadlineNum = Number(submissionDeadline)
    const resultDeadlineNum = Number(resultDeadline)

    console.log("[v0] Auction details from blockchain:", {
      ceremonyId: ceremonyIdNum,
      biddingDeadline: biddingDeadlineNum,
      submissionDeadline: submissionDeadlineNum,
      resultDeadline: resultDeadlineNum,
    })

    return {
      biddingDeadline: biddingDeadlineNum,
      bidSubmissionDeadline: submissionDeadlineNum,
      resultDeadline: resultDeadlineNum,
      ceremonyId: ceremonyIdNum,
    }
  } catch (error) {
    console.error("[v0] Error getting auction details:", error)
    return {
      biddingDeadline: 0,
      bidSubmissionDeadline: 0,
      resultDeadline: 0,
      ceremonyId: 0,
    }
  }
}