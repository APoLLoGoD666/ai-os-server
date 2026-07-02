"use strict";
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const memory = require('./obsidian-memory');
const constitutionGate = require('../lib/runtime/constitutional-gate');

const _sb = process.env.SUPABASE_URL
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    : null;
const _anthro = require('../lib/clients').getAnthropicClient();
const runtime = require('../lib/models/runtime');

// In-memory plan cache — avoids re-planning the same feature on retries
const _planCache = new Map();

const ROOT = path.join(__dirname, '..');
const MODEL  = 'claude-haiku-4-5-20251001';
const _SONNET = 'claude-sonnet-4-6';
const ROADMAP_FILE = path.join(ROOT, 'ROADMAP.md');

const _ghToken = process.env.GITHUB_TOKEN || '';
const _mask = (s) => _ghToken ? String(s || '').replace(new RegExp(_ghToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]') : String(s || '');

// Escape special regex characters in featureId strings
function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cognition-weights loader — 60-min TTL memoization
// Primary source: Supabase adaptation_cycles.routing_table (survives Render deploys)
// Fallback: config/cognition-weights.json (local file, empty after fresh deploy)
let _cwCache = null;
let _cwLoadedAt = 0;
const _CW_TTL_MS = 60 * 60 * 1000;
const _CW_PATH = path.join(ROOT, 'config', 'cognition-weights.json');

async function _refreshCognitionWeightsFromSupabase() {
    if (!_sb) return;
    try {
        const { data } = await _sb.from('adaptation_cycles')
            .select('routing_table')
            .not('routing_table', 'is', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();
        if (data?.routing_table) {
            _cwCache = data.routing_table;
            _cwLoadedAt = Date.now();
        }
    } catch { /* non-fatal — local file fallback remains active */ }
}

// Populate cache from Supabase on module load (non-blocking)
setImmediate(() => _refreshCognitionWeightsFromSupabase().catch(() => {}));

function _loadCognitionWeights() {
    if (_cwCache && Date.now() - _cwLoadedAt < _CW_TTL_MS) return _cwCache;
    try {
        _cwCache = JSON.parse(fs.readFileSync(_CW_PATH, 'utf8'));
        _cwLoadedAt = Date.now();
    } catch {
        _cwCache = { routingOverrides: {} };
    }
    // Trigger background Supabase refresh on TTL expiry
    setImmediate(() => _refreshCognitionWeightsFromSupabase().catch(() => {}));
    return _cwCache;
}

// Pre-classify feature before planning — selects model tier for planFeature
function _preClassifyFeature(feature) {
    const weights = _loadCognitionWeights();
    const id = (feature.id || '').toLowerCase();
    if (weights.routingOverrides && weights.routingOverrides[id]) {
        const ov = weights.routingOverrides[id];
        if ((ov.confidence ?? 0) >= 0.7) return ov.tier;
    }
    const t = `${feature.id} ${feature.title}`.toLowerCase();
    if (/\b(auth|password|secret|api.?key|jwt|oauth|stripe|payment|security|encrypt|rls|rbac|permiss|hash|session)\b/.test(t))
        return 'critical';
    if (/\b(refactor|architect|orchestrat|pipeline|rebuild|multi.?step|integrat|vector|embed|agent.system|workflow|migration)\b/.test(t))
        return 'complex';
    return 'simple';
}

// Run an array of async task functions with bounded concurrency
async function _runWithConcurrency(fns, limit) {
    const results = new Array(fns.length);
    let next = 0;
    async function worker() {
        while (next < fns.length) {
            const i = next++;
            results[i] = await fns[i]();
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, fns.length) }, worker));
    return results;
}

// Insert notification with dedup — skips if unread notification of same type+feature already exists
async function _insertNotification(row) {
    if (!_sb) return;
    try {
        if (row.featureId) {
            const { data } = await _sb.from('apex_notifications')
                .select('id').eq('type', row.type).eq('read', false)
                .ilike('message', `%${row.featureId}%`).limit(1);
            if (data && data.length > 0) {
                console.log(`[Master] notification dedup — ${row.type}/${row.featureId} already pending`);
                return;
            }
        }
        await _sb.from('apex_notifications').insert(row);
    } catch (e) {
        console.warn('[Master] notification insert failed:', e.message);
    }
}

