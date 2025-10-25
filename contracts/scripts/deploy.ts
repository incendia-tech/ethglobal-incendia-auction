import { network } from "hardhat";
import { parseEther } from "viem";

async function main() {
  console.log("Starting deployment...");
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Balance: ${parseEther((await publicClient.getBalance({ address: deployer.account.address })).toString())} ETH`);
  
  console.log("Deploying Groth16Verifier...");
  const verifier = await viem.deployContract("Groth16Verifier");
  console.log(`Groth16Verifier: ${verifier.address}`);
  
  console.log("Deploying Factory...");
  const factory = await viem.deployContract("Factory");
  console.log(`Factory: ${factory.address}`);
  
  console.log("Deploying Auction...");
  
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
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const auctionAddress = await factory.read.contracts([salt]);
  
  console.log(`Auction: ${auctionAddress}`);
  console.log(`Tx Hash: ${txHash}`);
  
  const auction = await viem.getContractAt("Auction", auctionAddress);
  
  console.log(`Factory: ${factory.address}`);
  console.log(`Auction: ${auctionAddress}`);
  
  const deploymentInfo = {
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      Groth16Verifier: verifier.address,
      Factory: factory.address,
      Auction: auctionAddress
    },
    auctionConfig: {
      ceremonyId: ceremonyId.toString(),
      biddingDeadline: biddingDeadline.toString(),
      submissionDeadline: submissionDeadline.toString(),
      resultDeadline: resultDeadline.toString(),
      maxWinners: maxWinners.toString(),
      salt: salt
    },
    transactionHash: txHash
  };
  
  console.log("Deployment completed successfully!");
  
  return deploymentInfo;
}

main().catch((error) => {
  console.error("Deployment failed:");
  console.error(error);
  process.exitCode = 1;
});
