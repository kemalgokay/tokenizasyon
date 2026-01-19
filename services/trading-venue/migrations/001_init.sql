CREATE SCHEMA IF NOT EXISTS trading_venue;

CREATE TABLE IF NOT EXISTS trading_venue.markets (
  id uuid PRIMARY KEY,
  token_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_venue.orders (
  id uuid PRIMARY KEY,
  market_id uuid REFERENCES trading_venue.markets(id),
  trader_id text NOT NULL,
  side text NOT NULL,
  type text NOT NULL,
  price numeric,
  quantity numeric NOT NULL,
  remaining_qty numeric NOT NULL,
  status text NOT NULL,
  time_in_force text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_venue.trades (
  id uuid PRIMARY KEY,
  market_id uuid REFERENCES trading_venue.markets(id),
  buy_order_id uuid NOT NULL,
  sell_order_id uuid NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  executed_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS trading_venue.order_book_levels (
  market_id uuid REFERENCES trading_venue.markets(id),
  side text NOT NULL,
  price numeric NOT NULL,
  total_qty numeric NOT NULL,
  PRIMARY KEY (market_id, side, price)
);

CREATE TABLE IF NOT EXISTS trading_venue.daily_trade_stats (
  market_id uuid REFERENCES trading_venue.markets(id),
  day date NOT NULL,
  volume numeric NOT NULL,
  notional numeric NOT NULL,
  PRIMARY KEY (market_id, day)
);

CREATE TABLE IF NOT EXISTS trading_venue.audit_log (
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

CREATE TABLE IF NOT EXISTS trading_venue.outbox_events (
  id bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_venue.idempotency_keys (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  response_body jsonb NOT NULL,
  status_code integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_market_side_price_created ON trading_venue.orders(market_id, side, price, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON trading_venue.outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_key_endpoint ON trading_venue.idempotency_keys(key, endpoint);
