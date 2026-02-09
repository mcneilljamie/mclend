export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateNumericInput(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  const cleanValue = value.replace(/,/g, '');

  if (!/^\d*\.?\d*$/.test(cleanValue)) {
    return { isValid: false, error: 'Invalid number format' };
  }

  const numValue = parseFloat(cleanValue);

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Invalid number' };
  }

  if (numValue <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (numValue > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, error: 'Amount too large' };
  }

  const decimalPlaces = cleanValue.split('.')[1]?.length || 0;
  if (decimalPlaces > 18) {
    return { isValid: false, error: 'Too many decimal places (max 18)' };
  }

  return { isValid: true };
}

export function validateWithdrawalAmount(
  withdrawAmount: bigint,
  totalCollateral: bigint,
  totalDebt: bigint,
  healthFactor: bigint,
  collateralValue: bigint,
  liquidationThreshold: bigint
): ValidationResult {
  if (withdrawAmount <= 0n) {
    return { isValid: false, error: 'Withdrawal amount must be greater than 0' };
  }

  if (withdrawAmount > totalCollateral) {
    return { isValid: false, error: 'Insufficient collateral balance' };
  }

  if (totalDebt === 0n) {
    return { isValid: true };
  }

  const newCollateralValue = collateralValue - withdrawAmount;

  if (newCollateralValue === 0n && totalDebt > 0n) {
    return { isValid: false, error: 'Cannot withdraw all collateral while debt exists' };
  }

  const SAFE_HEALTH_FACTOR = 15000n;
  const liquidationThresholdBps = liquidationThreshold;
  const collateralAfterWithdraw = newCollateralValue * liquidationThresholdBps / 10000n;

  if (totalDebt > 0n && collateralAfterWithdraw < totalDebt) {
    return { isValid: false, error: 'Withdrawal would cause liquidation (health factor < 1.0)' };
  }

  const newHealthFactor = totalDebt > 0n
    ? (collateralAfterWithdraw * 10000n) / totalDebt
    : 0n;

  if (newHealthFactor > 0n && newHealthFactor < SAFE_HEALTH_FACTOR) {
    return {
      isValid: false,
      error: `Withdrawal would make position unsafe (health factor would be ${(Number(newHealthFactor) / 10000).toFixed(2)})`
    };
  }

  return { isValid: true };
}

export function sanitizeNumericInput(value: string): string {
  return value
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1');
}
