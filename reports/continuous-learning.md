# Continuous Learning Report — Knowledge Evolution

Generated: 2026-06-06  Branch: feature/knowledge-evolution

## Lesson Persistence Architecture

### Before

```
logLesson(text)
  → append to disk (01 Executive/Lessons.md)
  → push to in-memory buffer (cap 50)
  [LOST on Render restart — disk is ephemeral]
```

### After

```
logLesson(text)
  → append to disk (01 Executive/Lessons.md)        [local/dev]
  → push to in-memory buffer (cap 50)               [instant in-session]
  → fire-and-forget INSERT to apex_lessons (Supabase) [persistent across restarts]
```

`getRecentLessonsAsync(n)` merges all three sources: disk, buffer, and Supabase.

## apex_lessons Table

```sql
CREATE TABLE apex_lessons (
    id         BIGSERIAL PRIMARY KEY,
    lesson     TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status:** Table must exist in Supabase before persistence is active. If the table is absent, `logLesson` degrades silently — disk/buffer path continues unaffected. `_sbLessonsMissing` flag set on first 404 to avoid repeated failed calls.

## Supabase Schema Note

The JS client (via REST) can INSERT/SELECT but cannot CREATE TABLE. The `apex_lessons` table must be created once via the Supabase SQL editor:
```sql
CREATE TABLE IF NOT EXISTS apex_lessons (
    id BIGSERIAL PRIMARY KEY,
    lesson TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Render Compatibility

Render Starter plan has ephemeral disk — the `Lessons.md` file is reset on every deploy. The Supabase path is the only durable store. Once `apex_lessons` table exists, all lessons survive restarts and deploys.

## Learning Loop Quality

| Signal | Status |
|---|---|
| Lesson logged | ✅ disk + buffer + Supabase |
| Lessons survive restart | ✅ via Supabase (table must exist) |
| Lessons searchable | ❌ No semantic search on apex_lessons — BM25 only via searchVault() on disk |
| Auto-extraction from agent runs | ❌ Not implemented — manual logLesson() calls only |
| Lesson deduplication | ❌ INSERT (not upsert) — caller must avoid duplicates |
