# VISUAL ARCHITECTURE ATLAS
## Document 15 of 17 — All 20 Mermaid Diagrams
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## DIAGRAM 1: HIGH-LEVEL SYSTEM ARCHITECTURE

**Description:** Top-level view of APEX AI OS components and their relationships.

```mermaid
flowchart TB
    subgraph CLIENT["External Clients"]
        BROWSER["Dashboard Browser"]
        API_CLIENT["API Client"]
        CRON_SVC["Render Cron"]
        VOICE_CLIENT["Voice Client"]
    end

    subgraph RENDER["Render Platform"]
        subgraph MAIN["ai-os-server (server.js ~12,300 lines)"]
            AUTH["Auth Layer\n(requireAuth / requireAppAccess / requireCronAccess)"]
            ROUTES["23 Route Files\n(~370+ endpoints)"]
            INLINE["~35 Inline Routes\n(chat, tasks, memory, docs)"]
        end
        SIDECAR["apex-ai-sidecar"]
    end

    subgraph CORE["Core Subsystems"]
        ORCH["Agent Orchestrator\n(6-stage pipeline)"]
        GATEWAY["Memory Gateway\n(12 layers)"]
        GOV["Governance Engine\n(evidence, certs, SLO)"]
        PROBE["Governance Probe\n(10 checks, 100/100)"]
        EVTBUS["Event Bus\n(Postgres outbox)"]
    end

    subgraph DATA["Supabase (External)"]
        PG["Postgres\n(~150 tables)"]
        STORAGE["Supabase Storage"]
    end

    subgraph EXTERNAL["External Services"]
        ANTHROPIC["Anthropic Claude API"]
        GEMINI["Google Gemini API"]
        GITHUB["GitHub"]
        NOTION["Notion"]
        SLACK["Slack"]
        SENTRY["Sentry"]
        OBSIDIAN["Obsidian API"]
    end

    CLIENT --> RENDER
    RENDER --> CORE
    CORE --> DATA
    CORE --> EXTERNAL
    ORCH --> GITHUB
    ORCH --> ANTHROPIC
    ROUTES --> ORCH
    ROUTES --> GATEWAY
    ROUTES --> GOV
    GATEWAY --> PG
    GOV --> PG
    EVTBUS --> PG
    INLINE --> ANTHROPIC
```

---

## DIAGRAM 2: STARTUP SEQUENCE

**Description:** Sequence of operations during server.js initialization.

```mermaid
sequenceDiagram
    participant Render as Render Platform
    participant Server as server.js
    participant Sentry as @sentry/node
    participant DB as Supabase/pg Pool
    participant Routes as Route Files (23)
    participant Mastra as Mastra (deferred)

    Render->>Server: start process (node server.js)
    Server->>Sentry: Sentry.init(SENTRY_DSN)
    Server->>DB: pg Pool connect (DATABASE_URL)
    Server->>DB: Supabase singleton init (lib/clients.js)
    Server->>Server: Register global middleware (cors, body-parse, requestLogger)
    Server->>Server: Register requireAuth globally on /api/*
    Server->>Routes: _loadAgentRoutes() — load all 21 auto-route files
    Server->>Routes: Mount gemini-live + tts-gemini (special)
    Server->>Server: Register ~35 inline routes
    Server->>DB: setImmediate — enable RLS on documents + memory tables
    Server->>Server: Start HTTP listener (port from ENV)
    Note over Server: Server ready to accept requests
    Server->>Mastra: setTimeout(5min) — deferred Mastra init
    Note over Mastra: Init fires 5 minutes after startup
```

---

## DIAGRAM 3: REQUEST LIFECYCLE

**Description:** Full lifecycle of an authenticated API request.

```mermaid
sequenceDiagram
    participant Client
    participant Server as server.js middleware
    participant Auth as requireAuth
    participant Route as Route Handler
    participant Gateway as Memory Gateway
    participant Sanitizer as Sanitizer
    participant Supabase as Supabase Postgres
    participant Anthropic as Anthropic API

    Client->>Server: HTTP Request
    Server->>Server: requestLogger (write request_logs)
    Server->>Auth: requireAuth check
    Auth->>Auth: JWT cookie OR x-api-key validation
    alt Auth Failed
        Auth-->>Client: 401 Unauthorized
    else Auth Passed
        Auth->>Route: next()
        Route->>Gateway: storeMemory(layer, content)
        Gateway->>Sanitizer: scrub(content) — 10 patterns
        Sanitizer-->>Gateway: sanitized content
        Gateway->>Supabase: INSERT to layer table
        Route->>Anthropic: generateText(system_prompt + memory)
        Anthropic-->>Route: AI response
        Route-->>Client: JSON response
    end
```

---

## DIAGRAM 4: AGENT EXECUTION LIFECYCLE

