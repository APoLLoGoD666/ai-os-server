# Phase 5 — Deployment Configuration Audit

Generated: 2026-06-06

## render.yaml (in repo)

Source: `render.yaml` at repo root

```yaml
services:
  - type: web
    name: ai-os-server
    env: node
    buildCommand: npm install --legacy-peer-deps
    startCommand: node --max-old-space-size=220 server.js
    healthCheckPath: /health
    zeroDowntimeDeploys: false
  - type: web
    name: apex-ai-sidecar
    ...
```

## Render dashboard configuration (ACTUAL)

Source: `GET /v1/services/srv-d7idj1gsfn5c738hpsc0` → `serviceDetails`

| Field | Dashboard value | render.yaml value | Match? |
|---|---|---|---|
| buildCommand | `npm install` | `npm install --legacy-peer-deps` | NO |
| startCommand | `node server.js` | `node --max-old-space-size=220 server.js` | NO |
| healthCheckPath | `""` (empty) | `/health` | NO |
| plan | `starter` | (not specified) | N/A |
| region | `oregon` | (not specified) | N/A |

**Conclusion: render.yaml is not being applied to this service.**

The service was created manually via the Render dashboard. For render.yaml to take effect,
the service must be created or re-synced via `render deploy` CLI or via "New from Blueprint"
in the dashboard. Dashboard settings always override render.yaml for manually-created services.

All changes made to render.yaml (zeroDowntimeDeploys, startCommand, buildCommand, healthCheckPath)
have had zero effect on actual deployments.

## Is Render deploying the correct branch?

YES. Source: Render API `branch: "main"`, `autoDeployTrigger: "commit"`.
Every push to `main` triggers a deploy. The correct commits are being deployed.

## Is Render deploying the correct commit?

YES. Deploy list shows `commit.id` matching `git log` hashes exactly.

## Are zero-downtime deploys active?

UNKNOWN from API. Dashboard value not exposed via API. render.yaml `zeroDowntimeDeploys: false`
is NOT applied. Render defaults to zero-downtime deploys for web services.

**However, this is irrelevant.** The crash happens at module load time (exit code 1),
before the process ever binds a port. Zero-downtime configuration does not affect
a process that crashes immediately on startup.

## Can deployment overlap exceed memory limits?

Irrelevant to current failure. Memory is not the cause (see reports/memory-analysis.md).

## Environment variables

Source: Render API `envSpecificDetails`, `.env` file

The `NODE_OPTIONS` environment variable was previously set (`--max-old-space-size=300`)
per commit `ca1677f` commit message. Current status unknown — API does not expose env var values.

## Service metadata

| Field | Value |
|---|---|
| Service ID | srv-d7idj1gsfn5c738hpsc0 |
| Name | ai-os-server |
| URL | https://ai-os-server-jx20.onrender.com |
| Plan | starter (512 MB RAM) |
| Region | oregon |
| Auto deploy | yes (on push to main) |
| Disk | 1 GB at /data/vault |
| Cache | no-cache |
