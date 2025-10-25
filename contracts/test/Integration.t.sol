// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/Auction.sol";
import "../contracts/Factory.sol";
import "../contracts/verifier.sol";

contract IntegrationTest is Test {
    Factory public factory;
    Groth16Verifier public verifier;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    
    uint256 public ceremonyId = 1;
    uint256 public biddingDeadline;
    uint256 public submissionDeadline;
    uint256 public resultDeadline;
    uint256 public maxWinners = 3; // Small number for testing
    
    bytes32 public salt1 = keccak256("integration-test-salt");
    
    // Mock proof data
    uint256[2] public proofA = [uint256(1), uint256(2)];
    uint256[2][2] public proofB = [[uint256(3), uint256(4)], [uint256(5), uint256(6)]];
    uint256[2] public proofC = [uint256(7), uint256(8)];
    
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
    
    function testFullAuctionWorkflow() public {
        // Deploy auction through factory
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
        
        Auction auction = Auction(auctionAddress);
        
        // Verify deployment
        assertTrue(auctionAddress != address(0));
        assertEq(factory.contracts(salt1), auctionAddress);
        
        // Mock verifier to return true for all proofs
        vm.mockCall(
            address(verifier),
            abi.encodeWithSelector(verifier.verifyProof.selector),
            abi.encode(true)
        );
        
        // Submit multiple bids
        uint256[6] memory signals1 = [uint256(9), uint256(100), uint256(11), uint256(1000), uint256(13), uint256(14)];
        uint256[6] memory signals2 = [uint256(9), uint256(200), uint256(11), uint256(2000), uint256(13), uint256(14)];
        uint256[6] memory signals3 = [uint256(9), uint256(300), uint256(11), uint256(500), uint256(13), uint256(14)];
        uint256[6] memory signals4 = [uint256(9), uint256(400), uint256(11), uint256(3000), uint256(13), uint256(14)];
        
        // Submit bids from different users
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        auction.submitBid{value: 1000}(proofA, proofB, proofC, signals1, 1000);
        
        vm.deal(user2, 10 ether);
        vm.prank(user2);
        auction.submitBid{value: 2000}(proofA, proofB, proofC, signals2, 2000);
        
        vm.deal(user3, 10 ether);
        vm.prank(user3);
        auction.submitBid{value: 500}(proofA, proofB, proofC, signals3, 500);
        
        // Fourth bid should also work (maxWinners is 3, but we're testing the limit)
        address user4 = address(0x4);
        vm.deal(user4, 10 ether);
        vm.prank(user4);
        auction.submitBid{value: 3000}(proofA, proofB, proofC, signals4, 3000);
        
        // Verify all nullifiers are marked as used
        assertTrue(auction.usedNullifiers(100));
        assertTrue(auction.usedNullifiers(200));
        assertTrue(auction.usedNullifiers(300));
        assertTrue(auction.usedNullifiers(400));
        
        // Verify contract balance
        assertEq(address(auction).balance, 6500);
    }
    
    function testMultipleAuctionsFromSameFactory() public {
        bytes32 salt2 = keccak256("integration-test-salt-2");
        bytes32 salt3 = keccak256("integration-test-salt-3");
        
        // Deploy multiple auctions
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
            biddingDeadline + 1 hours,
            submissionDeadline + 1 hours,
            resultDeadline + 1 hours,
            ceremonyId + 1,
            maxWinners
        );
        
        address auctionAddress3 = factory.deployAuctionContract(
            salt3,
            Factory.CeremonyType.Auction,
            address(verifier),
            biddingDeadline + 2 hours,
            submissionDeadline + 2 hours,
            resultDeadline + 2 hours,
            ceremonyId + 2,
            maxWinners
        );
        
        // Verify all auctions are deployed
        assertTrue(auctionAddress1 != address(0));
        assertTrue(auctionAddress2 != address(0));
        assertTrue(auctionAddress3 != address(0));
        
        // Verify all are different addresses
        assertTrue(auctionAddress1 != auctionAddress2);
        assertTrue(auctionAddress2 != auctionAddress3);
        assertTrue(auctionAddress1 != auctionAddress3);
        
        // Verify all are stored in factory mapping
        assertEq(factory.contracts(salt1), auctionAddress1);
        assertEq(factory.contracts(salt2), auctionAddress2);
        assertEq(factory.contracts(salt3), auctionAddress3);
        
        // Test that each auction can accept bids independently
        vm.mockCall(
            address(verifier),
            abi.encodeWithSelector(verifier.verifyProof.selector),
            abi.encode(true)
        );
        
        Auction auction1 = Auction(auctionAddress1);
        Auction auction2 = Auction(auctionAddress2);
        Auction auction3 = Auction(auctionAddress3);
        
        uint256[6] memory signals1 = [uint256(9), uint256(100), uint256(11), uint256(1000), uint256(13), uint256(14)];
        uint256[6] memory signals2 = [uint256(9), uint256(200), uint256(11), uint256(1000), uint256(13), uint256(14)];
        uint256[6] memory signals3 = [uint256(9), uint256(300), uint256(11), uint256(1000), uint256(13), uint256(14)];
        
        // Submit bids to different auctions
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        auction1.submitBid{value: 1000}(proofA, proofB, proofC, signals1, 1000);
        
        vm.deal(user2, 10 ether);
        vm.prank(user2);
        auction2.submitBid{value: 1000}(proofA, proofB, proofC, signals2, 1000);
        
        vm.deal(user3, 10 ether);
        vm.prank(user3);
        auction3.submitBid{value: 1000}(proofA, proofB, proofC, signals3, 1000);
        
        // Verify each auction has the correct balance
        assertEq(address(auction1).balance, 1000);
        assertEq(address(auction2).balance, 1000);
        assertEq(address(auction3).balance, 1000);
        
        // Verify nullifiers are tracked per auction
        assertTrue(auction1.usedNullifiers(100));
        assertTrue(auction2.usedNullifiers(200));
        assertTrue(auction3.usedNullifiers(300));
        
        // Verify nullifiers from one auction don't affect others
        assertFalse(auction1.usedNullifiers(200));
        assertFalse(auction1.usedNullifiers(300));
        assertFalse(auction2.usedNullifiers(100));
        assertFalse(auction2.usedNullifiers(300));
        assertFalse(auction3.usedNullifiers(100));
        assertFalse(auction3.usedNullifiers(200));
    }
    
    function testAuctionWithDifferentVerifiers() public {
        // Deploy a second verifier
        Groth16Verifier verifier2 = new Groth16Verifier();
        
        bytes32 salt2 = keccak256("integration-test-salt-verifier-2");
        
        // Deploy auction with different verifier
        address auctionAddress2 = factory.deployAuctionContract(
            salt2,
            Factory.CeremonyType.Auction,
            address(verifier2),
            biddingDeadline,
            submissionDeadline,
            resultDeadline,
            ceremonyId,
            maxWinners
        );
        
        Auction auction2 = Auction(auctionAddress2);
        
        // Verify the auction uses the correct verifier
        assertEq(address(auction2.verifier()), address(verifier2));
        
        // Mock the second verifier to return true
        vm.mockCall(
            address(verifier2),
            abi.encodeWithSelector(verifier2.verifyProof.selector),
            abi.encode(true)
        );
        
        // Submit bid to auction with second verifier
        uint256[6] memory signals = [uint256(9), uint256(100), uint256(11), uint256(1000), uint256(13), uint256(14)];
        
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        auction2.submitBid{value: 1000}(proofA, proofB, proofC, signals, 1000);
        
        // Verify the bid was accepted
        assertTrue(auction2.usedNullifiers(100));
        assertEq(address(auction2).balance, 1000);
    }
    
    function testGasOptimization() public {
        uint256 gasStart = gasleft();
        
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
        
        uint256 deploymentGas = gasStart - gasleft();
        
        // Mock verifier
        vm.mockCall(
            address(verifier),
            abi.encodeWithSelector(verifier.verifyProof.selector),
            abi.encode(true)
        );
        
        // Test bid submission gas usage
        gasStart = gasleft();
        
        uint256[6] memory signals = [uint256(9), uint256(100), uint256(11), uint256(1000), uint256(13), uint256(14)];
        
        Auction auction = Auction(auctionAddress);
        
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        auction.submitBid{value: 1000}(proofA, proofB, proofC, signals, 1000);
        
        uint256 bidGas = gasStart - gasleft();
        
        console.log("Deployment gas:", deploymentGas);
        console.log("Bid submission gas:", bidGas);
        
        // These are informational - actual gas limits would depend on network
        assertTrue(deploymentGas > 0);
        assertTrue(bidGas > 0);
    }
    
    function testEdgeCaseNullifiers() public {
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
        
        Auction auction = Auction(auctionAddress);
        
        vm.mockCall(
            address(verifier),
            abi.encodeWithSelector(verifier.verifyProof.selector),
            abi.encode(true)
        );
        
        // Test with nullifier = 0
        uint256[6] memory signalsZero = [uint256(9), uint256(0), uint256(11), uint256(1000), uint256(13), uint256(14)];
        
        vm.deal(user1, 10 ether);
        vm.prank(user1);
        auction.submitBid{value: 1000}(proofA, proofB, proofC, signalsZero, 1000);
        
        assertTrue(auction.usedNullifiers(0));
        
        // Test with very large nullifier
        uint256[6] memory signalsLarge = [uint256(9), type(uint256).max, uint256(11), uint256(1000), uint256(13), uint256(14)];
        
        vm.deal(user2, 10 ether);
        vm.prank(user2);
        auction.submitBid{value: 1000}(proofA, proofB, proofC, signalsLarge, 1000);
        
        assertTrue(auction.usedNullifiers(type(uint256).max));
    }
}
