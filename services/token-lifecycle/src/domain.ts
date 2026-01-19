export type AssetStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type TokenStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'REDEEMED';
export type CorporateActionStatus = 'SCHEDULED' | 'EXECUTED' | 'CANCELLED';
export type RedemptionStatus = 'REQUESTED' | 'APPROVED' | 'SETTLED' | 'REJECTED';

export interface Asset {
  id: string;
  type: string;
  issuerId: string;
  metadata: Record<string, unknown>;
  documents: Record<string, unknown>;
  valuation: Record<string, unknown>;
  status: AssetStatus;
}

export interface TokenRules {
  whitelistRequired: boolean;
  transferLimits?: {
    dailyNotionalLimit?: string;
    dailyAmountLimit?: string;
  };
}

export interface Token {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
  status: TokenStatus;
  rules: TokenRules;
}

export interface HolderPosition {
  tokenId: string;
  holderId: string;
  balance: string;
}

export interface WhitelistedHolder {
  tokenId: string;
  holderId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CorporateAction {
  id: string;
  tokenId: string;
  type: 'COUPON' | 'DIVIDEND' | 'SPLIT' | 'MERGE';
  params: Record<string, unknown>;
  recordDate: string;
  payDate: string;
  status: CorporateActionStatus;
}

export interface Redemption {
  id: string;
  tokenId: string;
  holderId: string;
  amount: string;
  status: RedemptionStatus;
}

export const toAmount = (value: string): bigint => {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error('Amount must be integer string');
  }
  return BigInt(value);
};

export const fromAmount = (value: bigint): string => value.toString();
