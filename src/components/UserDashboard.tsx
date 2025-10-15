import { Shield, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useUserAccount, formatHealthFactor, formatUSD } from '../hooks/useUserAccount';

export const UserDashboard = () => {
  const { accountData, loading } = useUserAccount();

  if (!accountData && !loading) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!accountData) return null;

  const totalCollateral = parseFloat(formatUSD(accountData.totalCollateralBase));
  const totalDebt = parseFloat(formatUSD(accountData.totalDebtBase));
  const availableBorrows = parseFloat(formatUSD(accountData.availableBorrowsBase));
  const healthFactor = formatHealthFactor(accountData.healthFactor);

  const getHealthFactorColor = (hf: string) => {
    if (hf === '∞') return 'text-emerald-400';
    const value = parseFloat(hf);
    if (value >= 2) return 'text-emerald-400';
    if (value >= 1.5) return 'text-yellow-400';
    return 'text-rose-400';
  };

  const netWorth = totalCollateral - totalDebt;

  return (
    <div className="bg-slate-800 rounded-xl shadow-md p-5 mb-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Your Account Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-teal-500/30">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-medium text-slate-300">Net Worth</span>
          </div>
          <p className="text-xl font-bold text-white">
            ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-emerald-500/30">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">Total Collateral</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">
            ${totalCollateral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-rose-500/30">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium text-slate-300">Total Borrowed</span>
          </div>
          <p className="text-xl font-bold text-rose-400">
            ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 border border-amber-500/30">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Health Factor</span>
          </div>
          <p className={`text-xl font-bold ${getHealthFactorColor(healthFactor)}`}>
            {healthFactor}
          </p>
        </div>
      </div>

      {totalDebt > 0 && (
        <div className="mt-4 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-300">Available to Borrow</span>
            <span className="text-sm font-bold text-white">
              ${availableBorrows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Keep your health factor above 1.0 to avoid liquidation
          </div>
        </div>
      )}
    </div>
  );
};
