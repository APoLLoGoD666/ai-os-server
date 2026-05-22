"use strict";
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const memory = require('./obsidian-memory');

const ROOT = path.join(__dirname, '..');
const MODEL = 'claude-sonnet-4-6';
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
}

// ── Plan a feature using Claude ──────────────────────────────────
async function planFeature(feature, workstream) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const context = memory.getFullContext();

    const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
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

PRINCIPLES:
- Plan before building — write spec for any 3+ step task
- Minimal code impact — touch only what is necessary
- No temporary fixes — find root causes
- Verify before done — prove it works
- Ask: would a staff engineer approve this?

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

    if (plan.permissionRequired) {
        console.log(`[Master] ${feature.id} requires permission: ${plan.permissionReason}`);
        // Write permission request to Supabase notifications
        const { createClient } = require('@supabase/supabase-js');
        const _sb = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
        );
        await _sb.from('apex_notifications').insert({
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
        console.log(`[Master] ${feature.id} completed — commit ${result.commitHash}`);
    } else {
        memory.logLesson(
            `${feature.id} failed: ${result.error}. ` +
            `Workstream: ${workstream}. ` +
            `Plan approach was: ${plan.approach}`
        );
        console.error(`[Master] ${feature.id} failed: ${result.error}`);
    }

    return result;
}

// ── Run a full workstream sequentially ───────────────────────────
async function runWorkstream(workstreamName, workstream) {
    console.log(`[Master] Workstream starting: ${workstreamName} (${workstream.pending.length} features)`);
    const results = [];

    for (const feature of workstream.pending) {
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
            return await runAgentTeam(spec, feature.id);
        }
    }
    throw new Error(`${featureId} not found in roadmap`);
}

module.exports = { runMasterOrchestrator, runFeature, parseRoadmap, runFeatureWithPermission };
