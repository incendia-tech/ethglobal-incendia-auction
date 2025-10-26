Tested on WSL:

We followed the examples from Arcology and updated the "Like" example to verify our Zero-knowledge proofs and used its `Add` method to build a `yes/no` type of voting mechanism. Same thing can also be used in the auction like an "English Auction."

The following has been tested fully (both benchmark and tests) on a midrange laptop with __WSL__:

Installing configuring and running the Arcology Devnet Docker from their direct example's page document:
```

localip=$(hostname -I | awk '{print $1}')

echo $localip

docker run -itd --name l1 -p 8545:8545 -p 26656:26656 -p 9191:9191 -p 9192:9192 -p 9292:9292 arcologynetwork/devnet -f http://$localip:7545 -b http://$localip:3500 -s http://$localip:8545 -r true -m false

docker ps

npm install -g @arcologynetwork/frontend-tools

npx arcology.net-monitor http://$localip:8545
```

Now navigate into the project's directory and install modules and run the test :)

```
cd incendia/

npm install

npx hardhat run test/test-vote.js --network TestnetInfo
```

the output of the above command would be something like this:

```
npx hardhat run test/test-vote.js --network TestnetInfo
======start deploying contract======
Deployed  Groth16 Verifier  at 0xfAd409e4F015f9a5D97D4f1f953f14ae66F80AD9
Deployed Parallel Burn2Vote at 0x391b613b08C8d81a099d17127113392441998476
======start executing TXs calling SubmitVote======
Tx Status:1 Height:3446
. . . (10 same lines) 
Tx Status:1 Height:3446
```

We have also re-written the benchamrks to include our type of transactions:

```
npx hardhat run benchmark/vote/gen-tx-bid-vote.js --network TestnetInfo
```

it of course takes a while and the final output looks like this:

```
======start deploying contract======
Deployed  Groth16 Verifier  at 0xfbC451FBd7E17a1e7B18347337657c1F2c52B631
Deployed Parallel Burn2Vote at 0x2249977665260A63307Cf72a4D65385cC0817CB5
======start generating TXs calling SubmitVote======
Generating Tx data [****************************************] 100% 0.0s
Test data generation completed: 100000
```

Then you can send them to devnet like this:

```
npx arcology.net-tx-sender http://127.0.0.1:8545 benchmark/vote/txs/vote 
```

out is something like this:
```
The file vote.out is sent successfully,total 100000
```
you can see transactions status in the monitoring tab `npx arcology.net-monitor http://$localip:8545`:

```
...

height = 1617, empty block, timestamp = 1761487703, maxTps = 20000, realtimeTps(1m) = 0

height = 1618, empty block, timestamp = 1761487704, maxTps = 20000, realtimeTps(1m) = 0

height = 1619, total = 20000, success = 20000, fail = 0, timestamp = 1761487705, maxTps = 20000, realtimeTps(1m) = 1538

height = 1620, total = 15852, success = 15852, fail = 0, timestamp = 1761487706, maxTps = 20000, realtimeTps(1m) = 2560

height = 1621, empty block, timestamp = 1761487781, maxTps = 20000, realtimeTps(1m) = 0

height = 1622, empty block, timestamp = 1761487847, maxTps = 20000, realtimeTps(1m) = 0

...
```