**Description:** 6-stage pipeline with 5 pre-execution gates.

```mermaid
flowchart TD
    START(["Task Submitted"]) --> G1

    subgraph GATES["Pre-Execution Gates"]
        G1{"GATE 1\nConstitutional\nCheck anti-goals"} -->|FAIL| BLOCK1(["BLOCKED\nAnti-goal violation"])
        G1 -->|PASS| G2
        G2{"GATE 2\nAutonomy\nLEVEL_0?"} -->|LEVEL_0| BLOCK2(["BLOCKED\nAutonomy level 0"])
        G2 -->|PASS| G3
        G3{"GATE 3\nTwin Gate\ndo_not_deploy?"} -->|YES| BLOCK3(["BLOCKED\nTwin simulation"])
        G3 -->|PASS| G4
        G4{"GATE 4\nDeploy Gate\npolicy=hold?"} -->|HOLD| BLOCK4(["BLOCKED\nDeploy hold"])
        G4 -->|PASS| G5
        G5{"GATE 5\nBehavior Gate\nblocking constraint?"} -->|YES| BLOCK5(["BLOCKED\nBehavior constraint"])
        G5 -->|PASS| PIPELINE
    end

    subgraph PIPELINE["6-Stage Pipeline"]
        S1["STAGE 1\nRESEARCHER\n(Optional — Firecrawl/Playwright)"]
        S2["STAGE 2\nARCHITECT\n(Zod plan validation)"]
        S3["STAGE 3\nDEVELOPER\n(per-file write, 3-retry, 8096 tokens)"]
        S4A["STAGE 4A\nREVIEWER\n(AI code review)"]
        S4B["STAGE 4B\nVALIDATOR\n(static analysis only)"]
        S5["STAGE 5\nTESTER\n(node --check per file)"]
        S6["STAGE 6\nCOMMITTER\n(git commit + push + deploy)"]

        S1 --> S2 --> S3 --> S4A
        S3 --> S4B
        S4A -->|Both must pass| S5
        S4B -->|Both must pass| S5
        S5 --> S6
    end

    PIPELINE --> S1
    S6 --> REFLECT["REFLECTOR\n(Haiku lesson extraction\n→ gateway layer 10)"]
    REFLECT --> DONE(["Pipeline Complete"])

    subgraph VALIDATOR_DETAIL["VALIDATOR Detail"]
        V1{"testCases=[] OR\nfilesApplied=[]?"} -->|YES| AUTOPASS["AUTO-PASS\n(FAIL-OPEN)"]
        V1 -->|NO| V2{"Exception/parse\nfailure?"} -->|YES| FAILCLOSED["passed=false\n(fail-closed WS-1B)"]
        V2 -->|NO| V3{"passed=false AND\nfailedCases.length>0?"} -->|YES| RETRY["Trigger retry"]
        V3 -->|passed=false, failedCases=[]| GAP["NO RETRY\n(dispatch gap — residual risk)"]
    end
```

---

## DIAGRAM 5: MEMORY ARCHITECTURE

**Description:** 12-layer memory system with gateway routing.

```mermaid
flowchart LR
    CALLER["Caller\n(orchestrator, routes, obsidian-memory)"]

    subgraph GATEWAY["lib/memory/gateway.js"]
        GW_IN["storeMemory(layer, content, traceId)"]
        SANITIZE["lib/memory/sanitizer.js\n(10 patterns)"]
        DISPATCH["Layer Dispatch"]
    end

    subgraph LAYERS["Memory Layers"]
        L0["Layer 0\nfounder_memory\n(elevated + evidence audit)"]
        L1["Layer 1\nworking_memory\n(TTL 7200s, UNIQUE session+type)"]
        L2["Layer 2\nepisodic_memory\n(VECTOR 768)"]
        L3["Layer 3\nprocedural_memory"]
        LGAP["Layer 4\nGAP — no handler"]
        L5["Layer 5\nstrategic_memory"]
        L6["Layer 6\nskill_memory"]
        L7["Layer 7\ndecision_memory"]
        L8["Layer 8\nknowledge_graph_nodes + edges"]
        L9["Layer 9\nsemantic_memory"]
        L10["Layer 10\napex_lessons\n(task_id + trace_id — BD-01)"]
        L11["Layer 11\nreflexion_records\n(evidence audit)"]
        L12["Layer 12\nimprovement_candidates"]
    end

    subgraph AUDIT["Evidence Audit"]
        EVT["evidence_blocks\n(immutable chain)"]
    end

    CALLER --> GW_IN
    GW_IN --> SANITIZE
    SANITIZE --> DISPATCH
    DISPATCH --> L0 & L1 & L2 & L3 & LGAP & L5 & L6 & L7 & L8 & L9 & L10 & L11 & L12
    L0 --> EVT
    L11 --> EVT
```

