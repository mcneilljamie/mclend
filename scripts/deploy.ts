import { ethers } from "hardhat";

async function main() {
  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const MCFUN_FACTORY = "0x6E8717dd111Bea3f5B12785798F3d1380c01D72B";
  const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const MCLEND = "0xe03e4d90a46f62ac405708ba5036f292d5e0edc8";
  const VARIABLE_DEBT_USDT = "0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8";

  console.log("Deploying McLendOriginationGate...");
  console.log("=====================================");
  console.log("Configuration:");
  console.log("  Aave Pool:", AAVE_POOL);
  console.log("  Uniswap Router:", UNISWAP_ROUTER);
  console.log("  McFun Factory:", MCFUN_FACTORY);
  console.log("  USDT:", USDT);
  console.log("  WETH:", WETH);
  console.log("  MCLEND:", MCLEND);
  console.log("  Variable Debt USDT:", VARIABLE_DEBT_USDT);
  console.log("  Origination Fee: 1% (100 BPS)");
  console.log("=====================================\n");

  const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
  const mcLendOriginationGate = await McLendOriginationGate.deploy(
    AAVE_POOL,
    UNISWAP_ROUTER,
    MCFUN_FACTORY,
    USDT,
    WETH,
    MCLEND,
    VARIABLE_DEBT_USDT
  );

  await mcLendOriginationGate.waitForDeployment();

  const address = await mcLendOriginationGate.getAddress();
  console.log("✅ McLendOriginationGate deployed to:", address);

  console.log("\n=====================================");
  console.log("Transaction Flow:");
  console.log("1. User borrows netAmount + 1% fee from Aave");
  console.log("2. Fee (1% in USDT) is captured");
  console.log("3. USDT → ETH swap on Uniswap V3 (max 3% slippage)");
  console.log("4. ETH → MCLEND swap on McFun (max 50% slippage)");
  console.log("5. MCLEND tokens burned to dead address");
  console.log("=====================================\n");

  console.log("⚠️  IMPORTANT: Contract is immutable");
  console.log("   - No admin functions");
  console.log("   - No upgradeability");
  console.log("   - All addresses are hardcoded");
  console.log("   - 1% origination fee is fixed\n");

  console.log("To verify on Etherscan, run:");
  console.log(
    `npx hardhat verify --network mainnet ${address} ${AAVE_POOL} ${UNISWAP_ROUTER} ${MCFUN_FACTORY} ${USDT} ${WETH} ${MCLEND} ${VARIABLE_DEBT_USDT}`
  );

  console.log("\nUpdate frontend config:");
  console.log(`MCLEND_ORIGINATION_GATE: '${address}'`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
