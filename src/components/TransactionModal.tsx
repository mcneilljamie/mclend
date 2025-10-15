import { useState } from 'react';
import { X, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Contract, parseUnits, MaxUint256 } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { Asset } from '../types/aave';
import { AAVE_POOL_ADDRESS, POOL_ABI, ERC20_ABI } from '../config/assets';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  maxAmount?: string;
}

export const TransactionModal = ({ isOpen, onClose, asset, type, maxAmount }: TransactionModalProps) => {
  const { signer, account } = useWeb3();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'transacting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTransaction = async () => {
    if (!signer || !account || !amount) return;

    try {
      setIsProcessing(true);
      setError(null);
      setTxHash(null);

      const amountInWei = parseUnits(amount, asset.decimals);
      const poolContract = new Contract(AAVE_POOL_ADDRESS, POOL_ABI, signer);
      const tokenContract = new Contract(asset.address, ERC20_ABI, signer);

      if (type === 'supply' || type === 'repay') {
        setTxStatus('approving');
        const allowance = await tokenContract.allowance(account, AAVE_POOL_ADDRESS);

        if (allowance < amountInWei) {
          const approveTx = await tokenContract.approve(AAVE_POOL_ADDRESS, MaxUint256);
          await approveTx.wait();
        }
      }

      setTxStatus('transacting');
      let tx;

      switch (type) {
        case 'supply':
          tx = await poolContract.supply(asset.address, amountInWei, account, 0);
          break;
        case 'withdraw':
          tx = await poolContract.withdraw(asset.address, amountInWei, account);
          break;
        case 'borrow':
          tx = await poolContract.borrow(asset.address, amountInWei, 2, 0, account);
          break;
        case 'repay':
          tx = await poolContract.repay(asset.address, amountInWei, 2, account);
          break;
      }

      setTxHash(tx.hash);
      await tx.wait();

      setTxStatus('success');
      setTimeout(() => {
        onClose();
        setTxStatus('idle');
        setAmount('');
      }, 3000);
    } catch (err: any) {
      console.error('Transaction error:', err);
      setTxStatus('error');

      let errorMessage = 'Transaction failed';

      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = 'Transaction was rejected';
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected';
        } else {
          errorMessage = err.message.length > 100 ? err.message.substring(0, 100) + '...' : err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'supply': return `Supply ${asset.symbol}`;
      case 'withdraw': return `Withdraw ${asset.symbol}`;
      case 'borrow': return `Borrow ${asset.symbol}`;
      case 'repay': return `Repay ${asset.symbol}`;
    }
  };

  const getButtonText = () => {
    if (txStatus === 'approving') return 'Approving...';
    if (txStatus === 'transacting') return 'Processing...';
    if (txStatus === 'success') return 'Success!';
    return getTitle();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-7 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-7">
          {txStatus === 'success' ? (
            <div className="text-center py-10">
              <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-900 mb-2">Transaction Successful!</p>
              {txHash && (
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View on Etherscan
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="mb-7">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isProcessing}
                    className="w-full px-5 py-4 pr-24 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg font-semibold disabled:bg-gray-50"
                    step="any"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                    {asset.symbol}
                  </div>
                </div>
                {maxAmount && (
                  <button
                    onClick={() => setAmount(maxAmount)}
                    disabled={isProcessing}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-3"
                  >
                    Max: {parseFloat(maxAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {txStatus === 'approving' && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-sm text-blue-800">Approving token spend...</p>
                </div>
              )}

              {txStatus === 'transacting' && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-sm text-blue-800">Processing transaction...</p>
                </div>
              )}

              <button
                onClick={handleTransaction}
                disabled={!amount || isProcessing || parseFloat(amount) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 px-7 rounded-xl transition-colors shadow-lg disabled:shadow-none"
              >
                {getButtonText()}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
