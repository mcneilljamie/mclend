import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADDRESSES, TOKEN_DECIMALS } from '../config/contracts';
import { IERC20_ABI, AAVE_POOL_ABI } from '../config/abis';
import { useTokenBalance, useTokenAllowance } from '../hooks/useTokenBalance';
import { useReserveData, formatAPY } from '../hooks/useReserveData';
import { formatWBTC } from '../utils/format';
import { validateNumericInput, sanitizeNumericInput } from '../utils/validation';
import { parseTransactionError } from '../utils/errorHandling';
import { toastManager } from './Toast';
import { SuccessModal } from './SuccessModal';
import { Loader } from 'lucide-react';

export function DepositWBTC() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState('');
  const [successType, setSuccessType] = useState<'approval' | 'deposit'>('deposit');
  const [pendingTxType, setPendingTxType] = useState<'approval' | 'deposit' | null>(null);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const { data: wbtcBalance } = useTokenBalance(
    ADDRESSES.WBTC as `0x${string}`,
    address
  );

  const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
    ADDRESSES.WBTC as `0x${string}`,
    address,
    ADDRESSES.AAVE_POOL as `0x${string}`
  );

  const { liquidityRate } = useReserveData(ADDRESSES.WBTC as `0x${string}`);

  const needsApproval = allowance !== undefined && allowance !== null && typeof allowance === 'bigint' && amount !== '' &&
    parseUnits(amount || '0', TOKEN_DECIMALS.WBTC) > allowance;

  useEffect(() => {
    if (isConfirmed && hash && pendingTxType) {
      toastManager.dismissAll();
      setSuccessType(pendingTxType);
      setSuccessTxHash(hash);
      setSuccessModalOpen(true);
      setPendingTxType(null);

      if (pendingTxType === 'approval') {
        setTimeout(() => refetchAllowance(), 2000);
      }
    }
  }, [isConfirmed, hash, pendingTxType, refetchAllowance]);

  const handleApprove = async () => {
    if (!amount) return;

    const inputValidation = validateNumericInput(amount);
    if (!inputValidation.isValid) {
      toastManager.show('error', inputValidation.error || 'Invalid input');
      return;
    }

    const toastId = toastManager.show('loading', 'Approving WBTC...');
    try {
      setPendingTxType('approval');
      await writeContract({
        address: ADDRESSES.WBTC as `0x${string}`,
        abi: IERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.AAVE_POOL as `0x${string}`, maxUint256],
      });
      toastManager.update(toastId, 'loading', 'Waiting for transaction confirmation...');
    } catch (error: any) {
      setPendingTxType(null);
      const errorMessage = parseTransactionError(error);
      toastManager.update(toastId, 'error', errorMessage);
    }
  };

  const handleDeposit = async () => {
    if (!amount || !address) return;

    const inputValidation = validateNumericInput(amount);
    if (!inputValidation.isValid) {
      toastManager.show('error', inputValidation.error || 'Invalid input');
      return;
    }

    const parsedAmount = parseUnits(amount, TOKEN_DECIMALS.WBTC);

    if (wbtcBalance !== undefined && wbtcBalance !== null && typeof wbtcBalance === 'bigint' && parsedAmount > wbtcBalance) {
      toastManager.show('error', 'Insufficient WBTC balance');
      return;
    }

    const toastId = toastManager.show('loading', 'Depositing WBTC...');
    try {
      setPendingTxType('deposit');
      await writeContract({
        address: ADDRESSES.AAVE_POOL as `0x${string}`,
        abi: AAVE_POOL_ABI,
        functionName: 'supply',
        args: [ADDRESSES.WBTC as `0x${string}`, parsedAmount, address, 0],
      });
      toastManager.update(toastId, 'loading', 'Waiting for transaction confirmation...');
      setAmount('');
    } catch (error: any) {
      setPendingTxType(null);
      const errorMessage = parseTransactionError(error);
      toastManager.update(toastId, 'error', errorMessage);
    }
  };

  const handleMax = () => {
    if (wbtcBalance !== undefined && wbtcBalance !== null && typeof wbtcBalance === 'bigint') {
      setAmount(formatWBTC(wbtcBalance));
    }
  };

  const getSuccessModalContent = () => {
    switch (successType) {
      case 'approval':
        return {
          title: 'WBTC Approval Successful',
          description: 'You can now deposit WBTC into Aave. This was a one-time setup.'
        };
      case 'deposit':
        return {
          title: 'Deposit Successful',
          description: 'Your WBTC has been deposited as collateral and is now earning interest.'
        };
    }
  };

  return (
    <>
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        txHash={successTxHash}
        {...getSuccessModalContent()}
      />
      <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-xl shadow-2xl shadow-purple-500/10 p-6 border border-purple-500/20">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Deposit WBTC Collateral</h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-gray-400">Earning APY:</span>
          <span className="text-lg font-semibold text-green-400">{formatAPY(liquidityRate)}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Amount
          </label>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
              placeholder="0.0"
              className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500"
            />
            <button
              onClick={handleMax}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600/50 hover:bg-purple-600 rounded text-sm font-medium text-white transition-colors"
            >
              MAX
            </button>
          </div>
          {wbtcBalance !== undefined && wbtcBalance !== null && typeof wbtcBalance === 'bigint' && (
            <p className="text-sm text-gray-400 mt-1">
              Wallet Balance: {formatWBTC(wbtcBalance)} WBTC
            </p>
          )}
        </div>

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isPending || isConfirming || !amount}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve WBTC'
            )}
          </button>
        ) : (
          <button
            onClick={handleDeposit}
            disabled={isPending || isConfirming || !amount}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
          >
            {isPending || isConfirming ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Depositing...
              </>
            ) : (
              'Deposit WBTC'
            )}
          </button>
        )}
      </div>
    </div>
    </>
  );
}
