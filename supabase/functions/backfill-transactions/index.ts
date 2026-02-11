import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createPublicClient, http, parseAbiItem, formatUnits } from 'npm:viem@2.45.1';
import { mainnet } from 'npm:viem@2.45.1/chains';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ADDRESSES = {
  MCLEND_ORIGINATION_GATE: '0x5a4F7bE7E9fC81A9Ff35273B641Bb42F1A8c3865',
  AAVE_POOL: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
};

const EVENTS = {
  BorrowExecuted: parseAbiItem('event BorrowExecuted(address indexed user, uint256 netAmount, uint256 feeAmount, uint256 grossAmount, uint256 timestamp)'),
  Supply: parseAbiItem('event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)'),
  Withdraw: parseAbiItem('event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)'),
  Repay: parseAbiItem('event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, bool useATokens)'),
};

const BLOCKS_PER_QUERY = 10000n;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { fromBlock: requestFromBlock, toBlock: requestToBlock } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http('https://eth.llamarpc.com'),
    });

    const currentBlock = await publicClient.getBlockNumber();

    // Default to backfilling from McLend contract deployment to current block
    const fromBlock = BigInt(requestFromBlock || 21500000);
    const toBlock = requestToBlock ? BigInt(requestToBlock) : currentBlock;

    const chunkedFromBlock = fromBlock;
    const chunkedToBlock = fromBlock + BLOCKS_PER_QUERY > toBlock ? toBlock : fromBlock + BLOCKS_PER_QUERY;

    console.log(`Backfilling blocks ${chunkedFromBlock} to ${chunkedToBlock}`);

    const transactions = [];

    const borrowLogs = await publicClient.getLogs({
      address: ADDRESSES.MCLEND_ORIGINATION_GATE,
      event: EVENTS.BorrowExecuted,
      fromBlock: chunkedFromBlock,
      toBlock: chunkedToBlock,
    });

    for (const log of borrowLogs) {
      const { user, netAmount } = log.args;
      transactions.push({
        user_address: user.toLowerCase(),
        action_type: 'borrow',
        amount: formatUnits(netAmount, 6),
        asset: 'USDT',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    const supplyLogs = await publicClient.getLogs({
      address: ADDRESSES.AAVE_POOL,
      event: EVENTS.Supply,
      args: { reserve: ADDRESSES.WBTC },
      fromBlock: chunkedFromBlock,
      toBlock: chunkedToBlock,
    });

    for (const log of supplyLogs) {
      const { onBehalfOf, amount } = log.args;
      transactions.push({
        user_address: onBehalfOf.toLowerCase(),
        action_type: 'supply',
        amount: formatUnits(amount, 8),
        asset: 'WBTC',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    const withdrawLogs = await publicClient.getLogs({
      address: ADDRESSES.AAVE_POOL,
      event: EVENTS.Withdraw,
      args: { reserve: ADDRESSES.WBTC },
      fromBlock: chunkedFromBlock,
      toBlock: chunkedToBlock,
    });

    for (const log of withdrawLogs) {
      const { user, amount } = log.args;
      transactions.push({
        user_address: user.toLowerCase(),
        action_type: 'withdraw',
        amount: formatUnits(amount, 8),
        asset: 'WBTC',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    const repayLogs = await publicClient.getLogs({
      address: ADDRESSES.AAVE_POOL,
      event: EVENTS.Repay,
      args: { reserve: ADDRESSES.USDT },
      fromBlock: chunkedFromBlock,
      toBlock: chunkedToBlock,
    });

    for (const log of repayLogs) {
      const { user, amount } = log.args;
      transactions.push({
        user_address: user.toLowerCase(),
        action_type: 'repay',
        amount: formatUnits(amount, 6),
        asset: 'USDT',
        tx_hash: log.transactionHash,
        health_factor: '0',
        created_at: new Date().toISOString(),
      });
    }

    console.log(`Found ${transactions.length} transactions`);

    if (transactions.length > 0) {
      const { error: insertError } = await supabase
        .from('user_actions')
        .upsert(transactions, { onConflict: 'tx_hash', ignoreDuplicates: true });

      if (insertError) {
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        blocksProcessed: Number(chunkedToBlock - chunkedFromBlock),
        transactionsFound: transactions.length,
        fromBlock: Number(chunkedFromBlock),
        toBlock: Number(chunkedToBlock),
        hasMore: chunkedToBlock < toBlock,
        nextFromBlock: chunkedToBlock < toBlock ? Number(chunkedToBlock + 1n) : null,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error backfilling transactions:', error);
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
