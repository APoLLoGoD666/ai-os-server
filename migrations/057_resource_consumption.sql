-- resource_consumption table — ARCH-15 §6.6 / ARCH-14 Phase 8 reconciliation
-- Append-only cost accounting per model invocation. No updated_at column.
CREATE TABLE IF NOT EXISTS resource_consumption (
    id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    record_id      uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    task_id        uuid,
    session_id     uuid,
    request_id     text NOT NULL,
    resource_type  text NOT NULL
                     CHECK (resource_type IN ('MODEL_TOKENS','RESERVATION','RELEASE','OVERAGE')),
    model_tier     text,
    model_id       text,
    input_tokens   integer,
    output_tokens  integer,
    cost_usd       numeric(10,6) NOT NULL,
    is_reservation boolean NOT NULL DEFAULT false,
    is_release     boolean NOT NULL DEFAULT false,
    recorded_at    timestamptz NOT NULL DEFAULT NOW(),
    created_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_consumption_request_id
    ON resource_consumption(request_id);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_task_id
    ON resource_consumption(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_consumption_recorded_at
    ON resource_consumption(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_resource_type
    ON resource_consumption(resource_type);

ALTER TABLE resource_consumption ENABLE ROW LEVEL SECURITY;