// ── Parse ROADMAP.md into structured workstreams ──────────────────
function parseRoadmap() {
    let content;
    try { content = fs.readFileSync(ROADMAP_FILE, 'utf8'); }
    catch { console.warn('[Master] ROADMAP.md not found — returning empty workstreams'); return {}; }
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
        new RegExp(`^- \\[ \\] (${_escapeRegex(featureId)}: .+)$`, 'm'),
        '- [x] $1'
    );
    fs.writeFileSync(ROADMAP_FILE, content, 'utf8');
    try {
        const _repoBase = 'https://github.com/APoLLoGoD666/ai-os-server.git';
        const _gitEnv = {
            ...process.env,
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
            GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`oauth2:${_ghToken}`).toString('base64')}`,
            GIT_TERMINAL_PROMPT: '0',
        };
        execSync('git add ROADMAP.md', { cwd: ROOT, stdio: 'pipe' });
        const _commitR = spawnSync('git', ['commit', '-m', `roadmap: mark ${featureId} complete [skip ci]`], { cwd: ROOT, stdio: 'pipe' });
        if (_commitR.status !== 0) throw new Error(_commitR.stderr?.toString() || 'git commit failed');
        execSync(`git pull --rebase ${_repoBase} main`, { cwd: ROOT, stdio: 'pipe', env: _gitEnv });
        execSync(`git push ${_repoBase} main`, { cwd: ROOT, stdio: 'pipe', env: _gitEnv });
        console.log(`[Master] ROADMAP.md pushed — ${featureId} marked [x]`);
    } catch (e) {
        console.warn(`[Master] ROADMAP.md push failed (non-fatal): ${_mask(e.message)} ${_mask(e.stderr?.toString())}`);
    }
}

// ── Plan a feature using Claude ──────────────────────────────────
async function planFeature(feature, workstream) {
    if (_planCache.has(feature.id)) {
        console.log(`[Master] planFeature cache hit for ${feature.id}`);
        return _planCache.get(feature.id);
    }

    // GAP-7: Constitution gate — evaluate before any model calls or planning work
    let gateResult;
    try {
        gateResult = await Promise.resolve(constitutionGate.evaluate(
            { metadata: { path: `plan/${feature.id}` }, identity: { roles: ['HUMAN_OPERATOR'] } },
            {}
        ));
    } catch (gateErr) {
        throw new Error(`Constitution gate unavailable — planFeature aborted: ${gateErr.message}`);
    }

    const verdict = gateResult && gateResult.verdict;

    if (verdict === 'DENY') {
        throw new Error(`Constitutional gate DENY for ${feature.id}: ${(gateResult.risks || []).join(', ') || 'policy violation'}`);
    }

    // RESTRICT: halve planning token budget and flag as restricted
    if (verdict === 'RESTRICT') {
        workstream = workstream; // no-op (workstream is a string, immutable here)
        feature = { ...feature, _restricted: true, _maxTokens: 1500 };
        console.log(`[Master] planFeature ${feature.id} — RESTRICTED by constitution gate (risks: ${(gateResult.risks || []).join(', ')})`);
    }

    const _featureClass = _preClassifyFeature(feature);
    let planModel = (_featureClass === 'critical' || _featureClass === 'complex') ? _SONNET : MODEL;
    console.log(`[Master] planFeature ${feature.id} — class: ${_featureClass}, model: ${planModel}`);
    // Upgrade plan model if adaptation engine has a high-confidence ARCHITECT recommendation
    try {
        const _ae = require('./adaptation-engine');
        const _archRec = _ae.getRecommendationsFor({ stage: 'ARCHITECT' })
            .find(a => a.type === 'model_tier' && a.params?.recommendedModel && a.confidence >= 0.5);
        if (_archRec && planModel !== _SONNET) {
            planModel = _archRec.params.recommendedModel;
            console.log(`[Master] planFeature model upgraded by adaptation: ${planModel} (conf:${_archRec.confidence})`);
        }
    } catch {}
    const context = await memory.getFullContextAsync();

    const _planMaxTokens = feature._restricted ? (feature._maxTokens || 1500) : 3000;
    const res = await Promise.race([
        runtime.execute({ client: _anthro, model: planModel, caller: 'master_planner', maxTokens: _planMaxTokens,
            system: [{ type: 'text', cache_control: { type: 'ephemeral' }, text: `You are a senior architect planning features for Apex AI OS.
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
}` }],
            messages: [{
                role: 'user',
                content: `WORKSTREAM: ${workstream}\nFEATURE: ${feature.id} — ${feature.title}\n\nSYSTEM CONTEXT:\n${context}\n\nPlan this feature.`
            }],
        }).then(r => r.result),
        new Promise((_, reject) => setTimeout(() => reject(new Error('planFeature timeout after 60s')), 60000))
    ]);

    const text = res.content.map(i => i.text || '').join('').trim();
    let plan;
    try {
        const first = text.indexOf('{');
        if (first === -1) throw new Error('No JSON object found');
        let depth = 0, end = -1;
        for (let i = first; i < text.length; i++) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end === -1) throw new Error('Unterminated JSON object');
        plan = JSON.parse(text.slice(first, end + 1));
    } catch (e) { throw new Error(`Plan JSON parse failed for ${feature.id}: ${e.message}`); }
    _planCache.set(feature.id, plan);
    return plan;
}

// ── Write a detailed post-feature retrospective ───────────────────
function _writeRetrospective(feature, plan, result, workstream) {
    try {
        const date = new Date().toISOString().split('T')[0];
        const filesChanged = (result.agentLogs || [])
            .find(l => l.role === 'DEVELOPER')?.result?.applied?.map(e => `- ${e.file} (${e.status})`) || [];
        const retries = (result.agentLogs || []).filter(l => l.role === 'DEVELOPER').length;
        const content =
            `---\nid: ${feature.id}\ntitle: ${feature.title}\nstatus: completed\n` +
            `date: ${date}\ncommit: ${result.commitHash}\ncost: $${result.cost || '?'}\n` +
            `workstream: ${workstream}\ncomplexity: ${result.complexity || '?'}\n---\n\n` +
            `# ${feature.id}: ${feature.title}\n\n` +
            `## Approach\n${plan.approach || 'N/A'}\n\n` +
            `## Files Changed\n${filesChanged.join('\n') || 'None recorded'}\n\n` +
            `## Metrics\n- Cost: $${result.cost || '?'}\n- Complexity: ${result.complexity || '?'}\n` +
            `- Retries: ${retries - 1}\n- Commit: ${result.commitHash}\n\n` +
            `## External Services\n${(plan.externalServices || []).map(s => `- ${s}`).join('\n') || 'None'}\n`;
        memory.write(`Features/${feature.id}.md`, content);
    } catch (e) { console.warn('[Master] retrospective write failed (non-fatal):', e.message); }
}

