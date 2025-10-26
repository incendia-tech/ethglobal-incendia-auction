# Anonymous Auction using proof-of-burn

A fully on-chain, anonymous auction protocol using Proof-of-Burn and zk-SNARKs. Bidders burn tokens to unspendable addresses, generate a zero-knowledge proof, and submit their bids on Ethereum-compatible chains without sacrificing privacy or verifiability.

## Protocol Description

The auction protocol presented here is developed from scratch, inspired by the core ideas of our previouse voting protocol. While both systems share conceptual similarities in using zero-knowledge proofs and proof-of-burn commitments, the auction protocol introduces a completely new architecture, circuits, and logic tailored specifically for bid submission and winner determination.

The auction protocol operates in four main phases: setup, registration, bidding, and determination. In the setup phase, the organizer deploys or configures a smart contract on the blockchain, specifying parameters such as the auction options, time frames, and proof-of-burn verification logic. During registration, eligible bidders generate commitments to their identities and submit zero-knowledge proofs of eligibility. These commitments are aggregated into a Merkle tree, and the resulting root is stored on-chain to define the set of authorized bidders. This structure ensures that only registered participants can later submit valid bids while preserving anonymity.

In the bidding phase, each bidder generates a unique, unspendable burn address (hash of some parameters including: bid amount, bidder's id, ceremony's id, random value) and sends a small amount of tokens to it, effectively committing to their bid. The bidder then produces a zero-knowledge proof attesting to the correctness of the burn, their eligibility, and the proper formation of a unique nullifier that prevents double bidding. During the winner determination phase, the bidder submits their plaintext bid along with the proof to the smart contract. The contract verifies the proof on-chain, ensures the nullifier’s uniqueness, and immediately updates the winner so far. This design eliminates the need for trusted authorities, maintaining transparency, scalability, and bidder anonymity through unlinkability between bidders and bids.

The bid value cannot be changed once submitted. 
The system ensures fairness and privacy through similar proof structures but adapts them for value-based competition rather than binary or categorical choice. The winner is determined at the end of the bidding phase, where all valid bids are verified and compared on-chain.

## Features

- **Fully Decentralized and On-Chain**: No trusted third parties or off-chain winner determination, everything happens in smart contracts.
- **Bidder Anonymity and Unlinkability**: There is no on-chain linkage between a bidders’s identity, their burn transaction, and the bid value.
- **Lightweight ZKPs**: Uses Circom + Groth16 for succinct proofs; avoids heavy homomorphic encryption or MPC overhead.
- **Public Verifiability**: All bids, proofs, and determination operations are publicly auditable on-chain, allowing any observer to verify the correctness of the final outcome.
- **Scalability and Efficiency**: Bids are submitted in plaintext, and verification is lightweight, resulting in low on-chain computation and gas costs.


## Prerequisites

Before setting up the project, ensure the following tools are installed:

- **Node.js** (>=16.0.0) - [Install Node.js](https://nodejs.org/)
