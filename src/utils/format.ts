import { formatUnits, parseUnits } from 'viem';
import { TOKEN_DECIMALS } from '../config/contracts';

export function formatWBTC(value: bigint): string {
  const formatted = formatUnits(value, TOKEN_DECIMALS.WBTC);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(Number(formatted));
}

export function formatUSDT(value: bigint): string {
  const formatted = formatUnits(value, TOKEN_DECIMALS.USDT);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(formatted));
}

export function parseWBTC(value: string): bigint {
  const cleanValue = value.replace(/,/g, '');
  return parseUnits(cleanValue, TOKEN_DECIMALS.WBTC);
}

export function parseUSDT(value: string): bigint {
  const cleanValue = value.replace(/,/g, '');
  return parseUnits(cleanValue, TOKEN_DECIMALS.USDT);
}

export function formatHealthFactor(value: bigint): string {
  if (value === 0n) return '0';
  // If health factor is unreasonably large (no debt), display infinity
  // Aave returns type(uint256).max when there's no debt
  const MAX_REASONABLE_HF = 10n ** 20n; // 100 with 18 decimals
  if (value > MAX_REASONABLE_HF) return '∞';
  const formatted = formatUnits(value, 18);
  return Number(formatted).toFixed(2);
}

export function formatLTV(value: bigint): string {
  return (Number(value) / 100).toFixed(2);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSD(value: bigint, decimals: number = 8): string {
  const formatted = formatUnits(value, decimals);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(formatted));
}

export function calculateFee(netAmount: bigint, feeBps: number, bpsDenominator: number): bigint {
  return (netAmount * BigInt(feeBps)) / BigInt(bpsDenominator);
}

export function calculateGrossAmount(netAmount: bigint, feeBps: number, bpsDenominator: number): bigint {
  const fee = calculateFee(netAmount, feeBps, bpsDenominator);
  return netAmount + fee;
}

export function calculateSafeMaxBorrow(
  availableBorrowsBase: bigint,
  targetHealthFactor: number = 1.5
): bigint {
  const safePercentage = BigInt(Math.floor((1 / targetHealthFactor) * 10000));
  return (availableBorrowsBase * safePercentage) / 10000n;
}
