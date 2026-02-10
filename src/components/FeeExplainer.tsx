import { ArrowRight, Flame, Repeat, Wallet } from 'lucide-react';

interface FeeExplainerProps {
  netAmount?: string;
  feeAmount?: string;
  grossAmount?: string;
  compact?: boolean;
}

export function FeeExplainer({ netAmount, feeAmount, grossAmount, compact = false }: FeeExplainerProps) {
  const exampleNet = netAmount || '10,000';
  const exampleFee = feeAmount || '100';
  const exampleGross = grossAmount || '10,100';

  if (compact) {
    return (
      <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          How the 1% Fee Works
        </h4>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            When you borrow, a single atomic transaction executes:
          </p>
          <div className="flex items-center gap-2 text-xs bg-black/30 rounded p-2">
            <div className="flex-1">1. Borrow {exampleGross} USDT</div>
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <div className="flex-1">2. Send {exampleNet} to you</div>
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <div className="flex-1">3. Swap {exampleFee} fee</div>
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <div className="flex-1">4. Burn MCLEND</div>
          </div>
          <p className="text-xs text-gray-400 italic">
            All steps happen in one transaction. The fee is instantly converted to MCLEND tokens and burned, creating deflationary pressure.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-blue-900/20 backdrop-blur-xl rounded-2xl border border-blue-500/20 p-8 shadow-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl mb-4 border border-blue-500/20">
          <Flame className="w-12 h-12 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">How the Atomic Fee Works</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Every borrow includes a transparent 1% origination fee that's automatically collected, swapped, and burned in a single transaction.
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-950/50 to-blue-950/50 border border-purple-500/30 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 text-center">Example: Borrowing $10,000</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">You want to receive:</span>
            <span className="text-white font-semibold">$10,000 USDT</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">McLend Fee (1%):</span>
            <span className="text-orange-400 font-semibold">+$100 USDT</span>
          </div>
          <div className="border-t border-purple-500/30 pt-3 flex justify-between items-center">
            <span className="text-purple-300 font-semibold">Total borrowed from Aave:</span>
            <span className="text-white font-bold">$10,100 USDT</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-purple-950/50 border border-purple-500/30 rounded-xl p-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div className="flex justify-center mb-4 mt-2">
            <Wallet className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold mb-2 text-center">Borrow from Aave</h3>
          <p className="text-gray-400 text-sm text-center">
            Contract borrows {exampleGross} USDT from Aave on your behalf
          </p>
        </div>

        <div className="bg-green-950/50 border border-green-500/30 rounded-xl p-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div className="flex justify-center mb-4 mt-2">
            <ArrowRight className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-white font-semibold mb-2 text-center">Transfer to You</h3>
          <p className="text-gray-400 text-sm text-center">
            {exampleNet} USDT sent directly to your wallet
          </p>
        </div>

        <div className="bg-blue-950/50 border border-blue-500/30 rounded-xl p-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div className="flex justify-center mb-4 mt-2">
            <Repeat className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-white font-semibold mb-2 text-center">Swap Fee</h3>
          <p className="text-gray-400 text-sm text-center">
            {exampleFee} USDT fee swapped to ETH, then to MCLEND tokens
          </p>
        </div>

        <div className="bg-orange-950/50 border border-orange-500/30 rounded-xl p-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div className="flex justify-center mb-4 mt-2">
            <Flame className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-white font-semibold mb-2 text-center">Burn MCLEND</h3>
          <p className="text-gray-400 text-sm text-center">
            MCLEND tokens permanently burned, reducing supply
          </p>
        </div>
      </div>

      <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-5">
        <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Why This Matters
        </h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex gap-2">
            <span className="text-blue-400 flex-shrink-0">•</span>
            <span><strong>Atomic:</strong> All 4 steps happen in a single transaction—no manual steps or separate approvals</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-400 flex-shrink-0">•</span>
            <span><strong>Transparent:</strong> You see exactly what you'll receive and what you'll owe before confirming</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-400 flex-shrink-0">•</span>
            <span><strong>Deflationary:</strong> Fee collection permanently reduces MCLEND token supply via burning</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-400 flex-shrink-0">•</span>
            <span><strong>Simple:</strong> One upfront fee at origination—no hidden charges or recurring costs</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
