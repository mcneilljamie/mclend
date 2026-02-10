# McLend Atomic Fee-Swap-Burn Architecture

## Overview

McLendOriginationGate is an **immutable, permissionless** lending origination wrapper that atomically captures a 0.4% origination fee, swaps it through two DEXs, and burns the acquired tokens. The entire process happens in a single transaction with no manual intervention required.

## Core Principles

### Immutability
- **No admin functions**: Contract has zero governance or admin capabilities
- **No upgradeability**: Once deployed, the contract cannot be modified
- **Hardcoded addresses**: All protocol addresses are set in constructor as immutable variables
- **Fixed fee**: 0.4% origination fee is a constant (40 BPS)

### Atomicity
Every borrow transaction executes the complete flow atomically:
1. Borrow USDT from Aave V3 (gross amount = net amount + 0.4% fee)
2. Capture 0.4% fee in USDT
3. Swap USDT → ETH on Uniswap V3
4. Swap ETH → MCLEND on McFun
5. Burn MCLEND to dead address

If ANY step fails, the ENTIRE transaction reverts. No partial execution is possible.

## Transaction Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Initiates Borrow                         │
│          borrowWithFee(netAmount, minEthOut, minMclendOut, deadline) │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Step 1: Calculate Amounts                       │
│  • feeAmount = netAmount × 40 / 10000 (0.4%)                          │
│  • grossAmount = netAmount + feeAmount                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Step 2: Borrow from Aave V3                       │
│  • aavePool.borrow(USDT, grossAmount, onBehalfOf: user)            │
│  • User receives borrowed USDT tokens                               │
│  • User now has debt position on Aave                               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Step 3: Capture Fee in Contract                    │
│  • usdt.transferFrom(user, contract, feeAmount)                    │
│  • Contract now holds 0.4% fee in USDT                                │
│  • User keeps netAmount of USDT                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Step 4: Swap USDT → WETH (Uniswap V3)                  │
│  • usdt.approve(uniswapRouter, feeAmount)                          │
│  • uniswapRouter.exactInputSingle({                                │
│      tokenIn: USDT,                                                │
│      tokenOut: WETH,                                               │
│      fee: 500 (0.05% pool),                                        │
│      amountIn: feeAmount,                                          │
│      amountOutMinimum: minEthOut (3% slippage protection)          │
│    })                                                              │
│  • Contract receives WETH                                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Step 5: Unwrap WETH → ETH                       │
│  • weth.withdraw(ethReceived)                                      │
│  • Contract now holds native ETH                                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Step 6: Swap ETH → MCLEND (McFun)                      │
│  • Get McFun AMM address for MCLEND                                │
│  • mcFunAMM.swapETHForToken{value: ethReceived}(minMclendOut)     │
│  • Contract receives MCLEND tokens                                 │
│  • 50% slippage protection for volatile McFun markets              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Step 7: Burn MCLEND Tokens                       │
│  • mclend.transfer(DEAD_ADDRESS, mclendReceived)                   │
│  • MCLEND permanently removed from circulation                     │
│  • Dead address: 0x000000000000000000000000000000000000dEaD        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Transaction Complete ✓                         │
│  • User has netAmount USDT                                         │
│  • User has debt on Aave for grossAmount USDT                      │
│  • MCLEND tokens burned                                            │
│  • All events emitted for tracking                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Smart Contract Architecture

### McLendOriginationGate.sol

**Immutable State Variables:**
- `aavePool`: Aave V3 Pool for borrowing
- `uniswapRouter`: Uniswap V3 SwapRouter for USDT→WETH
- `mcFunFactory`: McFun Factory to get pool addresses
- `usdt`: USDT token contract
- `weth`: WETH token contract
- `mclend`: MCLEND token contract

**Constants:**
- `ORIGINATION_FEE_BPS = 40` (0.4%)
- `BPS_DENOMINATOR = 10000`
- `UNISWAP_POOL_FEE = 500` (0.05%)
- `DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD`

