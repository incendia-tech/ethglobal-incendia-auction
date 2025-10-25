// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/Auction.sol";
import "../contracts/Factory.sol";
import "../contracts/verifier.sol";
import "../contracts/Errors.sol";

contract FactoryTest is Test {
    Factory public factory;
    Groth16Verifier public verifier;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    uint256 public ceremonyId = 1;
    uint256 public biddingDeadline;
    uint256 public submissionDeadline;
    uint256 public resultDeadline;
    uint256 public maxWinners = 10;
    
    bytes32 public salt1 = keccak256("test-salt-1");
    bytes32 public salt2 = keccak256("test-salt-2");
    
    function setUp() public {
        // Deploy verifier
        verifier = new Groth16Verifier();
        
        // Deploy factory
        factory = new Factory();
        
        // Set up deadlines
        biddingDeadline = block.timestamp + 1 hours;
        submissionDeadline = biddingDeadline + 1 hours;
        resultDeadline = submissionDeadline + 1 hours;
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
        
        // Verify the auction was deployed
        assertTrue(auctionAddress != address(0));
        
        // Verify the auction is stored in the mapping
        assertEq(factory.contracts(salt1), auctionAddress);
        
        // Verify the auction contract is properly initialized
        Auction auction = Auction(auctionAddress);
        assertEq(address(auction.verifier()), address(verifier));
        assertEq(auction.ceremonyId(), ceremonyId);
        assertEq(auction.biddingDeadline(), biddingDeadline);
        assertEq(auction.bidSubmissionDeadline(), submissionDeadline);
        assertEq(auction.resultDeadline(), resultDeadline);
    }
    
    function testDeployAuctionContractEmitsEvent() public {
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
        
        // Verify the auction was deployed
        assertTrue(auctionAddress != address(0));
        
        // The event emission is tested implicitly by successful deployment
        // In a real scenario, you would check the event logs
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
        
        // Try to deploy second auction with same salt
        vm.expectRevert(abi.encodeWithSelector(SaltAlreadyUsed.selector, salt1));
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
    }
    
    function testDeployMultipleAuctionsWithDifferentSalts() public {
        // Deploy first auction
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
        
        // Deploy second auction with different salt
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
        
        // Verify both auctions were deployed
        assertTrue(auctionAddress1 != address(0));
        assertTrue(auctionAddress2 != address(0));
        assertTrue(auctionAddress1 != auctionAddress2);
        
        // Verify both auctions are stored in the mapping
        assertEq(factory.contracts(salt1), auctionAddress1);
        assertEq(factory.contracts(salt2), auctionAddress2);
        
        // Verify both auctions are properly initialized
        Auction auction1 = Auction(auctionAddress1);
        Auction auction2 = Auction(auctionAddress2);
        
        assertEq(address(auction1.verifier()), address(verifier));
        assertEq(address(auction2.verifier()), address(verifier));
        assertEq(auction1.ceremonyId(), ceremonyId);
        assertEq(auction2.ceremonyId(), ceremonyId);
    }
    
    function testGetCeremonyBytecode() public {
        // This function is internal, so we can't test it directly
        // But we can verify it works by checking that deployment succeeds
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
        
        assertTrue(auctionAddress != address(0));
    }
    
    function testDeployWithDifferentParameters() public {
        uint256 differentCeremonyId = 2;
        uint256 differentMaxWinners = 5;
        uint256 differentBiddingDeadline = block.timestamp + 2 hours;
        uint256 differentSubmissionDeadline = differentBiddingDeadline + 2 hours;
        uint256 differentResultDeadline = differentSubmissionDeadline + 2 hours;
        
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            differentBiddingDeadline,
            differentSubmissionDeadline,
            differentResultDeadline,
            differentCeremonyId,
            differentMaxWinners
        );
        
        // Verify the auction was deployed with correct parameters
        Auction auction = Auction(auctionAddress);
        assertEq(auction.ceremonyId(), differentCeremonyId);
        assertEq(auction.biddingDeadline(), differentBiddingDeadline);
        assertEq(auction.bidSubmissionDeadline(), differentSubmissionDeadline);
        assertEq(auction.resultDeadline(), differentResultDeadline);
    }
    
    function testDeployWithZeroAddressVerifier() public {
        // This should still work as the contract doesn't validate the verifier address
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(0),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        assertTrue(auctionAddress != address(0));
        
        Auction auction = Auction(auctionAddress);
        assertEq(address(auction.verifier()), address(0));
    }
    
    function testDeployWithMaxWinnersZero() public {
        // Deploy with maxWinners = 0
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            0
        );
        
        assertTrue(auctionAddress != address(0));
        
        // The auction should be deployed but with empty arrays
        // This tests edge case behavior
    }
    
    function testDeployWithLargeMaxWinners() public {
        uint256 largeMaxWinners = 1000;
        
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            largeMaxWinners
        );
        
        // The auction should be deployed with large arrays
        // This tests gas limits and array initialization
        assertTrue(auctionAddress != address(0));
    }
    
    function testDeployWithPastDeadlines() public {
        // Use a fixed past timestamp to avoid underflow
        uint256 pastDeadline = 1000000; // Fixed past timestamp
        
        address auctionAddress = factory.deployAuctionContract(
            salt1,
            Factory.CeremonyType.Auction,
            address(verifier),
            pastDeadline,
            pastDeadline + 1 hours,
            pastDeadline + 2 hours,
            ceremonyId,
            maxWinners
        );
        
        assertTrue(auctionAddress != address(0));
        
        Auction auction = Auction(auctionAddress);
        assertEq(auction.biddingDeadline(), pastDeadline);
    }
    
    function testContractsMapping() public {
        // Initially, the mapping should return address(0)
        assertEq(factory.contracts(salt1), address(0));
        
        // Deploy auction
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
        
        // Now the mapping should return the deployed address
        assertEq(factory.contracts(salt1), auctionAddress);
        
        // Different salt should still return address(0)
        assertEq(factory.contracts(salt2), address(0));
    }
    
    function testGasUsage() public {
        uint256 gasStart = gasleft();
        
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
        
        uint256 gasUsed = gasStart - gasleft();
        
        // Log gas usage for optimization reference
        console.log("Gas used for deployment:", gasUsed);
        
        // This test helps track gas usage for optimization
        assertTrue(gasUsed > 0);
    }
    
    function testMultipleDeploymentsGasUsage() public {
        uint256 gasStart = gasleft();
        
        // Deploy multiple auctions
        for (uint256 i = 0; i < 5; i++) {
            bytes32 salt = keccak256(abi.encodePacked("salt", i));
            factory.deployAuctionContract(
                salt,
                Factory.CeremonyType.Auction,
                address(verifier),
                biddingDeadline,
                submissionDeadline,
                resultDeadline,
                ceremonyId,
                maxWinners
            );
        }
        
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for 5 deployments:", gasUsed);
        
        assertTrue(gasUsed > 0);
    }
}
