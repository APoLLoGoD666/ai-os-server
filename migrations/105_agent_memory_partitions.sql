-- 105_agent_memory_partitions.sql
-- Per-agent memory partitions for the APEX Civilisation.
-- Namespace keys: agent:{slug}, director:{domain}, council:{role}, ministry:{name}
-- Used by lib/agent-memory.js

create table if not exists agent_memory (
  id            uuid          primary key default gen_random_uuid(),
  partition_key text          not null,
  memory_type   text          not null default 'general',
  content       text,
  metadata      jsonb,
  expires_at    timestamptz,
  created_at    timestamptz   not null default now()
);

-- Fast lookup by partition (the primary access pattern)
create index if not exists agent_memory_partition_idx
  on agent_memory (partition_key, created_at desc);

-- Namespace prefix scan (used by getPartitionMemories)
create index if not exists agent_memory_partition_prefix_idx
  on agent_memory (partition_key text_pattern_ops);

-- Clean up expired entries (run via cron or Supabase scheduled function)
-- delete from agent_memory where expires_at is not null and expires_at < now();
