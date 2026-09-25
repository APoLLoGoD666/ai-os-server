-- APEX V-11-A Migration 091: Identity Foundation
-- Extends humans table and adds multi-user support tables.
-- Safe to re-run (IF NOT EXISTS / DO NOTHING patterns).
-- Run in Supabase SQL editor before deploying V-11-A backend.

-- ── 1. Extend humans table ────────────────────────────────────────────────────

ALTER TABLE humans
  ADD COLUMN IF NOT EXISTS email                    TEXT,
  ADD COLUMN IF NOT EXISTS password_hash            TEXT,
  ADD COLUMN IF NOT EXISTS role                     TEXT NOT NULL DEFAULT 'master',
  ADD COLUMN IF NOT EXISTS status                   TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by               UUID REFERENCES humans(id),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at            TIMESTAMPTZ;

-- Enforce valid role and status values
DO $$ BEGIN
  BEGIN
    ALTER TABLE humans ADD CONSTRAINT humans_role_check CHECK (role IN ('master', 'user'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE humans ADD CONSTRAINT humans_status_check CHECK (status IN ('active', 'invited', 'suspended'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE humans ADD CONSTRAINT humans_email_unique UNIQUE (email);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Ensure master record has role set
UPDATE humans SET role = 'master' WHERE id = '00000000-0000-4000-8000-000000000001' AND role IS DISTINCT FROM 'master';

COMMENT ON COLUMN humans.role IS 'V-11-A: master = system owner; user = invited beta user';
COMMENT ON COLUMN humans.status IS 'V-11-A: active | invited | suspended';
COMMENT ON COLUMN humans.invited_by IS 'V-11-A: UUID of master who created this user account';

-- ── 2. Token revocations ──────────────────────────────────────────────────────
-- Stores invalidated JWT IDs for logout and emergency revocation.

CREATE TABLE IF NOT EXISTS token_revocations (
  jti        TEXT PRIMARY KEY,
  human_id   UUID REFERENCES humans(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE token_revocations IS 'V-11-A: Revoked JWT IDs. Prune rows where expires_at < now().';

-- ── 3. Invite tokens ──────────────────────────────────────────────────────────
-- One-time tokens Master creates to invite Users.

CREATE TABLE IF NOT EXISTS invite_tokens (
  token       TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  human_id    UUID REFERENCES humans(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES humans(id),
  role        TEXT NOT NULL DEFAULT 'user',
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE invite_tokens IS 'V-11-A: One-time invite tokens created by Master for User onboarding.';

-- ── 4. User capability overrides ──────────────────────────────────────────────
-- Per-user grants or revocations relative to their role default capability set.

CREATE TABLE IF NOT EXISTS user_capability_overrides (
  human_id    UUID NOT NULL REFERENCES humans(id) ON DELETE CASCADE,
  capability  TEXT NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES humans(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (human_id, capability)
);

COMMENT ON TABLE user_capability_overrides IS 'V-11-A: Per-user capability delta from role defaults.';

-- ── 5. Audit log ──────────────────────────────────────────────────────────────
-- System-visible events only. User private data is never logged here (RD-3/D7 Layer 1).

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  human_id    UUID REFERENCES humans(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT,
  detail      JSONB,
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_log IS 'V-11-A: System activity audit. Layer 1 of RD-3/D7 privacy model (always visible to Master).';

-- ── 6. APEX preferences ───────────────────────────────────────────────────────
-- Per-user UI preferences (namespaced from Master defaults).

CREATE TABLE IF NOT EXISTS apex_preferences (
  human_id    UUID PRIMARY KEY REFERENCES humans(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE apex_preferences IS 'V-11-A: Per-user preferences. User private (RD-3/D7 Layer 3).';

-- ── 7. Insert master preferences row (idempotent) ────────────────────────────

INSERT INTO apex_preferences (human_id)
VALUES ('00000000-0000-4000-8000-000000000001')
ON CONFLICT (human_id) DO NOTHING;
