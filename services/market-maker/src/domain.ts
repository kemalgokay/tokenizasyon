export type PriceSource = 'MANUAL' | 'ORACLE_STUB';
export type MMStatus = 'ACTIVE' | 'DISABLED';

export interface MMConfig {
  id: string;
  marketId: string;
  marketMakerId: string;
  enabled: boolean;
  baseSpreadBps: number;
  stepBps: number;
  levels: number;
  baseQty: string;
  qtyDecay: number;
  minPriceTick: string;
  minQtyStep: string;
  priceSource: PriceSource;
  status: MMStatus;
}

export interface MMRiskLimit {
  marketId: string;
  marketMakerId: string;
  maxNotionalPerOrder: string;
  maxOpenOrders: number;
  maxDailyNotional: string;
  maxNetPosition: string;
  killSwitch: boolean;
}

export interface MMInventory {
  marketId: string;
  marketMakerId: string;
  balanceToken: string;
  balanceFiatStub: string;
  netPosition: string;
  avgCost: string;
}

export interface MMOrderLink {
  mmRunId: string;
  orderId: string;
  level: number;
  side: 'BUY' | 'SELL';
}

export interface MMRun {
  id: string;
  marketId: string;
  startedAt: string;
  reason: 'PRICE_MOVE' | 'TIMER' | 'BOOK_THIN';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

export interface PriceTick {
  marketId: string;
  ts: string;
  midPrice: string;
}

export interface QuoteLevel {
  side: 'BUY' | 'SELL';
  price: string;
  quantity: string;
  level: number;
}

export const toAmount = (value: string): bigint => {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error('Amount must be integer string');
  }
  return BigInt(value);
};

export const fromAmount = (value: bigint): string => value.toString();