---

## DIAGRAM 6: GOVERNANCE ARCHITECTURE

**Description:** Full governance system from evidence chain to probe.

```mermaid
flowchart TD
    subgraph TRIGGERS["Write Triggers"]
        MEM_L0["Memory Layer 0 write"]
        MEM_L11["Memory Layer 11 write"]
        PIPELINE["Agent pipeline stages"]
        PROBERUN["Probe runner"]
    end

    subgraph GOVERNANCE["lib/governance*.js"]
        EV["appendEvidenceBlock()\n(immutable chain, prev_hash)"]
        SNAP["captureSnapshot()"]
        CERT["certify() — score 0-1.0\n0=denied, 1.0=certified"]
        INC["createIncident() / resolveIncident()"]
        SLO_W["recordSLOMeasurement()"]
        COST_W["recordCost()\n(tokens_in, tokens_out, cost_usd)"]
        DASH["captureDashboardSnapshot()"]
    end

    subgraph TABLES["Governance Tables"]
        EB["evidence_blocks\n(chain_id, payload, prev_hash)"]
        ES["execution_snapshots"]
        EA["execution_artifacts"]
        CA["cost_accounting"]
        CERT_T["certifications\nsystem_certifications"]
        INC_T["incidents\nincident_timelines\nincident_evidence\nincident_resolutions"]
        SLO_T["slo_definitions\nslo_measurements\nslo_violations"]
        POL_T["policies\npolicy_decisions\npolicy_violations"]
        ANO["anomalies"]
        DS["dashboard_snapshots"]
        GP["governance_probes"]
    end

    subgraph PROBE["governance-probe.js (10 checks)"]
        P1["1. execution_snapshots"]
        P2["2. cost_accounting_tokens"]
        P3["3. execution_artifacts"]
        P4["4. certification_certified"]
        P5["5. evidence_blocks"]
        P6["6. lesson_sources"]
        P7["7. lesson_traceability_bd01"]
        P8["8. incident_creation"]
        P9["9. certification_denied"]
        P10["10. incident_resolution"]
        SCORE["Score: 100/100\nprobe_passed=true"]
    end

    TRIGGERS --> GOVERNANCE
    MEM_L0 & MEM_L11 --> EV
    PIPELINE --> SNAP & EA & COST_W
    EV --> EB
    SNAP --> ES
    CERT --> CERT_T
    INC --> INC_T
    SLO_W --> SLO_T
    COST_W --> CA
    DASH --> DS
    PROBE --> GP
    P1-..->ES
    P2-..->CA
    P3-..->EA
    P4 & P9-..->CERT_T
    P5-..->EB
    P6-..->POL_T
    P7-..->apex_lessons
    P8 & P10-..->INC_T
    SCORE --> GP
```

---

## DIAGRAM 7: AUTHENTICATION ARCHITECTURE

**Description:** 3-layer auth system with boundaries.

```mermaid
flowchart LR
    REQ["Incoming Request"]

    subgraph L1["Layer 1: requireAuth (ALL /api/*)"]
        JWT["JWT Cookie\napex_token\n(7d, AGENT_SECRET)"]
        APIKEY["x-api-key header\n= AGENT_SECRET\n(NOT timing-safe)"]
        LOGIN["POST /api/login\npassword !== DASHBOARD_PASSWORD\n(VULNERABLE — not timing-safe)"]
    end

    subgraph L2["Layer 2: requireAppAccess (specific routes)"]
        APPKEY["x-app-key OR ?app_key\n= APP_ACCESS_KEY\n(crypto.timingSafeEqual)"]
        DUP["DUPLICATE:\nlib/app-auth.js (canonical)\nserver.js lines 827-835 (copy)"]
    end

    subgraph L3["Layer 3: requireCronAccess (/cron/*)"]
        CRONSEC["x-cron-secret\n= CRON_SECRET\n(crypto.timingSafeEqual)"]
    end

    subgraph OPEN["No Auth (intentional)"]
        HEALTHZ["/api/healthz\n/api/ping\n/api/ready\n/api/version\n/api/uptime\n/api/status\n/api/metrics\n/api/build-info"]
    end

    subgraph BYPASS["Bypass"]
        BPENV["BYPASS_DASHBOARD_AUTH=true\nskips L1 for /api/dashboard"]
    end

    REQ --> L1
    REQ --> OPEN
    L1 -->|Pass| L2
    L2 -->|Pass| HANDLER["Route Handler"]
    REQ --> L3
    L3 -->|Pass| CRONHANDLER["Cron Handler"]
    BYPASS -.->|Bypasses| L1
```

---

## DIAGRAM 8: DATABASE ARCHITECTURE

**Description:** Tables grouped by domain with migration history.

