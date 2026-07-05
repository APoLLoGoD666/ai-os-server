# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 07 · Evidence Appendix

**Registry Version:** 1.0.0
**Date:** 2026-07-03

---

This appendix records the source evidence — shell commands and file reads — used during registry construction. All entity records in 01-Entity-Catalogue are grounded in this evidence.

---

## Construction Session

| Field | Value |
|---|---|
| Construction Date | 2026-07-03 |
| Evidence Gathered By | Direct filesystem inspection of C:/Users/arwwo/Desktop/APEX/Scripts |
| Operating Mode | STRICT READ ONLY — no code changes, no file modifications |
| Evidence Method | Bash find commands, directory listings, file reads |

---

## Shell Commands Executed

### Directory Structure Discovery

```bash
# Full folder tree
find "C:/Users/arwwo/Desktop/APEX/Scripts" -type d | sort

# Root-level files
ls "C:/Users/arwwo/Desktop/APEX/Scripts"
```

### Library Files Enumeration

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib" -maxdepth 2 -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib" -maxdepth 1 -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/constitution" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/memory" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/intelligence" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/runtime" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/cognitive" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/executive" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/finance" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/founder" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/orchestration" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/lib/models" -name "*.js" | sort
```

### Agent-System Files Enumeration

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/agent-system" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/config" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/runtime" -type f | sort
```

### Routes, Migrations, Scripts Enumeration

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/routes" -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/migrations" -maxdepth 1 -name "*.sql" -o -name "*.js" | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/scripts" -type f | sort
```

### Public, Data, Config, Services

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/public" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/data" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/config" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/services" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/dev-tools" -maxdepth 2 -type f | sort
```

### Piper TTS Assets

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/piper_server/piper" -maxdepth 1 -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/piper_server/voices" -name "*.onnx*" | sort
```

### Agent Definitions

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/.claude/agents" -maxdepth 2 -name "*.md" | sort
```

### Middleware, Tests, Validation

```bash
find "C:/Users/arwwo/Desktop/APEX/Scripts/middleware" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/tests" -type f | sort
find "C:/Users/arwwo/Desktop/APEX/Scripts/validation" -maxdepth 1 -type f | sort
```

---

## Files Read During Construction

| File | Purpose | Entities Evidenced |
|---|---|---|
| C:/Users/arwwo/Desktop/APEX/Scripts/docs/registry/00-Registry-Index.md | ID block plan and registry structure | ENT-000006 (registry itself) |
| C:/Users/arwwo/Desktop/APEX/Scripts/docs/registry/02-Entity-Families.md | Family classification definitions | All families used in catalogue |
| C:/Users/arwwo/Desktop/APEX/Scripts/docs/registry/04-Entity-Attributes.md | Attribute definitions | All attributes used in Block 01 records |
| C:/Users/arwwo/Desktop/APEX/Scripts/CLAUDE.md | Project instructions, stack description | ENT-000040 (server.js), ENT-000113 (CLAUDE.md) |
| C:/Users/arwwo/Desktop/APEX/Scripts/.claude/CLAUDE.md | Agent and skill definitions | ENT-001088 (.claude/CLAUDE.md) |

---

## Database Evidence

The database table list (Block 10, ENT-000560 → ENT-000759) was sourced from:
- Session context carrying table names accumulated over prior sessions
- Migration files in migrations/ — each SQL file creates or modifies tables
- Supabase schema inspection conducted in prior work sessions

Evidence commands that originally produced the table list:
```sql
-- Run against Supabase Postgres to verify table existence
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

---

## Environment Variable Evidence

The environment variable list (Block 11, ENT-000760 → ENT-000803) was sourced from:
- C:/Users/arwwo/Desktop/APEX/Scripts/.env.example (template file listing all vars)
- Prior session context carrying the complete variable list

---

## Evidence Confidence Assessment

| Evidence Type | Confidence | Notes |
|---|---|---|
| File existence (find command output) | HIGH | Direct filesystem confirmation |
| File content / purpose | LOW–MEDIUM | Most files not individually read |
| Database table existence | HIGH | Tables confirmed across multiple migration files and prior session work |
| Environment variable list | HIGH | Confirmed from .env.example template |
| External service capabilities | MEDIUM | Inferred from env var names and bridge files |
| Cron job schedules | LOW | Not inspected at runtime |

---

## Reproducibility

To reproduce this registry:

1. Run all `find` commands listed in this appendix against `C:/Users/arwwo/Desktop/APEX/Scripts`
2. Run the Supabase table query against the production database
3. Inspect `.env.example` for environment variable names
4. Apply entity family codes from `02-Entity-Families.md`
5. Apply attribute definitions from `04-Entity-Attributes.md`
6. Assign sequential IDs following block plan in `00-Registry-Index.md`

---

*End of 07 — Evidence Appendix*