// ── Update workstream Kanban board in Obsidian ────────────────────
function _updateKanban(feature, status) {
    try {
        const existing = memory.read('Projects/Pipeline.md') || `# Pipeline Board\n\n## Pending\n\n## In Progress\n\n## Complete\n`;
        let board = existing;
        const entry = `- [${feature.id}] ${feature.title}`;
        // Remove from other sections first
        board = board.replace(new RegExp(`^\\- \\[${feature.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\].*$`, 'gm'), '');
        // Add to correct section
        const section = status === 'complete' ? '## Complete' : status === 'in-progress' ? '## In Progress' : '## Pending';
        if (!board.includes(section)) board += '\n' + section + '\n';
        board = board.replace(section, section + '\n' + entry);
        // Clean up extra blank lines
        board = board.replace(/\n{3,}/g, '\n\n');
        memory.write('Projects/Pipeline.md', board);
    } catch (e) { console.warn('[Master] Kanban update failed (non-fatal):', e.message); }
}

// ── Run a single feature through the agent pipeline ──────────────
async function runFeature(feature, workstream) {
    const runAgentTeam = require('./orchestrator');

    console.log(`[Master] Starting ${feature.id}: ${feature.title}`);
    _updateKanban(feature, 'in-progress');
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
            const { data: standing } = await _sb
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
        await _insertNotification({
            id: `perm-${feature.id}-${Date.now()}`,
            featureId: feature.id,
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
        // Detailed retrospective — richer than logFeature's basic entry
        _writeRetrospective(feature, plan, result, workstream);
        // Update Kanban board
        _updateKanban(feature, 'complete');
        memory.logFeature(
            feature.id,
            feature.title,
            result.commitHash,
            plan.approach
        );
        console.log(`[Master] ${feature.id} completed — commit ${result.commitHash} — cost $${result.cost || '?'}`);
        await _insertNotification({
            id: `feat-complete-${feature.id}-${Date.now()}`,
            featureId: feature.id,
            type: 'feature_complete',
            message: `Feature ${feature.id} completed — commit ${result.commitHash} — cost $${result.cost || '?'}`,
            read: false
        });
    } else {
        memory.logLesson(
            `${feature.id} failed: ${result.error}. ` +
            `Workstream: ${workstream}. ` +
            `Plan approach was: ${plan.approach}`
        );
        console.error(`[Master] ${feature.id} failed: ${result.error}`);
        await _insertNotification({
            id: `feat-failed-${feature.id}-${Date.now()}`,
            featureId: feature.id,
            type: 'feature_failed',
            message: `Feature ${feature.id} failed after 3 attempts: ${result.error}`,
            read: false
        });
    }

    return result;
}

// ── Run a full workstream sequentially ───────────────────────────
async function runWorkstream(workstreamName, workstream) {
    console.log(`[Master] Workstream starting: ${workstreamName} (${workstream.pending.length} features)`);
    const results = [];

    for (const feature of workstream.pending) {
        if (feature.dependsOn) {
            const { data } = await _sb
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
    const _masterStart = Date.now();
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

    console.log(`[Master] Running ${activeWorkstreams.length} workstreams (max 3 concurrent)`);

    const results = await _runWithConcurrency(
        activeWorkstreams.map(([name, ws]) => () =>
            runWorkstream(name, ws).catch(e => {
                memory.logLesson(`Workstream ${name} crashed: ${e.message}`);
                return [{ error: e.message }];
            })
        ),
        3
    );

    const summary = {};
    activeWorkstreams.forEach(([name], i) => {
        summary[name] = results[i];
    });

    const totalSec = ((Date.now() - _masterStart) / 1000).toFixed(1);
    console.log(`[Master] All workstreams complete — total time: ${totalSec}s`);
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
                await _insertNotification({
                    id: `feat-complete-${featureId}-${Date.now()}`,
                    featureId,
                    type: 'feature_complete',
                    message: `Feature ${featureId} completed and deployed successfully`,
                    read: false
                });
            } else {
                await _insertNotification({
                    id: `feat-failed-${featureId}-${Date.now()}`,
                    featureId,
                    type: 'feature_failed',
                    message: `Feature ${featureId} failed after 3 attempts: ${result.error}`,
                    read: false
                });
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
        ({ data, error } = await _sb
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
            await _sb.from('apex_notifications').update({ read: true }).eq('id', row.id);
            await runFeatureWithPermission(featureId)
                .catch(e => console.error(`[AutoApprove] ${featureId} run error:`, e.message));
        } catch (e) {
            console.error(`[AutoApprove] failed to approve ${featureId}:`, e.message);
        }
    }
}

// ── gstack-pattern: Office Hours — product interrogation before building ──────
// Validates feature requirements with forcing questions before dev starts.
async function officeHours(topic) {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'officeHours',
        maxTokens: 1500,
        system: `You are a senior product manager running office hours for Apex AI OS.
Ask sharp, forcing questions that expose unstated assumptions, edge cases, and misaligned expectations.
Format: numbered list of 5-8 questions the builder must answer before writing any code.
Be direct. No preamble. Start immediately with Q1.`,
        messages: [{ role: 'user', content: `Feature request: ${topic}\n\nWhat must I answer before we build this?` }]
    });
    const questions = res.content[0].text.trim();
    memory.write(`Projects/OfficeHours-${Date.now()}.md`, `# Office Hours: ${topic}\n\n${questions}`);
    return { questions, topic };
}

