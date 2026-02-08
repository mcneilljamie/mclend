import { useState, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { ADDRESSES, TOKEN_DECIMALS, MCLEND_FEE_BPS, BPS_DENOMINATOR } from '../config/contracts';
import { VARIABLE_DEBT_TOKEN_ABI, MCLEND_BORROW_GATE_ABI } from '../config/abis';
import { useUserAccountData } from '../hooks/useUserAccountData';
import { useBorrowAllowance } from '../hooks/useDebtToken';
import { formatUSDT, formatUSD, calculateFee, calculateGrossAmount, calculateSafeMaxBorrow } from '../utils/format';
import { toastManager } from './Toast';
import { Loader, AlertCircle } from 'lucide-react';

export function BorrowUSDT() {
  const { address } = useAccount();
  const [netAmount, setNetAmount] = useState('');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const { data: accountData } = useUserAccountData(address);
  const { data: creditDelegation, refetch: refetchDelegation } = useBorrowAllowance(
    address,
    ADDRESSES.MCLEND_BORROW_GATE as `0x${string}`
  );

  const netAmountBigInt = useMemo(() => {
    if (!netAmount) return 0n;
    try {
      return parseUnits(netAmount, TOKEN_DECIMALS.USDT);
    } catch {
      return 0n;
    }
  }, [netAmount]);

  const feeAmount = useMemo(
    () => calculateFee(netAmountBigInt, MCLEND_FEE_BPS, BPS_DENOMINATOR),
    [netAmountBigInt]
  );

  const grossAmount = useMemo(
    () => calculateGrossAmount(netAmountBigInt, MCLEND_FEE_BPS, BPS_DENOMINATOR),
    [netAmountBigInt]
  );

  const needsCreditDelegation = creditDelegation !== undefined && grossAmount > creditDelegation;

  const availableBorrow = accountData?.[2] || 0n;
  const safeMaxBorrow = useMemo(
    () => calculateSafeMaxBorrow(availableBorrow, 1.5),
    [availableBorrow]
  );

  const handleApproveDelegation = async () => {
    if (!grossAmount) return;
    const toastId = toastManager.show('loading', 'Approving credit delegation...');
    try {
      await writeContract({
        address: ADDRESSES.VARIABLE_DEBT_USDT as `0x${string}`,
        abi: VARIABLE_DEBT_TOKEN_ABI,
        functionName: 'approveDelegation',
        args: [ADDRESSES.MCLEND_BORROW_GATE as `0x${string}`, grossAmount],
      });
      toastManager.update(toastId, 'success', 'Credit delegation approved!', hash);
      refetchDelegation();
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to approve delegation');
    }
  };

  const handleBorrow = async () => {
    if (!netAmount || !address) return;
    const toastId = toastManager.show('loading', 'Borrowing USDT...');
    try {
      await writeContract({
        address: ADDRESSES.MCLEND_BORROW_GATE as `0x${string}`,
        abi: MCLEND_BORROW_GATE_ABI,
        functionName: 'borrowWithFee',
        args: [ADDRESSES.USDT as `0x${string}`, netAmountBigInt],
      });
      toastManager.update(toastId, 'success', 'USDT borrowed successfully!', hash);
      setNetAmount('');
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to borrow USDT');
    }
  };

  const handleSafeMax = () => {
    if (safeMaxBorrow > 0n) {
      setNetAmount(formatUSDT(safeMaxBorrow));
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
      <h2 className="text-2xl font-bold text-white mb-4">Borrow USDT</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Net Amount (You Receive)
          </label>
          <div className="relative">
            <input
              type="number"
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
              placeholder="0.0"
              step="0.01"
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500"
            />
            <button
              onClick={handleSafeMax}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded text-sm font-medium text-white transition-colors"
            >
              SAFE MAX
            </button>
          </div>
          {availableBorrow > 0n && (
            <p className="text-sm text-gray-400 mt-1">
              Available: {formatUSD(availableBorrow, 8)} | Safe Max: {formatUSD(safeMaxBorrow, 8)}
            </p>
          )}
        </div>

        {netAmount && netAmountBigInt > 0n && (
          <div className="bg-purple-950/30 border border-purple-500/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">Net Amount (You Receive):</span>
              <span className="font-semibold text-white">{formatUSDT(netAmountBigInt)} USDT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-300">McLend Fee (1%):</span>
              <span className="font-semibold text-white">{formatUSDT(feeAmount)} USDT</span>
            </div>
            <div className="flex justify-between text-sm border-t border-purple-500/30 pt-2">
              <span className="text-purple-300">Total Borrowed:</span>
              <span className="font-bold text-white">{formatUSDT(grossAmount)} USDT</span>
            </div>
          </div>
        )}

        {grossAmount > availableBorrow && (
          <div className="flex items-start gap-2 bg-red-950/30 border border-red-500/30 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              Insufficient borrowing capacity. Please deposit more collateral or reduce borrow amount.
            </p>
          </div>
        )}

        {needsCreditDelegation ? (
          <button
            onClick={handleApproveDelegation}
            disabled={isPending || isConfirming || !netAmount || grossAmount > availableBorrow}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve Credit Delegation'
            )}
          </button>
        ) : (
          <button
            onClick={handleBorrow}
            disabled={isPending || isConfirming || !netAmount || grossAmount > availableBorrow}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Borrowing...
              </>
            ) : (
              'Borrow USDT'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
