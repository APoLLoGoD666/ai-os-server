# Phase 2 — Render Deploy Forensics

Generated: 2026-06-06

## Summary

Every deploy since commit `95aa3b8` (2026-06-05T02:05Z) has failed with `nonZeroExit: 1`.
Build succeeds in all cases. Failure occurs during server startup, not during build.

## Pattern: Build succeeds, deploy fails

Every failed deploy shows:
- `build_ended` event with `buildStatus: "succeeded"`
- `deploy_ended` event with `reason: {failure: {nonZeroExit: 1}}`

Build duration: ~1.5–2 minutes. Deploy (startup) duration: ~0.5–1 minutes.
Total deploy attempt duration: consistently ~2.5 minutes.

## Deploy log (all 16 failures)

| Deploy ID | Commit | Started | Status | Failure reason |
|---|---|---|---|---|
| dep-d8hl259oagis73cvo1rg | fe89f88 | 2026-06-05T22:43:33Z | update_failed | nonZeroExit: 1 |
| dep-d8hd38e47okc73evpmmg | f3e62fd | 2026-06-05T13:39:46Z | update_failed | nonZeroExit: 1 |
| dep-d8hckv6rnols73e899e0 | 383cc62 | 2026-06-05T13:09:17Z | update_failed | nonZeroExit: 1 |
| dep-d8hccigjo6nc73cnodvg | af8de5e | 2026-06-05T12:51:22Z | update_failed | nonZeroExit: 1 |
| dep-d8hbqotckfvc73avqqgg | 8a352e0 | 2026-06-05T12:13:23Z | update_failed | nonZeroExit: 1 |
| dep-d8hbise7r5hc73d6rrh0 | 99bee3e | 2026-06-05T11:56:33Z | update_failed | nonZeroExit: 1 |
| dep-d8hb34brjlhs7381s5u0 | c5beb37 | 2026-06-05T11:22:57Z | update_failed | nonZeroExit: 1 |
| dep-d8han2u47okc73eu3ai0 | ca1677f | 2026-06-05T10:57:16Z | update_failed | nonZeroExit: 1 |
| dep-d8hai327am4s738p28e0 | 5b6c4de | 2026-06-05T10:46:36Z | update_failed | nonZeroExit: 1 |
| dep-d8hai2uk1jcs739oabrg | 5b6c4de | 2026-06-05T10:46:35Z | update_failed | nonZeroExit: 1 |
| dep-d8haf928pkls73c7indg | 5b6c4de | 2026-06-05T10:40:36Z | update_failed | nonZeroExit: 1 |
| dep-d8h4fgojo6nc73cj6p70 | 5b6c4de | 2026-06-05T03:51:31Z | update_failed | nonZeroExit: 1 |
| dep-d8h43ah9rddc73esuqd0 | 453d915 | 2026-06-05T03:25:30Z | update_failed | nonZeroExit: 1 |
| dep-d8h3v8ek1jcs739fth50 | b4525a8 | 2026-06-05T03:16:49Z | update_failed | nonZeroExit: 1 |
| dep-d8h3h3l624lc73eep5f0 | b4525a8 | 2026-06-05T02:46:38Z | update_failed | nonZeroExit: 1 |
| dep-d8h2tq19rddc73eseg3g | 95aa3b8 | 2026-06-05T02:05:29Z | update_failed | nonZeroExit: 1 |

## Last successful deploy

| Deploy ID | Commit | Finished | Status |
|---|---|---|---|
| dep-d8h2p3q8pkls73bsiv0g | 8f94b22 | 2026-06-05T01:58:07Z | live |

## Symptoms searched for — findings

| Symptom | Found | Evidence |
|---|---|---|
| OOM / Exit 137 | NO | All failures show `nonZeroExit: 1`, not 137 |
| SIGKILL | NO | `evicted: false` in all failure reasons |
| Memory Limit | NO | Exit code 1 is application error, not OOM |
| Health Check Failure | INDIRECT | Server crashes before health check can run |
| Non-zero exit | YES | `nonZeroExit: 1` in every failure |
| Missing Module | YES | `Cannot find module './agent-pipeline-hooks'` (local test) |
| Build failure | NO | `buildStatus: "succeeded"` in every case |

## First failing commit analysis

The first failure is commit `95aa3b8` (2026-06-05T02:05Z), immediately after last successful `8f94b22`.

Files changed in `95aa3b8` vs `8f94b22`:
- `agent-system/orchestrator.js` — added `require('./agent-pipeline-hooks')` at line 9
- `lib/logger.js` — new file
- `lib/cron-logger.js` — updated
- `agent-system/obsidian-client.js` — updated
- `agent-system/supabase-setup.js` — updated
- 25 report files (no code)

Root cause: `require('./agent-pipeline-hooks')` in orchestrator.js references a file that was never created.

## Render API source

- Service endpoint: `GET /v1/services/srv-d7idj1gsfn5c738hpsc0`
- Deploys endpoint: `GET /v1/services/srv-d7idj1gsfn5c738hpsc0/deploys?limit=20`
- Events endpoint: `GET /v1/services/srv-d7idj1gsfn5c738hpsc0/events?limit=20`
- API key: from `.env` (RENDER_API_KEY)
