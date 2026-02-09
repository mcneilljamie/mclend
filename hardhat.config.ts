import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.VITE_ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
        blockNumber: 18500000,
      },
      chainId: 1,
    },
    mainnet: {
      type: "http",
      url: process.env.VITE_ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
