# McLend Deployment Guide

This guide walks you through deploying the McLendOriginationGate smart contract to Ethereum mainnet.

## Prerequisites

1. **Funded Ethereum Wallet**: You need ETH for gas fees (estimate ~$50-100 depending on gas prices)
2. **RPC Provider**: Alchemy or Infura API key for mainnet access
3. **Etherscan API Key**: For contract verification (optional but recommended)

## Step 1: Configure Environment

Update your `.env` file with:

```bash
# Your Ethereum mainnet RPC URL
VITE_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Private key of wallet with ETH for deployment (KEEP SECRET!)
PRIVATE_KEY=your_private_key_here

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Security Warning**: Never commit your private key or share it. Use a deployment-specific wallet if possible.

## Step 2: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file with solc 0.8.20 (evm target: shanghai)
```

## Step 3: Run Tests (Optional but Recommended)

```bash
npx hardhat test
```

This will test:
- Contract deployment
- Fee management functions
- Access control
- Security features

## Step 4: Deploy to Mainnet

```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

The deployment script will automatically:
1. Verify that MCLEND token has an active McFun pool (CRITICAL)
2. Deploy the McLendOriginationGate contract
3. Display all configured addresses

Expected output:
```
Deploying McLendOriginationGate...
=====================================
Configuration:
  Aave Pool: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
  Uniswap Router: 0xE592427A0AEce92De3Edee1F18E0157C05861564
  McFun Factory: 0x6E8717dd111Bea3f5B12785798F3d1380c01D72B
  USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
  MCLEND: 0xe03e4d90a46f62ac405708ba5036f292d5e0edc8
  Variable Debt USDT: 0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8
  Origination Fee: 1% (100 BPS)
=====================================

Pre-deployment verification...
✅ McFun pool verified for MCLEND: 0x...
✅ McLendOriginationGate deployed to: 0x...
```

**Important**: If the McFun pool check fails, deployment will abort. Ensure MCLEND has an active pool on McFun before deploying.

**Save the deployed contract address!** You'll need it for the next steps.

## Step 5: Verify Contract on Etherscan

```bash
npx hardhat verify --network mainnet <DEPLOYED_ADDRESS> \
  0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 \
  0xE592427A0AEce92De3Edee1F18E0157C05861564 \
  0x6E8717dd111Bea3f5B12785798F3d1380c01D72B \
  0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 \
  0xe03e4d90a46f62ac405708ba5036f292d5e0edc8 \
  0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8
```

Replace `<DEPLOYED_ADDRESS>` with your actual deployed address.

## Step 6: Update Frontend Configuration

Edit `src/config/contracts.ts` and update:

```typescript
export const ADDRESSES = {
  // ... other addresses
  MCLEND_ORIGINATION_GATE: '0xYOUR_DEPLOYED_ADDRESS_HERE',
  // ... rest
} as const;
```

## Step 7: Test on Mainnet

Before going live:

1. Connect with a test wallet containing small amounts of WBTC/USDT
2. Test deposit flow
3. Test credit delegation approval
4. Test small borrow amount
5. Test repay
6. Test withdraw
7. Verify all transactions on Etherscan

## Step 8: Deploy Frontend

Build the production frontend:

```bash
npm run build
```

Deploy the `dist/` folder to your hosting provider (Vercel, Netlify, etc.).

### Environment Variables for Production

Set these in your hosting platform:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ETHEREUM_RPC_URL=your_mainnet_rpc_url
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
```

## Contract Addresses Reference

These are the Aave V3 mainnet addresses used by McLend:

- **Aave V3 Pool**: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- **Pool Addresses Provider**: `0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e`
- **Protocol Data Provider**: `0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD`
- **WBTC Token**: `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`
- **USDT Token**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **Variable Debt USDT**: `0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8`

## Gas Optimization Tips

1. Deploy during low gas times (weekends, late night UTC)
2. Use gas price estimators like [ETH Gas Station](https://ethgasstation.info/)
3. Set reasonable gas limits in Hardhat config

## Troubleshooting

### "Insufficient funds" error
- Ensure your wallet has enough ETH for deployment (~0.1 ETH should be safe)

### "Nonce too low" error
- Clear Hardhat cache: `npx hardhat clean`
- Try again

### "Invalid API key" error
- Check your RPC URL is correct
- Verify API key is valid and has mainnet access

### Contract verification fails
- Wait a few minutes after deployment
- Ensure constructor arguments match exactly
- Check Etherscan API key is valid

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on Etherscan
- [ ] Frontend updated with contract address
- [ ] Test transactions completed successfully
- [ ] All environment variables configured
- [ ] Frontend deployed to hosting
- [ ] Documentation updated with live addresses
- [ ] Security audit completed (if going public)

## Immutable Design

McLendOriginationGate has NO administrative functions:
- No owner or admin role
- No upgradeability
- No ability to change addresses, fees, or parameters
- Cannot be paused or modified after deployment
- Completely trustless and permissionless

This is intentional for maximum security and transparency.

## Security Considerations

1. **Test Thoroughly**: Always test on testnet first
2. **Start Small**: Begin with small amounts
3. **Monitor Closely**: Watch first few transactions
4. **Audit Code**: Consider professional audit for production
5. **Emergency Plan**: Know how to pause or upgrade if needed
6. **Private Keys**: Use hardware wallet for owner account

## Support

If you encounter issues:
1. Check transaction on Etherscan for error messages
2. Review Hardhat console output
3. Verify all addresses are correct
4. Ensure sufficient gas and funds

## Costs Estimate

Typical deployment costs (at 50 gwei):
- Contract deployment: 0.02-0.04 ETH
- Contract verification: Free
- Total estimate: ~0.04 ETH (~$100-200 depending on ETH price)

Gas prices vary significantly, check current rates before deploying.
