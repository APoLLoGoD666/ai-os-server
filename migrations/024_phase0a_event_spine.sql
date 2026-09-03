-- Phase 0a: Event spine — events, outbox, consumer_offsets
-- Event bus is in-memory (services/init.js); no existing persisted events table.
-- UNIQUE constraint applied from creation — no dedup migration needed.

CREATE TABLE IF NOT EXISTS events (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  source          text NOT NULL,
  type            text NOT NULL,
  entity_refs     uuid[] NOT NULL DEFAULT '{}',
  payload         jsonb NOT NULL,
  content_hash    text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  ingested_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS events_idempotency_key_uidx ON events (idempotency_key);
CREATE INDEX IF NOT EXISTS events_type_occurred_idx ON events (type, occurred_at);
CREATE INDEX IF NOT EXISTS events_entity_refs_gin_idx ON events USING gin (entity_refs);

-- Outbox: transactional staging buffer. Relay moves rows -> events with retry.
CREATE TABLE IF NOT EXISTS outbox (
  outbox_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  source          text NOT NULL,
  type            text NOT NULL,
  entity_refs     uuid[] NOT NULL DEFAULT '{}',
  payload         jsonb NOT NULL,
  content_hash    text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  relayed_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS outbox_idempotency_key_uidx ON outbox (idempotency_key);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (created_at) WHERE relayed_at IS NULL;

-- Consumer offsets: idempotency record for event consumers.
-- Each consumer records (name, event_id) in the same transaction as its side effects.
CREATE TABLE IF NOT EXISTS consumer_offsets (
  consumer_name text NOT NULL,
  event_id      uuid NOT NULL REFERENCES events (event_id),
  processed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);
