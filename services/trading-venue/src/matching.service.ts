import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogger, OutboxService } from '@tokenizasyon/common';
import { Market, Order, Trade, toAmount, fromAmount, SettlementIntent } from './domain';

interface ActorContext {
  id: string;
  role: string;
}

@Injectable()
export class MatchingService {
  private markets = new Map<string, Market>();
  private orders = new Map<string, Order>();
  private trades = new Map<string, Trade>();
  private orderBook = new Map<string, { bids: string[]; asks: string[] }>();

  constructor(private readonly audit: AuditLogger, private readonly outbox: OutboxService) {}

  createMarket(tokenId: string, actor: ActorContext): Market {
    const market: Market = { id: randomUUID(), tokenId, status: 'ACTIVE' };
    this.markets.set(market.id, market);
    this.orderBook.set(market.id, { bids: [], asks: [] });
    this.audit.record({
      aggregateType: 'Market',
      aggregateId: market.id,
      action: 'MarketCreated',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: market,
    });
    return market;
  }

  listMarkets(): Market[] {
    return [...this.markets.values()];
  }

  pauseMarket(id: string, actor: ActorContext): Market {
    const market = this.getMarket(id);
    market.status = 'PAUSED';
    this.markets.set(id, market);
    return market;
  }

  resumeMarket(id: string, actor: ActorContext): Market {
    const market = this.getMarket(id);
    market.status = 'ACTIVE';
    this.markets.set(id, market);
    return market;
  }

  placeOrder(input: Omit<Order, 'id' | 'remainingQty' | 'status' | 'createdAt'>, actor: ActorContext) {
    if (actor.role !== 'TRADER' && actor.role !== 'MARKET_MAKER') {
      throw new ForbiddenException('Role not allowed to trade');
    }
    const market = this.getMarket(input.marketId);
    if (market.status !== 'ACTIVE') {
      throw new BadRequestException('Market not active');
    }
    if (input.type === 'LIMIT' && !input.price) {
      throw new BadRequestException('Limit order requires price');
    }
    const order: Order = {
      ...input,
      id: randomUUID(),
      remainingQty: input.quantity,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.id, order);
    this.outbox.enqueue({
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'OrderPlaced',
      payload: { orderId: order.id },
    });
    const trades = this.match(order, market);
    return { order, trades };
  }

  cancelOrder(id: string): Order {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    order.status = 'CANCELLED';
    order.remainingQty = '0';
    this.orders.set(id, order);
    this.outbox.enqueue({
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'OrderCancelled',
      payload: { orderId: order.id },
    });
    return order;
  }

