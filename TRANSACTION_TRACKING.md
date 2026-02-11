# Transaction Tracking System

This document describes the automated transaction tracking system for McLend.

## Overview

The transaction tracking system automatically syncs blockchain transactions to the Supabase database, allowing users to view their complete transaction history.

## Components

### 1. Database Schema

**Table: `user_actions`**
- Stores all user transactions (supply, withdraw, borrow, repay)
- Indexed by user address and timestamp
- Unique constraint on transaction hash

**Table: `block_sync_state`**
- Tracks the last synced block number
- Prevents duplicate processing
- Initialized at block 21,500,000

### 2. Edge Functions

**`sync-transactions`**
- Runs every 15 minutes via cron job
- Syncs new transactions from Ethereum mainnet
- Processes 10,000 blocks per run
- Tracks:
  - BorrowExecuted events from McLendOriginationGate
  - Supply events from Aave Pool (WBTC)
  - Withdraw events from Aave Pool (WBTC)
  - Repay events from Aave Pool (USDT)

**`backfill-transactions`**
- Manual backfill function for historical data
- Can be called to sync past transactions
- Processes blocks in chunks of 10,000
- Returns pagination info for continued syncing

### 3. Frontend Component

**TransactionHistory.tsx**
- Displays user transactions in real-time
- Shows:
  - Transaction type (Supply/Withdraw/Borrow/Repay)
  - Amount and asset (WBTC/USDT)
  - Time (relative format)
  - Etherscan link
- Auto-refreshes when wallet connects
- Limits to 50 most recent transactions

## Automation

The system runs automatically:
- Cron job executes every 15 minutes
- Syncs new blocks incrementally
- No manual intervention required

## Backfilling Historical Data

To backfill historical transactions, call the backfill edge function:

```bash
curl -X POST \
  https://raywmxpmapzsabxutcqk.supabase.co/functions/v1/backfill-transactions \
  -H "Content-Type: application/json" \
  -d '{"fromBlock": 21500000, "toBlock": 21510000}'
```

Run this multiple times with different block ranges to sync all historical data.
