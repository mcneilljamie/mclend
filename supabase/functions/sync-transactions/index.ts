import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'npm:viem@2.45.1';
import { mainnet } from 'npm:viem@2.45.1/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Contract addresses
const ADDRESSES = {
  MCLEND_ORIGINATION_GATE: '0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865',
  AAVE_POOL: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
};

// Event signatures
const EVENTS = {
  BorrowExecuted: parseAbiItem('event BorrowExecuted(address indexed user, uint256 netAmount, uint256 feeAmount, uint256 grossAmount, uint256 timestamp)'),
  Supply: parseAbiItem('event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)'),
  Withdraw: parseAbiItem('event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)'),
  Repay: parseAbiItem('event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)'),
};

const BLOCKS_PER_QUERY = 1000n; // Process 1k blocks at a time (RPC limit)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create public client for Ethereum mainnet
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http('https://eth.llamarpc.com'),
    });

    // Get current block number
    const currentBlock = await publicClient.getBlockNumber();

    // Get last synced block from database
    const { data: syncState, error: syncError } = await supabase
      .from('block_sync_state')
      .select('*')
      .eq('chain', 'ethereum')
      .maybeSingle();

    if (syncError) {
      throw new Error(`Failed to get sync state: ${syncError.message}`);
    }

    const lastSyncedBlock = BigInt(syncState?.last_synced_block || 21500000);
    const toBlock = lastSyncedBlock + BLOCKS_PER_QUERY > currentBlock
      ? currentBlock
      : lastSyncedBlock + BLOCKS_PER_QUERY;

    console.log(`Syncing blocks ${lastSyncedBlock} to ${toBlock}`);

    const transactions = [];

    // Fetch BorrowExecuted events from McLendOriginationGate
    const borrowLogs = await publicClient.getLogs({
      address: ADDRESSES.MCLEND_ORIGINATION_GATE,
      event: EVENTS.BorrowExecuted,
      fromBlock: lastSyncedBlock + 1n,
      toBlock,
    });

    for (const log of borrowLogs) {
      const { user, netAmount } = log.args;
      transactions.push({
        user_address: user.toLowerCase(),
        action_type: 'borrow',
        amount: formatUnits(netAmount, 6), // USDT has 6 decimals
        asset: 'USDT',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    // Fetch Supply events from Aave Pool (WBTC only)
    const supplyLogs = await publicClient.getLogs({
      address: ADDRESSES.AAVE_POOL,
      event: EVENTS.Supply,
      args: { reserve: ADDRESSES.WBTC },
      fromBlock: lastSyncedBlock + 1n,
      toBlock,
    });

    for (const log of supplyLogs) {
      const { onBehalfOf, amount } = log.args;
      transactions.push({
        user_address: onBehalfOf.toLowerCase(),
        action_type: 'supply',
        amount: formatUnits(amount, 8), // WBTC has 8 decimals
        asset: 'WBTC',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    // Fetch Withdraw events from Aave Pool (WBTC only)
    const withdrawLogs = await publicClient.getLogs({
      address: ADDRESSES.AAVE_POOL,
      event: EVENTS.Withdraw,
      args: { reserve: ADDRESSES.WBTC },
      fromBlock: lastSyncedBlock + 1n,
      toBlock,
    });

    for (const log of withdrawLogs) {
      const { user, amount } = log.args;
      transactions.push({
        user_address: user.toLowerCase(),
        action_type: 'withdraw',
        amount: formatUnits(amount, 8), // WBTC has 8 decimals
        asset: 'WBTC',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    // Fetch Repay events from Aave Pool (USDT only)
    const repayLogs = await publicClient.getLogs({
      address: ADDRESSES.AAVE_POOL,
      event: EVENTS.Repay,
      args: { reserve: ADDRESSES.USDT },
      fromBlock: lastSyncedBlock + 1n,
      toBlock,
    });

    for (const log of repayLogs) {
      const { user, amount } = log.args;
      transactions.push({
        user_address: user.toLowerCase(),
        action_type: 'repay',
        amount: formatUnits(amount, 6), // USDT has 6 decimals
        asset: 'USDT',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    console.log(`Found ${transactions.length} transactions`);

    // Insert transactions into database (ignore conflicts on tx_hash)
    if (transactions.length > 0) {
      const { error: insertError } = await supabase
        .from('user_actions')
        .upsert(transactions, { onConflict: 'tx_hash', ignoreDuplicates: true });

      if (insertError) {
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }
    }

    // Update sync state
    const { error: updateError } = await supabase
      .from('block_sync_state')
      .update({
        last_synced_block: toBlock.toString(),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('chain', 'ethereum');

    if (updateError) {
      throw new Error(`Failed to update sync state: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocksProcessed: Number(toBlock - lastSyncedBlock),
        transactionsFound: transactions.length,
        fromBlock: Number(lastSyncedBlock),
        toBlock: Number(toBlock),
        currentBlock: Number(currentBlock),
        hasMore: toBlock < currentBlock,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error syncing transactions:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
