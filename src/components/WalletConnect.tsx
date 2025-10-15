import { Wallet, AlertCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';

export const WalletConnect = () => {
  const { account, isConnected, isConnecting, connect, disconnect, error } = useWeb3();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-3">
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/20 px-4 py-2.5 rounded-lg max-w-xs border border-red-500/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {isConnected ? (
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-500/30">
            {formatAddress(account!)}
          </div>
          <button
            onClick={disconnect}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md shadow-emerald-500/20"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};
