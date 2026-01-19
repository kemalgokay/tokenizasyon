import { MatchingService } from '../services/trading-venue/src/matching.service';
import { AuditLogger, OutboxService } from '../libs/common/src';

describe('MatchingService', () => {
  const actor = { id: 'trader-1', role: 'TRADER' };
  const ops = { id: 'ops-1', role: 'OPS' };

  const buildService = () => new MatchingService(new AuditLogger(), new OutboxService());

  test('price-time priority matching', () => {
    const service = buildService();
    const market = service.createMarket('token-1', ops);
    service.placeOrder({ marketId: market.id, traderId: 't1', side: 'SELL', type: 'LIMIT', price: '100', quantity: '10', timeInForce: 'GTC' }, actor);
    service.placeOrder({ marketId: market.id, traderId: 't2', side: 'SELL', type: 'LIMIT', price: '100', quantity: '10', timeInForce: 'GTC' }, actor);
    const result = service.placeOrder({ marketId: market.id, traderId: 't3', side: 'BUY', type: 'MARKET', price: null, quantity: '15', timeInForce: 'IOC' }, actor);
    expect(result.trades).toHaveLength(2);
    expect(result.trades[0].sellOrderId).toBeDefined();
  });

  test('market order hits best price', () => {
    const service = buildService();
    const market = service.createMarket('token-1', ops);
    service.placeOrder({ marketId: market.id, traderId: 's1', side: 'SELL', type: 'LIMIT', price: '90', quantity: '5', timeInForce: 'GTC' }, actor);
    service.placeOrder({ marketId: market.id, traderId: 's2', side: 'SELL', type: 'LIMIT', price: '95', quantity: '5', timeInForce: 'GTC' }, actor);
    const result = service.placeOrder({ marketId: market.id, traderId: 'b1', side: 'BUY', type: 'MARKET', price: null, quantity: '5', timeInForce: 'IOC' }, actor);
    expect(result.trades[0].price).toBe('90');
  });

  test('IOC cancels remainder', () => {
    const service = buildService();
    const market = service.createMarket('token-1', ops);
    service.placeOrder({ marketId: market.id, traderId: 's1', side: 'SELL', type: 'LIMIT', price: '100', quantity: '2', timeInForce: 'GTC' }, actor);
    const result = service.placeOrder({ marketId: market.id, traderId: 'b1', side: 'BUY', type: 'LIMIT', price: '100', quantity: '5', timeInForce: 'IOC' }, actor);
    expect(result.order.status).toBe('CANCELLED');
  });
});
