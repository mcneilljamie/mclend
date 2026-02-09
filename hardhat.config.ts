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
      type: "edr-simulated" as const,
      chainId: 1,
      forking: {
        url: process.env.VITE_ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
        blockNumber: 18500000,
      },
    },
  },
};

export default config;
