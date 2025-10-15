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
    if (hf === '∞') return 'text-emerald-600';
    const value = parseFloat(hf);
    if (value >= 2) return 'text-emerald-600';
    if (value >= 1.5) return 'text-yellow-600';
    return 'text-rose-600';
  };

  const netWorth = totalCollateral - totalDebt;

  return (
    <div className="bg-white rounded-xl shadow-md p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Your Account Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Net Worth</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">Total Collateral</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            ${totalCollateral.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-lg p-4 border border-rose-100">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <span className="text-sm font-medium text-gray-700">Total Borrowed</span>
          </div>
          <p className="text-2xl font-bold text-rose-700">
            ${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-gray-700">Health Factor</span>
          </div>
          <p className={`text-2xl font-bold ${getHealthFactorColor(healthFactor)}`}>
            {healthFactor}
          </p>
        </div>
      </div>

      {totalDebt > 0 && (
        <div className="mt-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Available to Borrow</span>
            <span className="text-base font-bold text-gray-900">
              ${availableBorrows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Keep your health factor above 1.0 to avoid liquidation
          </div>
        </div>
      )}
    </div>
  );
};