```mermaid
flowchart TB
    subgraph CORE["Core Agent (Migration 002-004, 027)"]
        apex_agents
        apex_agent_runs
        apex_agent_stages
        apex_lessons
        agent_reputation_events
        agent_decisions
        agent_memory_versions
    end

    subgraph MEMORY["Memory Layers (Migration 009-010)"]
        founder_memory
        working_memory
        episodic_memory
        procedural_memory
        strategic_memory
        skill_memory
        decision_memory
        knowledge_graph_nodes
        knowledge_graph_edges
        semantic_memory
        reflexion_records
        improvement_candidates
        memory_consolidation_queue
        vault_embeddings
    end

    subgraph GOV["Governance (Migration 005, 007-008)"]
        evidence_blocks
        execution_snapshots
        certifications
        incidents
        slo_definitions
        policies
        cost_accounting
        governance_probes
        anomalies
        otel_spans
    end

    subgraph COGNITIVE["Cognitive (Migration 011-013)"]
        cognitive_policy_decisions
        behavioral_modifications
        autonomy_decisions
        digital_twin_simulations
        cognitive_performance_metrics
        benchmark_results
        improvement_candidates_ext["improvement_candidates (extended)"]
    end

    subgraph FOUNDER["Founder OS (Migration 015, 018-019)"]
        founder_domains
        founder_goals
        founder_alignment_log
        founder_anti_goal_alerts
        founder_state_snapshots
        fkg_nodes
        fkg_edges
    end

    subgraph CIV["Civilization / Executive (Migration 015-017, 022)"]
        civilization_health_snapshots
        executive_decisions
        civilization_events
        executive_deliberations
        strategy_plans
        executive_performance
        resource_ledger
        exec_performance_stats
    end

    subgraph EMPIRE["Empire (Migration 020-021)"]
        sie_analyses
        egraph_nodes
        egraph_edges
        empire_health_scores
    end

    subgraph EVENTS["Event Spine (Migration 024-026)"]
        events
        outbox
        consumer_offsets
    end

    subgraph OPS["Observability / Ops (Migration 001, 004)"]
        cron_logs
        request_logs
        deployment_events
    end
```

---

## DIAGRAM 9: SUPABASE INTERACTION GRAPH

**Description:** Which files write to which tables.

```mermaid
flowchart TD
    subgraph WRITERS["Key Writers"]
        ORCH["orchestrator.js"]
        GW["gateway.js"]
        GOV_E["governance engine"]
        PROBE["governance-probe.js"]
        EVTBUS["event-bus.js"]
        ROUTES["route handlers"]
        SERVER["server.js middleware"]
    end

    subgraph TABLES["Key Tables"]
        AR["apex_agent_runs\napex_agent_stages"]
        MEM["memory tables\n(12 layers)"]
        EB["evidence_blocks"]
        GOV_T["governance tables\n(30+)"]
        GP["governance_probes"]
        OUT["outbox\nevents"]
        RL["request_logs"]
        AL["apex_lessons"]
    end

    ORCH --> AR
    ORCH --> GOV_T
    GW --> MEM
    GW --> EB
    GOV_E --> GOV_T
    GOV_E --> EB
    PROBE --> GP
    PROBE --> GOV_T
    EVTBUS --> OUT
    ROUTES --> MEM
    ROUTES --> GOV_T
    SERVER --> RL

    subgraph VIOLATIONS["Per-Request Client Violations"]
        GOV_R["routes/governance.js\n(lines 12-14)\ncreateClient() EACH call"]
        INT_R["routes/integrations.js\n(line 122-123)\ncreateClient() EACH call"]
        SRV_I["server.js inline\ncreateClient() in handler"]
    end
```

---

## DIAGRAM 10: RENDER DEPLOYMENT ARCHITECTURE

**Description:** Deployment flow from git push to live service.

```mermaid
flowchart TD
    DEV["Developer / Agent Orchestrator"]
    
    subgraph GIT["Git (GitHub)"]
        COMMIT["git commit"]
        PUSH["git push"]
    end

    subgraph RENDER["Render Platform"]
        DETECT["Auto-detect push\nOR API trigger"]
        BUILD["Build phase\n(npm install)"]
        SYNTAX["node --check\n(syntax only — NOT require() paths)"]
        DEPLOY["Deploy to service"]
        HEALTH["Health check\n(/api/healthz + /api/ready)"]
        ROLLBACK["Auto-rollback\n(if health check fails)"]
        LIVE["Service LIVE"]
    end

    subgraph SERVICES["Running Services"]
        MAIN["ai-os-server\n(server.js)"]
        SIDE["apex-ai-sidecar"]
    end

    DEV --> COMMIT --> PUSH --> DETECT
    DETECT --> BUILD --> SYNTAX --> DEPLOY --> HEALTH
    HEALTH -->|PASS| LIVE
    HEALTH -->|FAIL| ROLLBACK
    ROLLBACK -->|Restore previous| LIVE
    LIVE --> MAIN & SIDE

    NOTE["Phase 29B lesson:\nMODULE_NOT_FOUND not caught\nuntil Render runtime startup"]
    SYNTAX -.->|Does NOT catch| NOTE
```

