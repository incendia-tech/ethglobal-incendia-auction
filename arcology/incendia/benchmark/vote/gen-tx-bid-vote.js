const hre = require("hardhat");
var frontendUtil = require('@arcologynetwork/frontend-util/utils/util')
const nets = require('../../network.json');
const ProgressBar = require('progress');

const path = require("path");
const { loadAndConvertProof } = require("../../test/utils"); 
// import { loadAndConvertProof } from "./utils.js";

// Load proof data using utility functions
const proofPath = path.join(__dirname, "../../../../data/proof.json");
const publicPath = path.join(__dirname, "../../../../data/public.json");

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
  const provider = new ethers.providers.JsonRpcProvider(nets[hre.network.name].url);
  const pkCreator = nets[hre.network.name].accounts[0]
  const signerCreator = new ethers.Wallet(pkCreator, provider);
  const txbase = 'benchmark/vote/txs';
  frontendUtil.ensurePath(txbase);

  let i, tx;

  // Use pre-converted proof format
    const proofA = proofData.pi_a;
    const proofB = proofData.pi_b;
    const proofC = proofData.pi_c;
    const pubSignals = publicSignals;

  console.log('======start deploying contract======')
  // Deploy contracts
  const verifier_factory = await ethers.getContractFactory("Groth16Verifier");
  const deployed_verifyer = await verifier_factory.deploy();
  console.log(`Deployed  Groth16 Verifier  at ${deployed_verifyer.address}`)
  const bt_factory = await ethers.getContractFactory("BurnToVote");
  const vote = await bt_factory.deploy(deployed_verifyer.address);
  await vote.deployed();
  console.log(`Deployed Parallel Burn2Vote at ${vote.address}`)

  console.log('======start generating TXs calling SubmitVote======')
  let accountsLength = accounts.length
  // let accountsLength = 100
  frontendUtil.ensurePath(txbase + '/vote');
  const handle_vote = frontendUtil.newFile(txbase + '/vote/vote.out');

  const bar = new ProgressBar('Generating Tx data [:bar] :percent :etas', {
    total: 100,
    width: 40,
    complete: '*',
    incomplete: ' ',
  });

  const percent = accountsLength / 100
  let pk, signer
  for (i = 0; i < accountsLength; i++) {
    pk = nets[hre.network.name].accounts[i];
    signer = new ethers.Wallet(pk, provider);

    //burn2Vote
    tx = await vote.connect(accounts[i]).populateTransaction.submitVote(
          proofA,
          proofB,
          proofC,
          pubSignals,
          Math.floor(Math.random() * 2) 
        );
    await frontendUtil.writePreSignedTxFile(handle_vote, signer, tx);
    if (i > 0 && i % percent == 0) {
      bar.tick(1);
    }
  }
  bar.tick(1);

  if (bar.complete) {
    console.log(`Test data generation completed: ${accountsLength}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
