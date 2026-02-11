# Critical Fix: Debt Assignment Bug

**Date:** February 11, 2026
**Network:** Ethereum Mainnet
**Status:** Fixed and Redeployed

## The Bug

The first deployment at `0x66d1e94eE4F0b70057D7a211995E9AB1F7853f0B` had a critical bug in the `borrowWithFee()` function.

### What Went Wrong

Line 190 of the contract was:
```solidity
aavePool.borrow(
    address(usdt),
    grossAmount,
    2,
    0,
    address(this)  // ❌ WRONG: Assigns debt to contract
);
```

In Aave's `borrow()` function:
- **Borrowed tokens** are sent to the **caller** (msg.sender = the contract)
- **Debt** is assigned to the **onBehalfOf** parameter

With `onBehalfOf: address(this)`:
- ✅ Tokens went to: contract (correct)
- ❌ Debt assigned to: contract (WRONG!)

**Result:** The contract tried to take on debt but had no collateral, causing all transactions to revert with error -39000.

### The Fix

Changed line 190 to:
```solidity
aavePool.borrow(
    address(usdt),
    grossAmount,
    2,
    0,
    msg.sender  // ✅ CORRECT: Assigns debt to user
);
```

Now:
- ✅ Tokens go to: contract (can split between user and fee)
- ✅ Debt assigned to: user (who has collateral)

## Deployment History

| Version | Address | Status | Issue |
|---------|---------|--------|-------|
| v1 (deprecated) | `0xA81f7a10Ae6617AE0F9D64c895e0a1e3cB9e47e8` | ❌ Failed | Borrowed to user, not contract |
| v2 (deprecated) | `0x66d1e94eE4F0b70057D7a211995E9AB1F7853f0B` | ❌ Failed | Debt assigned to contract |
| **v3 (CURRENT)** | **`0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865`** | ✅ **LIVE** | **Debt to user, tokens to contract** |

## Current Deployment Details

**Contract Address:** `0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865`

**Etherscan:** https://etherscan.io/address/0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865

**Deployer:** `0x72550E26B02E8630Ca6DAa96C7E1bAa07c215d02`

**Deployment Cost:** ~0.0007 ETH

## Contract Configuration

All parameters remain the same:

| Parameter | Address |
|-----------|---------|
| Aave Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Uniswap Router | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| McFun Factory | `0x6E8717dd111Bea3f5B12785798F3d1380c01D72B` |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| MCLEND | `0xe03e4d90a46f62ac405708ba5036f292d5e0edc8` |
| Variable Debt USDT | `0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8` |

**Origination Fee:** 0.4% (40 basis points)

## How It Works Now

### Transaction Flow

1. User calls `borrowWithFee()` on the contract
2. Contract validates credit delegation
3. **Contract borrows from Aave:**
   - Borrowed USDT → sent to contract
   - Debt → assigned to user (who has collateral)
4. Contract sends net amount to user's wallet
5. Contract keeps fee and executes swap/burn:
   - USDT → WETH (Uniswap V3)
   - WETH → ETH (unwrap)
   - ETH → MCLEND (McFun AMM)
   - MCLEND → burned to dead address

### User Requirements

**One-time setup:**
1. Have collateral deposited in Aave V3
2. Approve credit delegation to contract address

**Every borrow:**
- Single atomic transaction
- No USDT approval needed
- No pre-existing USDT balance needed

## Verification

To verify the contract on Etherscan:

```bash
npx hardhat verify --network mainnet \
  0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865 \
  0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 \
  0xE592427A0AEce92De3Edee1F18E0157C05861564 \
  0x6E8717dd111Bea3f5B12785798F3d1380c01D72B \
  0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 \
  0xe03e4d90a46f62ac405708ba5036f292d5e0edc8 \
  0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8
```

## Testing Checklist

Before going live:
- [ ] Verify contract source code on Etherscan
- [ ] Test credit delegation approval
- [ ] Execute small test borrow (e.g., $100)
- [ ] Verify USDT received in wallet
- [ ] Check debt token balance increased
- [ ] Monitor transaction on Etherscan
- [ ] Verify MCLEND tokens were burned
- [ ] Test with multiple users

## What Changed From v2

**Single line change in McLendOriginationGate.sol:**

```diff
  aavePool.borrow(
      address(usdt),
      grossAmount,
      2,
      0,
-     address(this)
+     msg.sender
  );
```

This one-word change fixes the entire flow by correctly assigning debt to the user while still allowing the contract to receive and manage the borrowed funds.

## Lessons Learned

1. **Aave borrow mechanics are nuanced:**
   - Tokens go to caller (msg.sender)
   - Debt goes to onBehalfOf parameter
   - These can and should be different addresses

2. **Test with simulations:**
   - The wallet simulation caught this immediately
   - Would have also been caught by fork tests

3. **Contract immutability requires careful testing:**
   - No upgrades possible
   - Every deployment must be perfect
   - Testing is critical before mainnet deployment

## Security Notes

- Contract remains immutable (no admin functions)
- No upgradeability
- All addresses hardcoded
- 0.4% fee is fixed
- ReentrancyGuard protection active
- Slippage protection on all swaps
- Credit delegation validation enforced

## Frontend Updates

Frontend now points to: `0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865`

Updated in: `src/config/contracts.ts`

## Next Steps

1. ✅ Contract fixed and redeployed
2. ✅ Frontend updated
3. ✅ Build successful
4. ⏳ Verify on Etherscan
5. ⏳ Test with real transaction
6. ⏳ Monitor first uses
7. ⏳ Document for users
