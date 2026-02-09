import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADDRESSES, TOKEN_DECIMALS } from '../config/contracts';
import { IERC20_ABI, AAVE_POOL_ABI } from '../config/abis';
import { useUserAccountData } from '../hooks/useUserAccountData';
import { useDebtTokenBalance } from '../hooks/useDebtToken';
import { useTokenAllowance } from '../hooks/useTokenBalance';
import { useReserveData, formatAPY } from '../hooks/useReserveData';
import { formatHealthFactor, formatLTV, formatUSD, formatUSDT } from '../utils/format';
import { toastManager } from './Toast';
import { Loader, TrendingUp, TrendingDown, Percent } from 'lucide-react';

export function ManagePosition() {
  const { address } = useAccount();
  const [repayAmount, setRepayAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: accountData } = useUserAccountData(address);
  const { data: debtBalance } = useDebtTokenBalance(address);
  const { liquidityRate } = useReserveData(ADDRESSES.WBTC as `0x${string}`);
  const { variableBorrowRate } = useReserveData(ADDRESSES.USDT as `0x${string}`);
  const { data: usdtAllowance, refetch: refetchAllowance } = useTokenAllowance(
    ADDRESSES.USDT as `0x${string}`,
    address,
    ADDRESSES.AAVE_POOL as `0x${string}`
  );

  const totalCollateral = accountData?.[0] || 0n;
  const totalDebt = accountData?.[1] || 0n;
  const availableBorrows = accountData?.[2] || 0n;
  const liquidationThreshold = accountData?.[3] || 0n;
  const ltv = accountData?.[4] || 0n;
  const healthFactor = accountData?.[5] || 0n;

  const needsUSDTApproval = usdtAllowance !== undefined && repayAmount !== '' &&
    parseUnits(repayAmount || '0', TOKEN_DECIMALS.USDT) > usdtAllowance;

  const handleApproveUSDT = async () => {
    const toastId = toastManager.show('loading', 'Approving USDT...');
    try {
      await writeContract({
        address: ADDRESSES.USDT as `0x${string}`,
        abi: IERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.AAVE_POOL as `0x${string}`, 0n],
      });
      setTimeout(async () => {
        await writeContract({
          address: ADDRESSES.USDT as `0x${string}`,
          abi: IERC20_ABI,
          functionName: 'approve',
          args: [ADDRESSES.AAVE_POOL as `0x${string}`, maxUint256],
        });
        toastManager.update(toastId, 'success', 'USDT approved successfully!', hash);
        refetchAllowance();
      }, 1000);
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to approve USDT');
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || !address) return;
    const toastId = toastManager.show('loading', 'Repaying debt...');
    try {
      const parsedAmount = parseUnits(repayAmount, TOKEN_DECIMALS.USDT);
      await writeContract({
        address: ADDRESSES.AAVE_POOL as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: 'repay',
        args: [ADDRESSES.USDT as `0x${string}`, parsedAmount, 2, address],
      });
      toastManager.update(toastId, 'success', 'Debt repaid successfully!', hash);
      setRepayAmount('');
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to repay debt');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !address) return;
    const toastId = toastManager.show('loading', 'Withdrawing WBTC...');
    try {
      const parsedAmount = parseUnits(withdrawAmount, TOKEN_DECIMALS.WBTC);
      await writeContract({
        address: ADDRESSES.AAVE_POOL as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: 'withdraw',
        args: [ADDRESSES.WBTC as `0x${string}`, parsedAmount, address],
      });
      toastManager.update(toastId, 'success', 'WBTC withdrawn successfully!', hash);
      setWithdrawAmount('');
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to withdraw WBTC');
    }
  };

  const handleRepayMax = () => {
    if (debtBalance) {
      setRepayAmount(formatUSDT(debtBalance));
    }
  };

  const getHealthFactorColor = (hf: bigint) => {
    const formatted = formatHealthFactor(hf);
    if (formatted === '∞') return 'text-green-400';
    const hfNum = Number(formatted);
    if (hfNum >= 1.5) return 'text-green-400';
    if (hfNum >= 1.1) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
      <h2 className="text-2xl font-bold text-white mb-6">Manage Position</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-500/30">
          <p className="text-sm text-purple-300 mb-1">Health Factor</p>
          <p className={`text-3xl font-bold ${totalCollateral === 0n ? 'text-gray-500' : getHealthFactorColor(healthFactor)}`}>
            {totalCollateral === 0n ? '—' : formatHealthFactor(healthFactor)}
          </p>
        </div>

        <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-500/30">
          <p className="text-sm text-purple-300 mb-1">Loan to Value (LTV)</p>
          <p className={`text-3xl font-bold ${totalCollateral === 0n ? 'text-gray-500' : 'text-white'}`}>
            {totalCollateral === 0n ? '—' : `${formatLTV(ltv)}%`}
          </p>
        </div>

        <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-500/30">
          <p className="text-sm text-purple-300 mb-1">Liquidation Threshold</p>
          <p className={`text-3xl font-bold ${totalCollateral === 0n ? 'text-gray-500' : 'text-white'}`}>
            {totalCollateral === 0n ? '—' : `${formatLTV(liquidationThreshold)}%`}
          </p>
        </div>

        <div className="bg-green-950/30 rounded-lg p-4 border border-green-500/30">
          <p className="text-sm text-green-300 mb-1 flex items-center gap-1">
            <Percent className="w-4 h-4" />
            WBTC Supply APY
          </p>
          <p className="text-3xl font-bold text-green-400">{formatAPY(liquidityRate)}%</p>
        </div>

        <div className="bg-orange-950/30 rounded-lg p-4 border border-orange-500/30">
          <p className="text-sm text-orange-300 mb-1 flex items-center gap-1">
            <Percent className="w-4 h-4" />
            USDT Borrow APY
          </p>
          <p className="text-3xl font-bold text-orange-400">{formatAPY(variableBorrowRate)}%</p>
        </div>

        <div className="bg-green-950/30 rounded-lg p-4 border border-green-500/30">
          <p className="text-sm text-green-300 mb-1 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Total Collateral
          </p>
          <p className="text-2xl font-bold text-white">{formatUSD(totalCollateral, 8)}</p>
        </div>

        <div className="bg-red-950/30 rounded-lg p-4 border border-red-500/30">
          <p className="text-sm text-red-300 mb-1 flex items-center gap-1">
            <TrendingDown className="w-4 h-4" />
            Total Debt
          </p>
          <p className="text-2xl font-bold text-white">{formatUSD(totalDebt, 8)}</p>
        </div>

        <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-500/30 md:col-span-2 lg:col-span-2">
          <p className="text-sm text-purple-300 mb-1">Available to Borrow</p>
          <p className="text-2xl font-bold text-white">{formatUSD(availableBorrows, 8)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Repay Debt</h3>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Amount (USDT)
            </label>
            <div className="relative">
              <input
                type="text"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500"
              />
              <button
                onClick={handleRepayMax}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded text-sm font-medium text-white transition-colors"
              >
                MAX
              </button>
            </div>
            {debtBalance !== undefined && (
              <p className="text-sm text-gray-400 mt-1">
                Current Debt: {formatUSDT(debtBalance)} USDT
              </p>
            )}
          </div>

          {needsUSDTApproval ? (
            <button
              onClick={handleApproveUSDT}
              disabled={isPending || isConfirming || !repayAmount}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve USDT'
              )}
            </button>
          ) : (
            <button
              onClick={handleRepay}
              disabled={isPending || isConfirming || !repayAmount}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Repaying...
                </>
              ) : (
                'Repay'
              )}
            </button>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Withdraw Collateral</h3>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Amount (WBTC)
            </label>
            <input
              type="text"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500"
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={isPending || isConfirming || !withdrawAmount}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Withdrawing...
              </>
            ) : (
              'Withdraw'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
