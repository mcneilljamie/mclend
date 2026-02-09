import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADDRESSES, TOKEN_DECIMALS } from '../config/contracts';
import { IERC20_ABI, AAVE_POOL_ABI } from '../config/abis';
import { useUserAccountData } from '../hooks/useUserAccountData';
import { useDebtTokenBalance } from '../hooks/useDebtToken';
import { useTokenAllowance, useTokenBalance } from '../hooks/useTokenBalance';
import { useAssetPrice } from '../hooks/useAssetPrice';
import { formatHealthFactor, formatLTV, formatUSD, formatUSDT, formatWBTC } from '../utils/format';
import { validateNumericInput, validateWithdrawalAmount, sanitizeNumericInput } from '../utils/validation';
import { toastManager } from './Toast';
import { Loader, TrendingUp, TrendingDown } from 'lucide-react';

export function ManagePosition() {
  const { address } = useAccount();
  const [repayAmount, setRepayAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: accountData, refetch: refetchAccountData } = useUserAccountData(address);
  const { data: debtBalance, refetch: refetchDebtBalance } = useDebtTokenBalance(address);
  const { data: usdtBalance } = useTokenBalance(ADDRESSES.USDT as `0x${string}`, address);
  const { data: wbtcBalance } = useTokenBalance(ADDRESSES.WBTC as `0x${string}`, address);
  const { data: wbtcPrice } = useAssetPrice(ADDRESSES.WBTC as `0x${string}`);
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

  const needsUSDTApproval = usdtAllowance !== undefined && usdtAllowance !== null && typeof usdtAllowance === 'bigint' && repayAmount !== '' &&
    parseUnits(repayAmount || '0', TOKEN_DECIMALS.USDT) > usdtAllowance;

  const handleApproveUSDT = async () => {
    if (!address) return;
    const toastId = toastManager.show('loading', 'Approving USDT (Step 1/2)...');
    try {
      await writeContract({
        address: ADDRESSES.USDT as `0x${string}`,
        abi: IERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.AAVE_POOL as `0x${string}`, 0n],
      });

      toastManager.update(toastId, 'loading', 'Waiting for first approval...');

      await new Promise(resolve => setTimeout(resolve, 3000));

      toastManager.update(toastId, 'loading', 'Approving USDT (Step 2/2)...');
      const approveHash = await writeContract({
        address: ADDRESSES.USDT as `0x${string}`,
        abi: IERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.AAVE_POOL as `0x${string}`, maxUint256],
      });

      toastManager.update(toastId, 'success', 'USDT approved successfully!', approveHash as unknown as string);
      await refetchAllowance();
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to approve USDT');
    }
  };

  const handleRepay = async () => {
    if (!repayAmount || !address) return;

    const inputValidation = validateNumericInput(repayAmount);
    if (!inputValidation.isValid) {
      toastManager.show('error', inputValidation.error || 'Invalid input');
      return;
    }

    const parsedAmount = parseUnits(repayAmount, TOKEN_DECIMALS.USDT);

    if (usdtBalance !== undefined && usdtBalance !== null && typeof usdtBalance === 'bigint' && parsedAmount > usdtBalance) {
      toastManager.show('error', 'Insufficient USDT balance');
      return;
    }

    if (debtBalance !== undefined && debtBalance !== null && typeof debtBalance === 'bigint' && parsedAmount > debtBalance) {
      toastManager.show('error', 'Repay amount exceeds current debt');
      return;
    }

    const toastId = toastManager.show('loading', 'Repaying debt...');
    try {
      const isRepayingFull = debtBalance !== undefined && debtBalance !== null && typeof debtBalance === 'bigint' && parsedAmount >= debtBalance;
      const amountToRepay = isRepayingFull ? maxUint256 : parsedAmount;

      const txHash = await writeContract({
        address: ADDRESSES.AAVE_POOL as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: 'repay',
        args: [ADDRESSES.USDT as `0x${string}`, amountToRepay, BigInt(2), address],
      });

      toastManager.update(toastId, 'success', 'Debt repaid successfully!', txHash as unknown as string);
      setRepayAmount('');
      setTimeout(() => {
        refetchDebtBalance();
        refetchAccountData();
      }, 2000);
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to repay debt');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !address) return;

    const inputValidation = validateNumericInput(withdrawAmount);
    if (!inputValidation.isValid) {
      toastManager.show('error', inputValidation.error || 'Invalid input');
      return;
    }

    if (!wbtcPrice) {
      toastManager.show('error', 'Unable to fetch WBTC price. Please try again.');
      return;
    }

    const toastId = toastManager.show('loading', 'Validating withdrawal...');
    try {
      const parsedAmount = parseUnits(withdrawAmount, TOKEN_DECIMALS.WBTC);

      if (wbtcBalance !== undefined && wbtcBalance !== null && typeof wbtcBalance === 'bigint' && parsedAmount > wbtcBalance) {
        toastManager.update(toastId, 'error', 'Withdrawal amount exceeds WBTC balance');
        return;
      }

      const withdrawalValueUSD = (parsedAmount * wbtcPrice) / (10n ** 8n);

      const withdrawalValidation = validateWithdrawalAmount(
        withdrawalValueUSD,
        totalCollateral,
        totalDebt,
        healthFactor,
        totalCollateral,
        liquidationThreshold
      );

      if (!withdrawalValidation.isValid) {
        toastManager.update(toastId, 'error', withdrawalValidation.error || 'Invalid withdrawal');
        return;
      }

      toastManager.update(toastId, 'loading', 'Withdrawing WBTC...');
      const txHash = await writeContract({
        address: ADDRESSES.AAVE_POOL as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: 'withdraw',
        args: [ADDRESSES.WBTC as `0x${string}`, parsedAmount, address],
      });

      toastManager.update(toastId, 'success', 'WBTC withdrawn successfully!', txHash as unknown as string);
      setWithdrawAmount('');
      setTimeout(() => {
        refetchAccountData();
      }, 2000);
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to withdraw WBTC');
    }
  };

  const handleRepayMax = () => {
    if (debtBalance !== undefined && debtBalance !== null && typeof debtBalance === 'bigint') {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

        <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-500/30">
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
                onChange={(e) => setRepayAmount(sanitizeNumericInput(e.target.value))}
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
            <div className="text-sm text-gray-400 mt-1 space-y-0.5">
              {debtBalance !== undefined && debtBalance !== null && typeof debtBalance === 'bigint' && (
                <p>Current Debt: {formatUSDT(debtBalance)} USDT</p>
              )}
              {usdtBalance !== undefined && usdtBalance !== null && typeof usdtBalance === 'bigint' && (
                <p>USDT Balance: {formatUSDT(usdtBalance)} USDT</p>
              )}
            </div>
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
              onChange={(e) => setWithdrawAmount(sanitizeNumericInput(e.target.value))}
              placeholder="0.0"
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500"
            />
            <div className="text-sm text-gray-400 mt-1">
              {wbtcBalance !== undefined && wbtcBalance !== null && typeof wbtcBalance === 'bigint' && (
                <p>Available: {formatWBTC(wbtcBalance)} WBTC</p>
              )}
            </div>
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