---

## DIAGRAM 11: TELEMETRY ARCHITECTURE

**Description:** All monitoring and observability flows.

```mermaid
flowchart TD
    subgraph SOURCES["Event Sources"]
        HTTP_REQ["HTTP Requests"]
        AGENT_RUN["Agent Pipeline Runs"]
        GOV_EVT["Governance Events"]
        CRON_EVT["Cron Executions"]
        VOICE_EVT["Voice Sessions"]
        DEPLOY_EVT["Deploy Events"]
    end

    subgraph COLLECTORS["Collectors"]
        SENTRY["@sentry/node\n(unhandled exceptions)"]
        REQ_LOG["requestLogger middleware\n(all HTTP)"]
        ORCH_LOG["orchestrator.js\n(pipeline audit)"]
        GOV_LOG["governance engine\n(evidence + spans)"]
        CRON_LOG["cron handlers\n(cron_logs)"]
        LAT_TRACK["lib/latency-tracker\n(voice latency)"]
        COUNTER["lib/counter.js\n(request count)"]
    end

    subgraph STORAGE["Storage"]
        SENTRY_SVC["Sentry SaaS"]
        RL_TBL["request_logs table"]
        AR_TBL["apex_agent_runs\napex_agent_stages"]
        CA_TBL["cost_accounting"]
        EB_TBL["evidence_blocks"]
        OTEL_TBL["otel_spans table"]
        CL_TBL["cron_logs table"]
        SLO_TBL["slo_measurements"]
        GP_TBL["governance_probes"]
        IN_MEMORY["In-memory counter\n(resets on restart)"]
    end

    subgraph QUERY["Query Routes"]
        SELF_CHECK["/api/intelligence/self-check\n(9 subsystems)"]
        OPS["/api/operations/*\n(logs, deployments, readiness)"]
        GOV_API["/api/governance/*\n(probe, evidence, SLO)"]
        METRICS["/api/metrics\n(UNAUTHENTICATED)"]
    end

    HTTP_REQ --> REQ_LOG & SENTRY & COUNTER
    AGENT_RUN --> ORCH_LOG & GOV_LOG
    GOV_EVT --> GOV_LOG
    CRON_EVT --> CRON_LOG
    VOICE_EVT --> LAT_TRACK
    REQ_LOG --> RL_TBL
    ORCH_LOG --> AR_TBL & CA_TBL
    GOV_LOG --> EB_TBL & OTEL_TBL & SLO_TBL & GP_TBL
    CRON_LOG --> CL_TBL
    LAT_TRACK --> SLO_TBL
    COUNTER --> IN_MEMORY
    SENTRY --> SENTRY_SVC
    RL_TBL & AR_TBL & CA_TBL --> OPS
    GP_TBL & SLO_TBL & EB_TBL --> GOV_API
    IN_MEMORY --> METRICS
    SELF_CHECK --> OPS
```

---

## DIAGRAM 12: CACHE ARCHITECTURE

**Description:** What is cached, TTL, and invalidation.

```mermaid
flowchart TD
    subgraph PERSISTENT_CACHES["Persistent Caches (DB-Backed)"]
        WM["working_memory\n(Layer 1)\nTTL: 7200s per row\nINvalidated by: expires_at column\nUNIQUE(session_id, memory_type) — upsert"]
        VAULT_EMB["vault_embeddings\n(VECTOR 768)\nNo TTL — permanent until deleted\nInvalidated by: explicit DELETE"]
        EP_MEM["episodic_memory\n(VECTOR 768)\nNo TTL — permanent\nInvalidated by: explicit DELETE"]
    end

    subgraph IN_MEMORY_CACHES["In-Memory Caches (Process-Scoped)"]
        REQ_COUNTER["lib/counter.js\nRequest counter\nReset: on server restart\nNo TTL"]
        LAT_TRACK["lib/latency-tracker\nVoice session latency\nReset: on session end\nNo TTL"]
        SB_SINGLETON["lib/clients.js\nSupabase JS singleton\nReset: on server restart\nNo TTL"]
        PG_POOL["pg_database.js\npg Pool (connection pool)\nReset: on server restart\nMax connections: configured"]
    end

    subgraph JWT_CACHE["JWT Token Cache"]
        JWT["JWT cookie (apex_token)\nTTL: 7 days\nInvalidated by: AGENT_SECRET rotation\nNo revocation list"]
    end

    subgraph NO_CACHE["Explicitly Not Cached"]
        AI_RESP["Anthropic API responses\n(no caching)"]
        ROUTE_RESP["Route handler responses\n(no HTTP cache headers confirmed)"]
    end
```

