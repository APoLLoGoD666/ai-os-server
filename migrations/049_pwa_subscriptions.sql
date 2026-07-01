-- Migration 049: PWA Push Subscriptions
CREATE TABLE IF NOT EXISTS pwa_subscriptions (
  sub_id      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_used   timestamptz
);

CREATE INDEX IF NOT EXISTS pwa_subscriptions_created_idx ON pwa_subscriptions (created_at DESC);
