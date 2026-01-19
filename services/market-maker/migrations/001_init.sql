CREATE SCHEMA IF NOT EXISTS market_maker;

CREATE TABLE IF NOT EXISTS market_maker.mm_configs (
  id uuid PRIMARY KEY,
  market_id uuid NOT NULL,
  market_maker_id text NOT NULL,
  enabled boolean NOT NULL,
  base_spread_bps integer NOT NULL,
  step_bps integer NOT NULL,
  levels integer NOT NULL,
  base_qty numeric NOT NULL,
  qty_decay numeric NOT NULL,
  min_price_tick numeric NOT NULL,
  min_qty_step numeric NOT NULL,
  price_source text NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_maker.mm_inventory (
  market_id uuid NOT NULL,
  market_maker_id text NOT NULL,
  balance_token numeric NOT NULL,
  balance_fiat_stub numeric NOT NULL,
  net_position numeric NOT NULL,
  avg_cost numeric NOT NULL,
  PRIMARY KEY (market_id, market_maker_id)
);

CREATE TABLE IF NOT EXISTS market_maker.mm_risk_limits (
  market_id uuid NOT NULL,
  market_maker_id text NOT NULL,
  max_notional_per_order numeric NOT NULL,
  max_open_orders integer NOT NULL,
  max_daily_notional numeric NOT NULL,
  max_net_position numeric NOT NULL,
  kill_switch boolean NOT NULL,
  PRIMARY KEY (market_id, market_maker_id)
);

CREATE TABLE IF NOT EXISTS market_maker.mm_runs (
  id uuid PRIMARY KEY,
  market_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  reason text NOT NULL,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS market_maker.mm_order_links (
  mm_run_id uuid NOT NULL,
  order_id uuid NOT NULL,
  level integer NOT NULL,
  side text NOT NULL
);

CREATE TABLE IF NOT EXISTS market_maker.price_ticks (
  market_id uuid NOT NULL,
  ts timestamptz NOT NULL,
  mid_price numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS market_maker.audit_log (
  id bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  action text NOT NULL,
  actor_id text NOT NULL,
  role text NOT NULL,
  before_hash text,
  after_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_maker.outbox_events (
  id bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_maker.idempotency_keys (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  response_body jsonb NOT NULL,
  status_code integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON market_maker.outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_key_endpoint ON market_maker.idempotency_keys(key, endpoint);
