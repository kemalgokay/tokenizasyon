export type MarketStatus = 'ACTIVE' | 'PAUSED';
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type OrderStatus = 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED';
export type TimeInForce = 'GTC' | 'IOC';

export interface Market {
  id: string;
  tokenId: string;
  status: MarketStatus;
}

export interface Order {
  id: string;
  marketId: string;
  traderId: string;
  side: OrderSide;
  type: OrderType;
  price: string | null;
  quantity: string;
  remainingQty: string;
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: string;
}

export interface Trade {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  price: string;
  quantity: string;
  executedAt: string;
}

export interface SettlementIntent {
  tokenId: string;
  fromHolderId: string;
  toHolderId: string;
  quantity: string;
  paymentIntentId: string;
}

export const toAmount = (value: string): bigint => {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error('Amount must be integer string');
  }
  return BigInt(value);
};

export const fromAmount = (value: bigint): string => value.toString();
