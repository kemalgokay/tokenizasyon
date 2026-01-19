import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogger, OutboxService } from '@tokenizasyon/common';
import {
  MMConfig,
  MMInventory,
  MMRiskLimit,
  MMOrderLink,
  MMRun,
  PriceTick,
  QuoteLevel,
  fromAmount,
  toAmount,
} from './domain';

interface ActorContext {
  id: string;
  role: string;
}

@Injectable()
export class MarketMakerService {
  private configs = new Map<string, MMConfig>();
  private inventory = new Map<string, MMInventory>();
  private riskLimits = new Map<string, MMRiskLimit>();
  private orders = new Map<string, MMOrderLink[]>();
  private priceTicks = new Map<string, PriceTick>();
  private runs = new Map<string, MMRun>();

  constructor(private readonly audit: AuditLogger, private readonly outbox: OutboxService) {}

  upsertConfig(marketId: string, input: Partial<MMConfig> & { marketMakerId: string }, actor: ActorContext): MMConfig {
    const existing = this.configs.get(marketId);
    const config: MMConfig = {
      id: existing?.id ?? randomUUID(),
      marketId,
      marketMakerId: input.marketMakerId,
      enabled: input.enabled ?? existing?.enabled ?? false,
      baseSpreadBps: input.baseSpreadBps ?? existing?.baseSpreadBps ?? 20,
      stepBps: input.stepBps ?? existing?.stepBps ?? 5,
      levels: input.levels ?? existing?.levels ?? 5,
      baseQty: input.baseQty ?? existing?.baseQty ?? '1000',
      qtyDecay: input.qtyDecay ?? existing?.qtyDecay ?? 0.1,
      minPriceTick: input.minPriceTick ?? existing?.minPriceTick ?? '1',
      minQtyStep: input.minQtyStep ?? existing?.minQtyStep ?? '1',
      priceSource: input.priceSource ?? existing?.priceSource ?? 'MANUAL',
      status: input.status ?? existing?.status ?? 'ACTIVE',
    };
    this.configs.set(marketId, config);
    this.audit.record({
      aggregateType: 'MMConfig',
      aggregateId: config.id,
      action: 'MMConfigUpdated',
      actorId: actor.id,
      role: actor.role,
      before: existing ?? null,
      after: config,
    });
    this.outbox.enqueue({
      aggregateType: 'MMConfig',
      aggregateId: config.id,
      eventType: 'MMConfigUpdated',
      payload: config,
    });
    return config;
  }

  enable(marketId: string): MMConfig {
    const config = this.getConfig(marketId);
    config.enabled = true;
    this.configs.set(marketId, config);
    return config;
  }

  disable(marketId: string): MMConfig {
    const config = this.getConfig(marketId);
    config.enabled = false;
    this.configs.set(marketId, config);
    return config;
  }

  setPrice(marketId: string, midPrice: string): PriceTick {
    const tick: PriceTick = {
      marketId,
      ts: new Date().toISOString(),
      midPrice,
    };
    this.priceTicks.set(marketId, tick);
    return tick;
  }

  setRiskLimit(marketId: string, limit: MMRiskLimit): void {
    this.riskLimits.set(marketId, limit);
  }

  run(marketId: string, reason: MMRun['reason'], actor: ActorContext) {
    const config = this.getConfig(marketId);
    if (!config.enabled || config.status !== 'ACTIVE') {
      throw new BadRequestException('Market maker disabled');
    }
    const risk = this.riskLimits.get(marketId);
    if (risk?.killSwitch) {
      this.outbox.enqueue({
        aggregateType: 'MMRisk',
        aggregateId: marketId,
        eventType: 'KillSwitchActivated',
        payload: { marketId },
      });
      throw new BadRequestException('Kill switch active');
    }
    const tick = this.priceTicks.get(marketId);
    if (!tick) {
      throw new BadRequestException('Missing mid price');
    }
    const run: MMRun = {
      id: randomUUID(),
      marketId,
      startedAt: new Date().toISOString(),
      reason,
      status: 'SUCCESS',
    };
    this.runs.set(run.id, run);

    const inventory = this.getInventory(marketId, config.marketMakerId);
    const quotes = this.buildQuotes(tick.midPrice, config, inventory);
    this.orders.set(marketId, quotes.map((quote) => ({ mmRunId: run.id, orderId: randomUUID(), level: quote.level, side: quote.side })));

    this.outbox.enqueue({
      aggregateType: 'MMRun',
      aggregateId: run.id,
      eventType: 'MMOrdersPlaced',
      payload: { marketId, quotes },
    });

    return { run, quotes };
  }