---

## DIAGRAM 13: PROBE ARCHITECTURE

**Description:** The 10-check governance probe in detail.

```mermaid
flowchart TD
    TRIGGER["POST /api/governance/probe\nOR server startup"] --> PROBE

    subgraph PROBE["governance-probe.js"]
        C1["Check 1: execution_snapshots\ngov.captureSnapshot() → verify row"]
        C2["Check 2: cost_accounting_tokens\ntokens_in=100, tokens_out=50 → verify"]
        C3["Check 3: execution_artifacts\ngov.recordArtifact() → verify row"]
        C4["Check 4: certification_certified\nscore=1.0 → status='certified'"]
        C5["Check 5: evidence_blocks\nappendEvidenceBlock('probe') → verify"]
        C6["Check 6: lesson_sources\nrecordLessonSource() → verify row"]
        C7["Check 7: lesson_traceability_bd01\napex_lessons has task_id AND trace_id"]
        C8["Check 8: incident_creation\ncreateIncident() → returns id + DB row"]
        C9["Check 9: certification_denied\nscore=0 → status='denied'"]
        C10["Check 10: incident_resolution\nresolveIncident()\n(SKIPPED if Check 8 failed)"]

        SCORE["Score = passed_checks / 10\nThreshold: 80% = probe_passed=true\nCurrent: 100/100 = probe_passed=true"]
    end

    C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9 & C10 --> SCORE
    SCORE --> RESULT["INSERT governance_probes\n(score, results_json, probe_passed, run_at)"]
```

---

## DIAGRAM 14: VALIDATION ARCHITECTURE

**Description:** VALIDATOR stage behavior including fail-open gaps.

```mermaid
flowchart TD
    STAGE4["Stage 4: REVIEWER + VALIDATOR (parallel)"]

    subgraph VALIDATOR["VALIDATOR Stage (static analysis only)"]
        CHECK1{"testCases = []\nOR filesApplied = []?"} -->|YES| AUTOPASS["AUTO-PASS\nFAIL-OPEN\n(no tests to run)"]
        CHECK1 -->|NO| CHECK2{"Exception or\nparse failure?"} -->|YES| FAILCLOSED["passed = false\nFail-closed (WS-1B)"]
        CHECK2 -->|NO| CHECK3{"Non-boolean\npassed field?"} -->|YES| COERCE["Coerce to false\n(normalization block)"]
        CHECK3 -->|NO| RESULT{"Evaluate passed\nand failedCases"}
        RESULT -->|"passed=true"| PASS["VALIDATOR PASSES"]
        RESULT -->|"passed=false\nAND failedCases.length > 0"| RETRY["Trigger RETRY\n(DEVELOPER re-runs)"]
        RESULT -->|"passed=false\nAND failedCases = []"| GAP["NO RETRY TRIGGERED\n(dispatch gap — residual risk)\nPipeline may continue"]
    end

    subgraph LIMITS["VALIDATOR Cannot Detect"]
        RUNTIME["Runtime errors"]
        REQUIRE_ERR["require() path errors\n(caused Phase 29B)"]
        LOGIC_BUG["Logic bugs"]
        INTEGRATION["Integration failures"]
        TYPE_ERR["Runtime type errors"]
    end

    STAGE4 --> VALIDATOR
    AUTOPASS & PASS --> CONTINUE["Pipeline continues to TESTER"]
    COERCE & FAILCLOSED --> RETRY
```

---

## DIAGRAM 15: AUDIT ARCHITECTURE

**Description:** How apex_agent_runs and apex_agent_stages capture every pipeline execution.

```mermaid
flowchart TD
    TASK["Task submitted"] --> UPSERT_RUN["UPSERT apex_agent_runs\n(id, task_id, trace_id, status='running', started_at)"]

    subgraph STAGES["Per Stage"]
        INSERT_STAGE["INSERT apex_agent_stages\n(run_id, stage, status='running', started_at)"]
        STAGE_EXEC["Stage executes"]
        UPDATE_STAGE["UPDATE apex_agent_stages\n(status='passed'/'failed', output, completed_at, note)"]
    end

    UPSERT_RUN --> INSERT_STAGE
    INSERT_STAGE --> STAGE_EXEC --> UPDATE_STAGE
    UPDATE_STAGE -->|Next stage| INSERT_STAGE

    PIPELINE_END["Pipeline complete"] --> UPDATE_RUN["UPDATE apex_agent_runs\n(status='completed'/'failed', cost_usd, completed_at, note)"]
    UPDATE_STAGE --> PIPELINE_END

    subgraph COST_AUDIT["Cost Audit (parallel)"]
        COST["INSERT cost_accounting\n(task_id, stage, tokens_in, tokens_out, cost_usd, model)"]
    end

    STAGE_EXEC -.-> COST

    subgraph EVIDENCE_AUDIT["Evidence Audit (significant events)"]
        EV["appendEvidenceBlock()\n→ INSERT evidence_blocks\n(chain_id, payload, prev_hash)"]
    end

    UPDATE_STAGE -.->|Layers 0, 11| EV
```

