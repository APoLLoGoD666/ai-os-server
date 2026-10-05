-- Tool connections registry
CREATE TABLE IF NOT EXISTS tool_connections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    auth_type    TEXT NOT NULL DEFAULT 'api_key', -- 'api_key' | 'oauth2' | 'connection_string'
    status       TEXT NOT NULL DEFAULT 'disconnected', -- 'disconnected' | 'connected' | 'error' | 'expired'
    connected_at TIMESTAMPTZ,
    last_tested_at TIMESTAMPTZ,
    last_error   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_connections_status ON tool_connections(status);

-- Encrypted credential store
CREATE TABLE IF NOT EXISTS tool_credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id   UUID NOT NULL REFERENCES tool_connections(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL, -- 'api_key' | 'connection_string' | 'refresh_token' | 'access_token'
    encrypted_value TEXT NOT NULL,
    iv              TEXT NOT NULL,
    auth_tag        TEXT NOT NULL,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(connection_id, credential_type)
);

CREATE INDEX IF NOT EXISTS idx_tool_credentials_connection ON tool_credentials(connection_id);

-- RLS
ALTER TABLE tool_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_credentials ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically; these policies cover authenticated users
CREATE POLICY "connections_all" ON tool_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "credentials_all" ON tool_credentials FOR ALL USING (true) WITH CHECK (true);
