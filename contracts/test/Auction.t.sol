// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/Auction.sol";
import "../contracts/verifier.sol";
import "../contracts/Factory.sol";

contract AuctionTest {
    Groth16Verifier public verifier;
    Factory public factory;
    Auction public auction;
    
    uint256 public ceremonyId = 1;
    uint256 public biddingDeadline;
    uint256 public submissionDeadline;
    uint256 public resultDeadline;
    uint256 public maxWinners = 10;
    bytes32 public salt = keccak256("test-salt");

    function setUp() public {
        verifier = new Groth16Verifier();
        factory = new Factory();
        
        biddingDeadline = block.timestamp + 3600;
        submissionDeadline = biddingDeadline + 3600;
        resultDeadline = submissionDeadline + 3600;
        
        // Deploy auction through factory
        address auctionAddress = factory.deployAuctionContract(
            salt,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        auction = Auction(auctionAddress);
    }

    function testAuctionInitialization() public view {
        assert(address(auction.verifier()) == address(verifier));
        assert(auction.ceremonyId() == ceremonyId);
        assert(auction.biddingDeadline() == biddingDeadline);
        assert(auction.bidSubmissionDeadline() == submissionDeadline);
        assert(auction.resultDeadline() == resultDeadline);
    }

    function testAuctionVerifierAddress() public view {
        assert(address(auction.verifier()) == address(verifier));
    }

    function testAuctionCeremonyId() public view {
        assert(auction.ceremonyId() == ceremonyId);
    }

    function testAuctionDeadlines() public view {
        assert(auction.biddingDeadline() == biddingDeadline);
        assert(auction.bidSubmissionDeadline() == submissionDeadline);
        assert(auction.resultDeadline() == resultDeadline);
    }

    function testUsedNullifiersMapping() public view {
        // Test that nullifier mapping starts empty
        assert(auction.usedNullifiers(123) == false);
        assert(auction.usedNullifiers(456) == false);
    }
}
