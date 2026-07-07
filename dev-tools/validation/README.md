# validation/

Phase validation and verification scripts.
These are standalone Node.js scripts — they do not affect the running server.

Run any script directly:
  node validation/validate-phase10.js

---

## Naming convention

- `validate-phase{N}.js` — validates a specific build phase (10–41)
- `verify-c06.js`, `verify-memory-integrity.js` — targeted verification checks
- `phase-a-verify.js`, `phase-c-run.js` — phase A/C validation runners

## What these do

Each script tests a specific aspect of the system at a point in time —
governance rules, memory integrity, cognitive layer, certification gates, etc.
They are safe to run at any time and make no writes to the production system.
