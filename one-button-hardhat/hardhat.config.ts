import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

dotenvConfig();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
const FUJI_RPC_URL =
  process.env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
const AVALANCHE_RPC_URL =
  process.env.AVALANCHE_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc";

export default defineConfig({
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  plugins: [hardhatToolboxMochaEthersPlugin],

  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "generic",
    },

    fuji: {
      type: "http",
      chainType: "generic",
      url: FUJI_RPC_URL,
      chainId: 43113,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },

    mainnet: {
      type: "http",
      chainType: "generic",
      url: AVALANCHE_RPC_URL,
      chainId: 43114,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
});
