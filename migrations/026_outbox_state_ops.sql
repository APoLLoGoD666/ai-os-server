-- Migration 026: production ops for write_outbox_with_state
-- Extends the function with real state-change ops (was test-only: noop_test, insert_atomicity_sentinel).
-- Constitution Articles 3 & 4: every state change + outbox INSERT in one server-side transaction.
-- NEVER adds string-interpolated SQL — all ops use EXECUTE ... USING or literal DML.

CREATE OR REPLACE FUNCTION write_outbox_with_state(
    p_op              text,
    p_args            jsonb,
    p_idempotency_key text,
    p_source          text,
    p_type            text,
    p_entity_refs     text[],
    p_payload         jsonb,
    p_content_hash    text,
    p_occurred_at     text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    CASE p_op

        -- ── Test ops (Constitution probe targets — do not remove) ────────────
        WHEN 'noop_test' THEN
            NULL;

        WHEN 'insert_atomicity_sentinel' THEN
            INSERT INTO atomicity_sentinels (label, created_at)
            VALUES (p_args->>'label', now())
            ON CONFLICT DO NOTHING;

        -- ── Production ops ───────────────────────────────────────────────────

        -- Store a lesson as an improvement candidate atomically with the outbox entry.
        -- JS caller: writeWithOutbox({ op:'store_lesson', args:{title,description,improvement_type,source_observation} }, event)
        WHEN 'store_lesson' THEN
            INSERT INTO improvement_candidates (
                title, description, improvement_type, source_observation,
                status, created_at
            ) VALUES (
                COALESCE(p_args->>'title', 'Lesson from ' || p_source),
                COALESCE(p_args->>'description', p_payload::text),
                COALESCE(p_args->>'improvement_type', 'lesson'),
                COALESCE(p_args->>'source_observation', p_source),
                'pending',
                now()
            )
            ON CONFLICT DO NOTHING;

        -- Record a pipeline or agent run outcome atomically.
        -- JS caller: writeWithOutbox({ op:'record_agent_run', args:{task_id} }, event)
        WHEN 'record_agent_run' THEN
            INSERT INTO execution_events (event_type, task_id, payload, created_at)
            VALUES (
                p_type,
                CASE WHEN (p_args->>'task_id') IS NOT NULL
                     THEN (p_args->>'task_id')::uuid
                     ELSE NULL END,
                p_payload,
                now()
            )
            ON CONFLICT DO NOTHING;

        -- Mark a task complete while emitting the completion event atomically.
        -- JS caller: writeWithOutbox({ op:'mark_task_complete', args:{task_id} }, event)
        WHEN 'mark_task_complete' THEN
            UPDATE tasks
            SET    status     = 'complete',
                   updated_at = now()
            WHERE  id = (p_args->>'task_id')::uuid;

        ELSE
            RAISE EXCEPTION 'write_outbox_with_state: unknown op ''%''', p_op;

    END CASE;

    -- Always insert into outbox (idempotent via ON CONFLICT DO NOTHING on idempotency_key)
    INSERT INTO outbox (
        idempotency_key, source, type, entity_refs, payload,
        content_hash, occurred_at, created_at
    ) VALUES (
        p_idempotency_key,
        p_source,
        p_type,
        p_entity_refs::uuid[],
        p_payload,
        p_content_hash,
        p_occurred_at::timestamptz,
        now()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;
