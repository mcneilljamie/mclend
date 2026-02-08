import { expect } from "chai";
import { ethers } from "hardhat";
import { McLendBorrowGate } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("McLendBorrowGate", function () {
  let mcLendBorrowGate: McLendBorrowGate;
  let owner: SignerWithAddress;
  let feeReceiver: SignerWithAddress;
  let user: SignerWithAddress;
  const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const INITIAL_FEE_BPS = 100;

  beforeEach(async function () {
    [owner, feeReceiver, user] = await ethers.getSigners();

    const McLendBorrowGate = await ethers.getContractFactory("McLendBorrowGate");
    mcLendBorrowGate = await McLendBorrowGate.deploy(
      AAVE_POOL,
      feeReceiver.address,
      INITIAL_FEE_BPS
    );
    await mcLendBorrowGate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct Aave Pool address", async function () {
      expect(await mcLendBorrowGate.aavePool()).to.equal(AAVE_POOL);
    });

    it("Should set the correct fee receiver", async function () {
      expect(await mcLendBorrowGate.feeReceiver()).to.equal(feeReceiver.address);
    });

    it("Should set the correct initial fee BPS", async function () {
      expect(await mcLendBorrowGate.feeBps()).to.equal(INITIAL_FEE_BPS);
    });

    it("Should set the correct owner", async function () {
      expect(await mcLendBorrowGate.owner()).to.equal(owner.address);
    });

    it("Should revert with invalid addresses", async function () {
      const McLendBorrowGate = await ethers.getContractFactory("McLendBorrowGate");
      await expect(
        McLendBorrowGate.deploy(ethers.ZeroAddress, feeReceiver.address, INITIAL_FEE_BPS)
      ).to.be.revertedWithCustomError(mcLendBorrowGate, "InvalidAddress");
    });

    it("Should revert with fee too high", async function () {
      const McLendBorrowGate = await ethers.getContractFactory("McLendBorrowGate");
      await expect(
        McLendBorrowGate.deploy(AAVE_POOL, feeReceiver.address, 501)
      ).to.be.revertedWithCustomError(mcLendBorrowGate, "FeeTooHigh");
    });
  });

  describe("Fee Management", function () {
    it("Should allow owner to update fee receiver", async function () {
      const newReceiver = user.address;
      await expect(mcLendBorrowGate.setFeeReceiver(newReceiver))
        .to.emit(mcLendBorrowGate, "FeeReceiverUpdated")
        .withArgs(feeReceiver.address, newReceiver);
      expect(await mcLendBorrowGate.feeReceiver()).to.equal(newReceiver);
    });

    it("Should allow owner to update fee BPS", async function () {
      const newFeeBps = 200;
      await expect(mcLendBorrowGate.setFeeBps(newFeeBps))
        .to.emit(mcLendBorrowGate, "FeeBpsUpdated")
        .withArgs(INITIAL_FEE_BPS, newFeeBps);
      expect(await mcLendBorrowGate.feeBps()).to.equal(newFeeBps);
    });

    it("Should prevent non-owner from updating fee receiver", async function () {
      await expect(
        mcLendBorrowGate.connect(user).setFeeReceiver(user.address)
      ).to.be.revertedWithCustomError(mcLendBorrowGate, "OwnableUnauthorizedAccount");
    });

    it("Should prevent setting fee above MAX_FEE_BPS", async function () {
      await expect(
        mcLendBorrowGate.setFeeBps(501)
      ).to.be.revertedWithCustomError(mcLendBorrowGate, "FeeTooHigh");
    });

    it("Should prevent setting zero address as fee receiver", async function () {
      await expect(
        mcLendBorrowGate.setFeeReceiver(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(mcLendBorrowGate, "InvalidAddress");
    });
  });

  describe("Constants", function () {
    it("Should have correct MAX_FEE_BPS", async function () {
      expect(await mcLendBorrowGate.MAX_FEE_BPS()).to.equal(500);
    });

    it("Should have correct BPS_DENOMINATOR", async function () {
      expect(await mcLendBorrowGate.BPS_DENOMINATOR()).to.equal(10000);
    });
  });
});
