import { useReadContract } from 'wagmi';
import { ADDRESSES } from '../config/contracts';
import { VARIABLE_DEBT_TOKEN_ABI } from '../config/abis';

export function useDebtTokenBalance(userAddress?: `0x${string}`) {
  return useReadContract({
    address: ADDRESSES.VARIABLE_DEBT_USDT as `0x${string}`,
    abi: VARIABLE_DEBT_TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 10000,
    },
  });
}

export function useBorrowAllowance(fromUser?: `0x${string}`, toUser?: `0x${string}`) {
  return useReadContract({
    address: ADDRESSES.VARIABLE_DEBT_USDT as `0x${string}`,
    abi: VARIABLE_DEBT_TOKEN_ABI,
    functionName: 'borrowAllowance',
    args: fromUser && toUser ? [fromUser, toUser] : undefined,
    query: {
      enabled: !!fromUser && !!toUser,
      refetchInterval: 5000,
    },
  });
}
