# Phase 1 — Deployment Reality Check

Generated: 2026-06-06

## What commit is live?

**`8f94b22f7bd3c84135757a098c5662addb95bda7`**
"feat: vault knowledge graph reconstruction scripts" — 2026-06-04T23:09:23+01:00

Evidence: Render API deploy list, last entry with `status: "live"`, deploy `dep-d8h2p3q8pkls73bsiv0g`, finishedAt `2026-06-05T01:58:07Z`.

Note: This is NOT `5cb8485`. The live commit is two commits ahead of `5cb8485`.

## What commit should be live?

**`fe89f8857293b65974457801b830e54045cc19d8`**
"fix: disable zero-downtime deploys to fix OOM deploy failures" — 2026-06-05T22:41:16+01:00

Evidence: Current git HEAD on `main`, pushed to `origin/main`.

## What commit failed most recently?

**`fe89f8857293b65974457801b830e54045cc19d8`** (same as HEAD)
Deploy `dep-d8hl259oagis73cvo1rg`, status `update_failed`, finishedAt `2026-06-05T22:46:26Z`.

## What commit succeeded most recently?

**`8f94b22f7bd3c84135757a098c5662addb95bda7`**
Deploy `dep-d8h2p3q8pkls73bsiv0g`, status `live`, finishedAt `2026-06-05T01:58:07Z`.

## Current GitHub commit

`fe89f8857293b65974457801b830e54045cc19d8` on branch `main`.

Source: `git log origin/main --oneline -1`

## Current Render commit (dashboard config)

Render dashboard shows `buildCommand: "npm install"` and `startCommand: "node server.js"`.

Source: `GET /v1/services/srv-d7idj1gsfn5c738hpsc0` → `serviceDetails.envSpecificDetails`

Note: render.yaml fields (`npm install --legacy-peer-deps`, `--max-old-space-size=220`, `healthCheckPath: /health`, `zeroDowntimeDeploys: false`) are NOT applied. The Render dashboard configuration overrides render.yaml for this service.

## Current live commit

`8f94b22f7bd3c84135757a098c5662addb95bda7` — confirmed by:
- Health endpoint returns `{"status":"ok","uptime":664...}` with NO `version` field
- Version marker `383cc62` was added in commit `383cc62` (well after `8f94b22`), so absence confirms `8f94b22`
- Deploy API confirms `8f94b22` is the only deploy with `status: "live"`

## Current branch

`main` — confirmed by `git log origin/main`

## Current deployment status

BLOCKED. 16 consecutive deploys have failed since 2026-06-05T02:05Z. All have `reason: {failure: {nonZeroExit: 1}}` — server crashes on startup.

## Delta: live vs HEAD

| | Live (`8f94b22`) | HEAD (`fe89f88`) |
|---|---|---|
| Commits behind HEAD | 16 | 0 |
| server.js version marker | absent | `383cc62` |
| deploy-probe route | absent | present |
| self-check route | absent | present |
| agent-pipeline-hooks.js | absent | absent (BUG) |
