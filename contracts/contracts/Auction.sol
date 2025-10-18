// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./verifier.sol";

contract Auction {
   Groth16Verifier public verifier;

   error InvalidProof();

    uint256 public ceremonyId;

    uint256 public biddingDeadline;
    uint256 public bidSubmissionDeadline;
    uint256 public resultDeadline;
    


    uint256[] winningBids;
    address[] winners;

    bool private initialized = false;
    mapping(uint256 => bool) public usedNullifiers;


    function initialize(
        address _verifier,
        uint256 _biddingDeadline,
        uint256 _submissionDeadline,
        uint256 _resultDeadline,
        uint256 _ceremonyId,
        uint256 _maxWinners
    ) external {
        verifier = Groth16Verifier(_verifier);
        biddingDeadline = _biddingDeadline;
        bidSubmissionDeadline = _submissionDeadline;
        resultDeadline = _resultDeadline;
        ceremonyId = _ceremonyId;
        winners = new address[](_maxWinners);
        winningBids = new uint256[](_maxWinners);
        initialized = true;
    }


    function submitBid(
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC,
        uint256[6] calldata pubSignals
    ) external payable {

        bool proofIsValid = verifier.verifyProof(
            proofA, proofB, proofC, pubSignals
        );
        if (!proofIsValid) revert InvalidProof();

        usedNullifiers[pubSignals[1]] = true;

        if(pubSignals[3] > winningBids[0]){
          winningBids[0] = pubSignals[3];
          winners[0] = msg.sender;
        }
    }


    function checkAndInsertBid(uint256 bid, address bidder) internal returns (bool) {
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