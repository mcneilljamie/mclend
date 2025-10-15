import { TrendingUp, TrendingDown, DollarSign, Activity, Lock } from 'lucide-react';
import { Asset } from '../types/aave';
import { useAaveData } from '../hooks/useAaveData';
import { useUserAccount, formatUSD } from '../hooks/useUserAccount';

interface AssetCardProps {
  asset: Asset;
  onSupply: (maxAmount?: string) => void;
  onBorrow: (maxAmount?: string) => void;
  onWithdraw: (maxAmount?: string) => void;
  onRepay: (maxAmount?: string) => void;
}

const AssetIcon = ({ icon, symbol }: { icon: string; symbol: string }) => {
  if (icon === 'usdt') {
    return (
      <svg viewBox="0 0 2000 2000" className="w-10 h-10">
        <path fill="#26A17B" d="M1000,0c552.26,0,1000,447.74,1000,1000s-447.76,1000-1000,1000S0,1552.38,0,1000,447.68,0,1000,0"/>
        <path fill="#FFF" d="M1123.42,866.76V718h340.18V491.34H537.28V718H877.5V866.64C601,879.34,393.1,934.1,393.1,999.7s208,120.36,484.4,133.14v476.5h246V1132.8c276-12.74,483.48-67.46,483.48-133s-207.48-120.26-483.48-133m0,225.64v-0.12c-6.94.44-42.6,2.58-122,2.58-63.48,0-108.14-1.8-123.88-2.62v0.2C633.34,1081.66,451,1039.12,451,988.22S633.36,894.84,877.62,884V1050.1c16,1.1,61.76,3.8,124.92,3.8,75.86,0,114-3.16,121-3.8V884c243.8,10.86,425.72,53.44,425.72,104.16s-182,93.32-425.72,104.18"/>
      </svg>
    );
  }

  if (icon === 'wbtc') {
    return (
      <svg viewBox="0 0 32 32" className="w-10 h-10">
        <g fill="none" fillRule="evenodd">
          <circle cx="16" cy="16" r="16" fill="#5A5564"/>
          <path fill="#FFF" d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"/>
        </g>
      </svg>
    );
  }

  return null;
};

export const AssetCard = ({ asset, onSupply, onBorrow, onWithdraw, onRepay }: AssetCardProps) => {
  const { assetData, userPosition, loading } = useAaveData(asset);
  const { accountData } = useUserAccount();

  if (loading || !assetData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const hasSupplied = userPosition && parseFloat(userPosition.supplied) > 0;
  const hasBorrowed = userPosition && parseFloat(userPosition.borrowed) > 0;
  const hasCollateral = accountData && accountData.totalCollateralBase > 0n;
  const availableToBorrowUSD = accountData ? parseFloat(formatUSD(accountData.availableBorrowsBase)) : 0;

  return (
    <div className="bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-700">
      <div className="bg-gradient-to-r from-slate-700 to-slate-700 p-5 border-b border-slate-600">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center shadow-sm p-2">
            <AssetIcon icon={asset.icon} symbol={asset.symbol} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{asset.symbol}</h3>
            <p className="text-sm text-slate-400">{asset.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 rounded-lg p-3.5 shadow-sm border border-emerald-500/20">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">Supply APY</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">{assetData.supplyAPY}%</p>
          </div>

          <div className="bg-rose-500/10 rounded-lg p-3.5 shadow-sm border border-rose-500/20">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-medium text-slate-300">Borrow APY</span>
            </div>
            <p className="text-xl font-bold text-rose-400">{assetData.borrowAPY}%</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Total Supplied</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {parseFloat(assetData.totalSupplied).toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.symbol}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Total Borrowed</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {parseFloat(assetData.totalBorrowed).toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.symbol}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Available Liquidity</span>
            <span className="text-sm font-semibold text-white">
              {parseFloat(assetData.availableLiquidity).toLocaleString(undefined, { maximumFractionDigits: 2 })} {asset.symbol}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Utilization Rate</span>
            <span className="text-sm font-semibold text-white">{assetData.utilizationRate}%</span>
          </div>
        </div>

        {userPosition && (hasSupplied || hasBorrowed) && (
          <div className="bg-slate-700/50 rounded-lg p-4 mb-5 border border-slate-600">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Your Position</p>
            {hasSupplied && (
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-slate-400">Supplied</span>
                <span className="text-sm font-bold text-emerald-400">
                  {parseFloat(userPosition.supplied).toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset.symbol}
                </span>
              </div>
            )}
            {hasBorrowed && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Borrowed</span>
                <span className="text-sm font-bold text-rose-400">
                  {parseFloat(userPosition.borrowed).toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset.symbol}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSupply(userPosition?.walletBalance)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
          >
            Supply
          </button>
          <div className="relative">
            <button
              onClick={() => hasCollateral && onBorrow()}
              disabled={!hasCollateral}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center gap-2"
            >
              {!hasCollateral && <Lock className="w-4 h-4" />}
              Borrow
            </button>
            {!hasCollateral && (
              <div className="absolute -bottom-6 left-0 right-0 text-xs text-slate-500 text-center">
                Supply collateral first
              </div>
            )}
            {hasCollateral && availableToBorrowUSD > 0 && (
              <div className="absolute -bottom-6 left-0 right-0 text-xs text-emerald-400 text-center font-medium">
                Max: ${availableToBorrowUSD.toFixed(2)}
              </div>
            )}
          </div>
          {hasSupplied && (
            <button
              onClick={() => onWithdraw(userPosition?.supplied)}
              className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Withdraw
            </button>
          )}
          {hasBorrowed && (
            <button
              onClick={() => onRepay(userPosition?.walletBalance)}
              className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              Repay
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
