import { network } from "hardhat";
import { loadAndConvertProof } from "./proof-utils.js";
import fs from "fs";
import path from "path";

async function deployAuctionContracts() {
  const { viem } = await network.connect({
    network: "hardhatOp",
    chainType: "op",
  });

  console.log("Deploying Auction contracts to OP chain");

  const publicClient = await viem.getPublicClient();
  const [senderClient] = await viem.getWalletClients();

  console.log("Deploying from address:", senderClient.account.address);

  try {
    // Deploy Groth16Verifier
    console.log("Deploying Groth16Verifier...");
    const verifier = await viem.deployContract("Groth16Verifier");
    console.log("Groth16Verifier deployed at:", verifier.address);

    // Deploy Factory
    console.log("Deploying Factory...");
    const factory = await viem.deployContract("Factory");
    console.log("Factory deployed at:", factory.address);

    // Deploy Auction through Factory
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    const submissionDeadline = BigInt(biddingDeadline + 3600n); // 2 hours from now
    const resultDeadline = BigInt(submissionDeadline + 3600n); // 3 hours from now
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    console.log("Deploying Auction through Factory...");
    const auctionAddress = await factory.write.deployAuctionContract([
      salt,
      0, // CeremonyType.Auction
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    console.log("Auction deployed at:", auctionAddress);

    // Get the auction contract instance
    const auction = await viem.getContractAt("Auction", auctionAddress);

    // Verify deployment
    console.log("Verifying deployment...");
    console.log("Auction verifier:", await auction.read.verifier());
    console.log("Auction ceremony ID:", await auction.read.ceremonyId());
    console.log("Auction bidding deadline:", await auction.read.biddingDeadline());

    // Test submitting a bid if proof data is available
    const proofPath = path.join(__dirname, "../../data/proof.json");
    const publicPath = path.join(__dirname, "../../data/public.json");

    try {
      console.log("Testing bid submission with proof data...");
      
      const { proofA, proofB, proofC, publicSignals } = loadAndConvertProof(proofPath, publicPath);

      const bidAmount = 1000n;
      
      console.log("Submitting bid with amount:", bidAmount);
      const tx = await auction.write.submitBid([
        proofA,
        proofB,
        proofC,
        publicSignals,
        bidAmount
      ], {
        value: bidAmount
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log("Bid submitted successfully!");

      // Check events
      const events = await publicClient.getContractEvents({
        address: auction.address,
        abi: auction.abi,
        eventName: "BidSubmitted",
        fromBlock: "latest",
        strict: true,
      });

      console.log("BidSubmitted events:", events.length);
    } catch (error) {
      console.log("Proof data not found or invalid, skipping bid submission test:", (error as Error).message);
    }

    // Save deployment info
    const deploymentInfo = {
      verifier: verifier.address,
      factory: factory.address,
      auction: auctionAddress,
      ceremonyId: ceremonyId.toString(),
      biddingDeadline: biddingDeadline.toString(),
      submissionDeadline: submissionDeadline.toString(),
      resultDeadline: resultDeadline.toString(),
      maxWinners: maxWinners.toString(),
      salt: salt,
      deployedAt: new Date().toISOString(),
      network: "hardhatOp"
    };

    const deploymentPath = path.join(__dirname, "../deployments.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", deploymentPath);

  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

// Run deployment
deployAuctionContracts()
  .then(() => {
    console.log("Deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
