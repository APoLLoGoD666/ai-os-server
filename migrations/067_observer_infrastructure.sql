-- Migration 067: Observer Infrastructure
-- First-class sensor registry, calibration event log, and per-sensor health scores.

CREATE TABLE IF NOT EXISTS observer_registry (
    id               text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sensor_id        text        NOT NULL UNIQUE,
    sensor_name      text        NOT NULL,
    sensor_type      text        NOT NULL,
    domain           text        NOT NULL,
    description      text,
    health_score     numeric     NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    last_reading_at  timestamptz,
    last_calibrated  timestamptz,
    calibration_due  timestamptz,
    is_active        boolean     NOT NULL DEFAULT true,
    config           jsonb       NOT NULL DEFAULT '{}',
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_observer_domain  ON observer_registry(domain, is_active);
CREATE INDEX IF NOT EXISTS idx_observer_health  ON observer_registry(health_score, is_active);

CREATE TABLE IF NOT EXISTS calibration_events (
    id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sensor_id      text        NOT NULL REFERENCES observer_registry(sensor_id) ON DELETE CASCADE,
    event_type     text        NOT NULL DEFAULT 'calibration',
    expected_value jsonb,
    actual_value   jsonb,
    deviation      numeric,
    passed         boolean,
    notes          text,
    calibrated_by  text,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calib_sensor  ON calibration_events(sensor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calib_passed  ON calibration_events(passed, created_at DESC);

CREATE TABLE IF NOT EXISTS sensor_health_scores (
    id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sensor_id   text        NOT NULL REFERENCES observer_registry(sensor_id) ON DELETE CASCADE,
    dimension   text        NOT NULL,
    score       numeric     NOT NULL DEFAULT 100 CHECK (score >= 0 AND score <= 100),
    detail      jsonb       NOT NULL DEFAULT '{}',
    measured_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shs_sensor_dim  ON sensor_health_scores(sensor_id, dimension);
CREATE INDEX IF NOT EXISTS idx_shs_sensor  ON sensor_health_scores(sensor_id, measured_at DESC);
