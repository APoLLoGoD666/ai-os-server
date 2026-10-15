# W2-12 ActorProfile Baseline

**Task:** W2-12 RT-01 ActorProfile — `lib/founder/profile.js`  
**Date:** 2026-07-28  
**Phase:** 0 — Pre-implementation state capture  
**Baseline:** APEX-CONSTITUTION-v1.0

---

## 1. PURPOSE

This document captures the pre-W2-12 state of `lib/founder/profile.js` and
establishes the field honesty basis for wiring `ActorProfile` (RT-01).

---

## 2. FILE PROFILE

| Attribute | Value |
|-----------|-------|
| File | `lib/founder/profile.js` |
| Lines | 99 |
| Exports | `{ load, invalidate, getSection, getCoreValueKeywords, getAntiGoals, getProtectedPeople }` |
| Constitutional imports (pre-W2-12) | None |
| Role | Reads and assembles the Founder Profile from `founder_memory` (Layer 0). Cached 24h. |

---

## 3. ARCHITECTURE

### 3.1 Execution Flow

```
load(force=false)
  ├── cache hit?           → return cached profile (no DB call)
  ├── DB query             → founder_memory SELECT section, key, value, importance
  │   ├── DB error/empty   → return { _fallback: true, ...FALLBACK_CONTEXT }
  │   └── DB success       → _assemble(data) → cache.set() → return profile
  │
invalidate()    → cache.invalidatePattern('founder:profile')
getSection(s)   → load() → profile._raw[s] || profile[s]
getCoreValueKeywords() → load() → profile.core_values
getAntiGoals()         → load() → profile.anti_goals
getProtectedPeople()   → load() → profile.protected_people
```

### 3.2 Assembled Profile Structure (DB-loaded path)

```javascript
{
    identity:         raw['identity']          || {},   // Contains: name, email, etc.
    core_values:      raw['values.core']       || {},
    strategic_values: raw['values.strategic']  || {},
    principles:       _values(raw['principles']),
    protected_people: _values(raw['protected_people']),
    trusted_traits:   raw['traits.trusted']?.list?.traits || [],
    distrusted_traits: raw['traits.distrusted']?.list?.traits || [],
    anti_goals:       _values(raw['anti_goals']),
    failure_pattern:  raw['patterns.failure']?.cascade || {},
    peak_state:       raw['peak_state']?.characteristics || {},
    ideal_future:     raw['ideal_future']?.vision || {},
    wealth_philosophy: raw['wealth']?.philosophy || {},
    legacy:           { goal: raw['legacy']?.goal?.text || '' },
    health_goals:     raw['goals.health'] || {},
    _raw: raw,
}
```

### 3.3 Fallback Context Structure (non-authoritative)

`FALLBACK_CONTEXT` from `lib/memory/founder-memory.js` has a different flat structure:

```javascript
{
    identity_summary, communication_style, active_goals, working_style,
    constraints, relevant_preferences, technical_environment
}
```

**Key observation:** The fallback does NOT have an `identity.name` field — the key is
`identity_summary` (string) rather than a structured identity object. The assembled
profile from DB has `profile.identity.name`.

### 3.4 Identity Data Available

| Source | Field path | Value |
|--------|-----------|-------|
| DB-loaded profile | `profile.identity.name` | Founder name from `founder_memory` DB (section='identity', key='name') |
| DB-loaded profile | `profile.identity` | All identity fields |
| Fallback | none | No `identity.name` equivalent in flat fallback structure |

---

## 4. CONSTITUTIONAL TYPE — ActorProfile (RT-01)

**Source file:** `lib/constitutional-types/identity-record.js`  
**Runtime:** RT-01 (Identity and Actor Registration Runtime)  
**Authority:** R1-v1.1 RS-07 RT01-OWN-01; D8 §4.1 Canonical Object Type 1; D0 §Domain II; A0-v1.1.1 §3.1  
**deletion_policy:** PROHIBITED  
**structural_immutable:** false  
**d8_canonical_type:** 1 (first canonical object in D8)

### Required Fields (5)

| Field | Type | Enum | Description |
|-------|------|------|-------------|
| `actor_id` | string | — | Unique constitutional identifier |
| `actor_type` | string | HUMAN \| AGENT | D0 §Domain II actor category |
| `display_name` | string | — | Human-readable constitutional designation |
| `registered_at` | string | — | ISO 8601 registration timestamp |
| `status` | string | CANDIDATE \| ACTIVE \| SUSPENDED \| TERMINATED | Constitutional identity state |

### Optional Fields

| Field | Note |
|-------|------|
| `structural_identity_ref` | Wave 2 required but schema optional |
| `provenance_chain_ref` | Wave 2 required but schema optional |
| `constitutional_era` | Wave 2 required but schema optional |