---

## DIAGRAM 16: EVIDENCE ARCHITECTURE

**Description:** Immutable evidence block chain structure.

```mermaid
flowchart LR
    subgraph CHAIN["evidence_blocks chain (chain_id='main')"]
        B0["Block 0\nid: uuid-0\nchain_id: 'main'\nprev_hash: NULL\npayload: {...}\ncanonical_payload: {...}\npayload_version: '1'"]
        B1["Block 1\nid: uuid-1\nchain_id: 'main'\nprev_hash: hash(B0)\npayload: {...}"]
        B2["Block 2\nid: uuid-2\nchain_id: 'main'\nprev_hash: hash(B1)\npayload: {...}"]
        BN["Block N\n...\nprev_hash: hash(B[N-1])"]
        B0 --> B1 --> B2 --> BN
    end

    subgraph CHAINS["Active Chains"]
        MAIN["chain_id: 'main'\nAll governance events"]
        PROBE_C["chain_id: 'probe'\nProbe run blocks"]
        FOUNDER_C["chain_id: 'founder'\nFounder memory writes (Layer 0)"]
        L11_C["chain_id: (layer 11)\nReflexion writes (Layer 11)"]
    end

    subgraph TRIGGERS["Write Triggers"]
        T1["gateway.storeMemory(layer: 0)"]
        T2["gateway.storeMemory(layer: 11)"]
        T3["governance-probe.js check 5"]
        T4["Governance events (incidents, certs, etc.)"]
    end

    T1 --> FOUNDER_C
    T2 --> L11_C
    T3 --> PROBE_C
    T4 --> MAIN
```

---

## DIAGRAM 17: BACKGROUND TASK ARCHITECTURE

**Description:** All timers, crons, and loops.

```mermaid
flowchart TD
    STARTUP["server.js startup"]

    subgraph IMMEDIATE["Immediate (setImmediate)"]
        RLS["Enable Supabase RLS\non documents + memory tables"]
    end

    subgraph DEFERRED["Deferred (setTimeout 5min)"]
        MASTRA["Mastra framework init\n(uncertain if completes\nbefore cold-start restart)"]
    end

    subgraph SCHEDULED["Scheduled (node-cron)"]
        COG_CRONS["Cognitive crons\n(Sunday 9-11am UTC)\nGated: COGNITIVE_CRONS_ENABLED=true\nIncludes: consolidation, reflexion, evolution"]
        SCHED_RUN["runDueSchedules()\n(frequent check for agent schedules)"]
    end

    subgraph EXTERNAL_CRON["External Render Cron"]
        RENDER_CRON["POST /cron/run-schedules\n(x-cron-secret required)\nFrequency: configured in Render dashboard"]
    end

    subgraph ON_DEMAND["On-Demand (triggered)"]
        CIV_RT["Civilization Runtime\n(continuous when started\nvia POST /api/civilization/runtime/start)"]
        REALITY["Reality Loop\n(every 4hr when active\nvia manual trigger)"]
        NEWS["News Ingestion\n(via POST /api/intelligence/news/refresh)"]
    end

    STARTUP --> IMMEDIATE & DEFERRED
    STARTUP --> SCHEDULED
    EXTERNAL_CRON --> SCHED_RUN
```

---

## DIAGRAM 18: EXTERNAL DEPENDENCY GRAPH

**Description:** APEX to all external services.

```mermaid
flowchart LR
    APEX["APEX AI OS\n(Render)"]

    subgraph CRITICAL["Critical Dependencies"]
        ANTHROPIC["Anthropic Claude API\n(all AI generation)\nKey: ANTHROPIC_API_KEY"]
        SUPABASE["Supabase\n(Postgres + Storage)\nKey: SUPABASE_SERVICE_ROLE_KEY"]
        RENDER["Render Platform\n(hosting, deploy)"]
    end

    subgraph HIGH["High Dependencies"]
        GITHUB["GitHub\n(git remote, COMMITTER)\nKey: GITHUB_TOKEN"]
        GEMINI["Google Gemini API\n(voice pipeline)\nKey: GOOGLE_API_KEY"]
    end

    subgraph MEDIUM["Medium Dependencies"]
        SENTRY["Sentry\n(error tracking)\nKey: SENTRY_DSN"]
        OBSIDIAN["Obsidian API\n(lesson sync)\nKey: OBSIDIAN_API_KEY"]
        FIRECRAWL["Firecrawl\n(web research)"]
    end

    subgraph LOW["Low Dependencies"]
        NOTION["Notion\n(sync)\nKey: NOTION_API_KEY"]
        SLACK["Slack\n(notifications)\nKey: SLACK_BOT_TOKEN"]
        GMAIL["Gmail API\n(email)\nKeys: GMAIL_*"]
        PLAYWRIGHT_EXT["Web (via Playwright)\n(browser automation)"]
    end

    APEX --> CRITICAL
    APEX --> HIGH
    APEX --> MEDIUM
    APEX --> LOW
```

