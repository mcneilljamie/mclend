import { ExternalLink, Activity } from 'lucide-react';
import { formatDistance } from 'date-fns';

interface Transaction {
  id: string;
  timestamp: number;
  action: 'Supply' | 'Withdraw' | 'Borrow' | 'Repay' | 'Liquidation';
  amount: string;
  txHash: string;
}

const mockTransactions: Transaction[] = [];

export function TransactionHistory() {
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

  if (mockTransactions.length === 0) {
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
            {mockTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-purple-500/10 hover:bg-purple-950/20">
                <td className="py-3 px-4 text-sm text-gray-400">
                  {formatDistance(new Date(tx.timestamp * 1000), new Date(), { addSuffix: true })}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getActionColor(
                      tx.action
                    )}`}
                  >
                    {tx.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-white text-right font-medium">
                  {tx.amount}
                </td>
                <td className="py-3 px-4 text-center">
                  <a
                    href={`https://etherscan.io/tx/${tx.txHash}`}
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
