-- Add provider column to vault_embeddings for embed audit provenance (FINDING-005)
ALTER TABLE vault_embeddings
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'voyage';
