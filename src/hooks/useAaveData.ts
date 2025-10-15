import { useState, useEffect } from 'react';
import { Contract, formatUnits } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { Asset, AssetData, UserPosition } from '../types/aave';
import { AAVE_POOL_ADDRESS, POOL_ABI, ERC20_ABI } from '../config/assets';

const RAY = 10n ** 27n;
const SECONDS_PER_YEAR = 31536000n;

export const useAaveData = (asset: Asset) => {
  const { provider, account, isConnected } = useWeb3();
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || !isConnected) {
      setAssetData(null);
      setUserPosition(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const poolContract = new Contract(AAVE_POOL_ADDRESS, POOL_ABI, provider);
        const reserveData = await poolContract.getReserveData(asset.address);

        const liquidityRate = reserveData[2];
        const variableBorrowRate = reserveData[4];

        const supplyAPY = calculateAPY(liquidityRate);
        const borrowAPY = calculateAPY(variableBorrowRate);

        const tokenContract = new Contract(asset.address, ERC20_ABI, provider);
        const availableLiquidity = await tokenContract.balanceOf(asset.aTokenAddress);

        const aTokenContract = new Contract(asset.aTokenAddress, ERC20_ABI, provider);
        const totalSupplied = await aTokenContract.totalSupply();

        const variableDebtContract = new Contract(asset.variableDebtTokenAddress, ERC20_ABI, provider);
        const totalBorrowed = await variableDebtContract.totalSupply();

        const utilizationRate = totalSupplied > 0n
          ? Number((totalBorrowed * 10000n) / totalSupplied) / 100
          : 0;

        setAssetData({
          supplyAPY: supplyAPY.toFixed(2),
          borrowAPY: borrowAPY.toFixed(2),
          totalSupplied: formatUnits(totalSupplied, asset.decimals),
          totalBorrowed: formatUnits(totalBorrowed, asset.decimals),
          availableLiquidity: formatUnits(availableLiquidity, asset.decimals),
          utilizationRate: utilizationRate.toFixed(2),
        });

        if (account) {
          const aTokenBalance = await aTokenContract.balanceOf(account);
          const debtTokenBalance = await variableDebtContract.balanceOf(account);
          const walletBalance = await tokenContract.balanceOf(account);

          setUserPosition({
            supplied: formatUnits(aTokenBalance, asset.decimals),
            borrowed: formatUnits(debtTokenBalance, asset.decimals),
            suppliedUSD: '0',
            borrowedUSD: '0',
            aTokenBalance: aTokenBalance.toString(),
            debtTokenBalance: debtTokenBalance.toString(),
            walletBalance: formatUnits(walletBalance, asset.decimals),
          });
        }
      } catch (error: any) {
        console.error('Error fetching Aave data:', error);
        setAssetData(null);
        setUserPosition(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [provider, account, isConnected, asset]);

  return { assetData, userPosition, loading };
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