**Main Function:**
```solidity
function borrowWithFee(
    uint256 netAmount,      // Amount user receives
    uint256 minEthOut,      // Minimum ETH from USDT swap (slippage)
    uint256 minMclendOut,   // Minimum MCLEND from ETH swap (slippage)
    uint256 deadline        // Transaction deadline
) external nonReentrant
```

**Events:**
- `BorrowExecuted`: Emitted when Aave borrow succeeds
- `FeeCollected`: Emitted when fee is captured in contract
- `SwapExecuted`: Emitted for both USDT→ETH and ETH→MCLEND swaps
- `TokensBurned`: Emitted when MCLEND is burned

### Interface Definitions

**IPool (Aave V3):**
```solidity
interface IPool {
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;
}
```

**ISwapRouter (Uniswap V3):**
```solidity
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);
}
```

**IMcFunFactory:**
```solidity
interface IMcFunFactory {
    function tokenToAMM(address token) external view returns (address);
}
```

**Note**: The McFun factory exposes a public mapping `mapping(address => address) public tokenToAMM` which provides an auto-generated getter function. This returns the AMM contract address for a given token.

**IMcFunAMM:**
```solidity
interface IMcFunAMM {
    function swapETHForToken(uint256 minTokenOut) external payable returns (uint256 tokenOut);
}
```

**Note**: The McFun AMM uses `swapETHForToken` as its swap function, which accepts ETH (msg.value) and a minimum token output for slippage protection.

## Slippage Protection

### USDT → ETH (Uniswap V3)
- **Max Slippage**: 3% (300 BPS)
- **Calculation**: `minEthOut = feeAmount × 0.97 × USDT_ETH_PRICE`
- **Rationale**: Uniswap V3 USDT/WETH pools are highly liquid with tight spreads

### ETH → MCLEND (McFun)
- **Max Slippage**: 50% (5000 BPS)
- **Calculation**: `minMclendOut = ethReceived × 0.5 × ETH_MCLEND_PRICE`
- **Rationale**: McFun is a bonding curve DEX with potential for higher slippage on smaller tokens

## Gas Optimization

### Efficient Approvals
- Single approval per swap (not unlimited)
- Approvals happen immediately before swaps
- No wasted approval calls

### Minimal Storage
- All addresses are immutable (cheaper SLOAD)
- Constants use compile-time values
- No state variables that change

### Direct Transfers
- WETH unwrap avoids extra WETH balance checks
- Direct burn to dead address (no intermediate transfers)

## Security Considerations

### Reentrancy Protection
- `ReentrancyGuard` on main function
- All external calls follow checks-effects-interactions pattern
- ETH receive function accepts but doesn't execute logic

### Slippage Protection
- User-provided minimum outputs prevent sandwich attacks
- Deadline parameter prevents stale transaction execution
- Multi-step validation ensures expected amounts

### Immutability Benefits
- No admin can rug pull or change behavior
- No upgrade vectors for attackers
- Code is auditable forever

### Potential Risks
1. **Oracle Manipulation**: No price oracles used, slippage is user-controlled
2. **McFun Pool Issues**: If McFun pool doesn't exist, transaction reverts
3. **WETH Unwrap Failure**: Would cause transaction to revert
4. **Burn Transfer Failure**: Would cause transaction to revert

All risks result in transaction reversion (atomicity guarantee).

## Deployment

### Mainnet Addresses
```
Aave Pool:        0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
Uniswap Router:   0xE592427A0AEce92De3Edee1F18E0157C05861564
McFun Factory:    0x6E8717dd111Bea3f5B12785798F3d1380c01D72B
USDT:             0xdAC17F958D2ee523a2206206994597C13D831ec7
WETH:             0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
MCLEND:           0xe03e4d90a46f62ac405708ba5036f292d5e0edc8
```

### Deploy Command
```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

### Verify Command
```bash
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> \
  0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 \
  0xE592427A0AEce92De3Edee1F18E0157C05861564 \
  0x6E8717dd111Bea3f5B12785798F3d1380c01D72B \
  0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 \
  0xe03e4d90a46f62ac405708ba5036f292d5e0edc8
