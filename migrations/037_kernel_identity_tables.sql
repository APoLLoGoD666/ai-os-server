-- APEX v1 Kernel — Migration 037
-- Creates humans and agents identity tables.
-- Run in Supabase SQL editor. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS humans (
    id           UUID PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001',
    display_name TEXT NOT NULL DEFAULT 'Owner',
    auth_method  TEXT NOT NULL DEFAULT 'password',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE humans IS 'APEX v1 Kernel: human identity records. Single-user system — one row.';

CREATE TABLE IF NOT EXISTS agents (
    id         UUID PRIMARY KEY,
    role       TEXT NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE agents IS 'APEX v1 Kernel: agent identity records. One row per agent role.';
