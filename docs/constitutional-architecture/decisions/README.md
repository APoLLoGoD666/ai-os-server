# Implementation Decision Records — APEX Constitutional Architecture

---

## Purpose

This directory is the authoritative location for Implementation Decision Records (IDRs) produced during the transition of the APEX repository into the APEX-CONSTITUTION-v1.0 certified architecture.

An IDR documents why a specific implementation choice was made. IDRs are not constitutional amendments. They record how implementation authority is exercised within the space the frozen constitution defines. No IDR may override, reinterpret, or bypass a constitutional requirement.

**Authority source:** I2-IMPLEMENTATION-GOVERNANCE-MODEL.md Part 5

---

## Authority Model

| Role | Scope | IDR Authority |
|------|-------|--------------|
| Constitutional Authority | The constitutional corpus (D-series, A-series, R-series) | Cannot be altered by IDR |
| Implementation Owner | How the system realizes constitutional requirements | Signs all Class B, C, E decisions |
| Implementation Author | Which code realizes the decision | Produces IDR draft; executes after approval |

**Rule:** An IDR may not be written that contradicts a constitutional authority source. If a constitutional source is ambiguous, the ambiguity must be resolved through RT-16 (Class A change), not through an IDR.

---

## Decision Lifecycle

```
DRAFT → REVIEW → APPROVED → ACTIVE → SUPERSEDED (if replaced)
```

| State | Description |
|-------|-------------|
| DRAFT | Author has written the IDR; not yet reviewed |
| REVIEW | Implementation Owner is reviewing the IDR |
| APPROVED | Implementation Owner has approved; implementation may proceed |
| ACTIVE | The decision is in effect; corresponding code is live |
| SUPERSEDED | A later IDR has replaced this decision; see the superseding IDR |

**No implementation task may begin until its required IDR is in APPROVED state.**

---

## Relationship to Constitutional Governance

IDRs operate entirely within the implementation layer. They cannot:
- Modify a constitutional corpus document
- Reassign runtime ownership of an object type
- Alter a constitutional invariant
- Bypass the RT-16 amendment pipeline

IDRs can:
- Choose between two valid implementation paths
- Resolve contradictions between two I-series planning documents
- Establish canonical file paths, module structures, and naming conventions
- Record the rationale for implementation choices that future engineers will need to understand

When an IDR touches a constitutionally-preserved artifact (per I1-IMPLEMENTATION-ARCHITECTURE.md Part 18), it must explicitly cite the preservation constraint and confirm the decision does not alter the artifact's constitutional function.

---

## File Naming

All IDR files follow the naming convention:

```
IDR-NNN.md
```

Where NNN is a zero-padded three-digit sequence number. The first IDR is IDR-001.md.

---

## IDR Schema Reference

Each IDR file must contain the following fields (per I2-IMPLEMENTATION-GOVERNANCE-MODEL.md §5.2):

```
IDR-NNN
Date: YYYY-MM-DD
Author: [name]
Approved by: [Implementation Owner]
Change Class: [B / C / E]
Status: [DRAFT / REVIEW / APPROVED / ACTIVE / SUPERSEDED]

Decision:
[One sentence stating what was decided]

Constitutional Basis:
[Citation to the constitutional requirement this decision realizes]

Options Considered:
1. [Option A] — [why not chosen]
2. [Option B] — [why not chosen]
3. [Chosen option] — [why chosen]

Constitutional Compliance Confirmation:
[Explicit statement that this decision does not alter observable constitutional behavior]

Affected Artifacts:
[File paths affected by this decision]

Supersedes:
[IDR number superseded, if any]
```

---

## Index

| IDR | Status | Subject | Required Before |
|-----|--------|---------|----------------|
| [IDR-001](IDR-001.md) | APPROVED | Canonical constitutional object type location (`lib/constitutional-types/`) | Gate 0 |
| [IDR-002](IDR-002.md) | APPROVED | Authority module structure (`lib/authority/`) | Wave 2 / W2-03 |

---

*Authority: I2-IMPLEMENTATION-GOVERNANCE-MODEL.md Part 5*
*Baseline: APEX-CONSTITUTION-v1.0*
*Created: 2026-07-25*
