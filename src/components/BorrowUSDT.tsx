import { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADDRESSES, TOKEN_DECIMALS, MCLEND_FEE_BPS, BPS_DENOMINATOR, SLIPPAGE } from '../config/contracts';
import { VARIABLE_DEBT_TOKEN_ABI, MCLEND_ORIGINATION_GATE_ABI } from '../config/abis';
import { useUserAccountData } from '../hooks/useUserAccountData';
import { useBorrowAllowance } from '../hooks/useDebtToken';
import { useReserveData, formatAPY } from '../hooks/useReserveData';
import { useAssetPrice } from '../hooks/useAssetPrice';
import { formatUSDT, formatUSD, calculateFee, calculateGrossAmount, calculateSafeMaxBorrow } from '../utils/format';
import { validateNumericInput, sanitizeNumericInput } from '../utils/validation';
import { parseTransactionError } from '../utils/errorHandling';
import { toastManager } from './Toast';
import { SuccessModal } from './SuccessModal';
import { Loader, AlertCircle, CheckCircle2, Circle } from 'lucide-react';

export function BorrowUSDT() {
  const { address } = useAccount();
  const [netAmount, setNetAmount] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState('');
  const [successType, setSuccessType] = useState<'delegation' | 'approval' | 'borrow'>('borrow');
  const [pendingTxType, setPendingTxType] = useState<'delegation' | 'borrow' | null>(null);
  const { writeContract, data: hash, isPending, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const isContractDeployed = ADDRESSES.MCLEND_ORIGINATION_GATE !== '0x0000000000000000000000000000000000000000';

  const { data: accountData } = useUserAccountData(address);
  const { data: creditDelegation, refetch: refetchDelegation } = useBorrowAllowance(
    address,
    ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`
  );

  const { variableBorrowRate } = useReserveData(ADDRESSES.USDT as `0x${string}`);
  const { data: wethPrice } = useAssetPrice(ADDRESSES.WETH as `0x${string}`);

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

  const hasCreditDelegation = creditDelegation !== undefined && creditDelegation !== null && typeof creditDelegation === 'bigint' && creditDelegation >= grossAmount;

  const availableBorrow = accountData?.[2] || 0n;
  const safeMaxBorrow = useMemo(
    () => calculateSafeMaxBorrow(availableBorrow, 1.5),
    [availableBorrow]
  );

  useEffect(() => {
    if (isConfirmed && hash && pendingTxType) {
      toastManager.dismissAll();
      setSuccessType(pendingTxType);
      setSuccessTxHash(hash);
      setSuccessModalOpen(true);
      setPendingTxType(null);

      if (pendingTxType === 'delegation') {
        setTimeout(() => refetchDelegation(), 2000);
      }
    }
  }, [isConfirmed, hash, pendingTxType, refetchDelegation]);

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false);
    resetWriteContract();
    setSuccessTxHash('');
  };

  const handleApproveDelegation = async () => {
    const toastId = toastManager.show('loading', 'Approving credit delegation (one-time setup)...');
    try {
      setPendingTxType('delegation');
      await writeContract({
        address: ADDRESSES.VARIABLE_DEBT_USDT as `0x${string}`,
        abi: VARIABLE_DEBT_TOKEN_ABI,
        functionName: 'approveDelegation',
        args: [ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`, maxUint256],
      });
      toastManager.update(toastId, 'loading', 'Waiting for transaction confirmation...');
    } catch (error: any) {
      setPendingTxType(null);
      const errorMessage = parseTransactionError(error);
      toastManager.update(toastId, 'error', errorMessage);
    }
  };

  const handleBorrow = async () => {
    if (!netAmount || !address) return;

    const inputValidation = validateNumericInput(netAmount);
    if (!inputValidation.isValid) {
      toastManager.show('error', inputValidation.error || 'Invalid input');
      return;
    }

    if (grossAmount > availableBorrow) {
      toastManager.show('error', 'Borrow amount exceeds available capacity');
      return;
    }

    if (!wethPrice) {
      toastManager.show('error', 'Unable to fetch ETH price. Please try again.');
      return;
    }

    const toastId = toastManager.show('loading', 'Borrowing USDT with atomic fee swap and burn...');
    try {
      const USDT_TO_ETH_DECIMALS_ADJUSTMENT = 10n ** 12n;

      const ethEstimate = (feeAmount * USDT_TO_ETH_DECIMALS_ADJUSTMENT) / wethPrice;
      const minEthOut = (ethEstimate * (BigInt(BPS_DENOMINATOR) - BigInt(SLIPPAGE.USDT_TO_ETH_BPS))) / BigInt(BPS_DENOMINATOR);

      const minMclendOut = 0n;

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      setPendingTxType('borrow');
      await writeContract({
        address: ADDRESSES.MCLEND_ORIGINATION_GATE as `0x${string}`,
        abi: MCLEND_ORIGINATION_GATE_ABI,
        functionName: 'borrowWithFee',
        args: [netAmountBigInt, minEthOut, minMclendOut, deadline],
      });
      toastManager.update(toastId, 'loading', 'Waiting for transaction confirmation...');
      setNetAmount('');
    } catch (error: any) {
      setPendingTxType(null);
      const errorMessage = parseTransactionError(error);
      toastManager.update(toastId, 'error', errorMessage);
    }
  };

  const handleSafeMax = () => {
    if (safeMaxBorrow > 0n) {
      // Convert from 8 decimals (Aave base currency) to 6 decimals (USDT)
      const safeMaxInUSDT = safeMaxBorrow / 100n;
      setNetAmount(formatUSDT(safeMaxInUSDT));
    }
  };

  const getSuccessModalContent = () => {
    switch (successType) {
      case 'delegation':
        return {
          title: 'Credit Delegation Approved',
          description: 'You can now borrow USDT through McLend. This was a one-time setup.'
        };
      case 'borrow':
        return {
          title: 'Borrow Successful',
          description: 'Your USDT has been borrowed and the fee has been swapped and burned as MCLEND.'
        };
      default:
        return {
          title: 'Success',
          description: 'Operation completed successfully.'
        };
    }
  };

  return (
    <>
      <SuccessModal
        isOpen={successModalOpen}
        onClose={handleCloseSuccessModal}
        txHash={successTxHash}
        {...getSuccessModalContent()}
      />
      <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Borrow USDT</h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-400">Variable APY:</span>
          <span className="text-lg font-semibold text-orange-400">{formatAPY(variableBorrowRate)}%</span>
        </div>
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Net Amount (You Receive)
          </label>
          <div className="relative">
            <input
              type="text"
              value={netAmount}
              onChange={(e) => setNetAmount(sanitizeNumericInput(e.target.value))}
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
              <span className="text-purple-300">McLend Fee (0.4%):</span>
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

        {netAmount && netAmountBigInt > 0n && !hasCreditDelegation && (
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">Setup Required</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Circle className="w-5 h-5 text-gray-500" />
                <span className="text-gray-400 text-sm">
                  Credit delegation approval needed
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
              'Approve Credit Delegation (One-Time Setup)'
            )}
          </button>
        )}

        {hasCreditDelegation && (
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
        )}
      </div>
    </div>
    </>
  );
}
