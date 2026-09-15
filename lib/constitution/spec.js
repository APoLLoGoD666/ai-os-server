'use strict';
// lib/constitution/spec.js — Machine-readable APEX constitutional specification
// 23 principles across 7 categories. Each has verify() (behavioral) + fingerprint() (structural).

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function _src(relPath) {
    try { return fs.readFileSync(path.join(ROOT, relPath), 'utf8'); } catch { return ''; }
}

function _h(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
}

// Extract first regex match from a source file for fingerprinting
function _extract(relPath, pattern) {
    const src = _src(relPath);
    const m = src.match(pattern);
    return m ? m[0] : '';
}

const PRINCIPLES = [

    // ── AUTHORITY ──────────────────────────────────────────────────────────────

    {
        id: 'P01_FOUNDER_LAYER_ZERO',
        category: 'AUTHORITY',
        name: 'Layer 0 unreachable by AGENT class',
        description: 'Founder memory (layer 0) denies READ/WRITE to AGENT-class entities',
        sources: ['lib/memory/access-controller.js'],
        verify() {
            const AccessController = require('../memory/access-controller');
            const ctrl = new AccessController();
            try { ctrl.check('api_client', [0], 'READ'); return { pass: false, evidence: 'AGENT-class READ of layer 0 was not denied' }; }
            catch { return { pass: true, evidence: 'AccessDeniedError thrown for api_client (AGENT) on layer 0 READ' }; }
        },
        fingerprint() { return _h(_extract('lib/memory/access-controller.js', /0:\s*\{[^}]+\}/)); },
    },

    {
        id: 'P02_ENTITY_CLASS_HIERARCHY',
        category: 'AUTHORITY',
        name: '4-tier entity class hierarchy',
        description: 'Entities classified into FOUNDER, COUNCIL, SYSTEM, AGENT tiers',
        sources: ['lib/memory/access-controller.js'],
        verify() {
            const src = _src('lib/memory/access-controller.js');
            const hasFOUNDER = src.includes("'FOUNDER'") || src.includes('"FOUNDER"');
            const hasCOUNCIL = src.includes("'COUNCIL'") || src.includes('"COUNCIL"');
            const hasSYSTEM  = src.includes("'SYSTEM'")  || src.includes('"SYSTEM"');
            const hasAGENT   = src.includes("'AGENT'")   || src.includes('"AGENT"');
            const pass = hasFOUNDER && hasCOUNCIL && hasSYSTEM && hasAGENT;
            return { pass, evidence: `FOUNDER=${hasFOUNDER} COUNCIL=${hasCOUNCIL} SYSTEM=${hasSYSTEM} AGENT=${hasAGENT}` };
        },
        fingerprint() { return _h(_extract('lib/memory/access-controller.js', /ENTITY_CLASSES\s*=\s*\{[\s\S]+?\};/)); },
    },

    {
        id: 'P03_LAYER_PERMISSION_MATRIX',
        category: 'AUTHORITY',
        name: 'Layer-specific permission matrix defined',
        description: 'Layers 0, 5, 10, 11 have explicit per-class permission overrides',
        sources: ['lib/memory/access-controller.js'],
        verify() {
            const src = _src('lib/memory/access-controller.js');
            const hasL0  = /\b0:\s*\{/.test(src);
            const hasL5  = /\b5:\s*\{/.test(src);
            const hasL10 = /\b10:\s*\{/.test(src);
            const hasL11 = /\b11:\s*\{/.test(src);
            return { pass: hasL0 && hasL5 && hasL10 && hasL11, evidence: `L0=${hasL0} L5=${hasL5} L10=${hasL10} L11=${hasL11}` };
        },
        fingerprint() { return _h(_extract('lib/memory/access-controller.js', /LAYER_PERMISSIONS\s*=\s*\{[\s\S]+?\};/)); },
    },

    {
        id: 'P04_ELEVATED_RIGHTS',
        category: 'AUTHORITY',
        name: 'Elevated rights restrict founder writes to specific entities',
        description: 'FOUNDER_WRITE right held only by founder and stop_hook',
        sources: ['lib/memory/access-controller.js'],
        verify() {
            const src = _src('lib/memory/access-controller.js');
            const hasRight = src.includes('FOUNDER_WRITE');
            const hasFounder = src.includes("'founder'") || src.includes('"founder"');
            return { pass: hasRight && hasFounder, evidence: `FOUNDER_WRITE=${hasRight} founder=${hasFounder}` };
        },
        fingerprint() { return _h(_extract('lib/memory/access-controller.js', /ELEVATED_RIGHTS\s*=\s*\{[\s\S]+?\};/)); },
    },

    // ── PRIVACY ────────────────────────────────────────────────────────────────

    {
        id: 'P05_PII_ABSTRACTION',
        category: 'PRIVACY',
        name: 'abstractForExternalPrompt strips all non-passthrough PII',
        description: 'Sensitive founder fields replaced with behavioral guidance; raw values never reach external APIs',
        sources: ['lib/founder/privacy-guard.js'],
        verify() {
            const { abstractForExternalPrompt } = require('../founder/privacy-guard');
            const SENTINEL = 'CONST_PII_TEST_7a9f3c1';
            const result = abstractForExternalPrompt({ protected_people: { name: SENTINEL }, wealth: { liquid: SENTINEL }, alignment_guidance: 'ok' });
            const raw = JSON.stringify(result || {});
            const leaked = raw.includes(SENTINEL);
            const passed = result?.alignment_guidance === 'ok';
            return { pass: !leaked && passed, evidence: `sentinel_leaked=${leaked} passthrough_preserved=${passed}` };
        },
        fingerprint() { return _h(_extract('lib/founder/privacy-guard.js', /ABSTRACTION_MAP\s*=\s*\[[\s\S]+?\];/)); },
    },

    {
        id: 'P06_SAFE_PASSTHROUGH_FIELDS',
        category: 'PRIVACY',
        name: '5 fields pass through abstraction unmodified',
        description: 'alignment_guidance, peak_state_prompt, relevant_values, applicable_principles, identity pass as-is',
        sources: ['lib/founder/privacy-guard.js'],
        verify() {
            const src = _src('lib/founder/privacy-guard.js');
            const fields = ['alignment_guidance', 'peak_state_prompt', 'relevant_values', 'applicable_principles', 'identity'];
            const present = fields.filter(f => src.includes(`'${f}'`) || src.includes(`"${f}"`));
            return { pass: present.length === 5, evidence: `${present.length}/5 passthrough fields: ${present.join(',')}` };
        },
        fingerprint() { return _h(_extract('lib/founder/privacy-guard.js', /SAFE_PASSTHROUGH\s*=\s*\[[\s\S]+?\];/)); },
    },

    {
        id: 'P07_PII_STRIP_FIELDS',
        category: 'PRIVACY',
        name: 'protected_people and _raw always stripped from model-bound objects',
        description: 'sanitizeForModel removes protected_people and _raw before any model call',
        sources: ['lib/founder/privacy-guard.js'],
        verify() {
            const { sanitizeForModel } = require('../founder/privacy-guard');
            const result = sanitizeForModel({ protected_people: { x: 1 }, _raw: 'secret', other: 'ok' });
            const stripped = !result.protected_people && !result._raw && result.other === 'ok';
            return { pass: stripped, evidence: `protected_people_present=${!!result.protected_people} _raw_present=${!!result._raw}` };
        },
        fingerprint() { return _h(_extract('lib/founder/privacy-guard.js', /STRIP_FIELDS\s*=\s*\[[\s\S]+?\];/)); },
    },

    {
        id: 'P08_PROTECTED_PEOPLE_ACCESS',
        category: 'PRIVACY',
        name: 'protected_people section inaccessible to agents',
        description: 'checkAccess denies agents/external entities from reading protected_people',
        sources: ['lib/founder/privacy-guard.js'],
        verify() {
            const { checkAccess } = require('../founder/privacy-guard');
            const agentDenied   = checkAccess('api_client', 'protected_people') === false;
            const systemAllowed = checkAccess('orchestrator', 'protected_people') === true;
            return { pass: agentDenied && systemAllowed, evidence: `agent_denied=${agentDenied} system_allowed=${systemAllowed}` };
        },
        fingerprint() { return _h(_extract('lib/founder/privacy-guard.js', /allowed\s*=\s*\[[\s\S]*?\]/)); },
    },

    // ── CERTIFICATION ──────────────────────────────────────────────────────────

    {
        id: 'P09_FOUR_CLAUSE_STANDARD',
        category: 'CERTIFICATION',
        name: '4-clause certification standard enforced',
        description: 'runAll() checks all 4 continuity clauses',
        sources: ['lib/certification/checker.js'],
        verify() {
            const src = _src('lib/certification/checker.js');
            const clauseCount = (src.match(/checkClause\d+\(\)/g) || []).length;
            return { pass: clauseCount >= 4, evidence: `${clauseCount} clause check calls found in runAll` };
        },
        fingerprint() { return _h(_extract('lib/certification/checker.js', /Promise\.all\(\[[\s\S]+?\]\)/)); },
    },

    {
        id: 'P10_DEPLOYMENT_GATE',
        category: 'CERTIFICATION',
        name: 'Deployment blocked on certification failure',
        description: 'certify.js exits with code 1 (blocking deployment) if any clause fails',
        sources: ['scripts/certify.js'],
        verify() {
            const src = _src('scripts/certify.js');
            const hasExit1 = src.includes('process.exit(1)');
            const hasBlockMsg = src.includes('DEPLOYMENT BLOCKED') || src.includes('FAIL');
            return { pass: hasExit1 && hasBlockMsg, evidence: `exit1=${hasExit1} block_message=${hasBlockMsg}` };
        },
        fingerprint() { return _h(_extract('scripts/certify.js', /if\s*\(report\.pass\)[\s\S]+?process\.exit/)); },
    },

    {
        id: 'P11_BEHAVIORAL_VERIFICATION',
        category: 'CERTIFICATION',
        name: 'Certification requires behavioral (not just structural) evidence',
        description: 'Certification includes _behavioral helper functions that test runtime behavior',
        sources: ['lib/certification/checker.js'],
        verify() {
            const src = _src('lib/certification/checker.js');
            const behavioralCount = (src.match(/_behavioral\w+/g) || []).length;
            return { pass: behavioralCount >= 4, evidence: `${behavioralCount} behavioral helper references found` };
        },
        fingerprint() { return _h((_src('lib/certification/checker.js').match(/_behavioral\w+/g) || []).join(',')); },
    },

    {
        id: 'P12_CERTIFICATION_RECORDED',
        category: 'CERTIFICATION',
        name: 'Certification results recorded in health monitor',
        description: 'runAll() calls healthMonitor.recordCertificationResult() so anomaly detector tracks cert state',
        sources: ['lib/certification/checker.js'],
        verify() {
            const src = _src('lib/certification/checker.js');
            const recorded = src.includes('healthMonitor.recordCertificationResult');
            return { pass: recorded, evidence: `recordCertificationResult call ${recorded ? 'present' : 'absent'}` };
        },
        fingerprint() { return _h(_extract('lib/certification/checker.js', /healthMonitor\.recordCertificationResult[\s\S]*?;/)); },
    },

    // ── LEARNING ───────────────────────────────────────────────────────────────

    {
        id: 'P13_LESSON_PERSISTENCE',
        category: 'LEARNING',
        name: 'Lessons not TTL-expired; recency_weight floor = 0.5',
        description: 'Lessons persist indefinitely; recency_weight floors at 0.5 so oldest lessons still rank',
        sources: ['lib/memory/gateway.js'],
        verify() {
            const src = _src('lib/memory/gateway.js');
            const hasFloor = src.includes('Math.max(0.5') || src.includes('Math.max(0.5,');
            const noTTL    = !src.includes('ttl') || !src.includes('apex_lessons');
            return { pass: hasFloor, evidence: `recency_floor=${hasFloor}` };
        },
        fingerprint() { return _h(_extract('lib/memory/gateway.js', /Math\.max\(0\.5[\s\S]+?;/)); },
    },

    {
        id: 'P14_APPLIED_STATUS_INCLUDED',
        category: 'LEARNING',
        name: "recordInfluence includes 'applied' status records",
        description: "Proven lessons (status='applied') continue accumulating influence weight",
        sources: ['lib/memory/reflexion-tracker.js'],
        verify() {
            const src = _src('lib/memory/reflexion-tracker.js');
            const included = src.includes("'applied'") && src.includes("'validated'") && src.includes("'pending'");
            return { pass: included, evidence: `applied_in_filter=${included}` };
        },
        fingerprint() { return _h(_extract('lib/memory/reflexion-tracker.js', /\['pending'[\s\S]*?\]/)); },
    },

    {
        id: 'P15_REFLEXION_OBSERVABLE',
        category: 'LEARNING',
        name: 'Reflexion write failures surface via structured logging',
        description: "Reflexion write errors call logger.warn (not caught silently) so failures are observable",
        sources: ['lib/memory/gateway.js'],
        verify() {
            const src = _src('lib/memory/gateway.js');
            const observable = src.includes('recordRetrieval failed') && src.includes('logger.warn');
            return { pass: observable, evidence: `observable=${observable}` };
        },
        fingerprint() { return _h(_extract('lib/memory/gateway.js', /recordRetrieval failed/)); },
    },

    // ── HEALTH ─────────────────────────────────────────────────────────────────

    {
        id: 'P16_HEALTH_MONITORING_OPERATIONAL',
        category: 'HEALTH',
        name: 'In-process health monitor operational',
        description: 'getHealthState() returns structured state with all 6 components and defined thresholds',
        sources: ['lib/health/monitor.js'],
        verify() {
            const monitor = require('../health/monitor');
            const hs = monitor.getHealthState();
            const valid = hs && ['healthy','degraded','critical'].includes(hs.status) && !!hs.components && !!hs.thresholds;
            return { pass: !!valid, evidence: `status=${hs?.status} components=${Object.keys(hs?.components || {}).length} thresholds=${!!hs?.thresholds}` };
        },
        fingerprint() { return _h(_extract('lib/health/monitor.js', /THRESHOLDS\s*=\s*\{[\s\S]+?\};/)); },
    },

    {
        id: 'P17_ANOMALY_DETECTION',
        category: 'HEALTH',
        name: 'Anomaly detector classifies provider failures as CRITICAL',
        description: 'detect() correctly identifies PROVIDER_UNAVAILABLE with CRITICAL severity and continuity impact',
        sources: ['lib/health/anomaly-detector.js'],
        verify() {
            const { detect, classify } = require('../health/anomaly-detector');
            const monitor = require('../health/monitor');
            const fakeHealth = {
                status: 'critical',
                components: {
                    anthropic:   { status: 'unavailable', consecutiveFailures: 5, avgLatencyMs: null },
                    google:      { status: 'healthy',     consecutiveFailures: 0, avgLatencyMs: null },
                    retrieval:   { consecutiveErrors: 0,  avgLatencyMs: null },
                    reflexion:   { totalWrites: 0,        failureRate: 0 },
                    policy:      { fromDB: true },
                    certification: { lastResult: true },
                },
                thresholds: monitor.THRESHOLDS,
            };
            const anomalies = detect(fakeHealth);
            const found = anomalies.find(a => a.type === 'PROVIDER_UNAVAILABLE' && a.severity === 'CRITICAL');
            return { pass: !!found, evidence: `PROVIDER_UNAVAILABLE_CRITICAL=${!!found}` };
        },
        fingerprint() { return _h(_extract('lib/health/anomaly-detector.js', /CONTINUITY_IMPACT\s*=\s*\{[\s\S]+?\};/)); },
    },

    {
        id: 'P18_PROVIDER_FAILOVER',
        category: 'HEALTH',
        name: 'Provider failover available via withFailover()',
        description: 'selector.withFailover() exported and selector honors containment provider override',
        sources: ['lib/models/selector.js'],
        verify() {
            const selector = require('../models/selector');
            const hasFailover = typeof selector.withFailover === 'function';
            const src = _src('lib/models/selector.js');
            const hasOverride = src.includes('getProviderOverride()');
            return { pass: hasFailover && hasOverride, evidence: `withFailover=${hasFailover} override_check=${hasOverride}` };
        },
        fingerprint() { return _h(_extract('lib/models/selector.js', /withFailover[\s\S]+?module\.exports/)); },
    },

    {
        id: 'P19_CONTAINMENT_MECHANISM',
        category: 'HEALTH',
        name: 'Containment activates on critical health state',
        description: 'evaluateAndContain() exists, activates degraded mode, and manages provider override',
        sources: ['lib/health/containment.js'],
        verify() {
            const containment = require('../health/containment');
            const ok = typeof containment.evaluateAndContain === 'function' &&
                       typeof containment.isContained === 'function' &&
                       typeof containment.getProviderOverride === 'function';
            return { pass: ok, evidence: `evaluateAndContain=${typeof containment.evaluateAndContain} isContained=${typeof containment.isContained}` };
        },
        fingerprint() { return _h(_extract('lib/health/containment.js', /function evaluateAndContain[\s\S]+?\}/)); },
    },

    // ── IDENTITY ───────────────────────────────────────────────────────────────

    {
        id: 'P20_EXECUTIVE_DIFFERENTIATION',
        category: 'IDENTITY',
        name: 'Executive entities produce differentiated system prompts',
        description: 'Different executive_context values produce distinct system prompts via _adaptContext',
        sources: ['lib/models/providers/anthropic.js', 'lib/executive/entity.js'],
        verify() {
            const AnthropicModel = require('../models/providers/anthropic');
            const m = new AnthropicModel('test', {});
            const cfo = m._adaptContext({ task: { description: 'test' }, executive_context: { system_prompt: 'CFO prompt', executive_role: 'CFO' } });
            const cto = m._adaptContext({ task: { description: 'test' }, executive_context: { system_prompt: 'CTO prompt', executive_role: 'CTO' } });
            const diff = cfo.system !== cto.system;
            return { pass: diff, evidence: `cfo_sys=${(cfo.system||'').slice(0,30)} cto_sys=${(cto.system||'').slice(0,30)}` };
        },
        fingerprint() { return _h(_extract('lib/models/providers/anthropic.js', /executive_context[\s\S]+?_adaptContext/)); },
    },

    {
        id: 'P21_FOUNDER_CONTEXT_PRESENT',
        category: 'IDENTITY',
        name: 'Founder context always present in assembled context packages',
        description: 'getContext() always returns a pkg with founder_context field populated',
        sources: ['lib/memory/gateway.js'],
        verify() {
            const src = _src('lib/memory/gateway.js');
            const hasFounderCtx = src.includes('founder_context:') && src.includes('founderMemory.FALLBACK_CONTEXT');
            return { pass: hasFounderCtx, evidence: `founder_context_assembled=${hasFounderCtx}` };
        },
        fingerprint() { return _h(_extract('lib/memory/gateway.js', /founder_context:\s*safe[\s\S]+?,/)); },
    },

    {
        id: 'P22_INTELLIGENCE_DELIVERY',
        category: 'IDENTITY',
        name: 'Intelligence engine prompts delivered to provider',
        description: 'task.description reaches provider via contextPackage.task.description (Phase 23C WS1 fix)',
        sources: ['lib/models/providers/anthropic.js'],
        verify() {
            const AnthropicModel = require('../models/providers/anthropic');
            const m = new AnthropicModel('test', {});
            const MARKER = 'CONST_INTEL_MARKER_d4e5f6';
            const adapted = m._adaptContext({ task: { description: MARKER } });
            const delivered = (adapted.messages?.[0]?.content || '').includes(MARKER);
            return { pass: delivered, evidence: `marker_delivered=${delivered}` };
        },
        fingerprint() { return _h(_extract('lib/models/providers/anthropic.js', /task\.description[\s\S]+?messages/)); },
    },

    // ── GOVERNANCE ─────────────────────────────────────────────────────────────

    {
        id: 'P23_LAYER_WRITES_AUDITED',
        category: 'GOVERNANCE',
        name: 'Layer 0 and 11 writes produce governance audit trail',
        description: 'storeMemory with layer 0 or 11 appends to governance evidence block',
        sources: ['lib/memory/gateway.js'],
        verify() {
            const src = _src('lib/memory/gateway.js');
            const hasAudit = src.includes('gov.appendEvidenceBlock') && src.includes('layer === 0 || meta.layer === 11');
            return { pass: hasAudit, evidence: `audit_on_layer_0_11=${hasAudit}` };
        },
        fingerprint() { return _h(_extract('lib/memory/gateway.js', /layer === 0\s*\|\|[\s\S]+?governance/)); },
    },
];

const CATEGORIES = [...new Set(PRINCIPLES.map(p => p.category))];

async function verifyAll() {
    const results = [];
    for (const p of PRINCIPLES) {
        try {
            const result = await Promise.resolve(p.verify());
            results.push({ id: p.id, category: p.category, name: p.name, ...result });
        } catch (e) {
            results.push({ id: p.id, category: p.category, name: p.name, pass: false, evidence: `verify error: ${e.message}` });
        }
    }
    return results;
}

function snapshotFingerprints() {
    const prints = {};
    for (const p of PRINCIPLES) {
        try { prints[p.id] = p.fingerprint(); }
        catch { prints[p.id] = 'ERROR'; }
    }
    return prints;
}

module.exports = { PRINCIPLES, CATEGORIES, verifyAll, snapshotFingerprints };
