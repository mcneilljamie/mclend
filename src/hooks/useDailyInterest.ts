import { useState, useEffect } from 'react';
import { Contract, formatUnits } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { AAVE_POOL_ADDRESS, POOL_ABI, ERC20_ABI, SUPPORTED_ASSETS } from '../config/assets';

const RAY = 10n ** 27n;

interface DailyInterestData {
  dailyInterest: number;
  supplyInterest: number;
  borrowInterest: number;
}

export const useDailyInterest = () => {
  const { provider, account, isConnected } = useWeb3();
  const [interestData, setInterestData] = useState<DailyInterestData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || !account || !isConnected) {
      setInterestData(null);
      return;
    }

    const fetchDailyInterest = async () => {
      try {
        setLoading(true);

        const btcPriceResponse = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        const btcPriceData = await btcPriceResponse.json();
        const btcPrice = parseFloat(btcPriceData.data.amount);

        const poolContract = new Contract(AAVE_POOL_ADDRESS, POOL_ABI, provider);

        let totalSupplyInterestPerDay = 0;
        let totalBorrowInterestPerDay = 0;

        for (const asset of SUPPORTED_ASSETS) {
          const reserveData = await poolContract.getReserveData(asset.address);
          const liquidityRate = reserveData[2];
          const variableBorrowRate = reserveData[4];

          const supplyAPY = calculateAPY(liquidityRate);
          const borrowAPY = calculateAPY(variableBorrowRate);

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

          const suppliedUSD = suppliedAmount * assetPrice;
          const borrowedUSD = borrowedAmount * assetPrice;

          const dailySupplyInterest = (suppliedUSD * supplyAPY) / 100 / 365;
          const dailyBorrowInterest = (borrowedUSD * borrowAPY) / 100 / 365;

          totalSupplyInterestPerDay += dailySupplyInterest;
          totalBorrowInterestPerDay += dailyBorrowInterest;
        }

        const netDailyInterest = totalSupplyInterestPerDay - totalBorrowInterestPerDay;

        setInterestData({
          dailyInterest: netDailyInterest,
          supplyInterest: totalSupplyInterestPerDay,
          borrowInterest: totalBorrowInterestPerDay,
        });
      } catch (error) {
        console.error('Error calculating daily interest:', error);
        setInterestData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyInterest();
    const interval = setInterval(fetchDailyInterest, 30000);
    return () => clearInterval(interval);
  }, [provider, account, isConnected]);

  return { interestData, loading };
};

const calculateAPY = (rate: bigint): number => {
  if (rate === 0n) return 0;

  const rateDecimal = Number(rate) / Number(RAY);
  const apy = ((1 + rateDecimal / 31536000) ** 31536000 - 1) * 100;

  if (!isFinite(apy) || isNaN(apy)) {
    const simpleAPY = rateDecimal * 100;
    return simpleAPY;
  }

  return apy;
};
