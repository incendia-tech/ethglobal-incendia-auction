import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AuctionModule", (m) => {
  // Deploy the Groth16Verifier contract
  const verifier = m.contract("Groth16Verifier");

  // Deploy the Factory contract
  const factory = m.contract("Factory");

  // Deploy an Auction contract through the factory
  const ceremonyId = 1n;
  const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600); 
  const submissionDeadline = BigInt(biddingDeadline + 3600n); 
  const resultDeadline = BigInt(submissionDeadline + 3600n);
  const maxWinners = 10n;
  const salt = m.getParameter("salt", "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

  m.call(factory, "deployAuctionContract", [
    salt,
    0, // CeremonyType.Auction
    verifier,
    biddingDeadline,
    submissionDeadline,
    resultDeadline,
    ceremonyId,
    maxWinners
  ]);

  return { verifier, factory };
});
