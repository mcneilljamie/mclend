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

  // getReserveData returns a struct with liquidityRate in Ray units (1e27)
  const liquidityRate = data?.[3] as bigint | undefined;

  return {
    data,
    liquidityRate,
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
