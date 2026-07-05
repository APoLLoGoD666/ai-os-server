# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 09 · Part 3 Index — Relationships, Routes & Remediation

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 3 — Final

---

## What Part 3 Delivers

1. **Dependency graph** — Navigable relationship map across all 51 fully attributed entities
2. **Route file expansion** — Full 29-attribute records for all 42 HTTP route files
3. **Critical finding remediation** — Two code fixes applied directly during registry construction
4. **Registry closure** — Final statistics, complete file index, registry declared v1.0.0 stable

---

## Part 3 Files

| File | Content | Status |
|---|---|---|
| `09a-Expanded-Routes.md` | Full attribute records for all 42 route files (ENT-000450 → ENT-000491) | Complete |
| `09b-Dependency-Graph.md` | Entity relationship map — consumer/dependency edges, critical path, pipeline chains | Complete |
| `09-Part3-Index.md` | This file — Part 3 index and remediation log | Complete |

---

## Remediation Log

### FINDING-001 — Constitutional Gate — RESOLVED

- **File:** `lib/runtime/constitutional-gate.js`
- **Change:** `_failOpen()` → `_failClosed()`. `VERDICT.RESTRICT` → `VERDICT.DENY` on timeout.
- **Comment updated:** `Fail-CLOSED: timeout → DENY (ARCH-14 INV-RT1 compliance)`
- **Verified:** `node --check` passed.
- **Date:** 2026-07-05

### FINDING-005 — Embed Fallback Provenance — PARTIALLY RESOLVED

- **File:** `lib/embed.js`
- **Change:** Added `console.warn('[embed] provider=gemini')` at Gemini entry and `[embed] Voyage 429 — backoff 60s` on rate limit. Fallback is now observable in server logs.
- **Verified:** `node --check` passed.
- **Remaining:** `vault_embeddings` table lacks a `provider` column. Full audit provenance requires a DB migration.
- **Date:** 2026-07-05

---

## Registry v1.0.0 — Complete File Manifest

| # | File | Purpose | Entities |
|---|---|---|---|
| 00 | `00-Registry-Index.md` | Navigation, ID blocks, file index | — |
| 01a | `01-Entity-Catalogue-Part1.md` | Blocks 01–05 (9 full + 80 compact) | ENT-000001 → ENT-000124 |
| 01b | `01-Entity-Catalogue-Part2a.md` | Blocks 06–12 (compact) | ENT-000150 → ENT-000903 |
| 01c | `01-Entity-Catalogue-Part2b.md` | Blocks 13–23 (compact + overflow) | ENT-000920 → ENT-001199 |
| 02 | `02-Entity-Families.md` | 34 family classifications | — |
| 03 | `03-Canonical-Identifiers.md` | 1,019-entry quick-lookup index | All |
| 04 | `04-Entity-Attributes.md` | 29-attribute definitions | — |
| 05 | `05-Registry-Statistics.md` | Counts, coverage, quality | — |
| 06 | `06-Unknown-Entities.md` | Unknown attribute catalogue | — |
| 07 | `07-Evidence-Appendix.md` | Shell commands and evidence files | — |
| 08 | `08-Expanded-Records-Index.md` | Part 2 index + 5 findings | — |
| 08a | `08a-Expanded-External-Services.md` | Full records: Block 02 | ENT-000010 → ENT-000028 |
| 08b | `08b-Expanded-Infrastructure.md` | Full records: Block 03 + 22 | ENT-000040–055, 001130–001131 |
| 08c | `08c-Expanded-Core-Lib.md` | Full records: Core lib files | ENT-000248 → ENT-000257 |
| 08d | `08d-Expanded-Agent-System.md` | Full records: Block 06 core | ENT-000258 → ENT-000263 |
| 09 | `09-Part3-Index.md` | Part 3 index + remediation log | — |
| 09a | `09a-Expanded-Routes.md` | Full records: All 42 routes | ENT-000450 → ENT-000491 |
| 09b | `09b-Dependency-Graph.md` | Dependency and consumer graph | All 51 attributed |

---

## Final Coverage Statistics

| Category | Total | Full 29-attr | Compact 7-attr |
|---|---|---|---|
| Civilisation (Block 01) | 9 | 9 | 0 |
| External Services (Block 02) | 19 | 19 | 0 |
| Infrastructure (Block 03) | 16 | 5 | 11 |
| Folders (Block 04) | 20 | 0 | 20 |
| Root Files (Block 05) | 25 | 0 | 25 |
| Agent-System (Block 06) | 46 | 6 | 40 |
| Library Files (Block 07) | 230 | 10 | 220 |
| Route Files (Block 08) | 42 | 42 | 0 |
| Migration Files (Block 09) | 55 | 0 | 55 |
| Database Tables (Block 10) | 200 | 0 | 200 |
| Environment Variables (Block 11) | 44 | 0 | 44 |
| Documentation (Block 12) | 94 | 0 | 94 |
| Scripts (Block 13) | 41 | 0 | 41 |
| Other Blocks (14–23) | ~178 | 2 | ~176 |
| **TOTAL** | **~1,019** | **93** | **~926** |

---

## Registry Invariants (Permanent)

1. IDs are permanent. ENT-NNNNNN never changes. Never reused.
2. Evidence precedes every entry. No invention.
3. UNKNOWN is recorded where evidence is absent.
4. The catalogue is the source of truth. The identifier index (03) is derived.
5. Findings discovered during registry construction are recorded in 08-Expanded-Records-Index.md.
6. Remediations applied during registry construction are logged in 09-Part3-Index.md.

---

*End of 09 — Part 3 Index*
*Registry v1.0.0 declared stable: 2026-07-05*
