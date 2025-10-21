// Ethereum transaction utilities

import { getMetaMaskProvider } from "./wallet"

export async function sendTransaction(to: string, value: string, data?: string): Promise<string> {
  const provider = await getMetaMaskProvider()
  if (!provider) {
    throw new Error("MetaMask not connected")
  }

  const accounts = await provider.request({ method: "eth_accounts" })
  if (!accounts || accounts.length === 0) {
    throw new Error("No connected account")
  }

  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: accounts[0],
        to,
        value,
        data,
        gas: "0x9a42", // 39490 gas limit (exactly the minimum needed)
        gasLimit: "0x9a42", // Alternative gas limit parameter
      },
    ],
  })

  return txHash
}

export async function waitForTransaction(txHash: string, confirmations: number = 1): Promise<void> {
  const provider = await getMetaMaskProvider()
  if (!provider) {
    throw new Error("MetaMask not connected")
  }

  return new Promise((resolve, reject) => {
    const checkConfirmation = async () => {
      try {
        const receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })

        if (receipt && receipt.status === "0x1") {
          resolve()
        } else if (receipt && receipt.status === "0x0") {
          reject(new Error("Transaction failed"))
        } else {
          // Transaction not yet confirmed, check again
          setTimeout(checkConfirmation, 2000)
        }
      } catch (error) {
        reject(error)
      }
    }

    checkConfirmation()
  })
}

// Utility functions for encoding data
export function encodeUint256(value: string | number): string {
  const hex = BigInt(value).toString(16)
  return "0x" + hex.padStart(64, "0")
}

export function encodeUint256Array(values: (string | number)[]): string {
  return values.map(encodeUint256).join("")
}
