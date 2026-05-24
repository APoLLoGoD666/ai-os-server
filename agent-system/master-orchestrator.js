"use strict";
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const memory = require('./obsidian-memory');

function _sbClient() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-haiku-4-5-20251001';
const ROADMAP_FILE = path.join(ROOT, 'ROADMAP.md');

// ── Parse ROADMAP.md into structured workstreams ──────────────────
function parseRoadmap() {
    const content = fs.readFileSync(ROADMAP_FILE, 'utf8');
    const workstreams = {};
    let current = null;

    for (const line of content.split('\n')) {
        const wsMatch = line.match(/^## Workstream: (.+)/);
        if (wsMatch) {
            current = wsMatch[1].trim();
            workstreams[current] = { pending: [], completed: [] };
            continue;
        }
        if (!current) continue;
        const pendingMatch = line.match(/^- \[ \] (FEAT-\w+): (.+)/);
        if (pendingMatch) {
            workstreams[current].pending.push({
                id: pendingMatch[1],
                title: pendingMatch[2].trim()
            });
        }
        const doneMatch = line.match(/^- \[x\] (FEAT-\w+): (.+)/i);
        if (doneMatch) {
            workstreams[current].completed.push({
                id: doneMatch[1],
                title: doneMatch[2].trim()
            });
        }
    }
    return workstreams;
}

// ── Mark a feature complete in ROADMAP.md ────────────────────────
function markFeatureComplete(featureId) {
    let content = fs.readFileSync(ROADMAP_FILE, 'utf8');
    content = content.replace(
        new RegExp(`^- \\[ \\] (${featureId}: .+)$`, 'm'),
        '- [x] $1'
    );
    fs.writeFileSync(ROADMAP_FILE, content, 'utf8');
    try {
        execSync('git add ROADMAP.md', { cwd: ROOT, stdio: 'pipe' });
        execSync(`git commit -m "roadmap: mark ${featureId} complete [skip ci]"`, { cwd: ROOT, stdio: 'pipe' });
        execSync('git push', { cwd: ROOT, stdio: 'pipe' });
        console.log(`[Master] ROADMAP.md pushed — ${featureId} marked [x]`);
    } catch (e) {
        console.warn(`[Master] ROADMAP.md push failed (non-fatal): ${e.message}`);
    }
}

// ── Plan a feature using Claude ──────────────────────────────────
async function planFeature(feature, workstream) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const planModel = MODEL;
    const context = memory.getFullContext();

    const res = await client.messages.create({
        model: planModel,
        max_tokens: 2000,
        system: `You are a senior architect planning features for Apex AI OS.
Apex is a Node.js/Express voice-first AI OS on Render.
Stack: Node.js, Express, Supabase, Anthropic Claude API,
Deepgram STT/TTS, Gmail OAuth2, Ruflo agents, Playwright browser.

PROTECTED — never modify:
- iOS HTT pipeline (touchstart/touchend/getUserMedia)
- /api/transcribe, /api/tts endpoints
- requireAppAccess middleware
- Database schema
- .env or environment variables
- server.js (large file — auto-loads routes, must not be touched for new features)

ROUTING RULE — CRITICAL:
New API routes MUST go in routes/<domain>.js using Express.Router().
server.js auto-loads everything in routes/ automatically.
Use these domain files (create if missing):
  routes/communications.js, routes/finance.js, routes/health.js,
  routes/intelligence.js, routes/life.js, routes/operations.js
filesToModify must NOT include server.js for new-route features.
filesToCreate should list the routes/<domain>.js file instead.

FILE SIZE LIMIT: Never put a file > 20KB in filesToModify — the agent cannot rewrite it.

PRINCIPLES (Karpathy):
- Think Before Coding — state what already exists before planning what to build
- Simplicity First — the simplest solution that satisfies the spec wins
- Surgical Changes — touch only what is necessary; never refactor while building
- Goal-Driven — implement the feature, nothing more

INTEGRATION STRATEGY:
For features requiring external services (WhatsApp, banking, email providers, CRM, LinkedIn):
- Prefer webhook-receiver patterns — let external services push to Apex, not Apex polling them
- This avoids credential complexity and enables n8n/Zapier workflow integration
- Mark permissionRequired=true only if an API KEY or OAuth flow is truly unavoidable

Output ONLY a JSON object with no markdown:
{
  "feasibility": "high|medium|low",
  "approach": "one paragraph summary",
  "filesToRead": ["file paths"],
  "filesToCreate": ["file paths"],
  "filesToModify": ["file paths"],
  "steps": ["numbered steps"],
  "externalServices": ["any APIs or services needed"],
  "permissionRequired": true/false,
  "permissionReason": "why permission needed or empty string",
  "estimatedComplexity": "simple|moderate|complex"
}`,
        messages: [{
            role: 'user',
            content: `WORKSTREAM: ${workstream}\nFEATURE: ${feature.id} — ${feature.title}\n\nSYSTEM CONTEXT:\n${context}\n\nPlan this feature.`
        }]
    });

    const text = res.content.map(i => i.text || '').join('').trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1) throw new Error('No plan JSON returned');
    return JSON.parse(text.slice(first, last + 1));
}

