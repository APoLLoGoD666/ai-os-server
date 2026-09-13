# Constitutional Changelog

## v1.0.0 — 2026-07-07

**Initial constitution ratified.**

Laws enacted:
- LAW-001: Impact Before Deletion (blocking, blast_radius >= 10)
- LAW-002: Agent Code Boundary (blocking, forbidden: code.edit/env.write/secret.write/github.push)
- LAW-003: Constitutional Gate Integrity (blocking, CONSTITUTIONAL_GATE_HEALTHY must PASS)
- LAW-004: Entity Ownership Required (advisory, 24h grace period)
- LAW-005: Domain Boundary Sovereignty (advisory, cross-domain imports forbidden)

Constitutional hash: a05315a123374671

Amendment procedure:
1. Propose changes to laws/ in a separate commit
2. Hash changes and update HASH file
3. 48-hour review period (laws apply in ADVISORY mode only)
4. Ratification: laws become BLOCKING
5. Record amendment here with date, rationale, and new hash
