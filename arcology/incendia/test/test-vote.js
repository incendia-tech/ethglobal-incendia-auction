const hre = require("hardhat");
var frontendUtil = require('@arcologynetwork/frontend-util/utils/util');
const { expect } = require("chai");
const path = require("path");
const { loadAndConvertProof } = require("./utils"); 
// import { loadAndConvertProof } from "./utils.js";

// Load proof data using utility functions
const proofPath = path.join(__dirname, "../../../data/proof.json");
const publicPath = path.join(__dirname, "../../../data/public.json");

let proofData = null;
let publicSignals = null;

try {
  const converted = loadAndConvertProof(proofPath, publicPath);
  proofData = {
    pi_a: converted.proofA,
    pi_b: converted.proofB,
    pi_c: converted.proofC,
  };
  publicSignals = converted.publicSignals;
} catch (error) {
  console.log("Warning: Could not load proof data for tests:", error.message);
}


async function main() {
    accounts = await ethers.getSigners(); 

    console.log('======start deploying contract======')
    // Deploy contracts
    const verifier_factory = await ethers.getContractFactory("Groth16Verifier");
    const deployed_verifyer = await verifier_factory.deploy();
    console.log(`Deployed  Groth16 Verifier  at ${deployed_verifyer.address}`)
    const bt_factory = await ethers.getContractFactory("BurnToVote");
    const bt = await bt_factory.deploy(deployed_verifyer.address);
    await bt.deployed();
    console.log(`Deployed Parallel Burn2Vote at ${bt.address}`)

    console.log('======start executing TXs calling SubmitVote======')
    // Use pre-converted proof format
    const proofA = proofData.pi_a;
    const proofB = proofData.pi_b;
    const proofC = proofData.pi_c;
    const pubSignals = publicSignals;

    // Submit bid with valid proof
    var txs=new Array();
    for(i=1;i<=10;i++){
      txs.push(frontendUtil.generateTx(function([bt,from]){
        return bt.connect(from).submitVote(
          proofA,
          proofB,
          proofC,
          pubSignals,
          100 + i * 146 
        );
      },bt,accounts[i]));
    }
    await frontendUtil.waitingTxs(txs);
    // expect(await bt.getTotal()).to.equal(5);

  }

  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });