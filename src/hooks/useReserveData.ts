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
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // getReserveData returns a struct:
  // [0] configuration, [1] liquidityIndex, [2] currentLiquidityRate (supply APY),
  // [3] variableBorrowIndex, [4] currentVariableBorrowRate (borrow APY), [5] stableBorrowRate, ...
  const liquidityRate = data?.[2] as bigint | undefined; // Supply/Deposit APY
  const variableBorrowRate = data?.[4] as bigint | undefined; // Variable Borrow APY

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

  // Convert from Ray (1e27) to percentage
  // APY = (1 + rate/secondsPerYear)^secondsPerYear - 1
  // For display purposes, we approximate: APY ≈ rate * 100
  const RAY = 10n ** 27n;
  const apy = Number((rateInRay * 10000n) / RAY) / 100;

  return apy.toFixed(2);
}
