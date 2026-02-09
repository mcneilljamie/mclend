import { useReadContract } from 'wagmi';
import { ADDRESSES } from '../config/contracts';
import { AAVE_ORACLE_ABI } from '../config/abis';

export function useAssetPrice(assetAddress: `0x${string}`) {
  return useReadContract({
    address: ADDRESSES.AAVE_ORACLE as `0x${string}`,
    abi: AAVE_ORACLE_ABI,
    functionName: 'getAssetPrice',
    args: [assetAddress],
    query: {
      refetchInterval: 30000,
      staleTime: 20000,
    },
  });
}
