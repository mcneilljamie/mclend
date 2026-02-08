import { ethers } from "hardhat";

async function main() {
  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const FEE_RECEIVER = "0x993aee79ee816b636d80f06186325b19a0ee3d45";
  const INITIAL_FEE_BPS = 100;

  console.log("Deploying McLendBorrowGate...");

  const McLendBorrowGate = await ethers.getContractFactory("McLendBorrowGate");
  const mcLendBorrowGate = await McLendBorrowGate.deploy(
    AAVE_POOL,
    FEE_RECEIVER,
    INITIAL_FEE_BPS
  );

  await mcLendBorrowGate.waitForDeployment();

  const address = await mcLendBorrowGate.getAddress();
  console.log("McLendBorrowGate deployed to:", address);
  console.log("Aave Pool:", AAVE_POOL);
  console.log("Fee Receiver:", FEE_RECEIVER);
  console.log("Fee BPS:", INITIAL_FEE_BPS, "(1%)");

  console.log("\nTo verify on Etherscan, run:");
  console.log(
    `npx hardhat verify --network mainnet ${address} ${AAVE_POOL} ${FEE_RECEIVER} ${INITIAL_FEE_BPS}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