// ── gstack-pattern: QA Lead — pre-ship quality gate ──────────────────────────
async function qaLead(featureId, filePaths = []) {
    const fileContext = filePaths.map(fp => {
        try { return `\n\`\`\`\n// ${fp}\n${require('fs').readFileSync(require('path').join(ROOT, fp), 'utf8').slice(0, 1500)}\n\`\`\``; }
        catch { return `// ${fp} (not found)`; }
    }).join('\n');

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'qaLead',
        maxTokens: 2000,
        system: `You are the QA Lead for Apex AI OS. Produce a concrete test checklist for the feature.
Include: happy path, error states, edge cases, mobile/voice, accessibility, rate limiting.
Format: markdown checklist. No preamble.`,
        messages: [{ role: 'user', content: `Feature: ${featureId}\n${fileContext}\n\nGenerate the QA checklist.` }]
    });
    const checklist = res.content[0].text.trim();
    memory.write(`Projects/QA-${featureId}.md`, `# QA: ${featureId}\n\n${checklist}`);
    return { checklist, featureId };
}

// ── gstack-pattern: Release Check — pre-deploy verification ──────────────────
async function releaseCheck(features = []) {
    const roadmap = parseRoadmap();
    const completedIds = Object.values(roadmap).flatMap(ws => ws.completed.map(f => f.id));
    const pendingCount = Object.values(roadmap).reduce((a, ws) => a + ws.pending.length, 0);

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'releaseCheck',
        maxTokens: 1000,
        system: `You are the Release Manager for Apex AI OS. Produce a go/no-go release assessment.
Check: completed features, pending blockers, known risks, recommended action.
Format: ## Go/No-Go\n[decision]\n\n## Blockers\n[list]\n\n## Risks\n[list]\n\n## Recommended Action\n[action]`,
        messages: [{ role: 'user', content: `Completed features: ${completedIds.join(', ')}\nPending features: ${pendingCount}\nFeatures in this release: ${features.join(', ') || 'unspecified'}\n\nGo/No-Go?` }]
    });
    const report = res.content[0].text.trim();
    memory.write(`Projects/ReleaseCheck-${new Date().toISOString().split('T')[0]}.md`, report);
    return { report, completedFeatures: completedIds.length, pendingFeatures: pendingCount };
}

