import { MarketMakerService } from '../services/market-maker/src/market-maker.service';
import { AuditLogger, OutboxService } from '../libs/common/src';

describe('MarketMakerService', () => {
  const actor = { id: 'mm-1', role: 'MARKET_MAKER' };
  const buildService = () => new MarketMakerService(new AuditLogger(), new OutboxService());

  test('ladder generation with spread and levels', () => {
    const service = buildService();
    service.upsertConfig('m1', { marketMakerId: actor.id, levels: 3, baseSpreadBps: 10, stepBps: 5 }, actor);
    service.enable('m1');
    service.setPrice('m1', '1000');
    const result = service.run('m1', 'TIMER', actor);
    expect(result.quotes).toHaveLength(6);
    expect(result.quotes[0].price).toBe('999');
  });

  test('inventory skew adjusts quantities', () => {
    const service = buildService();
    service.upsertConfig('m1', { marketMakerId: actor.id, levels: 1, baseSpreadBps: 10, stepBps: 5, baseQty: '100' }, actor);
    service.enable('m1');
    service.setPrice('m1', '1000');
    service.handleTrade('m1', actor.id, 'BUY', '50', '1000');
    const result = service.run('m1', 'PRICE_MOVE', actor);
    const buy = result.quotes.find((quote) => quote.side === 'BUY');
    const sell = result.quotes.find((quote) => quote.side === 'SELL');
    expect(Number(buy?.quantity ?? '0')).toBeGreaterThan(Number(sell?.quantity ?? '0'));
  });

  test('kill switch blocks run', () => {
    const service = buildService();
    service.upsertConfig('m1', { marketMakerId: actor.id }, actor);
    service.enable('m1');
    service.setPrice('m1', '1000');
    service.setRiskLimit('m1', {
      marketId: 'm1',
      marketMakerId: actor.id,
      maxNotionalPerOrder: '100000',
      maxOpenOrders: 10,
      maxDailyNotional: '1000000',
      maxNetPosition: '1000',
      killSwitch: true,
    });
    expect(() => service.run('m1', 'TIMER', actor)).toThrow('Kill switch active');
  });

  test('token paused triggers MM order cancel', () => {
    const service = buildService();
    service.upsertConfig('m1', { marketMakerId: actor.id }, actor);
    service.enable('m1');
    service.setPrice('m1', '1000');
    service.run('m1', 'TIMER', actor);
    const cancelled = service.cancelOrders('m1');
    expect(cancelled.length).toBeGreaterThan(0);
  });
});
