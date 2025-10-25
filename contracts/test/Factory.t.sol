// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/Factory.sol";
import "../contracts/verifier.sol";

contract FactoryTest {
    Factory public factory;
    Groth16Verifier public verifier;
    
    uint256 public ceremonyId = 1;
    uint256 public biddingDeadline;
    uint256 public submissionDeadline;
    uint256 public resultDeadline;
    uint256 public maxWinners = 10;
    bytes32 public salt1 = keccak256("test-salt-1");
    bytes32 public salt2 = keccak256("test-salt-2");

    function setUp() public {
        factory = new Factory();
        verifier = new Groth16Verifier();
        
        biddingDeadline = block.timestamp + 3600;
        submissionDeadline = biddingDeadline + 3600;
        resultDeadline = submissionDeadline + 3600;
    }

    function testDeployAuctionContract() public {
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        assert(auctionAddress != address(0));
        assert(factory.contracts(salt1) == auctionAddress);
    }

    function testPreventDuplicateSalt() public {
        // Deploy first auction
        factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        // Try to deploy with same salt - should revert
        bool success = true;
        try factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        ) {
            success = false; // Should not reach here
        } catch {
            success = true; // Expected to revert
        }
        
        assert(success);
    }

    function testDeployMultipleAuctions() public {
        address auctionAddress1 = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        address auctionAddress2 = factory.deployAuctionContract(
            salt2,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        assert(auctionAddress1 != auctionAddress2);
        assert(factory.contracts(salt1) == auctionAddress1);
        assert(factory.contracts(salt2) == auctionAddress2);
    }

    function testContractsMapping() public {
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        assert(factory.contracts(salt1) == auctionAddress);
        assert(factory.contracts(salt2) == address(0)); // Different salt should be zero
    }
}