// ── gstack-pattern: Retrospective — weekly learning capture ──────────────────
async function retro(period = 'week') {
    const lessons = memory.getLessons ? memory.getLessons() : '';
    const decisions = (() => { try { return require('./obsidian-client').obsidianRead('System/Decisions.md'); } catch { return Promise.resolve(''); } })();

    const [lessonsText, decisionsText] = await Promise.all([
        typeof lessons === 'string' ? lessons : Promise.resolve(''),
        decisions
    ]);

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'retro',
        maxTokens: 1500,
        system: `You are facilitating a ${period}ly retrospective for Apex AI OS.
Format: ## What Worked\n## What Didn't\n## Surprises\n## Next ${period[0].toUpperCase()}${period.slice(1)} Actions (3 max)
Be specific. Extract from lessons/decisions, not generic platitudes.`,
        messages: [{ role: 'user', content: `Recent lessons:\n${String(lessonsText).slice(0, 1000)}\n\nRecent decisions:\n${String(decisionsText).slice(0, 1000)}\n\nRun the retro.` }]
    });
    const report = res.content[0].text.trim();
    const date = new Date().toISOString().split('T')[0];
    memory.write(`System/Retro-${date}.md`, `# Retrospective ${date}\n\n${report}`);
    return { report, period };
}

// ── gstack-pattern: Investigate — systematic root-cause analysis ──────────────
async function investigate(errorDescription, context = {}) {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'investigate',
        maxTokens: 2000,
        system: `You are a systematic debugger for Apex AI OS (Node.js/Express/Supabase/Playwright).
Use the 5-Whys method. Format:
## Symptoms\n## Root Cause Hypothesis\n## Evidence Needed\n## 5-Whys\n## Fix Strategy\n## Rollback Plan
Be specific. Name files and line numbers where possible.`,
        messages: [{ role: 'user', content: `Error: ${errorDescription}\nContext: ${JSON.stringify(context, null, 2)}\n\nInvestigate.` }]
    });
    const report = res.content[0].text.trim();
    memory.logLesson(`Investigation: ${errorDescription.slice(0, 100)} → ${report.split('\n')[0]}`);
    return { report, error: errorDescription };
}

// ── gstack-pattern: Benchmark — performance baseline capture ─────────────────
async function benchmark(urls = []) {
    const browserAgent = (() => { try { return require('./browser-agent'); } catch { return null; } })();
    if (!browserAgent) return { error: 'browser-agent not available' };

    const results = [];
    for (const url of urls.slice(0, 5)) {
        try {
            const vitals = await browserAgent.webVitals(url);
            results.push(vitals);
        } catch (e) {
            results.push({ url, error: e.message });
        }
    }
    const date = new Date().toISOString().split('T')[0];
    memory.write(`Projects/Benchmark-${date}.md`,
        `# Benchmark ${date}\n\n` + results.map(r =>
            `## ${r.url}\n- LCP: ${r.vitals?.lcp}ms (${r.ratings?.lcp})\n- CLS: ${r.vitals?.cls} (${r.ratings?.cls})\n- TTFB: ${r.vitals?.ttfb}ms (${r.ratings?.ttfb})`
        ).join('\n\n')
    );
    return { results, date };
}

// ── gstack-pattern: Code Review — structured peer review via Claude ───────────
async function codeReview(filePaths = [], context = '') {
    const fileContext = filePaths.map(fp => {
        try {
            const abs = path.isAbsolute(fp) ? fp : path.join(ROOT, fp);
            return `\`\`\`\n// ${fp}\n${require('fs').readFileSync(abs, 'utf8').slice(0, 2000)}\n\`\`\``;
        } catch { return `// ${fp} (not found)`; }
    }).join('\n\n');

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'codeReview',
        maxTokens: 2500,
        system: `You are a senior engineer reviewing code for Apex AI OS (Node.js/Express/Supabase).
Review for: correctness, security (STRIDE), performance, maintainability, adherence to project style.
Format: ## Summary\n## Critical Issues\n## Minor Issues\n## Security (STRIDE)\n## Recommendations
Be specific — include line numbers and code snippets. No preamble.`,
        messages: [{ role: 'user', content: `${context ? `Context: ${context}\n\n` : ''}${fileContext}\n\nReview this code.` }]
    });
    const report = res.content[0].text.trim();
    const date = new Date().toISOString().split('T')[0];
    memory.write(`Projects/CodeReview-${date}-${Date.now()}.md`, `# Code Review\n\n${report}`);
    return { report, files: filePaths };
}

// ── gstack-pattern: Plan Eng Review — architecture and technical review ───────
async function planEngReview(featureId, planObj = {}) {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'planEngReview',
        maxTokens: 2000,
        system: `You are the engineering lead for Apex AI OS reviewing a feature plan.
Check: feasibility, API design, data model impact, security risks, complexity accuracy, missing steps.
Format: ## Verdict (approve/revise/reject)\n## Technical Concerns\n## Suggested Changes\n## Risk Rating (low/medium/high)
Be blunt. If the plan has gaps, name them specifically.`,
        messages: [{ role: 'user', content: `Feature: ${featureId}\n\nPlan:\n${JSON.stringify(planObj, null, 2)}\n\nEngineering review.` }]
    });
    const report = res.content[0].text.trim();
    memory.write(`Projects/EngReview-${featureId}.md`, `# Engineering Review: ${featureId}\n\n${report}`);
    return { report, featureId };
}