---

## DIAGRAM 19: INTERNAL MODULE DEPENDENCY GRAPH

**Description:** Key require() chains between internal modules.

```mermaid
flowchart TD
    SERVER["server.js\n(entry point)"]

    subgraph LIB["lib/ core"]
        CLIENTS["lib/clients.js\n(Supabase + Anthropic singletons)"]
        APP_AUTH["lib/app-auth.js\n(requireAuth, requireAppAccess)"]
        EVENT_BUS["lib/event-bus.js"]
        COUNTER["lib/counter.js"]
    end

    subgraph MEM["lib/memory/"]
        GATEWAY["gateway.js"]
        SANITIZER["sanitizer.js"]
        LAYER_MODS["Layer modules\n(working, episodic,\nstrategic, etc.)"]
    end

    subgraph GOV_LIB["lib/governance*.js"]
        GOV_ENGINE["Governance engine"]
    end

    subgraph AGENT["agent-system/"]
        ORCH["orchestrator.js"]
        PIPELINE["pipeline/\n(6 stage modules)"]
        REP["reputation.js"]
        SEL["dynamic-agent-selector.js"]
    end

    subgraph ROUTES["routes/ (23 files)"]
        ALL_ROUTES["All route handlers"]
    end

    OBS["obsidian-memory.js"]
    PROBE_FILE["governance-probe.js"]
    PG_DB["pg_database.js"]
    TASK_RT["runtime/task-router.js"]

    SERVER --> CLIENTS & APP_AUTH & EVENT_BUS & COUNTER
    SERVER --> GOV_ENGINE & PROBE_FILE & OBS & PG_DB
    SERVER --> TASK_RT & ALL_ROUTES
    ORCH --> GATEWAY & GOV_ENGINE & PIPELINE & REP & SEL
    GATEWAY --> SANITIZER & LAYER_MODS & CLIENTS & GOV_ENGINE
    ALL_ROUTES --> CLIENTS & GOV_ENGINE & GATEWAY
    OBS --> GATEWAY
    EVENT_BUS --> PG_DB
    PROBE_FILE --> CLIENTS & GOV_ENGINE
```

---

## DIAGRAM 20: END-TO-END DATA FLOW

**Description:** POST /api/chat from request to AI response, including memory injection.

```mermaid
sequenceDiagram
    participant Browser as Dashboard Browser
    participant Server as server.js
    participant Auth as requireAuth
    participant MemRead as formatRecentMemory()
    participant Gateway as memory/gateway.js
    participant Sanitizer as sanitizer.js
    participant Supabase as Supabase Postgres
    participant Anthropic as Anthropic Claude API
    participant EvtBus as event-bus.js
    participant Sentry as Sentry

    Browser->>Server: POST /api/chat {message: "Hello"}
    Server->>Server: requestLogger (log to request_logs)
    Server->>Auth: JWT cookie verify (AGENT_SECRET)
    Auth-->>Server: Auth OK

    Server->>MemRead: formatRecentMemory(session_id)
    MemRead->>Gateway: readMemory(layer 1, session_id)
    Gateway->>Supabase: SELECT working_memory WHERE session_id=X
    Supabase-->>Gateway: recent memory rows
    Gateway-->>MemRead: memory context
    MemRead-->>Server: formatted memory string

    Note over Server: Memory injected into system prompt
    Server->>Anthropic: messages.create({system: "...+memory...", messages: [...]})
    Anthropic-->>Server: AI response text

    Server->>Gateway: storeMemory(layer 1, {role: 'user', content: message})
    Gateway->>Sanitizer: scrub(content)
    Sanitizer-->>Gateway: sanitized
    Gateway->>Supabase: UPSERT working_memory

    Server->>Gateway: storeMemory(layer 1, {role: 'assistant', content: response})
    Gateway->>Sanitizer: scrub(content)
    Sanitizer-->>Gateway: sanitized
    Gateway->>Supabase: UPSERT working_memory

    Server->>EvtBus: publish('chat.completed', {session_id, tokens})
    EvtBus->>Supabase: write_outbox_with_state(event)

    Server-->>Browser: {response: "AI response text"}

    Note over Server,Sentry: On any unhandled exception:
    Server->>Sentry: captureException(err)
```
