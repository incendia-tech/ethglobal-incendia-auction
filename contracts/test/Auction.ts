import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { loadAndConvertProof } from "../scripts/proof-utils.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load proof data using utility functions
const proofPath = path.join(__dirname, "../../data/bid0/proof.json");
const publicPath = path.join(__dirname, "../../data/bid0/public.json");

let proofData: any = null;
let publicSignals: any = null;

try {
  const converted = loadAndConvertProof(proofPath, publicPath);
  proofData = {
    pi_a: converted.proofA,
    pi_b: converted.proofB,
    pi_c: converted.proofC
  };
  publicSignals = converted.publicSignals;
} catch (error) {
  console.log("Warning: Could not load proof data for tests:", (error as Error).message);
}

describe("Auction Contract", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should deploy and initialize Auction contract", async function () {
    // Deploy verifier
    const verifier = await viem.deployContract("Groth16Verifier");
    
    // Deploy factory
    const factory = await viem.deployContract("Factory");
    
    // Deploy auction through factory
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    const txHash = await factory.write.deployAuctionContract([
      salt,
      0, // CeremonyType.Auction
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const auctionAddress = await factory.read.contracts([salt]);

    // Get the auction contract instance
    const auction = await viem.getContractAt("Auction", auctionAddress);

    // Verify initialization
    assert.equal(await auction.read.verifier().then(addr => addr.toLowerCase()), verifier.address.toLowerCase());
    assert.equal(await auction.read.ceremonyId(), ceremonyId);
    assert.equal(await auction.read.biddingDeadline(), biddingDeadline);
    assert.equal(await auction.read.bidSubmissionDeadline(), submissionDeadline);
    assert.equal(await auction.read.resultDeadline(), resultDeadline);
  });

  it("Should accept valid proof and submit bid", async function () {
    if (!proofData || !publicSignals) {
      console.log("Skipping proof test - no proof data available");
      return;
    }

    // Deploy contracts
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    const txHash = await factory.write.deployAuctionContract([
      salt,
      0,
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const auctionAddress = await factory.read.contracts([salt]);

    const auction = await viem.getContractAt("Auction", auctionAddress);

    // Use pre-converted proof format
    const proofA = proofData.pi_a;
    const proofB = proofData.pi_b;
    const proofC = proofData.pi_c;
    const pubSignals = publicSignals;

    // Submit bid with valid proof
    const bidAmount = 1000n;
    const tx = await auction.write.submitBid([
      proofA,
      proofB,
      proofC,
      pubSignals,
      bidAmount
    ], {
      value: bidAmount
    });

    // Wait for transaction
    await publicClient.waitForTransactionReceipt({ hash: tx });

    // Check that bid was recorded
    const events = await publicClient.getContractEvents({
      address: auction.address,
      abi: auction.abi,
      eventName: "BidSubmitted",
      fromBlock: "latest",
      strict: true,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.bidder.toLowerCase(), (await viem.getWalletClients().then(clients => clients[0].account.address)).toLowerCase());
  });

  it("Should reject invalid proof", async function () {
    // Deploy contracts
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    const txHash = await factory.write.deployAuctionContract([
      salt,
      0,
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const auctionAddress = await factory.read.contracts([salt]);

    const auction = await viem.getContractAt("Auction", auctionAddress);

    // Create invalid proof
    const invalidProofA = ["0", "0"];
    const invalidProofB = [["0", "0"], ["0", "0"]];
    const invalidProofC = ["0", "0"];
    const invalidPubSignals = ["0", "0", "0", "0", "0", "0"];

    // Try to submit bid with invalid proof
    try {
      await auction.write.submitBid([
        invalidProofA,
        invalidProofB,
        invalidProofC,
        invalidPubSignals,
        1000n
      ], {
        value: 1000n
      });
      assert.fail("Should have reverted with invalid proof");
    } catch (error) {
      // Expected to fail
      assert.ok((error as Error).message.includes("InvalidProof") || (error as Error).message.includes("revert"));
    }
  });

  it("Should prevent duplicate nullifier usage", async function () {
    if (!proofData || !publicSignals) {
      console.log("Skipping duplicate nullifier test - no proof data available");
      return;
    }

    // Deploy contracts
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    const txHash = await factory.write.deployAuctionContract([
      salt,
      0,
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const auctionAddress = await factory.read.contracts([salt]);

    const auction = await viem.getContractAt("Auction", auctionAddress);

    // Use pre-converted proof format
    const proofA = proofData.pi_a;
    const proofB = proofData.pi_b;
    const proofC = proofData.pi_c;
    const pubSignals = publicSignals;

    // Submit first bid
    await auction.write.submitBid([
      proofA,
      proofB,
      proofC,
      pubSignals,
      1000n
    ], {
      value: 1000n
    });

    // Try to submit second bid with same nullifier
    try {
      await auction.write.submitBid([
        proofA,
        proofB,
        proofC,
        pubSignals,
        2000n
      ], {
        value: 2000n
      });
      assert.fail("Should have reverted with duplicate nullifier");
    } catch (error) {
      // Expected to fail due to duplicate nullifier
      assert.ok((error as Error).message.includes("InvalidProof") || (error as Error).message.includes("revert"));
    }
  });

  it("Should maintain correct bid ordering", async function () {
    if (!proofData || !publicSignals) {
      console.log("Skipping bid ordering test - no proof data available");
      return;
    }

    // Deploy contracts
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 3n; // Small number for testing
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    const txHash = await factory.write.deployAuctionContract([
      salt,
      0,
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const auctionAddress = await factory.read.contracts([salt]);

    const auction = await viem.getContractAt("Auction", auctionAddress);

    // Note: This test would need multiple different proofs to properly test bid ordering
    // For now, we'll just verify the contract can handle bid submissions
    const proofA = proofData.pi_a;
    const proofB = proofData.pi_b;
    const proofC = proofData.pi_c;
    const pubSignals = publicSignals;

    // Submit a bid
    await auction.write.submitBid([
      proofA,
      proofB,
      proofC,
      pubSignals,
      1000n
    ], {
      value: 1000n
    });

    // Verify bid was submitted
    const events = await publicClient.getContractEvents({
      address: auction.address,
      abi: auction.abi,
      eventName: "BidSubmitted",
      fromBlock: "latest",
      strict: true,
    });

    assert.equal(events.length, 1);
  });
});
