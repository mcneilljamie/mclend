import { useState } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { LandingPage } from './components/LandingPage';
import { AppPage } from './components/AppPage';
import { ToastContainer } from './components/Toast';
import { Bitcoin, ArrowLeft } from 'lucide-react';

function App() {
  const [showApp, setShowApp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950">
      <ToastContainer />

      <header className="border-b border-purple-900/30 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {showApp && (
                <button
                  onClick={() => setShowApp(false)}
                  className="p-2 hover:bg-purple-950/50 rounded-lg transition-colors border border-purple-800/30 mr-2"
                  title="Back to home"
                >
                  <ArrowLeft className="w-5 h-5 text-purple-400" />
                </button>
              )}
              <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
                <Bitcoin className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">McLend</h1>
            </div>
            {showApp && <WalletConnect />}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!showApp ? (
          <LandingPage onLaunchApp={() => setShowApp(true)} />
        ) : (
          <AppPage />
        )}
      </main>

      <footer className="border-t border-purple-900/30 bg-black/40 backdrop-blur-md mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            McLend - Powered by Aave V3 on Ethereum Mainnet
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