// ── gstack-pattern: Plan Design Review — UX and visual quality review ─────────
async function planDesignReview(featureId, spec = '') {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'planDesignReview',
        maxTokens: 2000,
        system: `You are the design lead for Apex AI OS reviewing a feature's UX/UI specification.
Apply: Emil Kowalski motion restraint, OKLCH color, 44px touch targets, WCAG AA.
Check: information architecture, empty states, error states, loading states, voice-first considerations.
Format: ## Verdict (approve/revise)\n## UX Issues\n## Visual Issues\n## Accessibility Gaps\n## Motion Notes`,
        messages: [{ role: 'user', content: `Feature: ${featureId}\n\nSpec:\n${spec}\n\nDesign review.` }]
    });
    const report = res.content[0].text.trim();
    memory.write(`Projects/DesignReview-${featureId}.md`, `# Design Review: ${featureId}\n\n${report}`);
    return { report, featureId };
}

// ── gstack-pattern: Design Consultation — open-ended design ideation ──────────
async function designConsultation(brief) {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'designConsultation',
        maxTokens: 2000,
        system: `You are a product designer for Apex AI OS — voice-first, calm, purposeful.
Reference: Emil Kowalski (motion restraint), OKLCH color, minimal but warm.
For the brief below, provide: the core design principle, 3 direction options, tradeoffs, and recommended direction.
Format: ## Core Principle\n## Direction A\n## Direction B\n## Direction C\n## Recommended\n## Key Tradeoffs`,
        messages: [{ role: 'user', content: `Design brief: ${brief}` }]
    });
    const report = res.content[0].text.trim();
    memory.write(`Projects/DesignConsult-${Date.now()}.md`, `# Design Consultation\n\n**Brief:** ${brief}\n\n${report}`);
    return { report, brief };
}

// ── gstack-pattern: Design Shotgun — rapid multi-direction UI concept ─────────
// Generates N distinct design directions for the same brief in one pass.
async function designShotgun(brief, variants = 3) {
    const n = Math.min(Math.max(variants, 2), 5);
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'designShotgun',
        maxTokens: 3000,
        system: `You are a product designer generating ${n} maximally distinct UI directions for Apex AI OS.
Each direction should differ fundamentally in visual language, hierarchy, or interaction model.
For each: name, one-sentence philosophy, key visual decisions, motion approach, risk.
Format: ## Direction 1: [Name]\n...\n## Direction ${n}: [Name]\n...\n## Recommendation`,
        messages: [{ role: 'user', content: `Brief: ${brief}\n\nGenerate ${n} distinct design directions.` }]
    });
    const report = res.content[0].text.trim();
    memory.write(`Projects/DesignShotgun-${Date.now()}.md`, `# Design Shotgun: ${brief}\n\n${report}`);
    return { report, brief, variants: n };
}

// ── gstack-pattern: Document Release — structured release notes ───────────────
async function documentRelease(features = [], version = '') {
    const roadmap = parseRoadmap();
    const completedFeatures = Object.values(roadmap).flatMap(ws =>
        ws.completed.filter(f => features.length === 0 || features.includes(f.id))
    );

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'documentRelease',
        maxTokens: 2000,
        system: `You are writing release notes for Apex AI OS.
Format: user-facing, clear, benefit-oriented. No jargon.
Structure: ## What's New\n## Improvements\n## Bug Fixes\n## Breaking Changes (if any)\n## Upgrade Notes
Each item: one sentence, user-benefit framing.`,
        messages: [{ role: 'user', content: `Version: ${version || 'next'}\nFeatures:\n${completedFeatures.map(f => `- ${f.id}: ${f.title}`).join('\n') || 'See description'}\n\nWrite release notes.` }]
    });
    const notes = res.content[0].text.trim();
    const date = new Date().toISOString().split('T')[0];
    const v = version || date;
    memory.write(`Projects/Release-${v}.md`, `# Release Notes — ${v}\n\n${notes}`);
    return { notes, version: v, featureCount: completedFeatures.length };
}

// ── gstack-pattern: Canary — lightweight pre-deploy sanity check ──────────────
// Checks live URLs for HTTP 200, response time, and basic content assertion.
async function canary(urls = [], assertions = []) {
    const https = require('https');
    const http = require('http');
    const results = [];

    for (const url of urls.slice(0, 10)) {
        const start = Date.now();
        try {
            await new Promise((resolve, reject) => {
                const mod = url.startsWith('https') ? https : http;
                const req = mod.get(url, { timeout: 8000 }, (res) => {
                    res.resume();
                    results.push({ url, status: res.statusCode, ms: Date.now() - start, ok: res.statusCode < 400 });
                    resolve();
                });
                req.on('error', e => { results.push({ url, error: e.message, ok: false }); resolve(); });
                req.on('timeout', () => { req.destroy(); results.push({ url, error: 'timeout', ok: false }); resolve(); });
            });
        } catch (e) {
            results.push({ url, error: e.message, ok: false });
        }
    }

    const allOk = results.every(r => r.ok);
    const date = new Date().toISOString().split('T')[0];
    memory.write(`Projects/Canary-${date}.md`,
        `# Canary Check — ${date}\n\n` +
        results.map(r => `- ${r.ok ? '✓' : '✗'} ${r.url} ${r.status || r.error} ${r.ms ? `(${r.ms}ms)` : ''}`).join('\n')
    );
    return { allOk, results };
}

