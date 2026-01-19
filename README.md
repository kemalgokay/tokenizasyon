# Tokenizasyon Monorepo

Bankaya yönelik RWA Tokenizasyon platformu için örnek **End-to-End Tokenization + Market Maker Order Book** sistemi. Monorepo içinde 3 mikroservis ve ortak kütüphane vardır.

## Mimari

```
/services/token-lifecycle
/services/trading-venue
/services/market-maker
/libs/common
/libs/web-api
/libs/web-ui
/apps/backoffice-web
/apps/trader-web
/apps/auditor-web
```

- **Token Lifecycle**: Asset onboarding, token yaratma, mint/burn/transfer, corporate actions, redemption.
- **Trading Venue**: Permissioned order book + matching engine (price-time priority).
- **Market Maker**: Mid price + spread/curve ile otomatik limit emirleri üretimi + risk/inventory yönetimi.

## Ortak Kütüphane (libs/common)

- RBAC guard (X-Actor-Id, X-Actor-Role)
- Idempotency middleware (Idempotency-Key)
- Audit log helper
- Outbox stub
- RFC7807 problem+json filter
- Correlation-ID middleware

## Lokal Çalıştırma

```bash
npm install
npm run build
docker-compose up
```

Servisler:
- Token Lifecycle: http://localhost:3001/docs
- Trading Venue: http://localhost:3002/docs
- Market Maker: http://localhost:3003/docs

Frontend uygulamaları (dev):

```bash
cd apps/backoffice-web && npm install && npm run dev
cd apps/trader-web && npm install && npm run dev
cd apps/auditor-web && npm install && npm run dev
```

Varsayılan portlar:
- Backoffice Web: http://localhost:5173
- Trader Web: http://localhost:5174
- Auditor Web: http://localhost:5175

`.env` örneği (Vite değişkenleri):
```
VITE_TOKEN_LIFECYCLE_API=http://localhost:3001
VITE_TRADING_VENUE_API=http://localhost:3002
VITE_MARKET_MAKER_API=http://localhost:3003
```

## Migration

Her servisin kendi `migrations` dizininde SQL şeması vardır. PostgreSQL üzerinde `psql` veya gömülü migration aracı ile uygulanabilir.

## Curl Örnekleri

### Asset -> Approve -> Token -> Activate
```bash
curl -X POST http://localhost:3001/assets \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: issuer-1' \
  -H 'X-Actor-Role: ISSUER' \
  -H 'Idempotency-Key: asset-1' \
  -d '{"type":"BOND","issuerId":"issuer-1","metadata":{},"documents":{},"valuation":{}}'

curl -X POST http://localhost:3001/assets/<assetId>/submit-review \
  -H 'X-Actor-Id: issuer-1' -H 'X-Actor-Role: ISSUER' -H 'Idempotency-Key: asset-2'

curl -X POST http://localhost:3001/assets/<assetId>/approve \
  -H 'X-Actor-Id: ops-1' -H 'X-Actor-Role: OPS' -H 'Idempotency-Key: asset-3'

curl -X POST http://localhost:3001/tokens \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: issuer-1' \
  -H 'X-Actor-Role: ISSUER' \
  -H 'Idempotency-Key: token-1' \
  -d '{"assetId":"<assetId>","symbol":"BND","name":"Bond","decimals":2,"rules":{"whitelistRequired":false}}'

curl -X POST http://localhost:3001/tokens/<tokenId>/activate \
  -H 'X-Actor-Id: ops-1' -H 'X-Actor-Role: OPS' -H 'Idempotency-Key: token-2'
```

### Mint Holder
```bash
curl -X POST http://localhost:3001/tokens/<tokenId>/mint \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: ops-1' -H 'X-Actor-Role: OPS' \
  -H 'Idempotency-Key: mint-1' \
  -d '{"toHolderId":"holder-1","amount":"1000"}'
```

### Create Market
```bash
curl -X POST http://localhost:3002/markets \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: ops-1' -H 'X-Actor-Role: OPS' \
  -H 'Idempotency-Key: market-1' \
  -d '{"tokenId":"<tokenId>"}'
```

### Place Order
```bash
curl -X POST http://localhost:3002/markets/<marketId>/orders \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: trader-1' -H 'X-Actor-Role: TRADER' \
  -H 'Idempotency-Key: order-1' \
  -d '{"traderId":"trader-1","side":"BUY","type":"LIMIT","price":"100","quantity":"10","timeInForce":"GTC"}'
```

### Run Market Maker -> Orderbook
```bash
curl -X POST http://localhost:3003/market-maker/markets/<marketId>/config \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: mm-1' -H 'X-Actor-Role: MARKET_MAKER' \
  -H 'Idempotency-Key: mm-1' \
  -d '{"baseSpreadBps":20,"stepBps":5,"levels":5,"baseQty":"1000"}'

curl -X POST http://localhost:3003/market-maker/markets/<marketId>/price \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: ops-1' -H 'X-Actor-Role: OPS' \
  -H 'Idempotency-Key: mm-2' \
  -d '{"midPrice":"1000"}'

curl -X POST http://localhost:3003/market-maker/markets/<marketId>/run \
  -H 'Content-Type: application/json' \
  -H 'X-Actor-Id: mm-1' -H 'X-Actor-Role: MARKET_MAKER' \
  -H 'Idempotency-Key: mm-3' \
  -d '{"reason":"TIMER"}'

curl -X GET http://localhost:3002/markets/<marketId>/orderbook \
  -H 'X-Actor-Id: trader-1' -H 'X-Actor-Role: TRADER'
```

### Role Header Örneği
```bash
-H 'X-Actor-Id: ops-1' \
-H 'X-Actor-Role: OPS' \
-H 'X-Correlation-Id: demo-corr-1'
```

### Frontend Login / Role Switch
- Backoffice, Trader, Auditor uygulamalarında giriş ekranından rol ve actorId seçilir.
- Auth bilgisi localStorage içinde saklanır ve her API çağrısına `X-Actor-Id` / `X-Actor-Role` olarak eklenir.
- Correlation id otomatik üretir ve her ekranda üst barda görüntülenir.

### Execute Trade -> Settlement Stub
Trade oluşunca outbox event içinde `SettlementRequested` payload'ı üretilir ve token transferi ile fiat stub için intent id döner.

## Notlar

- Fiat ödeme ve custody entegrasyonu stub olarak bırakılmıştır.
- Auth yalnızca header bazlı RBAC guard ile sağlanır.
- Event-driven ve outbox pattern stub olarak mevcuttur.
- Sayısal alanlarda integer string (decimal-safe) kullanılır.

## OpenAPI Client Generate

```
cd libs/web-api
npm run generate
```
