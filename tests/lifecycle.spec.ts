import { LifecycleService } from '../services/token-lifecycle/src/lifecycle.service';
import { AuditLogger, OutboxService } from '../libs/common/src';

describe('LifecycleService', () => {
  const actor = { id: 'issuer-1', role: 'ISSUER' };
  const ops = { id: 'ops-1', role: 'OPS' };

  const buildService = () => new LifecycleService(new AuditLogger(), new OutboxService());

  test('asset approve transition', () => {
    const service = buildService();
    const asset = service.createAsset(
      { type: 'REAL_ESTATE', issuerId: 'iss1', metadata: {}, documents: {}, valuation: {} },
      actor
    );
    service.submitAssetReview(asset.id, actor);
    const approved = service.approveAsset(asset.id, ops);
    expect(approved.status).toBe('APPROVED');
  });

  test('token activate transition', () => {
    const service = buildService();
    const asset = service.createAsset(
      { type: 'BOND', issuerId: 'iss1', metadata: {}, documents: {}, valuation: {} },
      actor
    );
    service.submitAssetReview(asset.id, actor);
    service.approveAsset(asset.id, ops);
    const token = service.createToken(
      { assetId: asset.id, symbol: 'BND', name: 'Bond', decimals: 2, rules: { whitelistRequired: false } },
      actor
    );
    const active = service.activateToken(token.id, ops);
    expect(active.status).toBe('ACTIVE');
  });

  test('paused transfer fails', () => {
    const service = buildService();
    const asset = service.createAsset(
      { type: 'BOND', issuerId: 'iss1', metadata: {}, documents: {}, valuation: {} },
      actor
    );
    service.submitAssetReview(asset.id, actor);
    service.approveAsset(asset.id, ops);
    const token = service.createToken(
      { assetId: asset.id, symbol: 'BND', name: 'Bond', decimals: 2, rules: { whitelistRequired: false } },
      actor
    );
    service.activateToken(token.id, ops);
    service.pauseToken(token.id, ops);
    expect(() => service.transfer(token.id, 'h1', 'h2', '10', ops)).toThrow('Token must be ACTIVE');
  });

  test('whitelist transfer enforcement', () => {
    const service = buildService();
    const asset = service.createAsset(
      { type: 'BOND', issuerId: 'iss1', metadata: {}, documents: {}, valuation: {} },
      actor
    );
    service.submitAssetReview(asset.id, actor);
    service.approveAsset(asset.id, ops);
    const token = service.createToken(
      { assetId: asset.id, symbol: 'BND', name: 'Bond', decimals: 2, rules: { whitelistRequired: true } },
      actor
    );
    service.activateToken(token.id, ops);
    service.addWhitelist(token.id, 'h1', 'ACTIVE');
    service.addWhitelist(token.id, 'h2', 'ACTIVE');
    service.mint(token.id, 'h1', '100', ops);
    service.transfer(token.id, 'h1', 'h2', '50', ops);
    expect(service.getPosition(token.id, 'h2')).toBe('50');
  });
});
