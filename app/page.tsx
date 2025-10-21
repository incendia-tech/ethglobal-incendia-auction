"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Flame, Loader2 } from "lucide-react"
import { fetchDeployedAuctions, getAuctionDetails, type DeployedAuction } from "@/lib/contracts/factory"

const DEFAULT_AUCTION = "0x7a22c06364090b01c0d2dba70c7ea8fd9a333e61"

function formatTimeRemaining(timestamp: number) {
  const now = Math.floor(Date.now() / 1000)
  const diff = timestamp - now

  if (diff <= 0) return "Ended"

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (hours > 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

export default function HomePage() {
  const [auctions, setAuctions] = useState<DeployedAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAuctions()
  }, [])

  async function loadAuctions() {
    try {
      setLoading(true)
      setError(null)

      let deployedAuctions = await fetchDeployedAuctions()

      if (deployedAuctions.length === 0) {
        console.log("[v0] No auctions from Factory, loading default auction:", DEFAULT_AUCTION)
        const details = await getAuctionDetails(DEFAULT_AUCTION)
        console.log("[v0] Default auction details:", details)
        deployedAuctions = [
          {
            address: DEFAULT_AUCTION,
            ceremonyType: 0,
            blockNumber: 0,
            transactionHash: "",
            ...details,
          },
        ]
        console.log("[v0] Created default auction object:", deployedAuctions[0])
      }

      console.log("[v0] Loaded auctions:", deployedAuctions)
      setAuctions(deployedAuctions)
    } catch (err: any) {
      console.error("[v0] Error loading auctions:", err)
      setError(err.message || "Failed to load auctions")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Burn Auction</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Active Auctions</h2>
          <p className="text-muted-foreground">Browse and participate in proof-of-burn sealed-bid auctions</p>
        </div>


        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={loadAuctions} variant="outline" size="sm" className="mt-2 bg-transparent">
              Retry
            </Button>
          </div>
        )}

        {/* Auctions Grid */}
        {!loading && !error && auctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No auctions found</p>
          </div>
        )}

        {!loading && auctions.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {auctions.map((auction, index) => {
              const isActive = auction.biddingDeadline && auction.biddingDeadline > Math.floor(Date.now() / 1000)
              const status = isActive ? "active" : "ended"

              return (
                <Card key={auction.address} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
                        {status}
                      </Badge>
                      {auction.biddingDeadline && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatTimeRemaining(auction.biddingDeadline)}</span>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-xl">
                      {auction.ceremonyId ? `Auction #${auction.ceremonyId}` : `Auction #${index + 1}`}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {auction.address.slice(0, 10)}...{auction.address.slice(-8)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Ceremony ID</span>
                        <span className="font-mono text-sm">{auction.ceremonyId || "N/A"}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/auction/${auction.address}`} className="w-full">
                      <Button className="w-full" disabled={!isActive}>
                        {isActive ? "View & Bid" : "View Results"}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
