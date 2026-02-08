import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { Wallet, LogOut, AlertTriangle } from 'lucide-react';
import { formatAddress } from '../utils/format';
import { mainnet } from 'wagmi/chains';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const isWrongNetwork = isConnected && chainId !== mainnet.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-950/50 border border-red-800/50 rounded-lg backdrop-blur-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400 font-medium">Wrong Network</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-950/50 border border-purple-800/50 rounded-lg backdrop-blur-sm">
          <Wallet className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-100">{formatAddress(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2.5 hover:bg-purple-950/50 rounded-lg transition-colors border border-purple-800/30"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 text-purple-400" />
        </button>
      </div>
    );
  }

  const primaryConnector = connectors[0];

  if (!primaryConnector) return null;

  return (
    <button
      onClick={() => connect({ connector: primaryConnector })}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg transition-all font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
    >
      <Wallet className="w-5 h-5" />
      Connect Wallet
    </button>
  );
}
