import { expect } from "chai";
import { ethers } from "hardhat";
import { McLendOriginationGate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("McLendOriginationGate - Mainnet Fork Tests", function () {
  let mcLendOriginationGate: McLendOriginationGate;
  let user: SignerWithAddress;
  let wbtcWhale: SignerWithAddress;

  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const MCFUN_FACTORY = "0x6E8717dd111Bea3f5B12785798F3d1380c01D72B";
  const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const MCLEND = "0x2b5876068e36c9781f49d1b7aa1f8dc667b5e0d8";
  const VARIABLE_DEBT_USDT = "0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8";
  const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  const WBTC_WHALE = "0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8";

  this.timeout(120000);

  beforeEach(async function () {
    [user] = await ethers.getSigners();

    await ethers.provider.send("hardhat_impersonateAccount", [WBTC_WHALE]);
    wbtcWhale = await ethers.getSigner(WBTC_WHALE);

    await user.sendTransaction({
      to: WBTC_WHALE,
      value: ethers.parseEther("10")
    });

    const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
    mcLendOriginationGate = await McLendOriginationGate.deploy(
      AAVE_POOL,
      UNISWAP_ROUTER,
      MCFUN_FACTORY,
      USDT,
      WETH,
      MCLEND,
      VARIABLE_DEBT_USDT
    );
    await mcLendOriginationGate.waitForDeployment();
  });

  async function setupCollateral(userAddress: string, wbtcAmount: bigint) {
    const wbtc = await ethers.getContractAt("IERC20", WBTC);

    const aavePoolAbi = [
      "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
      "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external"
    ];
    const aavePool = await ethers.getContractAt(aavePoolAbi, AAVE_POOL);

    await wbtc.connect(wbtcWhale).transfer(userAddress, wbtcAmount);

    const userSigner = await ethers.getSigner(userAddress);
    await wbtc.connect(userSigner).approve(AAVE_POOL, wbtcAmount);

    await aavePool.connect(userSigner).supply(
      WBTC,
      wbtcAmount,
      userAddress,
      0
    );
  }

  describe("End-to-End Borrow Flow", function () {
    it("Should execute full borrow with fee, swap, and burn flow", async function () {
      const netAmount = ethers.parseUnits("1000", 6);
      const feeAmount = (netAmount * 100n) / 10000n;
      const grossAmount = netAmount + feeAmount;

      const mcFunFactory = await ethers.getContractAt(
        ["function tokenToAMM(address token) external view returns (address)"],
        MCFUN_FACTORY
      );
      const mcFunAMM = await mcFunFactory.tokenToAMM(MCLEND);
      console.log("McFun AMM for MCLEND:", mcFunAMM);
      expect(mcFunAMM).to.not.equal(ethers.ZeroAddress, "MCLEND must have a McFun AMM");

      const wbtcAmount = ethers.parseUnits("1", 8);
      await setupCollateral(user.address, wbtcAmount);

      const variableDebtToken = await ethers.getContractAt(
        "IVariableDebtToken",
        VARIABLE_DEBT_USDT
      );
      await variableDebtToken.connect(user).approveDelegation(
        await mcLendOriginationGate.getAddress(),
        ethers.MaxUint256
      );

      const usdt = await ethers.getContractAt("IERC20", USDT);
      const mclend = await ethers.getContractAt("IERC20", MCLEND);

      const userUsdtBefore = await usdt.balanceOf(user.address);
      const deadMclendBefore = await mclend.balanceOf(DEAD_ADDRESS);
      const gateUsdtBefore = await usdt.balanceOf(await mcLendOriginationGate.getAddress());
      const gateMclendBefore = await mclend.balanceOf(await mcLendOriginationGate.getAddress());

      await usdt.connect(user).approve(await mcLendOriginationGate.getAddress(), feeAmount);

      const ETH_USD_PRICE = 3000n;
      const USDT_TO_ETH_DECIMALS_ADJUSTMENT = 10n ** 12n;
      const BPS_DENOMINATOR = 10000n;
      const USDT_TO_ETH_SLIPPAGE_BPS = 300n;
      const ETH_TO_MCLEND_SLIPPAGE_BPS = 5000n;

      const ethEstimate = (feeAmount * USDT_TO_ETH_DECIMALS_ADJUSTMENT) / ETH_USD_PRICE;
      const minEthOut = (ethEstimate * (BPS_DENOMINATOR - USDT_TO_ETH_SLIPPAGE_BPS)) / BPS_DENOMINATOR;
      const minMclendOut = (ethEstimate * (BPS_DENOMINATOR - ETH_TO_MCLEND_SLIPPAGE_BPS)) / BPS_DENOMINATOR;

      const deadline = Math.floor(Date.now() / 1000) + 1200;

      const tx = await mcLendOriginationGate.connect(user).borrowWithFee(
        netAmount,
        minEthOut,
        minMclendOut,
        deadline
      );

      const receipt = await tx.wait();

      const userUsdtAfter = await usdt.balanceOf(user.address);
      const deadMclendAfter = await mclend.balanceOf(DEAD_ADDRESS);
      const gateUsdtAfter = await usdt.balanceOf(await mcLendOriginationGate.getAddress());
      const gateMclendAfter = await mclend.balanceOf(await mcLendOriginationGate.getAddress());
      const gateWethBalance = await ethers.provider.getBalance(await mcLendOriginationGate.getAddress());

      expect(userUsdtAfter - userUsdtBefore).to.be.closeTo(netAmount, ethers.parseUnits("1", 6));

      expect(gateUsdtAfter).to.be.lte(1);
      expect(gateMclendAfter).to.be.lte(1);
      expect(gateWethBalance).to.be.lte(1);

      expect(deadMclendAfter).to.be.gt(deadMclendBefore);

      const borrowExecutedEvent = receipt?.logs.find(
        log => {
          try {
            const parsed = mcLendOriginationGate.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            return parsed?.name === "BorrowExecuted";
          } catch {
            return false;
          }
        }
      );
      expect(borrowExecutedEvent).to.not.be.undefined;
    });

    it("Should revert if credit delegation is insufficient", async function () {
      const netAmount = ethers.parseUnits("1000", 6);
      const wbtcAmount = ethers.parseUnits("1", 8);
      await setupCollateral(user.address, wbtcAmount);

      const minEthOut = 0n;
      const minMclendOut = 0n;
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      await expect(
        mcLendOriginationGate.connect(user).borrowWithFee(
          netAmount,
          minEthOut,
          minMclendOut,
          deadline
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InsufficientCreditDelegation");
    });

    it("Should revert if slippage protection is breached (minEthOut too high)", async function () {
      const netAmount = ethers.parseUnits("1000", 6);
      const feeAmount = (netAmount * 100n) / 10000n;
      const wbtcAmount = ethers.parseUnits("1", 8);
      await setupCollateral(user.address, wbtcAmount);

      const variableDebtToken = await ethers.getContractAt(
        "IVariableDebtToken",
        VARIABLE_DEBT_USDT
      );
      await variableDebtToken.connect(user).approveDelegation(
        await mcLendOriginationGate.getAddress(),
        ethers.MaxUint256
      );

      const usdt = await ethers.getContractAt("IERC20", USDT);
      await usdt.connect(user).approve(await mcLendOriginationGate.getAddress(), feeAmount);

      const minEthOut = ethers.parseUnits("1000", 18);
      const minMclendOut = 0n;
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      await expect(
        mcLendOriginationGate.connect(user).borrowWithFee(
          netAmount,
          minEthOut,
          minMclendOut,
          deadline
        )
      ).to.be.reverted;
    });

    it("Should handle USDT approval edge cases correctly", async function () {
      const netAmount = ethers.parseUnits("1000", 6);
      const feeAmount = (netAmount * 100n) / 10000n;
      const wbtcAmount = ethers.parseUnits("1", 8);
      await setupCollateral(user.address, wbtcAmount);

      const variableDebtToken = await ethers.getContractAt(
        "IVariableDebtToken",
        VARIABLE_DEBT_USDT
      );
      await variableDebtToken.connect(user).approveDelegation(
        await mcLendOriginationGate.getAddress(),
        ethers.MaxUint256
      );

      const usdt = await ethers.getContractAt("IERC20", USDT);

      await usdt.connect(user).approve(await mcLendOriginationGate.getAddress(), feeAmount / 2n);

      const minEthOut = 0n;
      const minMclendOut = 0n;
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      await expect(
        mcLendOriginationGate.connect(user).borrowWithFee(
          netAmount,
          minEthOut,
          minMclendOut,
          deadline
        )
      ).to.be.reverted;
    });
  });

  describe("Helper View Functions", function () {
    it("Should calculate required delegation correctly", async function () {
      const netAmount = ethers.parseUnits("1000", 6);
      const required = await mcLendOriginationGate.getRequiredDelegation(netAmount);

      const expectedFee = (netAmount * 100n) / 10000n;
      const expectedGross = netAmount + expectedFee;

      expect(required).to.equal(expectedGross);
    });

    it("Should check user delegation status correctly", async function () {
      const wbtcAmount = ethers.parseUnits("1", 8);
      await setupCollateral(user.address, wbtcAmount);

      const variableDebtToken = await ethers.getContractAt(
        "IVariableDebtToken",
        VARIABLE_DEBT_USDT
      );

      const netAmount = ethers.parseUnits("1000", 6);

      let [sufficient, required, current] = await mcLendOriginationGate.checkUserDelegation(
        user.address,
        netAmount
      );
      expect(sufficient).to.be.false;

      await variableDebtToken.connect(user).approveDelegation(
        await mcLendOriginationGate.getAddress(),
        ethers.MaxUint256
      );

      [sufficient, required, current] = await mcLendOriginationGate.checkUserDelegation(
        user.address,
        netAmount
      );
      expect(sufficient).to.be.true;
      expect(current).to.equal(ethers.MaxUint256);
    });
  });

  describe("Balance Verification", function () {
    it("Should leave no residual balances after successful operation", async function () {
      const netAmount = ethers.parseUnits("1000", 6);
      const feeAmount = (netAmount * 100n) / 10000n;
      const wbtcAmount = ethers.parseUnits("1", 8);
      await setupCollateral(user.address, wbtcAmount);

      const variableDebtToken = await ethers.getContractAt(
        "IVariableDebtToken",
        VARIABLE_DEBT_USDT
      );
      await variableDebtToken.connect(user).approveDelegation(
        await mcLendOriginationGate.getAddress(),
        ethers.MaxUint256
      );

      const usdt = await ethers.getContractAt("IERC20", USDT);
      await usdt.connect(user).approve(await mcLendOriginationGate.getAddress(), feeAmount);

      const minEthOut = 0n;
      const minMclendOut = 0n;
      const deadline = Math.floor(Date.now() / 1000) + 1200;

      await mcLendOriginationGate.connect(user).borrowWithFee(
        netAmount,
        minEthOut,
        minMclendOut,
        deadline
      );

      const gateAddress = await mcLendOriginationGate.getAddress();
      const weth = await ethers.getContractAt("IERC20", WETH);
      const mclend = await ethers.getContractAt("IERC20", MCLEND);

      const usdtBalance = await usdt.balanceOf(gateAddress);
      const wethBalance = await weth.balanceOf(gateAddress);
      const ethBalance = await ethers.provider.getBalance(gateAddress);
      const mclendBalance = await mclend.balanceOf(gateAddress);

      expect(usdtBalance).to.be.lte(1);
      expect(wethBalance).to.be.lte(1);
      expect(ethBalance).to.be.lte(1);
      expect(mclendBalance).to.be.lte(1);
    });
  });

  describe("Contract Immutability", function () {
    it("Should have no owner or admin functions", async function () {
      const contract = await ethers.getContractAt(
        "McLendOriginationGate",
        await mcLendOriginationGate.getAddress()
      );
      const abi = contract.interface.fragments;

      const adminFunctions = abi.filter((fragment: any) => {
        if (fragment.type !== 'function') return false;
        const name = fragment.name.toLowerCase();
        return name.includes('owner') ||
               name.includes('admin') ||
               name.includes('set') ||
               name.includes('update') ||
               name.includes('pause') ||
               name.includes('upgrade');
      });

      expect(adminFunctions.length).to.equal(0, "Contract should have no admin functions");
    });
  });
});