// ── Run a single feature through the agent pipeline ──────────────
async function runFeature(feature, workstream) {
    const runAgentTeam = require('./orchestrator');

    console.log(`[Master] Starting ${feature.id}: ${feature.title}`);
    console.log(`[Master] Planning ${feature.id} via Claude...`);
    memory.logDecision(
        `Starting ${feature.id}`,
        `Workstream: ${workstream}`
    );

    let plan;
    try {
        plan = await planFeature(feature, workstream);
    } catch (e) {
        const msg = `Failed to plan ${feature.id}: ${e.message}`;
        console.error(`[Master] ${msg}`);
        memory.logLesson(`Planning failed for ${feature.id}: ${e.message}. Check API response format.`);
        return { success: false, error: msg };
    }

    console.log(`[Master] Plan ready for ${feature.id} — complexity: ${plan.estimatedComplexity}, permissionRequired: ${plan.permissionRequired}`);

    // Auto-approve if permission is only needed for DB tables
    // (tables are now created by setup agent upfront)
    const _dbOnlyReasons = [
        'database', 'table', 'migration', 'schema', 'supabase',
        'column', 'row level security', 'rls', 'schema addition',
        'additive', 'new table', 'supabase table', 'database table',
        'cron', 'node-cron', 'background process'
    ];
    const _reason = (plan.permissionReason || '').toLowerCase();
    const _isDbOnly = _dbOnlyReasons.some(w => _reason.includes(w))
        && !_reason.includes('api key')
        && !_reason.includes('oauth')
        && !_reason.includes('terms of service')
        && !_reason.includes('environment variable')
        && !_reason.includes('plaid')
        && !_reason.includes('whatsapp')
        && !_reason.includes('linkedin');

    if (plan.permissionRequired && _isDbOnly) {
        console.log(`[Master] Auto-approving ${feature.id} — DB-only permission, tables pre-created`);
        plan.permissionRequired = false;
        memory.logDecision(
            `Auto-approved ${feature.id}`,
            'DB-only permission gate — tables pre-created by setup agent'
        );
    }

    // Check standing approvals table before blocking on permission
    if (plan.permissionRequired) {
        try {
            const { data: standing } = await _sbClient()
                .from('apex_standing_approvals')
                .select('id')
                .eq('feature_pattern', feature.id)
                .eq('active', true)
                .limit(1);
            if (standing && standing.length > 0) {
                console.log(`[Master] ${feature.id} — standing approval found, auto-approving`);
                plan.permissionRequired = false;
                memory.logDecision(`Standing approval used for ${feature.id}`, 'apex_standing_approvals table');
            }
        } catch (e) {
            console.warn('[Master] standing approvals check failed:', e.message);
        }
    }

    if (plan.permissionRequired) {
        console.log(`[Master] ${feature.id} requires permission: ${plan.permissionReason}`);
        // Write permission request to Supabase notifications
        await _sbClient().from('apex_notifications').insert({
            id: `perm-${feature.id}-${Date.now()}`,
            message: JSON.stringify({
                type: 'permissionRequest',
                featureId: feature.id,
                featureTitle: feature.title,
                reason: plan.permissionReason,
                plan: {
                    approach: plan.approach,
                    externalServices: plan.externalServices,
                    estimatedComplexity: plan.estimatedComplexity
                }
            }),
            type: 'permission',
            read: false
        });
        console.log(`[Master] Permission request written to dashboard for ${feature.id}`);
        return {
            success: false,
            pendingPermission: true,
            featureId: feature.id,
            reason: plan.permissionReason,
            plan
        };
    }

    const spec = {
        objective: `${feature.id}: ${feature.title}`,
        filesToRead: plan.filesToRead || [],
        filesToModify: [...(plan.filesToModify || []),
                        ...(plan.filesToCreate || [])],
        steps: plan.steps || [],
        safetyChecks: [
            'node --check server.js must pass',
            'Do not touch /api/transcribe or /api/tts',
            'Do not modify requireAppAccess',
            'Do not touch iOS HTT pipeline'
        ],
        successCriteria: [`${feature.id} implemented and committed`]
    };

    const result = await runAgentTeam(spec, feature.id);
    console.log(`[Master] Agent team finished ${feature.id} — success: ${result.success}`);

    if (result.success) {
        markFeatureComplete(feature.id);
        memory.logFeature(
            feature.id,
            feature.title,
            result.commitHash,
            plan.approach
        );
        console.log(`[Master] ${feature.id} completed — commit ${result.commitHash} — cost $${result.cost || '?'}`);
        try {
            await _sbClient().from('apex_notifications').insert({
                id: `feat-complete-${feature.id}-${Date.now()}`,
                type: 'feature_complete',
                message: `Feature ${feature.id} completed — commit ${result.commitHash} — cost $${result.cost || '?'}`,
                read: false
            });
        } catch (e) {
            console.warn(`[Master] feature_complete notification failed: ${e.message}`);
        }
    } else {
        memory.logLesson(
            `${feature.id} failed: ${result.error}. ` +
            `Workstream: ${workstream}. ` +
            `Plan approach was: ${plan.approach}`
        );
        console.error(`[Master] ${feature.id} failed: ${result.error}`);
        try {
            await _sbClient().from('apex_notifications').insert({
                id: `feat-failed-${feature.id}-${Date.now()}`,
                type: 'feature_failed',
                message: `Feature ${feature.id} failed after 3 attempts: ${result.error}`,
                read: false
            });
        } catch (e) {
            console.warn(`[Master] feature_failed notification failed: ${e.message}`);
        }
    }

    return result;
}

