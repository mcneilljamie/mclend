# McLend - WBTC Collateral, USDT Borrowing on Aave V3

McLend is a production-ready decentralized lending application built on Aave V3 Ethereum mainnet. Users can deposit WBTC as collateral and borrow USDT with a 0.4% origination fee charged by the McLend protocol.

## Features

- **Non-Custodial**: Your WBTC collateral stays in Aave's battle-tested protocol
- **Credit Delegation**: Secure borrowing through Aave's credit delegation mechanism
- **Health Factor Monitoring**: Real-time warnings to prevent liquidation
- **0.4% Origination Fee**: Transparent fee structure on borrowing
- **WBTC Only**: Simplified collateral management with WBTC
- **USDT Only**: Focus on stablecoin borrowing

## Architecture

### Smart Contract: McLendOriginationGate

The `McLendOriginationGate.sol` contract is an immutable, permissionless lending origination wrapper that atomically:
1. Borrows USDT from Aave V3 on behalf of user
2. Captures 0.4% origination fee
3. Swaps fee through Uniswap V3 (USDT→WETH→ETH) and McFun (ETH→MCLEND)
4. Burns MCLEND tokens to dead address

**Key Features:**
- **Immutable**: No admin functions, no upgradeability, no governance
- **Atomic**: Entire flow executes in single transaction or reverts
- **Trustless**: Code is law, no human intervention possible
- **USDT-Safe**: Uses OpenZeppelin SafeERC20 for USDT compatibility
- **Credit Delegation**: Secure borrowing through Aave V3
- **Auto-Burn**: Fee converted to MCLEND and burned automatically

**Mainnet Addresses:**
- Aave V3 Pool: `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2`
- Uniswap Router: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- McFun Factory: `0x6E8717dd111Bea3f5B12785798F3d1380c01D72B`
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- MCLEND: `0xe03e4d90a46f62ac405708ba5036f292d5e0edc8`
- Variable Debt USDT: `0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8`

### Frontend Application

Built with:
- **React + TypeScript**: Type-safe component development
- **Wagmi + Viem**: Web3 wallet connection and contract interactions
- **TailwindCSS**: Responsive, production-ready styling
- **Supabase**: Analytics and user action tracking
- **Lucide Icons**: Clean, professional iconography

## Setup Instructions

### 1. Environment Variables

Create or update `.env` file with:

```bash
# Supabase (Already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Ethereum Mainnet RPC
VITE_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# WalletConnect Project ID
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# For contract deployment only
PRIVATE_KEY=your_private_key_for_deployment
```

**Get API Keys:**
- Ethereum RPC: [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)
- WalletConnect: [WalletConnect Cloud](https://cloud.walletconnect.com/)

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy Smart Contract

Compile contracts:
```bash
npx hardhat compile
```

Run tests:
```bash
npx hardhat test
```

Deploy to mainnet (requires funded wallet):
```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

After deployment, update `MCLEND_ORIGINATION_GATE` address in `src/config/contracts.ts`.

### 4. Run Development Server

```bash
npm run dev
```

## User Flow

### Step 1: Deposit WBTC Collateral
1. Connect wallet (MetaMask or WalletConnect)
2. Enter WBTC amount to deposit
3. Approve WBTC spending (if needed)
4. Confirm deposit transaction
5. WBTC is supplied to Aave V3 Pool

### Step 2: Approve Credit Delegation (One-Time)
1. Approve Variable Debt USDT delegation to McLendOriginationGate
2. Can use max approval for unlimited future borrows
3. Revocable at any time by user
4. Required: allows McLend to borrow USDT on your behalf

### Step 3: Borrow USDT
1. Enter desired net USDT borrow amount
2. System calculates: gross = net + 0.4% fee, slippage parameters
3. Approve USDT spending for fee amount (happens after borrow)
4. Confirm borrow transaction through McLendOriginationGate
5. **Atomic execution:**
   - Contract borrows gross amount from Aave (debt in your name)
   - You receive net USDT amount in your wallet
   - Contract pulls fee from you in USDT
   - Contract swaps USDT→WETH on Uniswap, unwraps to ETH
   - Contract swaps ETH→MCLEND on McFun
   - Contract burns MCLEND to dead address
6. All steps succeed or entire transaction reverts

### Step 4: Manage Position
- **Monitor Health Factor**: Keep above 1.5 for safety
- **Repay Debt**: Repay USDT directly to Aave (approve USDT first)
- **Withdraw Collateral**: Withdraw WBTC if health factor allows
- **View Warnings**: Real-time alerts for liquidation risk

## Important Considerations

### Health Factor
- **Safe**: > 1.5 (recommended)
- **Warning**: < 1.3 (monitor closely)
- **Danger**: < 1.1 (high liquidation risk)
- **Liquidatable**: ≤ 1.0 (can be liquidated)

### USDT Approval Quirk
USDT requires allowance to be set to 0 before setting a new value. McLend handles this automatically.

### Variable Rate Only
McLend only supports variable rate borrowing (Aave interest rate mode 2).

### Non-Custodial Security
- Your WBTC collateral is deposited directly to Aave's Pool
- McLend cannot access your collateral
- Credit delegation is revocable at any time
- All transactions are transparent on Etherscan

## Contract Verification

After deployment, verify on Etherscan:

```bash
npx hardhat verify --network mainnet DEPLOYED_ADDRESS \
  0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2 \
  0xE592427A0AEce92De3Edee1F18E0157C05861564 \
  0x6E8717dd111Bea3f5B12785798F3d1380c01D72B \
  0xdAC17F958D2ee523a2206206994597C13D831ec7 \
  0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 \
  0xe03e4d90a46f62ac405708ba5036f292d5e0edc8 \
  0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8
```

## Analytics & Tracking

McLend uses Supabase to track:
- User actions (supply, withdraw, borrow, repay)
- Health factors over time
- Protocol-wide statistics
- Transaction history

All data is anonymized and used for analytics only.

## Security Notes

- Always maintain health factor above 1.5
- Monitor WBTC price volatility
- Never share private keys
- Verify all transaction details before signing
- Keep some buffer for gas fees
- This is mainnet - use real funds carefully

## Tech Stack

### Smart Contracts
- Solidity ^0.8.20
- OpenZeppelin Contracts
- Hardhat Development Environment

### Frontend
- React 18
- TypeScript
- Wagmi & Viem
- TailwindCSS
- Lucide React Icons
- Date-fns

### Backend
- Supabase (Database & Analytics)
- Aave V3 Protocol
- Ethereum Mainnet

## License

MIT

## Support

For issues or questions:
- Review the code in `/contracts` and `/src`
- Check Aave V3 documentation
- Verify transactions on Etherscan
- Test on testnet first if unsure

## Disclaimer

This is experimental DeFi software. Use at your own risk. Always verify smart contract addresses and understand the risks of lending protocols, liquidation, and smart contract bugs.