  getOrder(id: string): Order {
    const order = this.orders.get(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  listOrders(marketId: string): Order[] {
    return [...this.orders.values()].filter((order) => order.marketId === marketId);
  }

  getTrade(id: string): Trade {
    const trade = this.trades.get(id);
    if (!trade) {
      throw new NotFoundException('Trade not found');
    }
    return trade;
  }

  listTrades(marketId: string): Trade[] {
    return [...this.trades.values()].filter((trade) => trade.marketId === marketId);
  }

  getOrderBook(marketId: string, levels = 5) {
    const book = this.orderBook.get(marketId);
    if (!book) {
      throw new NotFoundException('Order book not found');
    }
    const bids = book.bids.slice(0, levels).map((id) => this.orders.get(id)).filter(Boolean) as Order[];
    const asks = book.asks.slice(0, levels).map((id) => this.orders.get(id)).filter(Boolean) as Order[];
    return { bids, asks };
  }

  listAuditLog() {
    return this.audit.list();
  }

  listOutboxEvents() {
    return this.outbox.list();
  }

  private match(order: Order, market: Market): Trade[] {
    const book = this.orderBook.get(market.id);
    if (!book) {
      throw new NotFoundException('Order book not found');
    }
    const trades: Trade[] = [];
    const opposite = order.side === 'BUY' ? book.asks : book.bids;

    const canMatch = (resting: Order): boolean => {
      if (order.type === 'MARKET') {
        return true;
      }
      if (!order.price || !resting.price) {
        return false;
      }
      const orderPrice = toAmount(order.price);
      const restingPrice = toAmount(resting.price);
      return order.side === 'BUY' ? orderPrice >= restingPrice : orderPrice <= restingPrice;
    };

    while (opposite.length > 0) {
      const restingId = opposite[0];
      const resting = this.orders.get(restingId);
      if (!resting || !['OPEN', 'PARTIALLY_FILLED'].includes(resting.status)) {
        opposite.shift();
        continue;
      }
      if (!canMatch(resting)) {
        break;
      }
      const qty = this.fill(order, resting);
      const trade: Trade = {
        id: randomUUID(),
        marketId: market.id,
        buyOrderId: order.side === 'BUY' ? order.id : resting.id,
        sellOrderId: order.side === 'SELL' ? order.id : resting.id,
        price: resting.price ?? order.price ?? '0',
        quantity: qty,
        executedAt: new Date().toISOString(),
      };
      this.trades.set(trade.id, trade);
      trades.push(trade);
      this.outbox.enqueue({
        aggregateType: 'Trade',
        aggregateId: trade.id,
        eventType: 'TradeExecuted',
        payload: trade,
      });
      this.outbox.enqueue({
        aggregateType: 'Settlement',
        aggregateId: trade.id,
        eventType: 'SettlementRequested',
        payload: this.buildSettlement(trade, market),
      });

      if (order.remainingQty === '0') {
        break;
      }
    }

    if (order.remainingQty === '0') {
      order.status = 'FILLED';
    } else if (order.remainingQty !== order.quantity) {
      order.status = 'PARTIALLY_FILLED';
    }

    if (order.type === 'LIMIT' && order.remainingQty !== '0' && order.timeInForce !== 'IOC') {
      this.insertOrder(order, book);
    } else if (order.type === 'MARKET' || order.timeInForce === 'IOC') {
      order.status = order.remainingQty === '0' ? order.status : 'CANCELLED';
      order.remainingQty = order.remainingQty === '0' ? order.remainingQty : '0';
    }

    this.orders.set(order.id, order);
    this.outbox.enqueue({
      aggregateType: 'OrderBook',
      aggregateId: market.id,
      eventType: 'OrderBookUpdated',
      payload: { marketId: market.id },
    });

    return trades;
  }

  private fill(incoming: Order, resting: Order): string {
    const incomingQty = toAmount(incoming.remainingQty);
    const restingQty = toAmount(resting.remainingQty);
    const executed = incomingQty <= restingQty ? incomingQty : restingQty;
    incoming.remainingQty = fromAmount(incomingQty - executed);
    resting.remainingQty = fromAmount(restingQty - executed);
    resting.status = resting.remainingQty === '0' ? 'FILLED' : 'PARTIALLY_FILLED';
    this.orders.set(resting.id, resting);
    return fromAmount(executed);
  }

  private insertOrder(order: Order, book: { bids: string[]; asks: string[] }): void {
    const list = order.side === 'BUY' ? book.bids : book.asks;
    list.push(order.id);
    list.sort((a, b) => {
      const orderA = this.orders.get(a);
      const orderB = this.orders.get(b);
      if (!orderA || !orderB) {
        return 0;
      }
      const priceA = toAmount(orderA.price ?? '0');
      const priceB = toAmount(orderB.price ?? '0');
      if (priceA === priceB) {
        return orderA.createdAt.localeCompare(orderB.createdAt);
      }
      return order.side === 'BUY' ? Number(priceB - priceA) : Number(priceA - priceB);
    });
  }

  private buildSettlement(trade: Trade, market: Market): SettlementIntent {
    return {
      tokenId: market.tokenId,
      fromHolderId: trade.sellOrderId,
      toHolderId: trade.buyOrderId,
      quantity: trade.quantity,
      paymentIntentId: `pi_${trade.id}`,
    };
  }

  private getMarket(id: string): Market {
    const market = this.markets.get(id);
    if (!market) {
      throw new NotFoundException('Market not found');
    }
    return market;
  }
}
