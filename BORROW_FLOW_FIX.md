# Borrow Flow Fix - February 11, 2026

## Problem Identified

The transaction was failing because of a design flaw in the fee collection mechanism:

1. Contract borrowed `grossAmount` (net + fee) from Aave **to the user's wallet**
2. Contract then tried to collect the fee by calling `usdt.safeTransferFrom(msg.sender, address(this), feeAmount)`
3. **This failed** if the user didn't already have USDT in their wallet

The root cause was that first-time borrowers or users without existing USDT balances couldn't pay the fee, causing transaction failures.

## Solution Implemented

The contract now borrows to itself instead of to the user:

### Contract Changes (McLendOriginationGate.sol)

**Before:**
```solidity
// Borrow to user
aavePool.borrow(address(usdt), grossAmount, 2, 0, msg.sender);

// Try to collect fee from user (FAILS if user has no USDT)
usdt.safeTransferFrom(msg.sender, address(this), feeAmount);
```

**After:**
```solidity
// Borrow to contract
aavePool.borrow(address(usdt), grossAmount, 2, 0, address(this));

// Send net amount to user
usdt.safeTransfer(msg.sender, netAmount);

// Fee is already in contract, ready for swapping
```

### Frontend Changes (BorrowUSDT.tsx)

Removed the entire USDT ERC20 approval flow:

- Removed `useReadContract` hook for USDT allowance
- Removed `hasUsdtAllowance` state check
- Removed `handleApproveUSDT` function
- Removed "Step 2: Approve USDT Fee" button
- Simplified UI to show only one setup step: Credit Delegation

## New User Flow

**One-time setup:**
1. Approve credit delegation on Variable Debt Token (allows contract to borrow on your behalf)

**Every borrow transaction:**
1. Contract borrows `grossAmount` from Aave to itself (using your credit delegation)
2. Contract sends `netAmount` to your wallet
3. Contract keeps `feeAmount` and swaps it (USDT → WETH → MCLEND)
4. Contract burns the MCLEND tokens

## Benefits

- **Simpler UX**: Only 1 approval needed instead of 2
- **Works for everyone**: No need to already have USDT to pay the fee
- **More logical**: Fee is taken from borrowed amount, not from pre-existing balance
- **Still atomic**: All steps happen in one transaction with no manual intervention

## Transaction Requirements

Users now only need:
- ✅ Credit delegation approval (one-time)
- ✅ Sufficient collateral in Aave
- ❌ ~~USDT approval (removed)~~
- ❌ ~~Pre-existing USDT balance (removed)~~

## Security Considerations

The contract still maintains all security features:
- ReentrancyGuard protection
- Slippage protection on swaps
- Credit delegation validation
- Residual balance checks
- All operations remain atomic
