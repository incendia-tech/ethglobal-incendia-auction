"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Flame, Clock, Wallet, CheckCircle2, Loader2, ExternalLink, Upload } from "lucide-react"
import Link from "next/link"
import { getMetaMaskProvider, connectWallet as connectMetaMask, getConnectedAccount } from "@/lib/ethereum/wallet"
import { sendTransaction, waitForTransaction } from "@/lib/ethereum/transactions"
import { submitBidToContract, parseGroth16Proof, type Groth16Proof } from "@/lib/contracts/auction"
import { getAuctionDetails } from "@/lib/contracts/factory"
import { BurnAddressCalculator } from "@/lib/contracts/burn-address-calculator"
import { loadProofData, submitProofToBackend, type LoadedProofData } from "@/lib/proof-loader"
import type { ProofData } from "@/lib/contracts/auction-abi"


type BidStep = "connect" | "input" | "burn" | "proof" | "submit" | "complete"

export default function AuctionPage() {
  const params = useParams()
  const router = useRouter()
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [currentStep, setCurrentStep] = useState<BidStep>("connect")
  const [burnAmount, setBurnAmount] = useState("")
  const [bidAmount, setBidAmount] = useState("")
  const [burnTxHash, setBurnTxHash] = useState("")
  const [contractAddress, setContractAddress] = useState("")
  const [bidSubmitTxHash, setBidSubmitTxHash] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [networkName, setNetworkName] = useState("")
  const [txConfirmations, setTxConfirmations] = useState(0)
  const [error, setError] = useState("")
  const [proofJson, setProofJson] = useState("")
  const [publicSignals, setPublicSignals] = useState("")
  const [parsedProof, setParsedProof] = useState<Groth16Proof | null>(null)
  const [proofError, setProofError] = useState("")
  const [auctionDetails, setAuctionDetails] = useState<any>(null)
  const [auctionLoading, setAuctionLoading] = useState(true)
  const [loadedProofData, setLoadedProofData] = useState<LoadedProofData | null>(null)
  const [proofLoading, setProofLoading] = useState(false)
  const [proofSubmissionStatus, setProofSubmissionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [proofSubmissionTxHash, setProofSubmissionTxHash] = useState("")

  useEffect(() => {
    // Set contract address from URL parameter and fetch auction details
    const auctionId = params.id as string
    if (auctionId) {
      setContractAddress(auctionId)
      loadAuctionDetails(auctionId)
    }
  }, [params.id])

  const loadAuctionDetails = async (auctionAddress: string) => {
    try {
      setAuctionLoading(true)
      setError("")
      const details = await getAuctionDetails(auctionAddress)
      setAuctionDetails(details)
    } catch (error) {
      console.error("Failed to load auction details:", error)
      setError("Failed to load auction details")
      // Set default auction details to prevent crashes
      setAuctionDetails({
        biddingDeadline: 0,
        bidSubmissionDeadline: 0,
        resultDeadline: 0,
        ceremonyId: 0,
      })
    } finally {
      setAuctionLoading(false)
    }
  }

  const loadProofDataFromBackend = async () => {
    try {
      setProofLoading(true)
      setProofError("")
      const data = await loadProofData()
      setLoadedProofData(data)
      setProofJson(JSON.stringify(data.proof, null, 2))
      setPublicSignals(JSON.stringify(data.publicSignals, null, 2))
      setParsedProof(parseGroth16Proof(JSON.stringify(data.proof)))
      setCurrentStep("submit")
    } catch (error: any) {
      console.error("Failed to load proof data:", error)
      setProofError(error.message || "Failed to load proof data")
    } finally {
      setProofLoading(false)
    }
  }

  const checkWalletConnection = async () => {
    const account = await getConnectedAccount()
    if (account) {
      setWalletAddress(account)
      setWalletConnected(true)
      setCurrentStep("input")
      await getNetworkName()
    }
  }

  const getNetworkName = async () => {
    const provider = await getMetaMaskProvider()
    if (provider) {
      try {
        const chainId = await provider.request({ method: "eth_chainId" })
        const networks: { [key: string]: string } = {
          "0x1": "Ethereum Mainnet",
          "0xaa36a7": "Sepolia Testnet",
          "0x5": "Goerli Testnet",
          "0x13882": "Polygon Amoy Testnet",
        }
        setNetworkName(networks[chainId] || `Chain ID: ${chainId}`)
      } catch (error) {
        console.error("Error getting network:", error)
      }
    }
  }

  const handleConnectWallet = async () => {
    setIsProcessing(true)
    setError("")
    try {
      const { account } = await connectMetaMask()
      setWalletAddress(account)
      setWalletConnected(true)
      setCurrentStep("input")
      await getNetworkName()
    } catch (error: any) {
      console.error("Failed to connect wallet:", error)
      setError(error.message || "Failed to connect to MetaMask")
    } finally {
      setIsProcessing(false)
    }
  }

  const executeBurnTransaction = async () => {
    setIsProcessing(true)
    setCurrentStep("burn")
    setError("")

    try {
      // Check if auction details are loaded
      if (!auctionDetails) {
        throw new Error("Auction details not loaded yet")
      }

      // Convert burn amount to wei (BigInt)
      const burnAmountWei = BigInt(Math.floor(Number.parseFloat(burnAmount) * 1e18))
      
      // Calculate proper burn address based on auction context
      const burnAddress = BurnAddressCalculator.generateBurnAddress(
        walletAddress,
        contractAddress,
        auctionDetails.ceremonyId || 0,
        burnAmountWei.toString()
      )
      
      const burnAmountWeiHex = "0x" + burnAmountWei.toString(16)

      console.log(`[v0] Burn details:`)
      console.log(`  - Wallet: ${walletAddress}`)
      console.log(`  - Contract: ${contractAddress}`)
      console.log(`  - Ceremony ID: ${auctionDetails?.ceremonyId || 0}`)
      console.log(`  - Burn Amount: ${burnAmount} ETH (${burnAmountWei} wei)`)
      console.log(`  - Calculated Burn Address: ${burnAddress}`)
      console.log(`  - Address Length: ${burnAddress.length}`)
      console.log(`  - Is Valid Format: ${burnAddress.startsWith('0x') && burnAddress.length === 42}`)
      const txHash = await sendTransaction(burnAddress, burnAmountWeiHex)
      setBurnTxHash(txHash)

      await waitForTransaction(txHash, 1)
      setTxConfirmations(1)
      setCurrentStep("proof")
      setIsProcessing(false)
      
      // Automatically load proof data after burn transaction
      await loadProofDataFromBackend()
    } catch (error: any) {
      console.error("Burn transaction failed:", error)
      setError(error.message || "Burn transaction failed")
      setIsProcessing(false)
      setCurrentStep("input")
    }
  }

  const handleParseProof = () => {
    setProofError("")
    try {
      const parsed = parseGroth16Proof(proofJson)
      setParsedProof(parsed)
      setCurrentStep("submit")
    } catch (error: any) {
      setProofError(error.message || "Failed to parse proof data")
    }
  }

  const handleSubmitBid = async () => {
    if (!parsedProof) {
      setError("No proof data available")
      return
    }

    setIsProcessing(true)
    setError("")
    setProofSubmissionStatus('loading')

    try {
      const bidAmountWei = Math.floor(Number.parseFloat(bidAmount) * 1e18).toString()
      
      // Submit proof to backend
      const result = await submitProofToBackend(
        contractAddress,
        burnTxHash,
        bidAmountWei,
        walletAddress
      )

      if (result.success && result.transactionHash) {
        setProofSubmissionTxHash(result.transactionHash)
        setBidSubmitTxHash(result.transactionHash)
        setProofSubmissionStatus('success')
        setCurrentStep("complete")
        
        // Log the result message for debugging
        console.log('Proof submission result:', result.message)
      } else {
        throw new Error(result.error || "Proof submission failed")
      }
    } catch (error: any) {
      console.error("Bid submission failed:", error)
      setError(error.message || "Bid submission failed")
      setProofSubmissionStatus('error')
    } finally {
      setIsProcessing(false)
    }
  }

  function formatTimeRemaining(endTime: Date) {
    const now = new Date()
    const diff = endTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const getExplorerUrl = (txHash: string) => {
    if (networkName.includes("Sepolia")) {
      return `https://sepolia.etherscan.io/tx/${txHash}`
    }
    return `https://etherscan.io/tx/${txHash}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Auctions
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Flame className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Burn Auction</h1>
                  <p className="text-xs text-gray-500">Proof-of-Burn Sealed-Bid</p>
                </div>
              </div>
            </div>
            {walletConnected ? (
              <div className="flex items-center gap-3">
                {networkName && (
                  <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full font-medium">
                    {networkName}
                  </span>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="font-mono font-medium">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleConnectWallet}
                className="text-xs text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md font-medium transition-colors shadow-sm"
              >
                Connect MetaMask
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Auction Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${auctionDetails?.biddingDeadline && auctionDetails.biddingDeadline > Math.floor(Date.now() / 1000) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  auctionDetails?.biddingDeadline && auctionDetails.biddingDeadline > Math.floor(Date.now() / 1000)
                    ? "bg-green-100 text-green-800 border border-green-200" 
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}>
                  {auctionDetails?.biddingDeadline && auctionDetails.biddingDeadline > Math.floor(Date.now() / 1000) 
                    ? "Active" 
                    : "Ended"}
                </span>
              </div>
              {auctionDetails?.biddingDeadline && (
                <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                  <Clock className="h-3 w-3 text-orange-500" />
                  <span className="font-medium">{formatTimeRemaining(new Date(auctionDetails.biddingDeadline * 1000))}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-100">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Auction Contract</h2>
                <p className="text-gray-600 text-sm">
                  Proof-of-burn sealed-bid auction. Connect your wallet to participate in bidding.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Ceremony ID</p>
                <p className="text-lg font-bold font-mono text-gray-900">{auctionDetails?.ceremonyId || "N/A"}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Auction Type</p>
                <p className="text-sm font-semibold text-gray-900">Proof-of-Burn</p>
              </div>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Auction Details</h3>
            
            <div className="space-y-4">
              {/* Contract Address */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Contract Address</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(contractAddress)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Copy
                  </button>
                </div>
                <p className="font-mono text-sm text-gray-900 break-all bg-gray-50 p-2 rounded">
                  {contractAddress}
                </p>
              </div>

              {/* Deadlines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-gray-700">Bidding Ends</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {auctionDetails?.biddingDeadline 
                      ? new Date(auctionDetails.biddingDeadline * 1000).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "N/A"}
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">Submission Ends</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {auctionDetails?.bidSubmissionDeadline 
                      ? new Date(auctionDetails.bidSubmissionDeadline * 1000).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {auctionLoading && (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading auction details...</p>
            </div>
          )}

          {/* Bidding Panel */}
          {!auctionLoading && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-100">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Place Your Bid</h3>
                <p className="text-gray-600 text-sm">
                  Submit a sealed bid using proof-of-burn. Follow the steps below to participate.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Step 1: Connect Wallet */}
              {currentStep === "connect" && (
                <div className="text-center py-8">
                  <div className="bg-gradient-to-br from-orange-100 to-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Connect Your Wallet</h3>
                  <p className="text-gray-600 mb-6 text-sm max-w-md mx-auto">
                    Connect your MetaMask wallet to participate in this proof-of-burn auction
                  </p>
                  <button 
                    className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" 
                    onClick={handleConnectWallet} 
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4 inline" />
                        Connect MetaMask
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: Input Amounts */}
              {currentStep === "input" && (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Enter Your Bid Details</h3>
                    <p className="text-gray-600 text-sm">
                      Specify the amount to burn and your sealed bid amount
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 rounded-lg bg-red-100">
                          <Flame className="h-4 w-4 text-red-600" />
                        </div>
                        <label htmlFor="burnAmount" className="text-sm font-semibold text-gray-900">
                          Burn Amount (ETH)
                        </label>
                      </div>
                      <input
                        id="burnAmount"
                        type="number"
                        step="0.0001"
                        placeholder="0.0"
                        value={burnAmount}
                        onChange={(e) => setBurnAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Amount to burn as proof of participation
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 rounded-lg bg-green-100">
                          <Wallet className="h-4 w-4 text-green-600" />
                        </div>
                        <label htmlFor="bidAmount" className="text-sm font-semibold text-gray-900">
                          Bid Amount (ETH)
                        </label>
                      </div>
                      <input
                        id="bidAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.0"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Your sealed bid amount (minimum: 0.001 ETH)
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Bid Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600 text-sm">Burn Amount:</span>
                        <span className="font-mono text-sm font-bold text-red-600">{burnAmount || "0"} ETH</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600 text-sm">Bid Amount:</span>
                        <span className="font-mono text-sm font-bold text-green-600">{bidAmount || "0"} ETH</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-gray-300">
                        <span className="text-sm font-bold text-gray-900">Total:</span>
                        <span className="font-mono text-base font-bold text-blue-600">
                          {Number.parseFloat(burnAmount || "0") + Number.parseFloat(bidAmount || "0")} ETH
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={executeBurnTransaction}
                    disabled={
                      !burnAmount ||
                      !bidAmount ||
                      !contractAddress ||
                      !auctionDetails ||
                      Number.parseFloat(bidAmount) < 0.001
                    }
                  >
                    <Flame className="mr-2 h-4 w-4 inline" />
                    Execute Burn Transaction
                  </button>
                </div>
              )}

              {/* Step 3: Burning */}
              {currentStep === "burn" && (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-orange-100 to-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Flame className="h-12 w-12 text-orange-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Burning Tokens</h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    {burnTxHash
                      ? "Transaction submitted! Waiting for confirmation..."
                      : "Please confirm the transaction in MetaMask..."}
                  </p>
                  
                  {burnTxHash && (
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 max-w-2xl mx-auto">
                      <p className="text-sm font-semibold text-gray-600 mb-3">Transaction Hash</p>
                      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border">
                        <p className="font-mono text-sm text-gray-900 break-all flex-1">
                          {burnTxHash}
                        </p>
                        <a
                          href={getExplorerUrl(burnTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 bg-gray-50 px-6 py-4 rounded-xl max-w-md mx-auto">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    <span className="text-gray-700 font-medium">
                      {burnTxHash ? "Confirming transaction..." : "Waiting for confirmation..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Step 4: Loading Proof Data */}
              {currentStep === "proof" && (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Confirmed!</h3>
                    <p className="text-gray-600">
                      Loading mock proof data for demonstration...
                    </p>
                  </div>

                  {proofError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{proofError}</p>
                      <button 
                        onClick={loadProofDataFromBackend}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Retry Loading Proof Data
                      </button>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Burn Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-gray-900 break-all flex-1">
                        {burnTxHash}
                      </p>
                      <a
                        href={getExplorerUrl(burnTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  {proofLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
                      <span className="text-gray-700 font-medium">Loading proof data...</span>
                    </div>
                  )}

                  {loadedProofData && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Proof Data Loaded Successfully</span>
                      </div>
                      <p className="text-xs text-green-700">
                        Mock proof data loaded successfully. Ready to submit to auction contract.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Submit to Contract */}
              {currentStep === "submit" && (
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Submit</h3>
                    <p className="text-gray-600">
                      Mock proof data is ready! Review your bid details below.
                    </p>
                  </div>

                  {loadedProofData && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Proof Data Ready</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        Mock proof data ready to submit. In production, this would be calculated from your burn transaction.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Contract Address</p>
                        <p className="font-mono text-sm text-gray-900 break-all">
                          {contractAddress}
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Burn Transaction Hash</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm text-gray-900 break-all flex-1">
                            {burnTxHash}
                          </p>
                          <a
                            href={getExplorerUrl(burnTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 mb-3">Bid Summary</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Burn Amount:</span>
                            <span className="font-mono">{burnAmount} ETH</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bid Amount:</span>
                            <span className="font-mono">{bidAmount} ETH</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Confirmations:</span>
                            <span className="font-mono text-green-600">{txConfirmations}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between">
                              <span className="font-medium">Total:</span>
                              <span className="font-mono font-semibold">
                                {Number.parseFloat(burnAmount || "0") + Number.parseFloat(bidAmount || "0")} ETH
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="w-full bg-gray-900 text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors disabled:opacity-50" 
                    onClick={handleSubmitBid} 
                    disabled={isProcessing || !loadedProofData}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        {proofSubmissionStatus === 'loading' ? 'Submitting Bid to Contract...' : 'Submitting to Contract...'}
                      </>
                    ) : (
                      "Submit Bid to Contract"
                    )}
                  </button>

                  {proofSubmissionStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">Proof submission failed. Please try again.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Complete */}
              {currentStep === "complete" && (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Bid Submitted Successfully!</h3>
                    <p className="text-gray-600">
                      Your bid has been successfully submitted to the auction contract. 
                      The proof data was automatically loaded and processed by the backend system.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Contract Address</p>
                          <p className="font-mono text-sm text-gray-900 break-all">
                            {contractAddress}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Bid Amount</p>
                          <p className="font-mono text-lg font-bold text-gray-900">{bidAmount} ETH</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Burn Transaction</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-gray-900 break-all flex-1">
                              {burnTxHash}
                            </p>
                            <a
                              href={getExplorerUrl(burnTxHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Proof Submission Transaction</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-gray-900 break-all flex-1">
                              {proofSubmissionTxHash || bidSubmitTxHash}
                            </p>
                            <a
                              href={getExplorerUrl(proofSubmissionTxHash || bidSubmitTxHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      className="flex-1 bg-gray-900 text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors" 
                      onClick={() => router.push("/")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4 inline" />
                      Back to Auctions
                    </button>
                    <button 
                      className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-50 transition-colors"
                      onClick={() => window.location.reload()}
                    >
                      Submit Another Bid
                    </button>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="pt-8 border-t border-gray-200">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    How it works
                  </h4>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                    <li className="font-medium">Connect your MetaMask wallet</li>
                    <li className="font-medium">Enter burn and bid amounts</li>
                    <li className="font-medium">Sign burn transaction (proof)</li>
                    <li className="font-medium">Wait for network confirmation</li>
                    <li className="font-medium">Provide ZK proof data (proof.json and public.json)</li>
                    <li className="font-medium">Submit bid to auction contract</li>
                    <li className="font-medium">Wait for auction to close</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  )
}