CREATE SCHEMA IF NOT EXISTS token_lifecycle;

CREATE TABLE IF NOT EXISTS token_lifecycle.assets (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  issuer_id text NOT NULL,
  metadata jsonb NOT NULL,
  documents jsonb NOT NULL,
  valuation jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_lifecycle.tokens (
  id uuid PRIMARY KEY,
  asset_id uuid REFERENCES token_lifecycle.assets(id),
  symbol text NOT NULL,
  name text NOT NULL,
  decimals integer NOT NULL,
  total_supply numeric NOT NULL,
  status text NOT NULL,
  rules jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_lifecycle.holder_positions (
  token_id uuid REFERENCES token_lifecycle.tokens(id),
  holder_id text NOT NULL,
  balance numeric NOT NULL,
  PRIMARY KEY (token_id, holder_id)
);

CREATE TABLE IF NOT EXISTS token_lifecycle.whitelisted_holders (
  token_id uuid REFERENCES token_lifecycle.tokens(id),
  holder_id text NOT NULL,
  status text NOT NULL,
  PRIMARY KEY (token_id, holder_id)
);

CREATE TABLE IF NOT EXISTS token_lifecycle.corporate_actions (
  id uuid PRIMARY KEY,
  token_id uuid REFERENCES token_lifecycle.tokens(id),
  type text NOT NULL,
  params jsonb NOT NULL,
  record_date date NOT NULL,
  pay_date date NOT NULL,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS token_lifecycle.redemptions (
  id uuid PRIMARY KEY,
  token_id uuid REFERENCES token_lifecycle.tokens(id),
  holder_id text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS token_lifecycle.audit_log (
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

CREATE TABLE IF NOT EXISTS token_lifecycle.outbox_events (
  id bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_lifecycle.idempotency_keys (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  response_body jsonb NOT NULL,
  status_code integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_positions_token_holder ON token_lifecycle.holder_positions(token_id, holder_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON token_lifecycle.outbox_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_key_endpoint ON token_lifecycle.idempotency_keys(key, endpoint);
