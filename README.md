# Anonymous Auction using proof-of-burn

A fully on-chain, anonymous auction protocol using Proof-of-Burn and zk-SNARKs. Bidders burn tokens to unspendable addresses, generate a zero-knowledge proof, and submit their bids on Ethereum-compatible chains without sacrificing privacy or verifiability.

## Protocol Description

The auction protocol implemented here is based on our previously developed voting protocol.

The voting protocol operates in four main phases: setup, registration, voting, and tallying. In the `setup phase`, the organizer deploys or configures a smart contract on the blockchain, specifying parameters such as the voting options, time frames, and proof-of-burn verification logic. During `registration`, eligible voters generate commitments to their identities and submit zero-knowledge proofs of eligibility. These commitments are aggregated into a Merkle tree, and the resulting root is stored on-chain to define the set of authorized voters. This structure ensures that only registered participants can later submit valid votes while preserving anonymity.

In the `voting phase`, each voter generates a unique, unspendable burn address (hash of some parameters including: vote, voter's id, ceremony's id, random value) and sends a small amount of tokens to it, effectively committing to their vote. The voter then produces a zero-knowledge proof attesting to the correctness of the burn, their eligibility, and the proper formation of a unique nullifier that prevents double voting. During the `tallying phase`, the voter submits their plaintext vote along with this proof to the smart contract. The contract verifies the proof on-chain, ensures the nullifier’s uniqueness, and immediately updates the public tally. This design eliminates the need for trusted tallying authorities, maintaining transparency, scalability, and voter anonymity through unlinkability between voters and votes.

In the auction protocol, the `vote` is replaced with a `bid`. The bid value cannot be changed once submitted. The winner is determined at the end of the bidding phase.

## Features

- **Fully On-Chain**: No trusted third parties or off-chain winner determination, everything happens in smart contracts.
- **Anonymous**: There is no link between biders who burn tokens and who submits the bid.
- **Lightweight ZKPs**: Uses Circom + Groth16 for succinct proofs; avoids heavy homomorphic encryption or MPC overhead.
- **Rust CLI**: Convenient command-line interface powered by `structopt` and `tokio`.


## Repository Layout

## Prerequisites

Before setting up the project, ensure the following tools are installed:

- **Node.js** (>=16.0.0) - [Install Node.js](https://nodejs.org/)
- **Rust** (for Cargo) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Homebrew** (for macOS) - [Install Homebrew](https://brew.sh/)
- **Circom** - [Install Circom](https://docs.circom.io/getting-started/installation/)
