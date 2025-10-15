import { useState } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { AssetCard } from './components/AssetCard';
import { UserDashboard } from './components/UserDashboard';
import { TransactionModal } from './components/TransactionModal';
import { useWeb3 } from './contexts/Web3Context';
import { SUPPORTED_ASSETS } from './config/assets';
import { Asset } from './types/aave';

type ModalState = {
  isOpen: boolean;
  asset: Asset | null;
  type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  maxAmount?: string;
};

function App() {
  const { isConnected } = useWeb3();
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    asset: null,
    type: 'supply',
  });

  const openModal = (asset: Asset, type: 'supply' | 'withdraw' | 'borrow' | 'repay', maxAmount?: string) => {
    setModal({ isOpen: true, asset, type, maxAmount });
  };

  const closeModal = () => {
    setModal({ isOpen: false, asset: null, type: 'supply' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="bg-slate-800/80 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-black">M</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  McLend
                </h1>
                <p className="text-xs text-slate-400">WBTC & USDT Markets</p>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {!isConnected ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-white text-3xl font-black">M</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to McLend
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Connect your wallet to supply and borrow WBTC and USDT using Aave's liquidity pools on Ethereum mainnet.
            </p>
            <div className="bg-slate-800 rounded-2xl shadow-lg p-8 max-w-2xl mx-auto border border-slate-700 mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Supply Assets</p>
                    <p className="text-sm text-slate-400">Earn interest on WBTC & USDT</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Borrow Assets</p>
                    <p className="text-sm text-slate-400">Borrow against your collateral</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Real-time APY</p>
                    <p className="text-sm text-slate-400">Live rates from Aave protocol</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 font-bold">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Health Factor</p>
                    <p className="text-sm text-slate-400">Monitor your position safety</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <UserDashboard />

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Markets</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {SUPPORTED_ASSETS.map((asset) => (
                  <AssetCard
                    key={asset.symbol}
                    asset={asset}
                    onSupply={(maxAmount) => openModal(asset, 'supply', maxAmount)}
                    onBorrow={(maxAmount) => openModal(asset, 'borrow', maxAmount)}
                    onWithdraw={(maxAmount) => openModal(asset, 'withdraw', maxAmount)}
                    onRepay={(maxAmount) => openModal(asset, 'repay', maxAmount)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {modal.isOpen && modal.asset && (
        <TransactionModal
          isOpen={modal.isOpen}
          onClose={closeModal}
          asset={modal.asset}
          type={modal.type}
          maxAmount={modal.maxAmount}
        />
      )}

      <footer className="bg-slate-800/50 backdrop-blur-sm border-t border-slate-700 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-400 text-sm">Powered by Aave</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
