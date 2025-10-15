import { useState, useEffect } from 'react';
import { Contract, formatUnits } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { UserAccountData } from '../types/aave';
import { AAVE_POOL_ADDRESS, POOL_ABI } from '../config/assets';

export const useUserAccount = () => {
  const { provider, account, isConnected } = useWeb3();
  const [accountData, setAccountData] = useState<UserAccountData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || !account || !isConnected) {
      setAccountData(null);
      return;
    }

    const fetchAccountData = async () => {
      try {
        setLoading(true);
        const poolContract = new Contract(AAVE_POOL_ADDRESS, POOL_ABI, provider);
        const data = await poolContract.getUserAccountData(account);

        setAccountData({
          totalCollateralBase: data[0],
          totalDebtBase: data[1],
          availableBorrowsBase: data[2],
          currentLiquidationThreshold: data[3],
          ltv: data[4],
          healthFactor: data[5],
        });
      } catch (error) {
        console.error('Error fetching user account data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
    const interval = setInterval(fetchAccountData, 30000);
    return () => clearInterval(interval);
  }, [provider, account, isConnected]);

  return { accountData, loading };
};

export const formatHealthFactor = (healthFactor: bigint): string => {
  if (healthFactor === BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')) {
    return '∞';
  }
  return (Number(healthFactor) / 1e18).toFixed(2);
};

export const formatUSD = (value: bigint): string => {
  return formatUnits(value, 8);
};
