// MetaMask wallet connection utilities

export interface EthereumProvider {
  isMetaMask?: boolean
  isTrust?: boolean
  providers?: EthereumProvider[]
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider | EthereumProvider[]
  }
}

// EIP-6963 wallet detection
async function detectMetaMaskViaEIP6963(): Promise<EthereumProvider | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null)
      return
    }

    let found = false
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.info?.name === "MetaMask" && !found) {
        found = true
        window.removeEventListener("eip6963:announceProvider", handler as EventListener)
        resolve(customEvent.detail.provider)
      }
    }

    window.addEventListener("eip6963:announceProvider", handler as EventListener)

    // Request existing providers
    window.dispatchEvent(new Event("eip6963:requestProvider"))

    // Timeout after 1 second
    setTimeout(() => {
      if (!found) {
        window.removeEventListener("eip6963:announceProvider", handler as EventListener)
        resolve(null)
      }
    }, 1000)
  })
}

export async function getMetaMaskProvider(): Promise<EthereumProvider | null> {
  if (typeof window === "undefined" || !window.ethereum) {
    return null
  }

  // Try EIP-6963 first (best practice for multiple wallets)
  const provider = await detectMetaMaskViaEIP6963()
  if (provider) return provider

  // Fallback: Check providers array
  if (Array.isArray(window.ethereum)) {
    const metamask = window.ethereum.find((p: EthereumProvider) => p.isMetaMask && !p.isTrust)
    if (metamask) return metamask
  } else if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    const metamask = window.ethereum.providers.find((p: EthereumProvider) => p.isMetaMask && !p.isTrust)
    if (metamask) return metamask
  }

  // Last resort: Check if window.ethereum is MetaMask
  if (!Array.isArray(window.ethereum) && window.ethereum.isMetaMask && !window.ethereum.isTrust) {
    return window.ethereum
  }

  return null
}

export async function connectWallet(): Promise<{ provider: EthereumProvider; account: string }> {
  const provider = await getMetaMaskProvider()
  if (!provider) {
    throw new Error("MetaMask not found. Please install MetaMask.")
  }

  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" })
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found")
    }

    return { provider, account: accounts[0] }
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected the connection request")
    }
    throw new Error(`Failed to connect: ${error.message}`)
  }
}

export async function getConnectedAccount(): Promise<string | null> {
  const provider = await getMetaMaskProvider()
  if (!provider) return null

  try {
    const accounts = await provider.request({ method: "eth_accounts" })
    return accounts && accounts.length > 0 ? accounts[0] : null
  } catch (error) {
    console.error("Error getting connected account:", error)
    return null
  }
}
