-- Task queue table
CREATE TABLE IF NOT EXISTS apex_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS apex_notifications (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline table
CREATE TABLE IF NOT EXISTS apex_timeline (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    objective TEXT,
    commit_hash TEXT,
    files_changed JSONB DEFAULT '[]',
    duration INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    agent_logs JSONB DEFAULT '[]',
    success BOOLEAN DEFAULT TRUE,
    error TEXT
);