---

## 5. FIELD HONESTY ASSESSMENT

### 5.1 Required Field Mapping

| Field | Source | Available? | Honesty |
|-------|--------|-----------|---------|
| `actor_id` | `'FOUNDER-APEX'` | YES (synthetic) | No persistent actor_id in founder_memory; constitutional system identifier (L-02) |
| `actor_type` | `'HUMAN'` | YES | Founder is a human actor per D0 §Domain II Actor category; enum value `HUMAN` is correct |
| `display_name` | `profile.identity?.name \|\| 'APEX Founder'` | YES | Direct from DB-loaded identity section; defensive fallback to constitutional designation |
| `registered_at` | `new Date().toISOString()` | YES (L-03) | No persistent registration timestamp in profile.js; point-in-time emission timestamp |
| `status` | `'ACTIVE'` | YES | Founder is constitutionally active — directly observable from system operation |

**Honest field satisfaction: 5/5 required fields (100%). W2-12 is FULLY IMPLEMENTABLE.**

### 5.2 actor_type Correction

The recomputed roadmap (§2.3) listed `actor_type: 'FOUNDER'` — this value is NOT in the
ActorProfile schema enum (`['HUMAN', 'AGENT']`). `'FOUNDER'` would cause `create()` to throw.
**Corrected value: `'HUMAN'`** — the founder is a human actor (D0 §Domain II establishes
HUMAN and AGENT as the two constitutional actor categories).

### 5.3 Optional Fields Assessment

| Field | Wave 2 Status |
|-------|--------------|
| `structural_identity_ref` | Not emitted — no StructuralIdentityRecord wired in Wave 2 (L-04) |
| `provenance_chain_ref` | Not emitted — no D2 Layer 3 provenance chain at this wiring point (L-05) |
| `constitutional_era` | Not emitted — civilizational era system not implemented in Wave 2 (L-06) |

---

## 6. WIRING SITE SELECTION

### 6.1 Candidate Paths in load()

| Path | Emit ActorProfile? | Rationale |
|------|--------------------|-----------|
| Cache hit (`return hit`) | NO | Profile already recorded; repeated emission avoided |
| Fallback path (`_fallback: true`) | NO | Non-authoritative data; no `identity.name` available |
| DB-loaded path (`return profile`) | YES | Authoritative data; `profile.identity?.name` available |

### 6.2 Wiring Location

**File:** `lib/founder/profile.js`  
**Function:** `load()`  
**Location:** After `cache.set(CACHE_KEY, profile, CACHE_TTL)`, before `return profile`  
**Pattern:** Fire-and-forget V1.0 (CONSTITUTIONAL WIRING PATTERN V1.0)

This location is inside the DB-loaded path only, ensuring:
1. Only authoritative data is used for `display_name`
2. Emission happens at most once per cache miss (24h TTL means at most once per day in production)
3. Production path is unblocked (setImmediate fires after `return profile` executes)

---

## 7. KNOWN LIMITATIONS (PRE-WIRING)

| ID | Description | Severity | Resolution Path |
|----|-------------|----------|----------------|
| L-01 | ActorProfile emitted only from DB-loaded path; fallback path omitted. Fallback lacks `identity.name` (different structure: `identity_summary` vs `identity.name`) | LOW | Acceptable for Wave 2; fallback is non-authoritative |
| L-02 | No persistent `actor_id` in founder_memory. Constitutional system identifier `'FOUNDER-APEX'` is synthetic | LOW | Wave 3: establish permanent actor_id in founder_memory schema |
| L-03 | `registered_at` set to emission timestamp (`new Date().toISOString()`). Actual constitutional registration predates APEX-CONSTITUTION-v1.0 | LOW | Wave 3: establish permanent registered_at in founder_memory; use stored value |
| L-04 | `structural_identity_ref` omitted — no StructuralIdentityRecord wired in Wave 2 | LOW | Wave 3: wire StructuralIdentityRecord; use `record.record_id` here |
| L-05 | `provenance_chain_ref` omitted — `load()` runs outside PETL transaction context | LOW | Wave 3: PETL-aware invocation path if required |
| L-06 | `constitutional_era` omitted — civilizational era system not implemented | LOW | Wave 3: implement era designation; set once at Wave 2 → Wave 3 transition |

---

## 8. PRE-WIRING GAPS

| Gap | Impact |
|-----|--------|
| No `ActorProfile` import | Cannot emit RT-01 type |
| No `constitutionalStore` import | Cannot write constitutional records |
| No fire-and-forget emission in `load()` | Founder constitutional identity never recorded |

---

*W2-12 Baseline created: 2026-07-28. Constitutional authority: R1-v1.1 RS-07 RT01-OWN-01; APEX-CONSTITUTION-v1.0.*
