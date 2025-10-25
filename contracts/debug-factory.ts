import { network } from "hardhat";

async function testFactory() {
  const { viem } = await network.connect();
  
  console.log("Testing Factory deployment...");
  
  // Deploy verifier and factory
  const verifier = await viem.deployContract("Groth16Verifier");
  const factory = await viem.deployContract("Factory");
  
  console.log("Verifier deployed at:", verifier.address);
  console.log("Factory deployed at:", factory.address);
  
  const ceremonyId = 1n;
  const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const submissionDeadline = BigInt(biddingDeadline + 3600n);
  const resultDeadline = BigInt(submissionDeadline + 3600n);
  const maxWinners = 10n;
  const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  
  console.log("Salt:", salt);
  console.log("Salt length:", salt.length);
  
  try {
    // Deploy auction through factory
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
    
    console.log("Auction address returned:", auctionAddress);
    console.log("Auction address length:", auctionAddress.length);
    console.log("Auction address type:", typeof auctionAddress);
    
    // Try to get the contract
    const auction = await viem.getContractAt("Auction", auctionAddress);
    console.log("Auction contract created successfully");
    
    // Try to read from it
    const verifierAddress = await auction.read.verifier();
    console.log("Verifier address from auction:", verifierAddress);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testFactory().catch(console.error);
