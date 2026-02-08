import { useReadContract } from 'wagmi';
import { ADDRESSES } from '../config/contracts';
import { AAVE_POOL_ABI } from '../config/abis';

export function useUserAccountData(address?: `0x${string}`) {
  return useReadContract({
    address: ADDRESSES.AAVE_POOL as `0x${string}`,
    abi: AAVE_POOL_ABI,
    functionName: 'getUserAccountData',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    },
  });
}

export type UserAccountData = {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
};
