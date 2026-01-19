import { requestJson } from '../httpClient';

export interface Asset {
  id: string;
  type: string;
  issuerId: string;
  status: string;
  metadata: Record<string, unknown>;
  valuation: Record<string, unknown>;
}

export interface Token {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  status: string;
  rules: Record<string, unknown>;
}

export interface HolderPosition {
  holderId: string;
  balance: string;
}

export interface WhitelistEntry {
  holderId: string;
  status: string;
}
export interface CorporateAction {
  id: string;
  type: string;
  recordDate: string;
  payDate: string;
  status: string;
}

export interface Redemption {
  id: string;
  status: string;
  tokenId: string;
}

export const tokenLifecycleClient = {
  listAssets: (baseUrl: string) => requestJson<Asset[]>({ baseUrl, path: '/assets' }),
  createAsset: (baseUrl: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<Asset>({
      baseUrl,
      path: '/assets',
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  submitAssetReview: (baseUrl: string, assetId: string, idempotencyKey?: string) =>
    requestJson<Asset>({
      baseUrl,
      path: `/assets/${assetId}/submit-review`,
      method: 'POST',
      idempotencyKey
    }),
  approveAsset: (baseUrl: string, assetId: string, idempotencyKey?: string) =>
    requestJson<Asset>({
      baseUrl,
      path: `/assets/${assetId}/approve`,
      method: 'POST',
      idempotencyKey
    }),
  rejectAsset: (baseUrl: string, assetId: string, idempotencyKey?: string) =>
    requestJson<Asset>({
      baseUrl,
      path: `/assets/${assetId}/reject`,
      method: 'POST',
      idempotencyKey
    }),
  listTokens: (baseUrl: string) => requestJson<Token[]>({ baseUrl, path: '/tokens' }),
  createToken: (baseUrl: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<Token>({
      baseUrl,
      path: '/tokens',
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  activateToken: (baseUrl: string, tokenId: string, idempotencyKey?: string) =>
    requestJson<Token>({
      baseUrl,
      path: `/tokens/${tokenId}/activate`,
      method: 'POST',
      idempotencyKey
    }),
  pauseToken: (baseUrl: string, tokenId: string, idempotencyKey?: string) =>
    requestJson<Token>({
      baseUrl,
      path: `/tokens/${tokenId}/pause`,
      method: 'POST',
      idempotencyKey
    }),
  resumeToken: (baseUrl: string, tokenId: string, idempotencyKey?: string) =>
    requestJson<Token>({
      baseUrl,
      path: `/tokens/${tokenId}/resume`,
      method: 'POST',
      idempotencyKey
    }),
  listPositions: (baseUrl: string, tokenId: string) =>
    requestJson<HolderPosition[]>({ baseUrl, path: `/tokens/${tokenId}/positions` }),
  listWhitelist: (baseUrl: string, tokenId: string) =>
    requestJson<WhitelistEntry[]>({ baseUrl, path: `/tokens/${tokenId}/whitelist` }),
  addWhitelist: (baseUrl: string, tokenId: string, holderId: string, idempotencyKey?: string) =>
    requestJson<void>({
      baseUrl,
      path: `/tokens/${tokenId}/whitelist`,
      method: 'POST',
      body: { holderId },
      idempotencyKey
    }),
  removeWhitelist: (baseUrl: string, tokenId: string, holderId: string, idempotencyKey?: string) =>
    requestJson<void>({
      baseUrl,
      path: `/tokens/${tokenId}/whitelist/${holderId}`,
      method: 'DELETE',
      idempotencyKey
    }),
  mint: (baseUrl: string, tokenId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<void>({
      baseUrl,
      path: `/tokens/${tokenId}/mint`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  burn: (baseUrl: string, tokenId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<void>({
      baseUrl,
      path: `/tokens/${tokenId}/burn`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  transfer: (baseUrl: string, tokenId: string, payload: Record<string, unknown>, idempotencyKey?: string) =>
    requestJson<void>({
      baseUrl,
      path: `/tokens/${tokenId}/transfer`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  listCorporateActions: (baseUrl: string, tokenId: string) =>
    requestJson<CorporateAction[]>({ baseUrl, path: `/tokens/${tokenId}/corporate-actions` }),
  scheduleCorporateAction: (
    baseUrl: string,
    tokenId: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string
  ) =>
    requestJson<CorporateAction>({
      baseUrl,
      path: `/tokens/${tokenId}/corporate-actions`,
      method: 'POST',
      body: payload,
      idempotencyKey
    }),
  executeCorporateAction: (
    baseUrl: string,
    tokenId: string,
    actionId: string,
    idempotencyKey?: string
  ) =>
    requestJson<CorporateAction>({
      baseUrl,
      path: `/tokens/${tokenId}/corporate-actions/${actionId}/execute`,
      method: 'POST',
      idempotencyKey
    }),
  listRedemptions: (baseUrl: string, tokenId: string) =>
    requestJson<Redemption[]>({ baseUrl, path: `/tokens/${tokenId}/redemptions` }),
  approveRedemption: (baseUrl: string, tokenId: string, redemptionId: string, idempotencyKey?: string) =>
    requestJson<Redemption>({
      baseUrl,
      path: `/tokens/${tokenId}/redemptions/${redemptionId}/approve`,
      method: 'POST',
      idempotencyKey
    }),
  rejectRedemption: (baseUrl: string, tokenId: string, redemptionId: string, idempotencyKey?: string) =>
    requestJson<Redemption>({
      baseUrl,
      path: `/tokens/${tokenId}/redemptions/${redemptionId}/reject`,
      method: 'POST',
      idempotencyKey
    }),
  settleRedemption: (baseUrl: string, tokenId: string, redemptionId: string, idempotencyKey?: string) =>
    requestJson<Redemption>({
      baseUrl,
      path: `/tokens/${tokenId}/redemptions/${redemptionId}/settle`,
      method: 'POST',
      idempotencyKey
    })
};
