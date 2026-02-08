import { useAccount } from 'wagmi';
import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { useUserAccountData } from '../hooks/useUserAccountData';
import { formatHealthFactor } from '../utils/format';
import { HEALTH_FACTOR_THRESHOLDS } from '../config/contracts';

export function HealthWarnings() {
  const { address } = useAccount();
  const { data: accountData } = useUserAccountData(address);

  const healthFactor = accountData?.[5] || 0n;
  const totalDebt = accountData?.[1] || 0n;

  if (totalDebt === 0n || healthFactor === 0n) {
    return null;
  }

  const hfNum = Number(formatHealthFactor(healthFactor));

  if (hfNum <= HEALTH_FACTOR_THRESHOLDS.LIQUIDATION) {
    return (
      <div className="bg-red-950/50 border-2 border-red-500/50 rounded-xl p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-300 mb-2">
              LIQUIDATABLE: Immediate Action Required
            </h3>
            <p className="text-red-300/90 mb-3">
              Your position may be liquidated at any time. You will lose collateral if you don't act now.
            </p>
            <div className="bg-red-900/30 rounded-lg p-3 mb-3 border border-red-500/30">
              <p className="text-sm font-semibold text-red-300">
                Current Health Factor: {hfNum.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-red-300">Immediate Actions:</p>
              <ul className="list-disc list-inside text-red-300/80 space-y-1">
                <li>Repay part or all of your debt immediately</li>
                <li>Deposit additional WBTC collateral</li>
                <li>Do not delay - liquidation can happen at any moment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hfNum < HEALTH_FACTOR_THRESHOLDS.DANGER) {
    return (
      <div className="bg-red-950/40 border-2 border-red-500/40 rounded-xl p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-7 h-7 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-300 mb-2">
              Danger: Your position is at high risk of liquidation
            </h3>
            <p className="text-red-300/90 mb-3">
              Your health factor is critically low. Take action now to avoid liquidation.
            </p>
            <div className="bg-red-900/30 rounded-lg p-3 mb-3 border border-red-500/30">
              <p className="text-sm font-semibold text-red-300">
                Current Health Factor: {hfNum.toFixed(2)} (Target: {'>'} {HEALTH_FACTOR_THRESHOLDS.SAFE})
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-red-300">Recommended Actions:</p>
              <ul className="list-disc list-inside text-red-300/80 space-y-1">
                <li>Repay some of your debt to increase health factor</li>
                <li>Add more WBTC collateral to your position</li>
                <li>Avoid borrowing more until health factor improves</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hfNum < HEALTH_FACTOR_THRESHOLDS.WARNING) {
    return (
      <div className="bg-orange-950/40 border-2 border-orange-500/40 rounded-xl p-6 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-orange-300 mb-2">
              Caution: Your position is approaching liquidation risk
            </h3>
            <p className="text-orange-300/90 mb-3">
              Your health factor is below the recommended safe threshold. Consider taking preventive action.
            </p>
            <div className="bg-orange-900/30 rounded-lg p-3 mb-3 border border-orange-500/30">
              <p className="text-sm font-semibold text-orange-300">
                Current Health Factor: {hfNum.toFixed(2)} (Target: {'>'} {HEALTH_FACTOR_THRESHOLDS.SAFE})
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-orange-300">Suggested Actions:</p>
              <ul className="list-disc list-inside text-orange-300/80 space-y-1">
                <li>Consider repaying part of your debt</li>
                <li>Monitor your position closely</li>
                <li>Be prepared to add collateral if price volatility increases</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
