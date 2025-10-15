export interface Asset {
  symbol: 'WBTC' | 'USDT';
  name: string;
  address: string;
  decimals: number;
  icon: string;
  aTokenAddress: string;
  variableDebtTokenAddress: string;
}

export interface AssetData {
  supplyAPY: string;
  borrowAPY: string;
  totalSupplied: string;
  totalBorrowed: string;
  availableLiquidity: string;
  utilizationRate: string;
}

export interface UserPosition {
  supplied: string;
  borrowed: string;
  suppliedUSD: string;
  borrowedUSD: string;
  aTokenBalance: string;
  debtTokenBalance: string;
  walletBalance: string;
}

export interface UserAccountData {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
}
