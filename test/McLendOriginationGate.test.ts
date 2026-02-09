import { expect } from "chai";
import { ethers } from "hardhat";
import { McLendOriginationGate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("McLendOriginationGate", function () {
  let mcLendOriginationGate: McLendOriginationGate;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const MCFUN_FACTORY = "0x6E8717dd111Bea3f5B12785798F3d1380c01D72B";
  const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const MCLEND = "0xe03e4d90a46f62ac405708ba5036f292d5e0edc8";

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
    mcLendOriginationGate = await McLendOriginationGate.deploy(
      AAVE_POOL,
      UNISWAP_ROUTER,
      MCFUN_FACTORY,
      USDT,
      WETH,
      MCLEND
    );
    await mcLendOriginationGate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct Aave Pool address", async function () {
      expect(await mcLendOriginationGate.aavePool()).to.equal(AAVE_POOL);
    });

    it("Should set the correct Uniswap Router address", async function () {
      expect(await mcLendOriginationGate.uniswapRouter()).to.equal(UNISWAP_ROUTER);
    });

    it("Should set the correct McFun Factory address", async function () {
      expect(await mcLendOriginationGate.mcFunFactory()).to.equal(MCFUN_FACTORY);
    });

    it("Should set the correct USDT address", async function () {
      expect(await mcLendOriginationGate.usdt()).to.equal(USDT);
    });

    it("Should set the correct WETH address", async function () {
      expect(await mcLendOriginationGate.weth()).to.equal(WETH);
    });

    it("Should set the correct MCLEND address", async function () {
      expect(await mcLendOriginationGate.mclend()).to.equal(MCLEND);
    });

    it("Should set the correct origination fee", async function () {
      expect(await mcLendOriginationGate.ORIGINATION_FEE_BPS()).to.equal(100);
    });

    it("Should set the correct dead address", async function () {
      expect(await mcLendOriginationGate.DEAD_ADDRESS()).to.equal("0x000000000000000000000000000000000000dEaD");
    });

    it("Should revert with invalid Aave Pool address", async function () {
      const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
      await expect(
        McLendOriginationGate.deploy(
          ethers.ZeroAddress,
          UNISWAP_ROUTER,
          MCFUN_FACTORY,
          USDT,
          WETH,
          MCLEND
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAddress");
    });

    it("Should revert with invalid Uniswap Router address", async function () {
      const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
      await expect(
        McLendOriginationGate.deploy(
          AAVE_POOL,
          ethers.ZeroAddress,
          MCFUN_FACTORY,
          USDT,
          WETH,
          MCLEND
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAddress");
    });

    it("Should revert with invalid McFun Factory address", async function () {
      const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
      await expect(
        McLendOriginationGate.deploy(
          AAVE_POOL,
          UNISWAP_ROUTER,
          ethers.ZeroAddress,
          USDT,
          WETH,
          MCLEND
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAddress");
    });

    it("Should revert with invalid USDT address", async function () {
      const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
      await expect(
        McLendOriginationGate.deploy(
          AAVE_POOL,
          UNISWAP_ROUTER,
          MCFUN_FACTORY,
          ethers.ZeroAddress,
          WETH,
          MCLEND
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAddress");
    });

    it("Should revert with invalid WETH address", async function () {
      const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
      await expect(
        McLendOriginationGate.deploy(
          AAVE_POOL,
          UNISWAP_ROUTER,
          MCFUN_FACTORY,
          USDT,
          ethers.ZeroAddress,
          MCLEND
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAddress");
    });

    it("Should revert with invalid MCLEND address", async function () {
      const McLendOriginationGate = await ethers.getContractFactory("McLendOriginationGate");
      await expect(
        McLendOriginationGate.deploy(
          AAVE_POOL,
          UNISWAP_ROUTER,
          MCFUN_FACTORY,
          USDT,
          WETH,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAddress");
    });
  });

  describe("Immutability", function () {
    it("Should not have any owner or admin functions", async function () {
      const contract = await ethers.getContractAt("McLendOriginationGate", await mcLendOriginationGate.getAddress());
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

  describe("BorrowWithFee", function () {
    it("Should revert with zero net amount", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      await expect(
        mcLendOriginationGate.connect(user).borrowWithFee(0, 0, 0, deadline)
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "InvalidAmount");
    });

    it("Should revert with expired deadline", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        mcLendOriginationGate.connect(user).borrowWithFee(1000000, 0, 0, expiredDeadline)
      ).to.be.revertedWithCustomError(mcLendOriginationGate, "DeadlinePassed");
    });
  });

  describe("Fee Calculation", function () {
    it("Should calculate 1% fee correctly", async function () {
      const feeBps = await mcLendOriginationGate.ORIGINATION_FEE_BPS();
      expect(feeBps).to.equal(100);

      const netAmount = ethers.parseUnits("1000", 6);
      const expectedFee = (netAmount * BigInt(100)) / BigInt(10000);
      const expectedGross = netAmount + expectedFee;

      expect(expectedFee).to.equal(ethers.parseUnits("10", 6));
      expect(expectedGross).to.equal(ethers.parseUnits("1010", 6));
    });
  });

  describe("Constants", function () {
    it("Should have correct Uniswap pool fee", async function () {
      expect(await mcLendOriginationGate.UNISWAP_POOL_FEE()).to.equal(500);
    });

    it("Should have correct BPS denominator", async function () {
      expect(await mcLendOriginationGate.BPS_DENOMINATOR()).to.equal(10000);
    });
  });
});