// ── gstack-pattern: Ship — orchestrated deploy workflow ───────────────────────
// Runs: canary → release-check → git tag → push
async function ship(featureId, opts = {}) {
    const releaseTag = opts.tag || `v${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)}`;

    // Pre-ship checks
    const releaseResult = await releaseCheck([featureId]);
    const goLine = (releaseResult.report || '').split('\n').find(l => /go\/no-go|decision/i.test(l));
    const isGo = !goLine || !/no.go/i.test(goLine);

    if (!isGo && !opts.force) {
        return { shipped: false, featureId, reason: 'Release check returned No-Go', report: releaseResult.report };
    }

    // Git tag + push
    let tagResult = 'skipped';
    if (_ghToken) {
        try {
            const repoUrl = `https://oauth2:${_ghToken}@github.com/APoLLoGoD666/ai-os-server.git`;
            const _tagR = spawnSync('git', ['tag', releaseTag], { cwd: ROOT, stdio: 'pipe' });
            if (_tagR.status !== 0) throw new Error(_tagR.stderr?.toString() || 'git tag failed');
            const _pushR = spawnSync('git', ['push', repoUrl, releaseTag], { cwd: ROOT, stdio: 'pipe' });
            if (_pushR.status !== 0) throw new Error(_pushR.stderr?.toString() || 'git push failed');
            tagResult = releaseTag;
        } catch (e) {
            tagResult = `tag-failed: ${_mask(e.message).slice(0, 100)}`;
        }
    }

    const notes = await documentRelease([featureId], releaseTag);
    memory.write(`Projects/Ship-${releaseTag}.md`,
        `# Ship: ${featureId}\n\n**Tag:** ${releaseTag}\n**Go/No-Go:** ${isGo ? 'GO' : 'NO-GO (forced)'}\n\n${notes.notes}`
    );
    return { shipped: true, featureId, tag: tagResult, releaseNotes: notes.notes };
}

// ── gstack-pattern: Codex — internal knowledge search ────────────────────────
// Searches Obsidian vault + recent decisions/lessons for relevant context.
async function codex(query) {
    const memory_mod = require('./obsidian-memory');
    const { obsidianRead } = require('./obsidian-client');

    // Pull relevant vault pages
    const candidates = ['System/WIKI.md', 'System/Decisions.md', 'System/Lessons.md', 'System/North-Star.md'];
    const pages = await Promise.all(candidates.map(async p => {
        try { return { path: p, content: (await obsidianRead(p) || '').slice(0, 1500) }; }
        catch { return null; }
    }));
    const corpus = pages.filter(Boolean).map(p => `## ${p.path}\n${p.content}`).join('\n\n---\n\n');

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'codex',
        maxTokens: 1500,
        system: `You are the institutional memory for Apex AI OS.
Search the vault corpus for what's relevant to the query.
Return: exact quotes, page references, synthesis of relevant context, and what's NOT found.
Format: ## Found\n## Gaps\n## Synthesis`,
        messages: [{ role: 'user', content: `Query: ${query}\n\nVault corpus:\n${corpus.slice(0, 3000)}` }]
    });
    return { answer: res.content[0].text.trim(), query };
}

// ── gstack-pattern: Autoplan — generate feature plan from natural language ────
// Skips the roadmap lookup — useful for ad-hoc or experimental features.
async function autoplan(description, workstream = 'Operations') {
    const syntheticFeature = { id: `FEAT-AUTO-${Date.now()}`, title: description };
    const plan = await planFeature(syntheticFeature, workstream);
    memory.write(`Projects/Autoplan-${Date.now()}.md`,
        `# Autoplan\n\n**Description:** ${description}\n\n` +
        `**Approach:** ${plan.approach}\n\n` +
        `**Steps:**\n${(plan.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
        `**Complexity:** ${plan.estimatedComplexity}\n` +
        `**Files to create:** ${(plan.filesToCreate || []).join(', ')}`
    );
    return { plan, description };
}

// ── gstack-pattern: Pair agent — interactive pair-programming session ─────────
// Given a task + existing code, returns next concrete step + reasoning.
async function pairAgent(task, currentCode = '', lastError = '') {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'pairAgent',
        maxTokens: 2000,
        system: `You are a pair programmer for Apex AI OS (Node.js/Express/Supabase).
Your role: give the next SINGLE concrete step to move the task forward.
Rules: one step only, with exact code or command; no future planning; fix errors first.
Format: ## Next Step\n[exact action]\n\n## Why\n[one sentence]\n\n## Code\n\`\`\`js\n...\n\`\`\``,
        messages: [{ role: 'user', content: `Task: ${task}\n${lastError ? `\nLast error:\n${lastError}\n` : ''}${currentCode ? `\nCurrent code:\n${currentCode.slice(0, 1500)}` : ''}` }]
    });
    const step = res.content[0].text.trim();
    return { step, task, hasError: !!lastError };
}

