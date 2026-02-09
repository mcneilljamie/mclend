import { useReadContract } from 'wagmi';
import { IERC20_ABI } from '../config/abis';

export function useTokenBalance(tokenAddress: `0x${string}`, userAddress?: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: IERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 15000,
      staleTime: 10000,
    },
  });
}

export function useTokenAllowance(
  tokenAddress: `0x${string}`,
  owner?: `0x${string}`,
  spender?: `0x${string}`
) {
  return useReadContract({
    address: tokenAddress,
    abi: IERC20_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!owner && !!spender,
      refetchInterval: 10000,
      staleTime: 8000,
    },
  });
}
