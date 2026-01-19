import { requestJson } from '../httpClient';

export interface MMConfig {
  marketId: string;
  baseSpreadBps: number;
  stepBps: number;
  levels: number;
  baseQty: string;
  enabled: boolean;
}

export interface MMInventory {
  marketId: string;
  position: string;
  updatedAt: string;
}

export interface MMRun {
  id: string;
  marketId: string;
  reason: string;
  status: string;
  startedAt: string;
}

export interface MMOrderLink {
  orderId: string;
  side: string;
  level: number;
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

export interface MMStatus {
  config: MMConfig;
  inventory: MMInventory;
  openOrders: MMOrderLink[];
  lastRun: MMRun | null;
  riskLimit: MMRiskLimit | null;
}

export const marketMakerClient = {
  getStatus: (baseUrl: string, marketId: string) =>
    requestJson<MMStatus>({ baseUrl, path: `/market-maker/markets/${marketId}/status` }),
  getConfig: (baseUrl: string, marketId: string) =>
    requestJson<MMConfig>({ baseUrl, path: `/market-maker/markets/${marketId}/config` }),
  upsertConfig: (baseUrl: string, marketId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<MMConfig>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/config`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  enable: (baseUrl: string, marketId: string, idempotencyKey?: string) =>
    requestJson<MMConfig>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/enable`,
      method: 'POST',
      idempotencyKey
    }),
  disable: (baseUrl: string, marketId: string, idempotencyKey?: string) =>
    requestJson<MMConfig>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/disable`,
      method: 'POST',
      idempotencyKey
    }),
  setManualPrice: (baseUrl: string, marketId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<void>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/price`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  run: (baseUrl: string, marketId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<MMRun>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/run`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  getInventory: (baseUrl: string, marketId: string) =>
    requestJson<MMInventory>({ baseUrl, path: `/market-maker/markets/${marketId}/inventory` }),
  listRuns: (baseUrl: string, marketId: string) =>
    requestJson<MMRun[]>({ baseUrl, path: `/market-maker/markets/${marketId}/runs` }),
  listOrders: (baseUrl: string, marketId: string) =>
    requestJson<MMOrderLink[]>({ baseUrl, path: `/market-maker/markets/${marketId}/orders` }),
  toggleKillSwitch: (baseUrl: string, marketId: string, enabled: boolean, idempotencyKey?: string) =>
    requestJson<MMRiskLimit>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/kill-switch`,
      method: 'POST',
      body: { enabled },
      idempotencyKey
    }),
  updateRiskLimits: (baseUrl: string, marketId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<MMRiskLimit>({
      baseUrl,
      path: `/market-maker/markets/${marketId}/risk-limit`,
      method: 'POST',
      body: payload,
      idempotencyKey
    })
};
