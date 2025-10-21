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
  const [parsedProof, setParsedProof] = useState<ProofData | null>(null)
  const [proofError, setProofError] = useState("")
  const [auctionDetails, setAuctionDetails] = useState<any>(null)
  const [auctionLoading, setAuctionLoading] = useState(true)

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
      const details = await getAuctionDetails(auctionAddress)
      setAuctionDetails(details)
    } catch (error) {
      console.error("Failed to load auction details:", error)
      setError("Failed to load auction details")
    } finally {
      setAuctionLoading(false)
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
      // Convert burn amount to wei (BigInt)
      const burnAmountWei = BigInt(Math.floor(Number.parseFloat(burnAmount) * 1e18))
      
      // Calculate proper burn address based on auction context
      const burnAddress = BurnAddressCalculator.generateBurnAddress(
        walletAddress,
        contractAddress,
        auctionDetails?.ceremonyId || 0,
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
      const proof: Groth16Proof = JSON.parse(proofJson)
      const signals: string[] = JSON.parse(publicSignals)

      const parsed = parseGroth16Proof(proof, signals)
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

    try {
      const bidAmountWei = Math.floor(Number.parseFloat(bidAmount) * 1e18).toString()
      const txHash = await submitBidToContract(contractAddress, parsedProof, bidAmountWei)
      setBidSubmitTxHash(txHash)
      setCurrentStep("complete")
    } catch (error: any) {
      console.error("Bid submission failed:", error)
      setError(error.message || "Bid submission failed")
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6" />
                <h1 className="text-xl font-semibold">Burn Auction</h1>
              </div>
            </div>
            {walletConnected ? (
              <div className="flex items-center gap-3">
                {networkName && (
                  <Badge variant="outline" className="text-xs">
                    {networkName}
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-mono text-sm">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnectWallet}>
                Connect MetaMask
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Auction Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary">
                  {auctionDetails?.biddingDeadline && auctionDetails.biddingDeadline > Math.floor(Date.now() / 1000) 
                    ? "Active" 
                    : "Ended"}
                </Badge>
                {auctionDetails?.biddingDeadline && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimeRemaining(new Date(auctionDetails.biddingDeadline * 1000))}</span>
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl">Auction Contract</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Proof-of-burn sealed-bid auction. Connect your wallet to participate in bidding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ceremony ID</p>
                  <p className="text-xl font-mono">{auctionDetails?.ceremonyId || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contract Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Auction Contract</p>
                <p className="font-mono text-sm break-all">{contractAddress}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bidding Deadline</p>
                <p className="font-mono text-sm">
                  {auctionDetails?.biddingDeadline 
                    ? new Date(auctionDetails.biddingDeadline * 1000).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bid Submission Deadline</p>
                <p className="font-mono text-sm">
                  {auctionDetails?.bidSubmissionDeadline 
                    ? new Date(auctionDetails.bidSubmissionDeadline * 1000).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {auctionLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading auction details...</span>
              </CardContent>
            </Card>
          )}

          {/* Bidding Panel */}
          {!auctionLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Place Your Bid</CardTitle>
              <CardDescription>Submit a sealed bid using proof-of-burn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Connect Wallet */}
              {currentStep === "connect" && (
                <div className="space-y-4">
                  <Alert>
                    <Wallet className="h-4 w-4" />
                    <AlertDescription>Connect your MetaMask wallet to participate in this auction</AlertDescription>
                  </Alert>
                  <Button className="w-full" onClick={handleConnectWallet} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect MetaMask
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Step 2: Input Amounts */}
              {currentStep === "input" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="burnAmount">Burn Amount (ETH)</Label>
                    <Input
                      id="burnAmount"
                      type="number"
                      step="0.0001"
                      placeholder="0.0"
                      value={burnAmount}
                      onChange={(e) => setBurnAmount(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Amount to burn as proof of participation</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bidAmount">Bid Amount (ETH)</Label>
                    <Input
                      id="bidAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.0"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your sealed bid amount (minimum: 0.001 ETH)
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={executeBurnTransaction}
                    disabled={
                      !burnAmount ||
                      !bidAmount ||
                      !contractAddress ||
                      Number.parseFloat(bidAmount) < 0.001
                    }
                  >
                    <Flame className="mr-2 h-4 w-4" />
                    Execute Burn Transaction
                  </Button>
                </div>
              )}

              {/* Step 3: Burning */}
              {currentStep === "burn" && (
                <div className="space-y-4">
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      {burnTxHash
                        ? "Waiting for transaction confirmation on the network..."
                        : "Please confirm the transaction in MetaMask..."}
                    </AlertDescription>
                  </Alert>
                  {burnTxHash && (
                    <div className="space-y-2">
                      <Label>Transaction Hash</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">{burnTxHash}</p>
                        <a
                          href={getExplorerUrl(burnTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Step 4: Input Proof Data */}
              {currentStep === "proof" && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>Burn transaction confirmed! Now provide your ZK proof data.</AlertDescription>
                  </Alert>

                  {proofError && (
                    <Alert variant="destructive">
                      <AlertDescription>{proofError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Burn Transaction Hash</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">{burnTxHash}</p>
                      <a
                        href={getExplorerUrl(burnTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proofJson">Proof JSON (proof.json)</Label>
                    <Textarea
                      id="proofJson"
                      placeholder='{"pi_a": [...], "pi_b": [...], "pi_c": [...], "protocol": "groth16", "curve": "bn128"}'
                      value={proofJson}
                      onChange={(e) => setProofJson(e.target.value)}
                      className="font-mono text-xs h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the contents of your proof.json file generated by the ZK circuit
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publicSignals">Public Signals JSON (public.json)</Label>
                    <Textarea
                      id="publicSignals"
                      placeholder='["value1", "value2", "value3", "value4", "value5", "value6"]'
                      value={publicSignals}
                      onChange={(e) => setPublicSignals(e.target.value)}
                      className="font-mono text-xs h-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste the contents of your public.json file (array of 6 values)
                    </p>
                  </div>

                  <Button className="w-full" onClick={handleParseProof} disabled={!proofJson || !publicSignals}>
                    <Upload className="mr-2 h-4 w-4" />
                    Parse Proof and Continue
                  </Button>
                </div>
              )}

              {/* Step 5: Submit to Contract */}
              {currentStep === "submit" && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Proof parsed successfully! Ready to submit your bid to the auction contract.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Contract Address</Label>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded">{contractAddress}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Burn Transaction Hash</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs break-all bg-muted p-2 rounded flex-1">{burnTxHash}</p>
                      <a
                        href={getExplorerUrl(burnTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bid Details</Label>
                    <div className="bg-muted p-3 rounded space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Burn Amount:</span>
                        <span className="font-mono">{burnAmount} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bid Amount:</span>
                        <span className="font-mono">{bidAmount} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confirmations:</span>
                        <span className="font-mono">{txConfirmations}</span>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleSubmitBid} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting to Contract...
                      </>
                    ) : (
                      "Submit Bid to Contract"
                    )}
                  </Button>
                </div>
              )}

              {/* Step 6: Complete */}
              {currentStep === "complete" && (
                <div className="space-y-4">
                  <Alert className="border-green-600">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Your bid has been successfully submitted to the auction contract!
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Transaction Details</Label>
                    <div className="bg-muted p-3 rounded space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Contract</p>
                        <p className="font-mono text-xs break-all">{contractAddress}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Burn TX</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs break-all flex-1">{burnTxHash}</p>
                          <a
                            href={getExplorerUrl(burnTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Bid Submission TX</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs break-all flex-1">{bidSubmitTxHash}</p>
                          <a
                            href={getExplorerUrl(bidSubmitTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Bid Amount</p>
                        <p className="font-mono text-sm">{bidAmount} ETH</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-transparent" variant="outline" onClick={() => router.push("/")}>
                    Back to Auctions
                  </Button>
                </div>
              )}

              {/* Info Box */}
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-2">How it works</h4>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Connect your MetaMask wallet</li>
                  <li>Enter burn and bid amounts</li>
                  <li>Sign burn transaction (proof)</li>
                  <li>Wait for network confirmation</li>
                  <li>Provide ZK proof data (proof.json and public.json)</li>
                  <li>Submit bid to auction contract</li>
                  <li>Wait for auction to close</li>
                </ol>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </main>
    </div>
  )
}
