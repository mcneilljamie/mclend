export function parseTransactionError(error: any): string {
  if (!error) return 'Transaction failed';

  const errorMessage = error.message || error.toString();

  if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
    return 'Transaction was rejected by user';
  }

  if (errorMessage.includes('execution reverted')) {
    const revertMatch = errorMessage.match(/execution reverted:?\s*(.+?)(?:\n|$)/i);
    if (revertMatch && revertMatch[1]) {
      const revertReason = revertMatch[1].trim().replace(/^["']|["']$/g, '');
      return `Transaction reverted: ${revertReason}`;
    }
    return 'Transaction reverted by contract';
  }

  if (errorMessage.includes('SwapInsufficientOutput')) {
    return 'Transaction reverted: Slippage too high. Try increasing slippage tolerance or try again.';
  }

  if (errorMessage.includes('InsufficientCreditDelegation')) {
    return 'Transaction reverted: Insufficient credit delegation. Please approve delegation first.';
  }

  if (errorMessage.includes('DeadlinePassed')) {
    return 'Transaction reverted: Deadline passed. Please try again.';
  }

  if (errorMessage.includes('ResidualBalance')) {
    return 'Transaction reverted: Unexpected balance remaining. Please contact support.';
  }

  if (errorMessage.includes('McFunPoolNotFound')) {
    return 'Transaction reverted: McFun pool not found for MCLEND token.';
  }

  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    return 'Insufficient funds for transaction';
  }

  if (errorMessage.includes('nonce')) {
    return 'Nonce error. Please try again.';
  }

  if (errorMessage.includes('gas')) {
    return 'Gas estimation failed. Transaction may fail or you may have insufficient ETH for gas.';
  }

  if (errorMessage.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (errorMessage.length > 100) {
    const shortError = errorMessage.substring(0, 100) + '...';
    return shortError;
  }

  return errorMessage;
}
