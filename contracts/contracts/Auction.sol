// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./verifier.sol";

contract Auction {
   Groth16Verifier public verifier;

    uint256 public ceremonyId;

    uint256 public biddingDeadline;
    uint256 public bidSubmissionDeadline;
    uint256 public resultDeadline;


    uint256[] winningBids;
    address[] winners;

    bool private initialized = false;


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


}