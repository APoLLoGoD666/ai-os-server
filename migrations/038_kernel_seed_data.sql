-- APEX v1 Kernel — Migration 038
-- Seeds the single human owner and all agent roles.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- After running: set APEX_HUMAN_ID=00000000-0000-4000-8000-000000000001 in Render env vars.

INSERT INTO humans (id, display_name, auth_method)
VALUES ('00000000-0000-4000-8000-000000000001', 'Owner', 'password')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agents (id, role, is_active) VALUES
    ('00000000-0000-4000-8000-000000000002', 'TASK_CYCLE',          true),
    ('00000000-0000-4000-8000-000000000003', 'ORCHESTRATOR',        true),
    ('00000000-0000-4000-8000-000000000004', 'MASTER_ORCHESTRATOR', true),
    ('00000000-0000-4000-8000-000000000005', 'ARCHITECT',           true),
    ('00000000-0000-4000-8000-000000000006', 'DEVELOPER',           true),
    ('00000000-0000-4000-8000-000000000007', 'REVIEWER',            true),
    ('00000000-0000-4000-8000-000000000008', 'VALIDATOR',           true),
    ('00000000-0000-4000-8000-000000000009', 'EMAIL',               true)
ON CONFLICT (id) DO NOTHING;

-- Verify: should return 1 human, 8 agents
-- SELECT 'humans' AS tbl, COUNT(*) FROM humans
-- UNION ALL
-- SELECT 'agents', COUNT(*) FROM agents;
