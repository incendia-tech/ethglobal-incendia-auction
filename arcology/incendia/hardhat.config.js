require("@nomiclabs/hardhat-waffle");
require('dotenv').config()
const nets = require('./network.json');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: "0.4.18",
        settings: { optimizer: { enabled: true, runs: 200 } },
      }
    ],
    overrides: {
      "contracts/WETH9.sol": {
        version: "0.4.18",
        settings: { optimizer: { enabled: true, runs: 200 } },
      }
    }
  },
  networks: nets
};
