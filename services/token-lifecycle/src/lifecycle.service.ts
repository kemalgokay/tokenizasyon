import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Asset,
  AssetStatus,
  CorporateAction,
  Redemption,
  Token,
  TokenRules,
  TokenStatus,
  toAmount,
  fromAmount,
} from './domain';
import { AuditLogger, OutboxService } from '@tokenizasyon/common';

interface ActorContext {
  id: string;
  role: string;
}

@Injectable()
export class LifecycleService {
  private assets = new Map<string, Asset>();
  private tokens = new Map<string, Token>();
  private positions = new Map<string, bigint>();
  private whitelisted = new Map<string, 'ACTIVE' | 'INACTIVE'>();
  private corporateActions = new Map<string, CorporateAction>();
  private redemptions = new Map<string, Redemption>();

  constructor(private readonly audit: AuditLogger, private readonly outbox: OutboxService) {}

  createAsset(input: Omit<Asset, 'id' | 'status'>, actor: ActorContext): Asset {
    const asset: Asset = {
      ...input,
      id: randomUUID(),
      status: 'DRAFT',
    };
    this.assets.set(asset.id, asset);
    this.audit.record({
      aggregateType: 'Asset',
      aggregateId: asset.id,
      action: 'AssetCreated',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: asset,
    });
    return asset;
  }

  listAssets(): Asset[] {
    return [...this.assets.values()];
  }

  submitAssetReview(id: string, actor: ActorContext): Asset {
    const asset = this.getAssetOrThrow(id);
    if (asset.status !== 'DRAFT') {
      throw new BadRequestException('Asset must be DRAFT');
    }
    return this.updateAssetStatus(asset, 'REVIEW', 'AssetSubmitted', actor);
  }

  approveAsset(id: string, actor: ActorContext): Asset {
    const asset = this.getAssetOrThrow(id);
    if (asset.status !== 'REVIEW') {
      throw new BadRequestException('Asset must be REVIEW');
    }
    return this.updateAssetStatus(asset, 'APPROVED', 'AssetApproved', actor);
  }

  rejectAsset(id: string, actor: ActorContext): Asset {
    const asset = this.getAssetOrThrow(id);
    if (!['REVIEW', 'DRAFT'].includes(asset.status)) {
      throw new BadRequestException('Asset not in reviewable state');
    }
    return this.updateAssetStatus(asset, 'REJECTED', 'AssetRejected', actor);
  }

  getAsset(id: string): Asset {
    return this.getAssetOrThrow(id);
  }

  listTokens(): Token[] {
    return [...this.tokens.values()];
  }

  createToken(input: { assetId: string; symbol: string; name: string; decimals: number; rules: TokenRules }, actor: ActorContext): Token {
    const asset = this.getAssetOrThrow(input.assetId);
    if (asset.status !== 'APPROVED') {
      throw new BadRequestException('Asset must be APPROVED');
    }
    const token: Token = {
      id: randomUUID(),
      assetId: input.assetId,
      symbol: input.symbol,
      name: input.name,
      decimals: input.decimals,
      totalSupply: '0',
      status: 'DRAFT',
      rules: input.rules,
    };
    this.tokens.set(token.id, token);
    this.audit.record({
      aggregateType: 'Token',
      aggregateId: token.id,
      action: 'TokenCreated',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: token,
    });
    return token;
  }

  activateToken(id: string, actor: ActorContext): Token {
    return this.updateTokenStatus(id, ['DRAFT', 'PAUSED'], 'ACTIVE', 'TokenActivated', actor);
  }

  pauseToken(id: string, actor: ActorContext): Token {
    return this.updateTokenStatus(id, ['ACTIVE'], 'PAUSED', 'TokenPaused', actor);
  }

  resumeToken(id: string, actor: ActorContext): Token {
    return this.updateTokenStatus(id, ['PAUSED'], 'ACTIVE', 'TokenResumed', actor);
  }

  getToken(id: string): Token {
    const token = this.tokens.get(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }
    return token;
  }

  listPositions(tokenId: string): { holderId: string; balance: string }[] {
    return [...this.positions.entries()]
      .filter(([key]) => key.startsWith(`${tokenId}:`))
      .map(([key, balance]) => ({
        holderId: key.split(':')[1],
        balance: fromAmount(balance),
      }));
  }

  mint(tokenId: string, toHolderId: string, amount: string, actor: ActorContext): Token {
    const token = this.assertTokenActive(tokenId);
    const value = toAmount(amount);
    this.adjustBalance(tokenId, toHolderId, value);
    token.totalSupply = fromAmount(toAmount(token.totalSupply) + value);
    this.tokens.set(token.id, token);
    this.audit.record({
      aggregateType: 'Token',
      aggregateId: token.id,
      action: 'Minted',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: { toHolderId, amount },
    });
    this.outbox.enqueue({
      aggregateType: 'Token',
      aggregateId: token.id,
      eventType: 'Minted',
      payload: { toHolderId, amount },
    });
    return token;
  }

