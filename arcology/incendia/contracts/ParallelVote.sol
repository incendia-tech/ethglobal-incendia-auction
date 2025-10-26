// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "@arcologynetwork/concurrentlib/lib/commutative/U256Cum.sol";

import "./verifier.sol";

// This is a simple contract that allows users to like and retrieve the number of likes. 
// It supports concurrent calls to the like function is OK.
contract BurnToVote {

    Groth16Verifier public verifier;
    
    error InvalidProof();
    uint256 public ceremonyId;

    uint256 public biddingDeadline;
    uint256 public bidSubmissionDeadline;
    uint256 public resultDeadline;
    
    bool private initialized = false;
    mapping(uint256 => bool) public usedNullifiers;


    uint256[] winningBids;
    address[] winners;

    U256Cumulative total = new U256Cumulative(0, type(uint256).max); // Using a commutative counter to store the number of likes. 

    constructor(address groth_verifier) {
        verifier = Groth16Verifier(groth_verifier);
    }

    //Increments the number of total by 1. Concurrent calls to this function is OK
    function like() public {
        total.add(1);
    } 

    //Returns the number of likes
    function getTotal() public view returns(uint256){
        return total.get();
    }

    function submitVote(
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[6] calldata pubSignals,
        uint256 _bid
    ) public {
        // Check if nullifier has already been used
        // if (usedNullifiers[pubSignals[1]]) revert InvalidProof();

        bool proofIsValid = verifier.verifyProof(
            proofA, proofB, proofC, pubSignals
        );
        if (!proofIsValid) revert InvalidProof();

        usedNullifiers[pubSignals[1]] = true;

        checkAndInsertVote(_bid, msg.sender);

        total.add(_bid);
    }


    function checkAndInsertVote(uint256 bid, address bidder) internal returns (bool) {
        for (uint256 i = 0; i < winners.length; i++) {
            if (bid > winningBids[i]) {
                for (uint256 j = winners.length - 1; j > i; j--) {
                    winners[j] = winners[j - 1];
                    winningBids[j] = winningBids[j - 1];
                }
                winningBids[i] = bid;
                winners[i] = bidder;
                return true;
            }
        }
        return false;
    }
}