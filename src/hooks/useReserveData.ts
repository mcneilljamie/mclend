import { useReadContract } from 'wagmi';
import { ADDRESSES } from '../config/contracts';
import { AAVE_POOL_ABI } from '../config/abis';

export function useReserveData(asset: `0x${string}`) {
  const { data, isLoading, error } = useReadContract({
    address: ADDRESSES.AAVE_POOL as `0x${string}`,
    abi: AAVE_POOL_ABI,
    functionName: 'getReserveData',
    args: [asset],
    query: {
      refetchInterval: 30000,
      enabled: true,
    },
  });

  // getReserveData returns a struct - viem/wagmi can return it as array or object
  const reserveData = data as any;

  // Array indices: [0] configuration, [1] liquidityIndex, [2] currentLiquidityRate,
  // [3] variableBorrowIndex, [4] currentVariableBorrowRate, [5] stableBorrowRate, ...
  const liquidityRate = (reserveData?.currentLiquidityRate ?? reserveData?.[2]) as bigint | undefined;
  const variableBorrowRate = (reserveData?.currentVariableBorrowRate ?? reserveData?.[4]) as bigint | undefined;

  // Debug logging
  if (data && !liquidityRate && !variableBorrowRate) {
    console.log('Reserve data for', asset, ':', data);
    console.log('Type:', typeof data, 'Array?', Array.isArray(data));
    console.log('Keys:', data ? Object.keys(data) : 'no data');
  }

  return {
    data,
    liquidityRate,
    variableBorrowRate,
    isLoading,
    error,
  };
}

export function formatAPY(rateInRay: bigint | undefined): string {
  if (!rateInRay) return '0.00';

  // Aave stores rates as APR per second in Ray format (1e27)
  // To convert to APY, we need to compound: APY = (1 + ratePerSecond)^secondsPerYear - 1
  const RAY = 1e27;
  const SECONDS_PER_YEAR = 31536000;

  const ratePerSecond = Number(rateInRay) / RAY;
  const apy = (Math.pow(1 + ratePerSecond, SECONDS_PER_YEAR) - 1) * 100;

  return apy.toFixed(2);
}
