import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import dotenv from 'dotenv';
dotenv.config();

export default {
  default: 'hardhat',
  networks: {
    hardhat: {},
    dev: {
      url: "http://localhost:8545"
    },
    kovan: {
      url: process.env['INFURA_KOVAN_ENDPOINT'],
      accounts: [process.env['OPERATOR_PK']],
    },
    mainnet: {
      url: process.env['INFURA_ENDPOINT'],
      accounts: [process.env['OPERATOR_PK']],
    }
  },
  solidity: {
    compilers: [{
      version: '0.6.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 999999,
        },
      },
    }, {
      version: '0.6.6',
      settings: {
        optimizer: {
          enabled: true,
          runs: 999999,
        },
        evmVersion: 'istanbul',
      },

    }, {
      version: '0.5.16',
      settings: {
        optimizer: {
          enabled: true,
          runs: 999999,
        },
        evmVersion: 'istanbul',
      },
    }, {
      version: '0.4.24',
      settings: {
        optimizer: {
          enabled: true,
          runs: 999999,
        },
      },
    }]
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './build/cache',
    artifacts: './build/artifacts',
  },
  gasReporter: {
    currency: 'USD',
    enabled: true,
  },
  etherscan: {
    apiKey: process.env["ETHERSCAN_API_KEY"]
  },
};
