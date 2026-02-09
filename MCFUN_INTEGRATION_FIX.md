# McFun Integration Fix

## Summary

Fixed McLend's McFun integration to match the actual production McFun contract deployed on mainnet.

## Problem

The McLend contract was calling `mcFunFactory.getPool(token)` which does not exist on the deployed McFun factory contract at `0x6E8717dd111Bea3f5B12785798F3d1380c01D72B`. This would cause all transactions to revert.

## Solution

Updated the integration to use the actual McFun factory interface:

### McFun Factory Contract Structure

The McFun factory exposes a public mapping:
```solidity
mapping(address => address) public tokenToAMM;
```

This creates an auto-generated getter function:
```solidity
function tokenToAMM(address token) external view returns (address);
```

## Changes Made

### 1. Contract Interface (`contracts/McLendOriginationGate.sol`)

**Before:**
```solidity
interface IMcFunFactory {
    function getPool(address token) external view returns (address);
}
```

**After:**
```solidity
interface IMcFunFactory {
    function tokenToAMM(address token) external view returns (address);
}
```

### 2. Custom Error

Added a new custom error for better error handling:
```solidity
error McFunPoolNotFound(address token);
```

### 3. Contract Logic

**Before:**
```solidity
address mcFunPool = mcFunFactory.getPool(address(mclend));
if (mcFunPool == address(0)) {
    revert InvalidAddress();
}
```

**After:**
```solidity
address mcFunPool = mcFunFactory.tokenToAMM(address(mclend));
if (mcFunPool == address(0)) {
    revert McFunPoolNotFound(address(mclend));
}
```

### 4. Test Files (`test/McLendOriginationGate.fork.test.ts`)

Updated the factory interface call in tests:

**Before:**
```typescript
const mcFunFactory = await ethers.getContractAt(
  ["function getPool(address token) external view returns (address)"],
  MCFUN_FACTORY
);
const mcFunPool = await mcFunFactory.getPool(MCLEND);
```

**After:**
```typescript
const mcFunFactory = await ethers.getContractAt(
  ["function tokenToAMM(address token) external view returns (address)"],
  MCFUN_FACTORY
);
const mcFunAMM = await mcFunFactory.tokenToAMM(MCLEND);
```

### 5. Deployment Script (`scripts/deploy.ts`)

Updated pre-deployment verification:

**Before:**
```typescript
const mcFunPool = await mcFunFactory.getPool(MCLEND);
if (mcFunPool === ethers.ZeroAddress) {
  throw new Error(`CRITICAL: MCLEND token ${MCLEND} does not have a McFun pool. Deployment aborted.`);
}
```

**After:**
```typescript
const mcFunAMM = await mcFunFactory.tokenToAMM(MCLEND);
if (mcFunAMM === ethers.ZeroAddress) {
  throw new Error(`CRITICAL: MCLEND token ${MCLEND} does not have a McFun AMM. Deployment aborted.`);
}
```

### 6. Documentation (`ATOMIC_FEE_FLOW.md`)

Updated interface documentation to reflect the correct McFun factory interface and added a note explaining the mapping structure.

## Verification

✅ Contract compiles successfully with Solidity 0.8.20
✅ New `McFunPoolNotFound` error present in compiled ABI
✅ `IMcFunFactory.tokenToAMM` interface correct in compiled artifacts
✅ Frontend builds successfully (Vite)
✅ All contract logic for swaps, burns, and atomicity unchanged

## Production Addresses

- **McFun Factory**: `0x6E8717dd111Bea3f5B12785798F3d1380c01D72B`
- **McFun AMM (reference)**: `0x5051250fea5fecff9d559aafcf75ad9a115498af` (for MCFUN token)
- **MCLEND Token**: `0xe03e4d90a46f62ac405708ba5036f292d5e0edc8`

## Atomicity Guarantee

All swap logic, slippage protection, and burn mechanisms remain **unchanged**. The fix only updates the factory interface call to match production:

1. ✅ Aave borrow remains atomic
2. ✅ USDT → ETH swap via Uniswap V3 (3% slippage protection)
3. ✅ ETH → MCLEND swap via McFun AMM (50% slippage protection)
4. ✅ MCLEND burn to dead address
5. ✅ Zero residual balance verification

## Testing Notes

- Fork tests should now correctly query the McFun factory using `tokenToAMM`
- Deployment script will properly verify MCLEND has a McFun AMM before deploying
- The contract will revert with `McFunPoolNotFound` if a token doesn't have an AMM

## Next Steps

1. Run fork tests against mainnet to verify AMM detection
2. Deploy to mainnet (contract will verify MCLEND AMM exists)
3. Verify the returned AMM address matches expected McFun AMM for MCLEND
4. Test with small amounts first (100-1000 USDT borrows)

## Hardhat Configuration

Fixed Hardhat 3.x configuration to use `edr-simulated` type for the hardhat network, ensuring proper compilation and testing.