  burn(tokenId: string, fromHolderId: string, amount: string, actor: ActorContext): Token {
    const token = this.getToken(tokenId);
    if (!['ACTIVE', 'PAUSED'].includes(token.status)) {
      throw new BadRequestException('Token must be ACTIVE or PAUSED');
    }
    if (actor.role !== 'OPS') {
      throw new ForbiddenException('Only OPS can burn');
    }
    const value = toAmount(amount);
    this.adjustBalance(tokenId, fromHolderId, -value);
    token.totalSupply = fromAmount(toAmount(token.totalSupply) - value);
    this.tokens.set(token.id, token);
    this.audit.record({
      aggregateType: 'Token',
      aggregateId: token.id,
      action: 'Burned',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: { fromHolderId, amount },
    });
    this.outbox.enqueue({
      aggregateType: 'Token',
      aggregateId: token.id,
      eventType: 'Burned',
      payload: { fromHolderId, amount },
    });
    return token;
  }

  transfer(tokenId: string, fromHolderId: string, toHolderId: string, amount: string, actor: ActorContext): void {
    const token = this.assertTokenActive(tokenId);
    if (token.rules.whitelistRequired) {
      this.assertWhitelisted(tokenId, fromHolderId);
      this.assertWhitelisted(tokenId, toHolderId);
    }
    const value = toAmount(amount);
    this.adjustBalance(tokenId, fromHolderId, -value);
    this.adjustBalance(tokenId, toHolderId, value);
    this.audit.record({
      aggregateType: 'Token',
      aggregateId: token.id,
      action: 'Transferred',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: { fromHolderId, toHolderId, amount },
    });
    this.outbox.enqueue({
      aggregateType: 'Token',
      aggregateId: token.id,
      eventType: 'Transferred',
      payload: { fromHolderId, toHolderId, amount },
    });
  }

  addWhitelist(tokenId: string, holderId: string, status: 'ACTIVE' | 'INACTIVE'): void {
    this.whitelisted.set(`${tokenId}:${holderId}`, status);
  }

  removeWhitelist(tokenId: string, holderId: string): void {
    this.whitelisted.set(`${tokenId}:${holderId}`, 'INACTIVE');
  }

  listWhitelist(tokenId: string): { holderId: string; status: 'ACTIVE' | 'INACTIVE' }[] {
    return [...this.whitelisted.entries()]
      .filter(([key]) => key.startsWith(`${tokenId}:`))
      .map(([key, status]) => ({ holderId: key.split(':')[1], status }));
  }

  scheduleCorporateAction(tokenId: string, input: Omit<CorporateAction, 'id' | 'status' | 'tokenId'>, actor: ActorContext): CorporateAction {
    const token = this.getToken(tokenId);
    if (token.status !== 'ACTIVE') {
      throw new BadRequestException('Token must be ACTIVE');
    }
    const action: CorporateAction = {
      ...input,
      id: randomUUID(),
      tokenId,
      status: 'SCHEDULED',
    };
    this.corporateActions.set(action.id, action);
    this.audit.record({
      aggregateType: 'CorporateAction',
      aggregateId: action.id,
      action: 'CorporateActionScheduled',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: action,
    });
    return action;
  }

  listCorporateActions(tokenId: string): CorporateAction[] {
    return [...this.corporateActions.values()].filter((action) => action.tokenId === tokenId);
  }

  executeCorporateAction(id: string, actor: ActorContext): CorporateAction {
    const action = this.corporateActions.get(id);
    if (!action) {
      throw new NotFoundException('Corporate action not found');
    }
    if (action.status !== 'SCHEDULED') {
      throw new BadRequestException('Corporate action must be SCHEDULED');
    }
    action.status = 'EXECUTED';
    this.corporateActions.set(action.id, action);
    this.outbox.enqueue({
      aggregateType: 'CorporateAction',
      aggregateId: action.id,
      eventType: 'CorporateActionExecuted',
      payload: { tokenId: action.tokenId, type: action.type, params: action.params },
    });
    this.audit.record({
      aggregateType: 'CorporateAction',
      aggregateId: action.id,
      action: 'CorporateActionExecuted',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: action,
    });
    return action;
  }

  getCorporateAction(id: string): CorporateAction {
    const action = this.corporateActions.get(id);
    if (!action) {
      throw new NotFoundException('Corporate action not found');
    }
    return action;
  }

  listRedemptions(tokenId: string): Redemption[] {
    return [...this.redemptions.values()].filter((redemption) => redemption.tokenId === tokenId);
  }

