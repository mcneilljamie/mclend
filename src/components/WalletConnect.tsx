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
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg max-w-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {isConnected ? (
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium">
            {formatAddress(account!)}
          </div>
          <button
            onClick={disconnect}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md shadow-blue-500/20"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};
