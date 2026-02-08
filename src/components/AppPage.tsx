import { useAccount } from 'wagmi';
import { WalletConnect } from './WalletConnect';
import { DepositWBTC } from './DepositWBTC';
import { BorrowUSDT } from './BorrowUSDT';
import { ManagePosition } from './ManagePosition';
import { HealthWarnings } from './HealthWarnings';
import { TransactionHistory } from './TransactionHistory';
import { Wallet } from 'lucide-react';

export function AppPage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 max-w-md text-center shadow-2xl shadow-purple-500/10">
          <div className="bg-purple-500/10 rounded-2xl p-6 mb-6 inline-block">
            <Wallet className="w-16 h-16 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-400 mb-8">
            Connect your Ethereum wallet to start borrowing against your Bitcoin collateral.
          </p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HealthWarnings />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepositWBTC />
        <BorrowUSDT />
      </div>

      <ManagePosition />

      <TransactionHistory />
    </div>
  );
}
