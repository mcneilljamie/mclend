import { useState, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADDRESSES, TOKEN_DECIMALS, MCLEND_FEE_BPS, BPS_DENOMINATOR, SLIPPAGE } from '../config/contracts';
import { VARIABLE_DEBT_TOKEN_ABI, MCLEND_ORIGINATION_GATE_ABI, IERC20_ABI } from '../config/abis';
import { useUserAccountData } from '../hooks/useUserAccountData';
import { useBorrowAllowance } from '../hooks/useDebtToken';
import { formatUSDT, formatUSD, calculateFee, calculateGrossAmount, calculateSafeMaxBorrow } from '../utils/format';
import { toastManager } from './Toast';
import { Loader, AlertCircle, CheckCircle2, Circle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { FeeExplainer } from './FeeExplainer';

export function BorrowUSDT() {
  const { address } = useAccount();
  const [netAmount, setNetAmount] = useState('');
  const [showFeeExplainer, setShowFeeExplainer] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const isContractDeployed = ADDRESSES.MCLEND_ORIGINATION_GATE !== '0x0000000000000000000000000000000000000000';

  const { data: accountData } = useUserAccountData(address);
  const { data: creditDelegation, refetch: refetchDelegation } = useBorrowAllowance(
    address,
    ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`
  );

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: ADDRESSES.USDT as `0x${string}`,
    abi: IERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`] : undefined,
  });

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

  const hasCreditDelegation = creditDelegation !== undefined && creditDelegation >= grossAmount;
  const hasUsdtAllowance = usdtAllowance !== undefined && usdtAllowance >= feeAmount;
  const needsSetup = !hasCreditDelegation || !hasUsdtAllowance;

  const availableBorrow = accountData?.[2] || 0n;
  const safeMaxBorrow = useMemo(
    () => calculateSafeMaxBorrow(availableBorrow, 1.5),
    [availableBorrow]
  );

  const handleApproveDelegation = async () => {
    const toastId = toastManager.show('loading', 'Approving credit delegation (one-time setup)...');
    try {
      await writeContract({
        address: ADDRESSES.VARIABLE_DEBT_USDT as `0x${string}`,
        abi: VARIABLE_DEBT_TOKEN_ABI,
        functionName: 'approveDelegation',
        args: [ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`, maxUint256],
      });
      toastManager.update(toastId, 'success', 'Credit delegation approved for unlimited borrows!', hash);
      setTimeout(() => refetchDelegation(), 2000);
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to approve delegation');
    }
  };

  const handleApproveUSDT = async () => {
    const toastId = toastManager.show('loading', 'Approving USDT for fee collection (one-time setup)...');
    try {
      await writeContract({
        address: ADDRESSES.USDT as `0x${string}`,
        abi: IERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`, maxUint256],
      });
      toastManager.update(toastId, 'success', 'USDT approved for unlimited fee collection!', hash);
      setTimeout(() => refetchUsdtAllowance(), 2000);
    } catch (error: any) {
      toastManager.update(toastId, 'error', error.message || 'Failed to approve USDT');
    }
  };

  const handleBorrow = async () => {
    if (!netAmount || !address) return;
    const toastId = toastManager.show('loading', 'Borrowing USDT with atomic fee swap and burn...');
    try {
      const ETH_USD_PRICE = 3000n;
      const USDT_TO_ETH_DECIMALS_ADJUSTMENT = 10n ** 12n;

      const ethEstimate = (feeAmount * USDT_TO_ETH_DECIMALS_ADJUSTMENT) / ETH_USD_PRICE;
      const minEthOut = (ethEstimate * (BPS_DENOMINATOR - SLIPPAGE.USDT_TO_ETH_BPS)) / BPS_DENOMINATOR;

      const minMclendOut = (ethEstimate * (BPS_DENOMINATOR - SLIPPAGE.ETH_TO_MCLEND_BPS)) / BPS_DENOMINATOR;

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      await writeContract({
        address: ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`,
        abi: MCLEND_ORIGINATION_GATE_ABI,
        functionName: 'borrowWithFee',
        args: [netAmountBigInt, minEthOut, minMclendOut, deadline],
      });
      toastManager.update(toastId, 'success', 'USDT borrowed and MCLEND burned successfully!', hash);
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Borrow USDT</h2>
        <button
          onClick={() => setShowFeeExplainer(!showFeeExplainer)}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Info className="w-4 h-4" />
          <span>How fees work</span>
          {showFeeExplainer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isContractDeployed && (
        <div className="mb-4 flex items-start gap-2 bg-red-950/30 border border-red-500/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">Contract Not Yet Deployed</p>
            <p className="text-sm text-red-300/80">
              The McLend Origination Gate contract has not been deployed to mainnet yet. All actions are disabled until deployment is complete.
            </p>
          </div>
        </div>
      )}

      {showFeeExplainer && (
        <div className="mb-4">
          <FeeExplainer
            netAmount={netAmount || undefined}
            feeAmount={netAmount ? formatUSDT(feeAmount) : undefined}
            grossAmount={netAmount ? formatUSDT(grossAmount) : undefined}
            compact={true}
          />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Net Amount (You Receive)
          </label>
          <div className="relative">
            <input
              type="text"
              value={netAmount}
              onChange={(e) => setNetAmount(e.target.value)}
              placeholder="0.0"
              disabled={!isContractDeployed}
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSafeMax}
              disabled={!isContractDeployed}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {netAmount && netAmountBigInt > 0n && (
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">Setup Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {hasCreditDelegation ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-500" />
                )}
                <span className={hasCreditDelegation ? "text-green-300 text-sm" : "text-gray-400 text-sm"}>
                  Credit delegation approved
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasUsdtAllowance ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-500" />
                )}
                <span className={hasUsdtAllowance ? "text-green-300 text-sm" : "text-gray-400 text-sm"}>
                  USDT fee approval set
                </span>
              </div>
            </div>
          </div>
        )}

        {!hasCreditDelegation && netAmount && netAmountBigInt > 0n && (
          <button
            onClick={handleApproveDelegation}
            disabled={isPending || isConfirming || !isContractDeployed}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Step 1: Approve Credit Delegation (One-Time)'
            )}
          </button>
        )}

        {hasCreditDelegation && !hasUsdtAllowance && netAmount && netAmountBigInt > 0n && (
          <button
            onClick={handleApproveUSDT}
            disabled={isPending || isConfirming || !isContractDeployed}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Step 2: Approve USDT Fee (One-Time)'
            )}
          </button>
        )}

        {hasCreditDelegation && hasUsdtAllowance && (
          <>
            <div className="flex items-start gap-2 bg-blue-950/30 border border-blue-500/30 rounded-lg p-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                Slippage protection: 3% for USDT→ETH, 50% for ETH→MCLEND. Price estimates based on $3,000/ETH. Transaction will revert if market rates are worse than these limits.
              </p>
            </div>
            <button
              onClick={handleBorrow}
              disabled={isPending || isConfirming || !netAmount || grossAmount > availableBorrow || !isContractDeployed}
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
          </>
        )}
      </div>
    </div>
  );
}