// ── Run a full workstream sequentially ───────────────────────────
async function runWorkstream(workstreamName, workstream) {
    console.log(`[Master] Workstream starting: ${workstreamName} (${workstream.pending.length} features)`);
    const results = [];

    for (const feature of workstream.pending) {
        if (feature.dependsOn) {
            const { data } = await _sbClient()
                .from('apex_notifications')
                .select('id')
                .eq('type', 'feature_complete')
                .ilike('message', `%${feature.dependsOn}%`)
                .limit(1);
            if (!data || data.length === 0) {
                console.log(`[Master] ${feature.id} waiting on ${feature.dependsOn} — re-queuing in 5 min`);
                setTimeout(() => runFeature(feature, workstreamName)
                    .catch(e => console.error(`[Master] deferred ${feature.id} error:`, e.message)), 300000);
                continue;
            }
        }

        const result = await runFeature(feature, workstreamName);
        results.push({ feature, result });

        if (!result.success && !result.pendingPermission) {
            console.warn(`[Master] ${workstreamName} paused after ${feature.id} failure`);
            break;
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    return results;
}

// ── Main export — run multiple workstreams in parallel ────────────
async function runMasterOrchestrator(workstreamFilter = null) {
    const roadmap = parseRoadmap();
    console.log('[Master] North Star loaded, lessons read');

    const workstreamsToRun = workstreamFilter
        ? Object.entries(roadmap).filter(([name]) =>
            workstreamFilter.includes(name))
        : Object.entries(roadmap);

    const activeWorkstreams = workstreamsToRun.filter(
        ([, ws]) => ws.pending.length > 0
    );

    if (activeWorkstreams.length === 0) {
        console.log('[Master] All features complete');
        return { complete: true };
    }

    console.log(`[Master] Running ${activeWorkstreams.length} workstreams in parallel`);

    const results = await Promise.all(
        activeWorkstreams.map(([name, ws]) =>
            runWorkstream(name, ws)
                .catch(e => {
                    memory.logLesson(`Workstream ${name} crashed: ${e.message}`);
                    return [{ error: e.message }];
                })
        )
    );

    const summary = {};
    activeWorkstreams.forEach(([name], i) => {
        summary[name] = results[i];
    });

    console.log('[Master] All workstreams complete');
    return summary;
}

// ── Run feature with explicit permission override ─────────────────
async function runFeatureWithPermission(featureId) {
    const runAgentTeam = require('./orchestrator');
    const roadmap = parseRoadmap();
    for (const [wsName, ws] of Object.entries(roadmap)) {
        const feature = ws.pending.find(f => f.id === featureId);
        if (feature) {
            const plan = await planFeature(feature, wsName);
            plan.permissionRequired = false; // override — user approved
            const spec = {
                objective: `${feature.id}: ${feature.title}`,
                filesToRead: plan.filesToRead || [],
                filesToModify: [...(plan.filesToModify || []),
                               ...(plan.filesToCreate || [])],
                steps: plan.steps || [],
                safetyChecks: [
                    'node --check server.js must pass',
                    'Do not touch /api/transcribe or /api/tts',
                    'Do not modify requireAppAccess',
                    'Do not touch iOS HTT pipeline'
                ],
                successCriteria: [`${feature.id} implemented and committed`]
            };
            const result = await runAgentTeam(spec, feature.id);
            if (result.success) {
                try {
                    await _sbClient().from('apex_notifications').insert({
                        id: `feat-complete-${featureId}-${Date.now()}`,
                        type: 'feature_complete',
                        message: `Feature ${featureId} completed and deployed successfully`,
                        read: false
                    });
                } catch (e) {
                    console.warn(`[Master] feature_complete notification failed: ${e.message}`);
                }
            } else {
                try {
                    await _sbClient().from('apex_notifications').insert({
                        id: `feat-failed-${featureId}-${Date.now()}`,
                        type: 'feature_failed',
                        message: `Feature ${featureId} failed after 3 attempts: ${result.error}`,
                        read: false
                    });
                } catch (e) {
                    console.warn(`[Master] feature_failed notification failed: ${e.message}`);
                }
            }
            return result;
        }
    }
    throw new Error(`${featureId} not found in roadmap`);
}

// ── Auto-approve safe permission requests on startup ─────────────
async function autoApproveStandardPermissions() {
    let data, error;
    try {
        ({ data, error } = await _sbClient()
            .from('apex_notifications')
            .select('*')
            .eq('type', 'permission')
            .eq('read', false));
    } catch (e) {
        console.error('[AutoApprove] query error:', e.message);
        return;
    }
    if (error) { console.error('[AutoApprove] query error:', error.message); return; }
    if (!data || !data.length) {
        console.log('[AutoApprove] no pending permission requests');
        return;
    }

    console.log(`[AutoApprove] checking ${data.length} pending permission request(s)`);

    const BLOCK_PATTERNS = [
        /oauth scope change/i,
        /linkedin/i,
        /whatsapp\s*tos/i,
        /plaid/i,
        /clinical/i,
        /crisis/i
    ];

    for (const row of data) {
        let info = {};
        try { info = JSON.parse(row.message); } catch (_) {}
        const featureId = info.featureId || row.id;
        const reason = (info.reason || '').toString();

        if (BLOCK_PATTERNS.some(p => p.test(reason))) {
            console.log(`[AutoApprove] SKIP ${featureId} — manual review required: "${reason}"`);
            continue;
        }

        const r = reason.toLowerCase();
        const isSafe = (
            r.includes('new table') ||
            r.includes('new supabase table') ||
            r.includes('database table') ||
            r.includes('supabase table') ||
            r.includes('additive migration') ||
            r.includes('additive') ||
            r.includes('schema addition') ||
            r.includes('column') ||
            r.includes('row level security') ||
            r.includes('rls') ||
            r.includes('migration') ||
            r.includes('cron') ||
            r.includes('node-cron') ||
            r.includes('background process') ||
            (r.includes('new dependency') && (r.includes('node-cron') || r.includes('express-rate-limit')))
        );

        if (!isSafe) {
            console.log(`[AutoApprove] SKIP ${featureId} — reason not in safe list: "${reason}"`);
            continue;
        }

        console.log(`[AutoApprove] AUTO-APPROVING ${featureId} — reason: "${reason}"`);
        try {
            await _sbClient().from('apex_notifications').update({ read: true }).eq('id', row.id);
            runFeatureWithPermission(featureId)
                .catch(e => console.error(`[AutoApprove] ${featureId} run error:`, e.message));
        } catch (e) {
            console.error(`[AutoApprove] failed to approve ${featureId}:`, e.message);
        }
    }
}

module.exports = { runMasterOrchestrator, runFeature, parseRoadmap, runFeatureWithPermission, autoApproveStandardPermissions };
