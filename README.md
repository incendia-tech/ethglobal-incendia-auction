# Anonymous Auction using proof-of-burn

A Rust-based implementation of a fully on-chain, anonymous auction protocol using Proof-of-Burn and zk-SNARKs. Bidders burn tokens to unspendable addresses, generate a zero-knowledge proof, and submit their bids on Ethereum-compatible chains without sacrificing privacy or verifiability.

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
