# McLend Origination Gate Deployment Summary

**Date:** February 11, 2026
**Network:** Ethereum Mainnet (Chain ID: 1)

## Deployed Contract

**Contract Address:** `0x66d1e94eE4F0b70057D7a211995E9AB1F7853f0B`

**Deployer:** `0x72550E26B02E8630Ca6DAa96C7E1bAa07c215d02`

**Transaction Details:**
- Gas Limit: 5,000,000
- Max Fee Per Gas: 1.2 gwei
- Max Priority Fee: 0.3 gwei

## Contract Configuration

The contract has been deployed with the following immutable parameters:

| Parameter | Address |
|-----------|---------|
| Aave Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Uniswap V3 Router | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| McFun Factory | `0x6E8717dd111Bea3f5B12785798F3d1380c01D72B` |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| MCLEND | `0xe03e4d90a46f62ac405708ba5036f292d5e0edc8` |
| Variable Debt USDT | `0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8` |

**Origination Fee:** 0.4% (40 basis points) - Fixed and immutable

## Key Features

### 1. Atomic Fee Processing
All steps occur in a single transaction:
1. Borrow USDT from Aave (to contract)
2. Transfer net amount to user
3. Swap fee: USDT → WETH (Uniswap V3)
4. Unwrap WETH to ETH
5. Swap ETH → MCLEND (McFun AMM)
6. Burn MCLEND tokens

### 2. Critical Fix Deployed
This deployment includes the fix for the borrow flow issue:
- Contract now borrows to itself instead of the user
- Eliminates need for users to pre-approve USDT spending
- Removes requirement for users to have existing USDT balance
- Simplifies user experience to single approval (credit delegation only)

### 3. Security Features
- ReentrancyGuard protection
- Slippage protection on all swaps
- Credit delegation validation
- Residual balance checks
- No admin functions (immutable)
- No upgradeability

## Verification

To verify the contract on Etherscan, run:

```bash
npx hardhat verify --network mainnet 0x66d1e94eE4F0b70057D7a211995E9AB1F7853f0B \
  0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 \
  0xE592427A0AEce92De3Edee1F18E0157C05861564 \
  0x6E8717dd111Bea3f5B12785798F3d1380c01D72B \
  0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 \
  0xe03e4d90a46f62ac405708ba5036f292d5e0edc8 \
  0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8
```

## Frontend Integration

The frontend configuration has been updated with the new contract address in:
- `src/config/contracts.ts` → `MCLEND_ORIGINATION_GATE: '0x66d1e94eE4F0b70057D7a211995E9AB1F7853f0B'`

## User Requirements

To use the protocol, users must:
1. Have collateral deposited in Aave V3
2. Approve credit delegation to the contract (one-time)
3. ~~Approve USDT spending~~ (REMOVED - no longer needed)

## Important Notes

⚠️ **Contract Immutability**
- No admin functions
- No upgradeability
- All addresses are hardcoded
- Fee rate is fixed at 0.4%

⚠️ **Old Contract**
The previous contract at `0xA81f7a10Ae6617AE0F9D64c895e0a1e3cB9e47e8` is now deprecated and should not be used.

## Links

- **Contract on Etherscan:** https://etherscan.io/address/0x66d1e94eE4F0b70057D7a211995E9AB1F7853f0B
- **Old Contract:** https://etherscan.io/address/0xA81f7a10Ae6617AE0F9D64c895e0a1e3cB9e47e8 (deprecated)
- **Aave V3 Pool:** https://etherscan.io/address/0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
- **McFun Factory:** https://etherscan.io/address/0x6E8717dd111Bea3f5B12785798F3d1380c01D72B

## Testing Recommendations

Before promoting to production:
1. Test credit delegation approval
2. Test small borrow transaction (e.g., $100 USDT)
3. Verify USDT received in wallet
4. Verify debt token balance in Aave
5. Check transaction history on Etherscan
6. Monitor for any slippage or swap failures

## Next Steps

1. ✅ Contract deployed
2. ✅ Frontend updated
3. ✅ Build successful
4. ⏳ Verify contract on Etherscan
5. ⏳ Test on mainnet with real funds
6. ⏳ Monitor first transactions
7. ⏳ Update documentation
