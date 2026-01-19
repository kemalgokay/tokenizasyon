import { requestJson } from '../httpClient';

export interface Market {
  id: string;
  tokenId: string;
  status: string;
}

export interface Order {
  id: string;
  marketId: string;
  side: string;
  type: string;
  price?: string;
  quantity: string;
  status: string;
}

export interface Trade {
  id: string;
  marketId: string;
  price: string;
  quantity: string;
  executedAt: string;
}

export interface PlaceOrderResult {
  order: Order;
  trades: Trade[];
}

export interface OrderBook {
  bids: Order[];
  asks: Order[];
}

export const tradingVenueClient = {
  listMarkets: (baseUrl: string) => requestJson<Market[]>({ baseUrl, path: '/markets' }),
  createMarket: (baseUrl: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<Market>({
      baseUrl,
      path: '/markets',
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  pauseMarket: (baseUrl: string, marketId: string, idempotencyKey?: string) =>
    requestJson<Market>({
      baseUrl,
      path: `/markets/${marketId}/pause`,
      method: 'POST',
      idempotencyKey
    }),
  resumeMarket: (baseUrl: string, marketId: string, idempotencyKey?: string) =>
    requestJson<Market>({
      baseUrl,
      path: `/markets/${marketId}/resume`,
      method: 'POST',
      idempotencyKey
    }),
  listOrders: (baseUrl: string, marketId: string) =>
    requestJson<Order[]>({ baseUrl, path: `/markets/${marketId}/orders` }),
  placeOrder: (baseUrl: string, marketId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<PlaceOrderResult>({
      baseUrl,
      path: `/markets/${marketId}/orders`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  cancelOrder: (baseUrl: string, marketId: string, orderId: string, idempotencyKey?: string) =>
    requestJson<Order>({
      baseUrl,
      path: `/markets/${marketId}/orders/${orderId}/cancel`,
      method: 'POST',
      idempotencyKey
    }),
  listTrades: (baseUrl: string, marketId: string) =>
    requestJson<Trade[]>({ baseUrl, path: `/markets/${marketId}/trades` }),
  getOrderBook: (baseUrl: string, marketId: string) =>
    requestJson<OrderBook>({ baseUrl, path: `/markets/${marketId}/orderbook` })
};
