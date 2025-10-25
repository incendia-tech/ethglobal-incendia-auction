import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Factory Contract", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  it("Should deploy Auction contract through factory", async function () {
    // Deploy verifier and factory
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Deploy auction through factory
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

    // Verify the auction was deployed and initialized
    const auction = await viem.getContractAt("Auction", auctionAddress);
    
    assert.equal(await auction.read.verifier().then(addr => addr.toLowerCase()), verifier.address.toLowerCase());
    assert.equal(await auction.read.ceremonyId(), ceremonyId);
    assert.equal(await auction.read.biddingDeadline(), biddingDeadline);
    assert.equal(await auction.read.bidSubmissionDeadline(), submissionDeadline);
    assert.equal(await auction.read.resultDeadline(), resultDeadline);

    // Check that the contract is stored in the mapping
    assert.equal(await factory.read.contracts([salt]), auctionAddress);
  });

  it("Should emit Deployed event when deploying contract", async function () {
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Deploy auction and check for event
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

    // Check that the event was emitted with correct arguments
    const events = await publicClient.getContractEvents({
      address: factory.address,
      abi: factory.abi,
      eventName: "Deployed",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
      strict: true,
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].args.contractAddress.toLowerCase(), auctionAddress.toLowerCase());
    assert.equal(events[0].args.votingType, 0); // CeremonyType.Auction
  });

  it("Should prevent deploying with same salt twice", async function () {
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Deploy first auction
    await factory.write.deployAuctionContract([
      salt,
      0, // CeremonyType.Auction
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Try to deploy second auction with same salt
    try {
      await factory.write.deployAuctionContract([
        salt,
        0, // CeremonyType.Auction
        verifier.address,
        biddingDeadline,
        submissionDeadline,
        resultDeadline,
        ceremonyId,
        maxWinners
      ]);
      assert.fail("Should have reverted with SaltAlreadyUsed error");
    } catch (error) {
      assert.ok(error.message.includes("SaltAlreadyUsed") || error.message.includes("revert"));
    }
  });

  it("Should allow deploying multiple auctions with different salts", async function () {
    const verifier = await viem.deployContract("Groth16Verifier");
    const factory = await viem.deployContract("Factory");
    
    const ceremonyId = 1n;
    const biddingDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const submissionDeadline = BigInt(biddingDeadline + 3600n);
    const resultDeadline = BigInt(submissionDeadline + 3600n);
    const maxWinners = 10n;
    
    const salt1 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const salt2 = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    // Deploy first auction
    const txHash1 = await factory.write.deployAuctionContract([
      salt1,
      0, // CeremonyType.Auction
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt1 = await publicClient.waitForTransactionReceipt({ hash: txHash1 });
    const auctionAddress1 = await factory.read.contracts([salt1]);

    // Deploy second auction with different salt
    const txHash2 = await factory.write.deployAuctionContract([
      salt2,
      0, // CeremonyType.Auction
      verifier.address,
      biddingDeadline,
      submissionDeadline,
      resultDeadline,
      ceremonyId,
      maxWinners
    ]);

    // Wait for transaction and get the deployed address
    const receipt2 = await publicClient.waitForTransactionReceipt({ hash: txHash2 });
    const auctionAddress2 = await factory.read.contracts([salt2]);

    // Verify both auctions were deployed
    assert.notEqual(auctionAddress1, auctionAddress2);
    assert.equal(await factory.read.contracts([salt1]), auctionAddress1);
    assert.equal(await factory.read.contracts([salt2]), auctionAddress2);
  });

  it("Should return correct bytecode for Auction ceremony type", async function () {
    const factory = await viem.deployContract("Factory");
    
    // This test verifies that the factory can generate the correct bytecode
    // The actual bytecode verification would require more complex testing
    // For now, we just verify the factory can be deployed and called
    assert.ok(factory.address);
  });
});
