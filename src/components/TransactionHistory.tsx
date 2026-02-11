import { ExternalLink, Activity, Loader } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  user_address: string;
  action_type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  amount: string;
  asset: 'WBTC' | 'USDT';
  tx_hash: string;
  created_at: string;
}

const actionTypeMap = {
  supply: 'Supply',
  withdraw: 'Withdraw',
  borrow: 'Borrow',
  repay: 'Repay',
} as const;

export function TransactionHistory() {
  const { address } = useAccount();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', address],
    queryFn: async () => {
      if (!address) return [];

      const { data, error } = await supabase
        .from('user_actions')
        .select('*')
        .eq('user_address', address.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data as Transaction[];
    },
    enabled: !!address,
  });
  const getActionColor = (action: string) => {
    switch (action) {
      case 'Supply':
        return 'text-green-300 bg-green-950/30 border-green-500/30';
      case 'Withdraw':
        return 'text-blue-300 bg-blue-950/30 border-blue-500/30';
      case 'Borrow':
        return 'text-orange-300 bg-orange-950/30 border-orange-500/30';
      case 'Repay':
        return 'text-purple-300 bg-purple-950/30 border-purple-500/30';
      case 'Liquidation':
        return 'text-red-300 bg-red-950/30 border-red-500/30';
      default:
        return 'text-gray-300 bg-gray-950/30 border-gray-500/30';
    }
  };

  if (!address) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Activity className="w-16 h-16 text-purple-400/30 mb-4" />
          <p className="text-gray-400 text-center mb-2">Connect wallet to view history</p>
          <p className="text-sm text-gray-500 text-center max-w-md">
            Connect your wallet to see your transaction history with the protocol.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Loader className="w-16 h-16 text-purple-400 mb-4 animate-spin" />
          <p className="text-gray-400 text-center">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Activity className="w-16 h-16 text-purple-400/30 mb-4" />
          <p className="text-gray-400 text-center mb-2">No transactions yet</p>
          <p className="text-sm text-gray-500 text-center max-w-md">
            Your transaction history will appear here once you start interacting with the protocol.
            All deposits, withdrawals, borrows, and repayments will be tracked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
      <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              <th className="text-left py-3 px-4 text-sm font-semibold text-purple-300">Time</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-purple-300">Action</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-purple-300">Amount</th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-purple-300">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-purple-500/10 hover:bg-purple-950/20">
                <td className="py-3 px-4 text-sm text-gray-400">
                  {formatDistance(new Date(tx.created_at), new Date(), { addSuffix: true })}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getActionColor(
                      actionTypeMap[tx.action_type]
                    )}`}
                  >
                    {actionTypeMap[tx.action_type]}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-white text-right font-medium">
                  {parseFloat(tx.amount).toFixed(tx.asset === 'WBTC' ? 8 : 2)} {tx.asset}
                </td>
                <td className="py-3 px-4 text-center">
                  <a
                    href={`https://etherscan.io/tx/${tx.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
                  >
                    View
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