// ── gstack-pattern: Careful — pre-write review before applying file changes ───
// Given intended changes, returns risk assessment before any code is written.
async function careful(fileToChange, intendedChange, existingContent = '') {
    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'careful',
        maxTokens: 1500,
        system: `You are a careful senior engineer reviewing a proposed change before it is applied.
Check: does it break anything? does it conflict with existing code? is there a safer approach?
Format: ## Risk (low/medium/high)\n## Conflicts\n## Side Effects\n## Recommended Approach\n## Safe to Proceed? (yes/no/revise)`,
        messages: [{ role: 'user', content: `File: ${fileToChange}\n\nIntended change:\n${intendedChange}\n\nExisting content (excerpt):\n${existingContent.slice(0, 1500)}` }]
    });
    const review = res.content[0].text.trim();
    const safe = /safe to proceed\?\s*(yes)/i.test(review);
    return { review, safe, fileToChange };
}

// ── gstack-pattern: Freeze — verify branch is release-ready before freeze ─────
async function freeze(branchName = 'main') {
    let gitStatus = '';
    try {
        const { execSync } = require('child_process');
        gitStatus = execSync('git status --short && git log --oneline -5', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) { gitStatus = `git error: ${e.message}`; }

    const { result: res } = await runtime.execute({
        tier: 'fast', caller: 'freeze',
        maxTokens: 800,
        system: `You are enforcing a branch freeze check for Apex AI OS.
A freeze means: no new features, only critical bug fixes.
Assess the git status and recent commits. Decide if it's safe to freeze.
Format: ## Freeze Decision (SAFE/NOT SAFE)\n## Uncommitted Changes\n## Recent Commits Summary\n## Recommended Action`,
        messages: [{ role: 'user', content: `Branch: ${branchName}\n\nGit state:\n${gitStatus}` }]
    });
    const report = res.content[0].text.trim();
    const freezeSafe = /freeze decision.*safe/i.test(report) && !/not safe/i.test(report);
    return { report, freezeSafe, branch: branchName };
}

// ── gstack-pattern: QA Run — execute QA checklist against live URLs ───────────
// Distinct from qaLead (which generates the checklist) — this runs it.
async function qaRun(featureId, urls = [], checklist = []) {
    const browserAgent = (() => { try { return require('./browser-agent'); } catch { return null; } })();
    const results = [];

    for (const url of urls.slice(0, 5)) {
        const urlResult = { url, checks: [] };
        try {
            const [vitals, aria, console_] = await Promise.all([
                browserAgent ? browserAgent.webVitals(url) : Promise.resolve(null),
                browserAgent ? browserAgent.ariaSnapshot(url) : Promise.resolve(null),
                browserAgent ? browserAgent.consoleMonitor(url, { filter: 'error' }) : Promise.resolve(null)
            ]);
            if (vitals) urlResult.checks.push({ check: 'web-vitals', ratings: vitals.ratings, passed: vitals.ratings?.lcp !== 'poor' });
            if (aria) urlResult.checks.push({ check: 'aria-accessible', passed: !!aria.ariaTree });
            if (console_) urlResult.checks.push({ check: 'no-console-errors', passed: console_.errorCount === 0, errors: console_.logs?.slice(0, 5) });
        } catch (e) {
            urlResult.error = e.message;
        }
        results.push(urlResult);
    }

    const passedAll = results.every(r => r.checks?.every(c => c.passed));
    const date = new Date().toISOString().split('T')[0];
    memory.write(`Projects/QARunReport-${featureId}-${date}.md`,
        `# QA Run: ${featureId}\n\n**Passed:** ${passedAll}\n\n` +
        results.map(r => `## ${r.url}\n${r.checks?.map(c => `- [${c.passed ? 'x' : ' '}] ${c.check}`).join('\n') || r.error}`).join('\n\n')
    );
    return { passedAll, results, featureId };
}

module.exports = {
    runMasterOrchestrator, runFeature, parseRoadmap,
    runFeatureWithPermission, autoApproveStandardPermissions,
    officeHours, qaLead, releaseCheck, retro, investigate, benchmark,
    codeReview, planEngReview, planDesignReview,
    designConsultation, designShotgun, documentRelease,
    canary, ship, codex,
    autoplan, pairAgent, careful, freeze, qaRun
};
