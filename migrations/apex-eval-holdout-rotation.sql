-- Run on apex-eval project (uwnhutqtxwbocghvwwco) → SQL Editor

ALTER TABLE benchmark_holdout_scenarios
    ADD COLUMN IF NOT EXISTS suite_version TEXT NOT NULL DEFAULT 'v1';

-- To rotate: set ACTIVE_SUITE_VERSION=v2 in edge function secrets, insert v2 scenarios.
-- Old scenarios stay in the table, just never queried.
