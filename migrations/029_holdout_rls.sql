-- Migration 029: RLS on benchmark_holdout_scenarios (Gap-4 credential isolation)
-- Enables Row-Level Security so that any client using the anon key (SUPABASE_ANON_KEY)
-- can only SELECT from this table. INSERT/UPDATE/DELETE are denied by default.
--
-- The service_role key bypasses RLS (Supabase design) — this is the residual gap
-- documented in the Evaluator Independence audit. The anon-key path (used by
-- getHoldoutClient in benchmark-runner.js) is fully constrained.
--
-- Write access to holdout scenarios requires direct Supabase dashboard access
-- (postgres superuser) — i.e., Founder only.

ALTER TABLE benchmark_holdout_scenarios ENABLE ROW LEVEL SECURITY;

-- Allow SELECT for anon and authenticated roles (respects RLS).
-- No INSERT/UPDATE/DELETE policies defined → those operations denied for both roles.
CREATE POLICY holdout_select_only
    ON benchmark_holdout_scenarios
    FOR SELECT
    TO anon, authenticated
    USING (true);
