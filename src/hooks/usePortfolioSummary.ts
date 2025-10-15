import { useState, useEffect } from 'react';
import { Contract, formatUnits } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { SUPPORTED_ASSETS, ERC20_ABI } from '../config/assets';

interface PortfolioSummary {
  totalDepositsUSD: number;
  totalBorrowsUSD: number;
  hasAnyPosition: boolean;
}

export const usePortfolioSummary = () => {
  const { provider, account, isConnected } = useWeb3();
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalDepositsUSD: 0,
    totalBorrowsUSD: 0,
    hasAnyPosition: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || !account || !isConnected) {
      setSummary({
        totalDepositsUSD: 0,
        totalBorrowsUSD: 0,
        hasAnyPosition: false,
      });
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoading(true);

        const btcPriceResponse = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        const btcPriceData = await btcPriceResponse.json();
        const btcPrice = parseFloat(btcPriceData.data.amount);

        let totalDepositsUSD = 0;
        let totalBorrowsUSD = 0;

        for (const asset of SUPPORTED_ASSETS) {
          const aTokenContract = new Contract(asset.aTokenAddress, ERC20_ABI, provider);
          const aTokenBalance = await aTokenContract.balanceOf(account);
          const suppliedAmount = parseFloat(formatUnits(aTokenBalance, asset.decimals));

          const variableDebtContract = new Contract(asset.variableDebtTokenAddress, ERC20_ABI, provider);
          const debtTokenBalance = await variableDebtContract.balanceOf(account);
          const borrowedAmount = parseFloat(formatUnits(debtTokenBalance, asset.decimals));

          let assetPrice = 0;
          if (asset.symbol === 'WBTC') {
            assetPrice = btcPrice;
          } else if (asset.symbol === 'USDT') {
            assetPrice = 1;
          }

          totalDepositsUSD += suppliedAmount * assetPrice;
          totalBorrowsUSD += borrowedAmount * assetPrice;
        }

        setSummary({
          totalDepositsUSD,
          totalBorrowsUSD,
          hasAnyPosition: totalDepositsUSD > 0 || totalBorrowsUSD > 0,
        });
      } catch (error) {
        console.error('Error fetching portfolio summary:', error);
        setSummary({
          totalDepositsUSD: 0,
          totalBorrowsUSD: 0,
          hasAnyPosition: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, [provider, account, isConnected]);

  return { summary, loading };
};