  requestRedemption(tokenId: string, holderId: string, amount: string, actor: ActorContext): Redemption {
    const token = this.getToken(tokenId);
    if (!['ACTIVE', 'PAUSED'].includes(token.status)) {
      throw new BadRequestException('Token must be ACTIVE or PAUSED');
    }
    const redemption: Redemption = {
      id: randomUUID(),
      tokenId,
      holderId,
      amount,
      status: 'REQUESTED',
    };
    this.redemptions.set(redemption.id, redemption);
    this.audit.record({
      aggregateType: 'Redemption',
      aggregateId: redemption.id,
      action: 'RedemptionRequested',
      actorId: actor.id,
      role: actor.role,
      before: null,
      after: redemption,
    });
    return redemption;
  }

  approveRedemption(id: string, actor: ActorContext): Redemption {
    const redemption = this.getRedemption(id);
    if (redemption.status !== 'REQUESTED') {
      throw new BadRequestException('Redemption must be REQUESTED');
    }
    redemption.status = 'APPROVED';
    this.redemptions.set(id, redemption);
    return redemption;
  }

  settleRedemption(id: string, actor: ActorContext): Redemption {
    const redemption = this.getRedemption(id);
    if (redemption.status !== 'APPROVED') {
      throw new BadRequestException('Redemption must be APPROVED');
    }
    const token = this.getToken(redemption.tokenId);
    const value = toAmount(redemption.amount);
    this.adjustBalance(redemption.tokenId, redemption.holderId, -value);
    token.totalSupply = fromAmount(toAmount(token.totalSupply) - value);
    this.tokens.set(token.id, token);
    redemption.status = 'SETTLED';
    this.redemptions.set(id, redemption);
    this.outbox.enqueue({
      aggregateType: 'Redemption',
      aggregateId: redemption.id,
      eventType: 'RedemptionSettled',
      payload: { tokenId: redemption.tokenId, holderId: redemption.holderId, amount: redemption.amount },
    });
    return redemption;
  }

  rejectRedemption(id: string, actor: ActorContext): Redemption {
    const redemption = this.getRedemption(id);
    if (!['REQUESTED', 'APPROVED'].includes(redemption.status)) {
      throw new BadRequestException('Redemption not rejectable');
    }
    redemption.status = 'REJECTED';
    this.redemptions.set(id, redemption);
    return redemption;
  }

  listAuditLog() {
    return this.audit.list();
  }

  listOutboxEvents() {
    return this.outbox.list();
  }

  getPosition(tokenId: string, holderId: string): string {
    return fromAmount(this.positions.get(`${tokenId}:${holderId}`) ?? 0n);
  }

  private updateAssetStatus(asset: Asset, status: AssetStatus, eventType: string, actor: ActorContext): Asset {
    const before = { ...asset };
    asset.status = status;
    this.assets.set(asset.id, asset);
    this.audit.record({
      aggregateType: 'Asset',
      aggregateId: asset.id,
      action: eventType,
      actorId: actor.id,
      role: actor.role,
      before,
      after: asset,
    });
    this.outbox.enqueue({
      aggregateType: 'Asset',
      aggregateId: asset.id,
      eventType,
      payload: { status },
    });
    return asset;
  }

  private updateTokenStatus(id: string, from: TokenStatus[], to: TokenStatus, eventType: string, actor: ActorContext): Token {
    const token = this.getToken(id);
    if (!from.includes(token.status)) {
      throw new BadRequestException(`Token must be ${from.join(' or ')}`);
    }
    const before = { ...token };
    token.status = to;
    this.tokens.set(token.id, token);
    this.audit.record({
      aggregateType: 'Token',
      aggregateId: token.id,
      action: eventType,
      actorId: actor.id,
      role: actor.role,
      before,
      after: token,
    });
    this.outbox.enqueue({
      aggregateType: 'Token',
      aggregateId: token.id,
      eventType,
      payload: { status: token.status },
    });
    return token;
  }

  private adjustBalance(tokenId: string, holderId: string, delta: bigint): void {
    const key = `${tokenId}:${holderId}`;
    const current = this.positions.get(key) ?? 0n;
    const next = current + delta;
    if (next < 0n) {
      throw new BadRequestException('Insufficient balance');
    }
    this.positions.set(key, next);
  }

  private assertTokenActive(tokenId: string): Token {
    const token = this.getToken(tokenId);
    if (token.status !== 'ACTIVE') {
      throw new BadRequestException('Token must be ACTIVE');
    }
    return token;
  }

  private assertWhitelisted(tokenId: string, holderId: string): void {
    const status = this.whitelisted.get(`${tokenId}:${holderId}`);
    if (status !== 'ACTIVE') {
      throw new BadRequestException('Holder not whitelisted');
    }
  }

  private getAssetOrThrow(id: string): Asset {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  private getRedemption(id: string): Redemption {
    const redemption = this.redemptions.get(id);
    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }
    return redemption;
  }
}