```

## Frontend Integration

### Prerequisites
1. User must have WBTC deposited as collateral on Aave
2. User must approve credit delegation to McLendOriginationGate (VariableDebtUSDT.approveDelegation)
3. User must approve USDT transfer to McLendOriginationGate for fee collection
4. User must have sufficient borrowing capacity

### Credit Delegation Flow
**Required before first borrow:**
```solidity
// Step 1: Approve credit delegation (one-time, can use max)
variableDebtUSDT.approveDelegation(mcLendOriginationGate, type(uint256).max);

// Step 2: Approve USDT for fee collection
usdt.approve(mcLendOriginationGate, feeAmount);

// Step 3: Execute borrow
mcLendOriginationGate.borrowWithFee(netAmount, minEthOut, minMclendOut, deadline);
```

### Transaction Parameters
```typescript
const netAmount = parseUnits("1000", 6); // 1000 USDT net
const feeAmount = (netAmount * 40n) / 10000n; // 4 USDT fee
const minEthOut = calculateMinEthOut(feeAmount, 0.03); // 3% slippage
const minMclendOut = calculateMinMclendOut(minEthOut, 0.50); // 50% slippage
const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

await contract.borrowWithFee(netAmount, minEthOut, minMclendOut, deadline);
```

### Event Monitoring
Monitor emitted events to track the complete flow:
- `BorrowExecuted`: Confirms Aave borrow
- `FeeCollected`: Confirms fee capture
- `SwapExecuted` (USDT→WETH): First swap complete
- `SwapExecuted` (ETH→MCLEND): Second swap complete
- `TokensBurned`: Final burn confirmation

## USDT Compatibility & SafeERC20

### Why USDT Requires Special Handling
USDT on Ethereum mainnet has a non-standard ERC20 implementation:
- `approve()` and `transferFrom()` return `void` instead of `bool` on some methods
- `approve()` requires existing allowance to be 0 before setting a new value
- Direct usage can cause silent failures

### SafeERC20 Solution
McLendOriginationGate uses OpenZeppelin's SafeERC20 library:
```solidity
using SafeERC20 for IERC20;

// Instead of: usdt.approve(router, amount)
usdt.forceApprove(router, amount);  // Handles USDT edge cases

// Instead of: usdt.transferFrom(user, contract, amount)
usdt.safeTransferFrom(user, contract, amount);  // Reverts on failure

// Instead of: mclend.transfer(dead, amount)
mclend.safeTransfer(dead, amount);  // Ensures success
```

**Benefits:**
- Automatic handling of non-standard returns
- Safe approval with `forceApprove` (approve(0) then approve(amount))
- Guaranteed revert on failure (no silent failures)
- Mainnet-proven safety

## Comparison with Previous System

| Feature | McLendBorrowGate (DELETED) | McLendOriginationGate (Current) |
|---------|------------------------|----------------------------|
| Status | Removed - Incorrect Implementation | Active - Production Ready |
| Admin Functions | Yes (Ownable) | None |
| Fee Destination | Treasury address | Burned via atomic swap |
| Upgradeability | Owner can change fee/receiver | Immutable |
| Fee Processing | Manual, nonsensical transfer | Automatic atomic swap+burn |
| Swap Integration | None | Uniswap V3 + McFun |
| Burn Mechanism | None | Automatic MCLEND burn |
| SafeERC20 | No | Yes - USDT compatible |
| Credit Delegation | Not properly implemented | Fully implemented with checks |
| Governance | Required | Not needed |
| Transparency | Low | Maximum |

## Testing

Run comprehensive test suite:
```bash
npx hardhat test test/McLendOriginationGate.test.ts
```

Tests cover:
- Deployment validation
- Immutability verification
- Fee calculation accuracy
- Error handling
- Constant values

## Audit Checklist

- [x] No admin functions
- [x] No upgradeability
- [x] Reentrancy protection
- [x] Slippage protection
- [x] Deadline protection
- [x] Atomic execution
- [x] Event emissions
- [x] Input validation
- [x] Error handling
- [x] Immutable addresses

## License

MIT