  handleTrade(marketId: string, marketMakerId: string, side: 'BUY' | 'SELL', quantity: string, price: string): MMInventory {
    const inventory = this.getInventory(marketId, marketMakerId);
    const qty = toAmount(quantity);
    const priceValue = toAmount(price);
    const delta = side === 'BUY' ? qty : -qty;
    inventory.netPosition = fromAmount(toAmount(inventory.netPosition) + delta);
    inventory.balanceToken = fromAmount(toAmount(inventory.balanceToken) + delta);
    const notional = qty * priceValue;
    inventory.balanceFiatStub = fromAmount(toAmount(inventory.balanceFiatStub) + (side === 'BUY' ? -notional : notional));
    this.inventory.set(`${marketId}:${marketMakerId}`, inventory);
    this.outbox.enqueue({
      aggregateType: 'MMInventory',
      aggregateId: `${marketId}:${marketMakerId}`,
      eventType: 'InventoryUpdated',
      payload: inventory,
    });
    return inventory;
  }

  status(marketId: string, marketMakerId: string) {
    return {
      config: this.getConfig(marketId),
      inventory: this.getInventory(marketId, marketMakerId),
      openOrders: this.orders.get(marketId) ?? [],
      lastRun: [...this.runs.values()].filter((run) => run.marketId === marketId).pop() ?? null,
    };
  }

  cancelOrders(marketId: string): MMOrderLink[] {
    const cancelled = this.orders.get(marketId) ?? [];
    this.orders.set(marketId, []);
    this.outbox.enqueue({
      aggregateType: 'MMRun',
      aggregateId: marketId,
      eventType: 'MMOrdersCancelled',
      payload: { marketId, count: cancelled.length },
    });
    return cancelled;
  }

  private buildQuotes(midPrice: string, config: MMConfig, inventory: MMInventory): QuoteLevel[] {
    const mid = toAmount(midPrice);
    const quotes: QuoteLevel[] = [];
    const net = toAmount(inventory.netPosition);
    const skew = net > 0n ? 1.1 : net < 0n ? 0.9 : 1.0;

    for (let level = 0; level < config.levels; level += 1) {
      const spreadBps = config.baseSpreadBps + level * config.stepBps;
      const spread = (mid * BigInt(spreadBps)) / 10000n;
      const bidPrice = mid - spread;
      const askPrice = mid + spread;
      const qtyBase = toAmount(config.baseQty);
      const qty = qtyBase - BigInt(Math.floor(Number(qtyBase) * (config.qtyDecay * level)));
      const bidQty = fromAmount(BigInt(Math.floor(Number(qty) * skew)));
      const askQty = fromAmount(BigInt(Math.floor(Number(qty) * (2 - skew))));
      quotes.push({ side: 'BUY', price: fromAmount(bidPrice), quantity: bidQty, level });
      quotes.push({ side: 'SELL', price: fromAmount(askPrice), quantity: askQty, level });
    }

    return quotes;
  }

  private getConfig(marketId: string): MMConfig {
    const config = this.configs.get(marketId);
    if (!config) {
      throw new BadRequestException('Config missing');
    }
    return config;
  }

  private getInventory(marketId: string, marketMakerId: string): MMInventory {
    const key = `${marketId}:${marketMakerId}`;
    const existing = this.inventory.get(key);
    if (existing) {
      return existing;
    }
    const fresh: MMInventory = {
      marketId,
      marketMakerId,
      balanceToken: '0',
      balanceFiatStub: '0',
      netPosition: '0',
      avgCost: '0',
    };
    this.inventory.set(key, fresh);
    return fresh;
  }
}
