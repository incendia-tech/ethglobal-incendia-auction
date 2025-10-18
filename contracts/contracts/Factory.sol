// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Auction.sol";
import "./Errors.sol";

contract Factory {
    enum CeremonyType {
        Auction
    }

    event Deployed(address indexed contractAddress, CeremonyType votingType);

    mapping(bytes32 => address) public contracts;

    function deployAuctionContract(
        bytes32 _salt,
        CeremonyType _ceremonyType,
        address _verifier,
        uint256 _biddingDealine,
        uint256 _submissionDeadline,
        uint256 _resultDeadline,
        uint256 _ceremonyId,
        uint256 _maxWinners
    ) external returns (address) {
        if (contracts[_salt] != address(0)) revert SaltAlreadyUsed(_salt);
        bytes memory bytecode = getCeremonyBytecode(_ceremonyType);

        address deployedAddress;

        assembly {
            deployedAddress := create2(0, add(bytecode, 0x20), mload(bytecode), _salt)
        }

        Auction(deployedAddress).initialize(
            _verifier,
            _biddingDealine,
            _submissionDeadline,
            _resultDeadline,
            _ceremonyId,
            _maxWinners
        );

        contracts[_salt] = deployedAddress;
        emit Deployed(deployedAddress, _ceremonyType);

        return deployedAddress;
    }


    function getCeremonyBytecode(CeremonyType votingType) internal pure returns (bytes memory) {
        if (votingType == CeremonyType.Auction) {
            return type(Auction).creationCode;
        } else{
            revert InvalidCeremonyType();
        }
    }
}