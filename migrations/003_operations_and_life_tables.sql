-- Migration 003: Operations and University/Life tables
-- Created: 2026-06-08
-- Route files: routes/operations.js, routes/life.js

CREATE TABLE IF NOT EXISTS apex_clients (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    stage TEXT DEFAULT 'qualifying',
    value NUMERIC(12,2),
    contact_email TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_projects (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    client_id BIGINT,
    description TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_documents (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    doc_type TEXT,
    content TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_proposals (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    client_id BIGINT,
    status TEXT DEFAULT 'draft',
    amount NUMERIC(12,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_university_modules (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    credits INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_university_assignments (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    module_id BIGINT,
    due_date DATE,
    weight_pct NUMERIC(5,2),
    notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_university_flashcards (
    id BIGSERIAL PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    module_id BIGINT,
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_university_sessions (
    id BIGSERIAL PRIMARY KEY,
    module_id BIGINT,
    duration_seconds INTEGER NOT NULL,
    session_type TEXT DEFAULT 'study',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apex_reading_list (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    status TEXT DEFAULT 'want-to-read',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
