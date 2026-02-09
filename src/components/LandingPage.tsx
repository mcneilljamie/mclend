import { Bitcoin, Shield, TrendingUp, Lock, ArrowRight, Zap, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { FeeExplainer } from './FeeExplainer';

interface LandingPageProps {
  onLaunchApp: () => void;
}

export function LandingPage({ onLaunchApp }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl mb-4 border border-purple-500/20">
            <Bitcoin className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Borrow Against Bitcoin
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Access instant liquidity without selling your Bitcoin. Institutional-grade lending powered by Aave V3.
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 shadow-2xl shadow-purple-500/10 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="bg-purple-500/10 rounded-xl p-4 mb-4 inline-block">
                <Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Non-Custodial</h3>
              <p className="text-gray-400 text-sm">Your Bitcoin stays in your control via Aave's secure protocol</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-500/10 rounded-xl p-4 mb-4 inline-block">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Competitive Rates</h3>
              <p className="text-gray-400 text-sm">Market-leading APY with transparent 1% origination fee</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-500/10 rounded-xl p-4 mb-4 inline-block">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Battle-Tested</h3>
              <p className="text-gray-400 text-sm">Built on Aave V3, securing billions in DeFi assets</p>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={onLaunchApp}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg transition-all font-semibold text-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
            >
              Launch App
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-8 mb-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Simple, transparent, and secure. Get liquidity in minutes without giving up your Bitcoin position.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-900/60 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm">
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-4">
                1
              </div>
              <h3 className="text-white font-semibold mb-2">Deposit WBTC</h3>
              <p className="text-gray-400 text-sm">
                Deposit wrapped Bitcoin as collateral into Aave V3's secure smart contracts.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm">
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-4">
                2
              </div>
              <h3 className="text-white font-semibold mb-2">Borrow USDT</h3>
              <p className="text-gray-400 text-sm">
                Instantly borrow up to 73% LTV in stablecoins against your Bitcoin collateral.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm">
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-4">
                3
              </div>
              <h3 className="text-white font-semibold mb-2">Use Liquidity</h3>
              <p className="text-gray-400 text-sm">
                Deploy your borrowed funds however you need while keeping Bitcoin exposure.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-purple-500/20 rounded-xl p-6 backdrop-blur-sm">
              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-4">
                4
              </div>
              <h3 className="text-white font-semibold mb-2">Repay & Withdraw</h3>
              <p className="text-gray-400 text-sm">
                Repay your loan anytime and withdraw your Bitcoin collateral. No prepayment penalties.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900/90 to-purple-900/20 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 shadow-xl mb-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">Why Choose DeFi Over TradFi?</h2>
            <p className="text-gray-400">
              Traditional Bitcoin-backed loans come with significant drawbacks. Here's how we compare:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Instant Access</h4>
                  <p className="text-gray-400 text-sm">
                    Borrow in seconds. No applications, credit checks, or waiting periods.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Lower Rates</h4>
                  <p className="text-gray-400 text-sm">
                    Market-driven rates typically 2-5% lower than traditional lenders.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Non-Custodial</h4>
                  <p className="text-gray-400 text-sm">
                    Your Bitcoin never leaves the blockchain. No counterparty risk or custody concerns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Transparent Fees</h4>
                  <p className="text-gray-400 text-sm">
                    Simple 1% origination fee. No hidden charges or surprise costs.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">TradFi: Slow Processing</h4>
                  <p className="text-gray-400 text-sm">
                    Traditional lenders require 1-2 weeks for approval and fund disbursement.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">TradFi: Higher Costs</h4>
                  <p className="text-gray-400 text-sm">
                    Expect 8-15% APR plus origination fees, processing fees, and monthly charges.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">TradFi: Custody Risk</h4>
                  <p className="text-gray-400 text-sm">
                    You must transfer Bitcoin to the lender's custody, exposing you to platform risk.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">TradFi: Complex Terms</h4>
                  <p className="text-gray-400 text-sm">
                    Lengthy contracts with prepayment penalties and restrictive covenants.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-950/50 border border-purple-500/20 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="flex justify-center mb-2">
                  <Clock className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">Seconds</div>
                <p className="text-sm text-gray-400">Time to liquidity</p>
              </div>
              <div>
                <div className="flex justify-center mb-2">
                  <DollarSign className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">1% Fee</div>
                <p className="text-sm text-gray-400">Simple origination cost</p>
              </div>
              <div>
                <div className="flex justify-center mb-2">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">73% LTV</div>
                <p className="text-sm text-gray-400">Maximum loan-to-value</p>
              </div>
            </div>
          </div>
        </div>

        <FeeExplainer />
      </div>
    </div>
  );
}
