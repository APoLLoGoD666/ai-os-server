# Phase 3 — Memory Analysis

Generated: 2026-06-06

## Note

Memory is NOT the root cause of deploy failures. All failures show `nonZeroExit: 1` (application crash),
not exit code 137 (OOM/SIGKILL). This analysis is included for completeness and future reference.

## Live server memory (current, running 8f94b22)

Source: `GET /health` → `memory` field

| Metric | Value |
|---|---|
| Heap used | 162 MB |
| RSS | 250 MB |
| Warning threshold | >400 MB heap (not triggered) |

## Render instance limits

Source: Render API `serviceDetails.plan: "starter"`

| Limit | Value |
|---|---|
| RAM | 512 MB |
| CPU | 0.5 vCPU |
| Disk | 1 GB (mounted at `/data/vault`) |

## Dashboard start command

Source: Render API `serviceDetails.envSpecificDetails.startCommand: "node server.js"`

No `--max-old-space-size` flag. Node.js default V8 heap limit applies (~1.4 GB on Linux, but
capped by available system memory at ~512 MB on the Starter plan).

Note: render.yaml specifies `node --max-old-space-size=220 server.js` but this is overridden
by the dashboard configuration and NOT applied.

## OOM hypothesis — REJECTED

Evidence: `reason: {failure: {evicted: false, nonZeroExit: 1}}` across all 16 failures.
- `evicted: false` confirms no OOM eviction
- Exit code 1 is a Node.js uncaught exception, not a kernel OOM kill (137)

## Subsystem memory impact (estimated, not measured)

These estimates are based on module inspection, not profiling:

| Subsystem | Load type | Estimated impact |
|---|---|---|
| Express + middleware | Eager (startup) | ~20–30 MB heap |
| Supabase client | Eager (startup) | ~5–10 MB heap |
| orchestrator.js | Eager (startup) | ~2–5 MB heap |
| langchain-rag.js | Lazy (first RAG call) | ~50–80 MB heap |
| Mastra | Lazy (conditional load) | ~50–100 MB heap |
| Obsidian client | Eager (startup) | ~2–5 MB heap |

Note: langchain-rag.js is lazy-loaded (per previous fixes). Mastra is conditionally loaded.

## Conclusion

Memory is within safe bounds on the live server (250 MB RSS, 512 MB limit).
Deploy failures are caused by application crash, not memory pressure.
