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
      refetchInterval: 10000,
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

  // Aave stores rates in Ray format (1e27)
  // Convert to percentage with higher precision before rounding
  const RAY = 10n ** 27n;

  // Use 100000 multiplier for more precision (5 decimal places) before rounding to 2
  const percentage = Number((rateInRay * 100000n) / RAY) / 1000;

  return percentage.toFixed(2);
}
