'use strict';

/**
 * APEX Strategic Planning Engine — Stage 3.5
 *
 * Maintains long-horizon objectives, adaptive execution plans, and world-state
 * modeling. Sits above executive arbitration (Stage 3.4).
 *
 * Does NOT:
 *   - dispatch tools or execute agents
 *   - schedule jobs or queue tasks
 *   - alter execution routing
 *   - touch voice pipeline
 *
 * Does:
 *   - track evolving strategic objectives (in-process, session-scoped)
 *   - decompose goals into template-based plan nodes
 *   - model world-state entities (projects, businesses, systems)
 *   - generate advisory strategic initiatives (zero execution side effects)
 *   - provide strategic continuity hints for /chat responses
 */

const bus = require('./event-bus');

// ── Objective lifecycle states ─────────────────────────────────────────────────

const OBJECTIVE_STATUS = {
    PLANNING:   'PLANNING',
    ACTIVE:     'ACTIVE',
    BLOCKED:    'BLOCKED',
    DEFERRED:   'DEFERRED',
    MONITORING: 'MONITORING',
    COMPLETED:  'COMPLETED',
    ABANDONED:  'ABANDONED',
};

// ── Bounds ─────────────────────────────────────────────────────────────────────

const MAX_OBJECTIVES   = 20;
const MAX_PLAN_NODES   = 15;
const MAX_WORLD_ENT    = 30;
const MAX_INITIATIVES  = 10;
const OBJECTIVE_TTL_MS = 2 * 60 * 60 * 1000; // 2 h
const RESUME_THRESHOLD = 0.20;

// ── Category detection ─────────────────────────────────────────────────────────

const _CAT_RE = {
    business:  /\b(business|revenue|profit|monetis[ae]?|youtube|channel|brand|product|service|client|customer|market|competitor|startup|launch|scale|growth|sales|marketing|seo|funnel|conversion|ecommerce|saas|b2b|b2c|faceless|niche|sponsorship|affiliate|audience)\b/i,
    technical: /\b(api|server|deploy(?:ment)?|architect(?:ure)?|database|schema|system|code|refactor|pipeline|infrastructure|integration|microservice|module|library|framework|backend|frontend|devops)\b/i,
    research:  /\b(research|investigat|analys[ie]|study|explore|understand|evaluate|compare|benchmark|review|audit)\b/i,
    personal:  /\b(habit|routine|fitness|health|personal goal|skill|productivity|schedule|life improvement|sleep|mindset)\b/i,
    system:    /\b(apex|ai os|automation|workflow|monitor|optim(?:is|iz)[ae]?|performance|latency|agent|observability)\b/i,
};

function _detectCategory(text) {
    for (const [cat, re] of Object.entries(_CAT_RE)) {
        if (re.test(text || '')) return cat;
    }
    return 'general';
}

// ── Strategic value estimation ─────────────────────────────────────────────────

function _estimateValue(title, category) {
    let v = 0.30;
    if (category === 'business')  v += 0.25;
    if (category === 'system')    v += 0.15;
    if (category === 'technical') v += 0.10;
    if (/revenue|profit|monetis|growth|scale/i.test(title))     v += 0.20;
    if (/automat|recurring|pipeline|workflow/i.test(title))      v += 0.10;
    return +Math.min(1.0, v).toFixed(2);
}

// ── Plan templates by category ─────────────────────────────────────────────────

const _TEMPLATES = {
    business: [
        'Define target market, value proposition, and competitive positioning',
        'Competitive landscape analysis and differentiation strategy',
        'Revenue model, pricing architecture, and monetization roadmap',
        'Content or product pipeline design and automation',
        'Distribution channels, growth levers, and audience acquisition',
        'Analytics, feedback loops, and KPI tracking',
        'Operational workflows and scaling infrastructure',
        'Optimization cycles, pivots, and strategic review cadence',
    ],
    technical: [
        'Requirements gathering and system architecture design',
        'Core component design and module boundary mapping',
        'Integration surface and API contract definition',
        'Implementation sequencing and dependency resolution',
        'Testing, validation, and quality assurance strategy',
        'Deployment, monitoring, and alerting plan',
        'Performance profiling and scalability roadmap',
    ],
    research: [
        'Research question framing and scope definition',
        'Source identification and information gathering plan',
        'Analysis methodology and framework selection',
        'Synthesis, pattern identification, and insight extraction',
        'Conclusions, recommendations, and knowledge transfer',
    ],
    personal: [
        'Goal clarification and success criteria definition',
        'Resource mapping and constraint identification',
        'Action plan with measurable milestones',
        'Habit integration and routine design',
        'Progress review cadence and strategy adjustment',
    ],
    system: [
        'Current system state assessment and baseline metrics',
        'Bottleneck identification and root-cause analysis',
        'Improvement plan design and prioritization',
        'Phased rollout and implementation sequencing',
        'Monitoring, feedback loop, and continuous optimization',
    ],
    general: [
        'Objective clarification and scoping',
        'Resource and constraint analysis',
        'Plan development and task sequencing',
        'Execution monitoring and progress tracking',
        'Review, adaptation, and completion',
    ],
};

// ── ID generators ──────────────────────────────────────────────────────────────

let _sq = { o: 0, n: 0, e: 0, i: 0 };
const _id = (pfx, k) => `${pfx}_${Date.now().toString(36)}_${(++_sq[k]).toString(36)}`;

// ── Factory functions ──────────────────────────────────────────────────────────

function _mkObjective(sessionId, { title = '', category, target_outcomes = [], autonomy_level = 1 } = {}) {
    const cat = category || _detectCategory(title);
    return {
        objective_id:           _id('obj', 'o'),
        session_id:             sessionId,
        title,
        category:               cat,
        strategic_value:        _estimateValue(title, cat),
        status:                 OBJECTIVE_STATUS.PLANNING,
        created_at:             Date.now(),
        updated_at:             Date.now(),
        target_outcomes:        target_outcomes.slice(),
        active_plans:           [],
        completed_steps:        [],
        unresolved_constraints: [],
        known_risks:            [],
        opportunities:          [],
        progress_score:         0,
        confidence:             0.5,
        estimated_value:        null,
        world_state_refs:       [],
        executive_priority:     null,
        autonomy_level,
    };
}

function _mkPlanNode(description, { dependencies = [], impact = 'medium', uncertainty = 0.4 } = {}) {
    return {
        node_id:          _id('nod', 'n'),
        description,
        dependencies:     dependencies.slice(),
        status:           'pending',
        estimated_impact: impact,
        reversibility:    'reversible',
        uncertainty,
        next_actions:     [],
    };
}

function _mkWorldEntity(sessionId, { entity, type, current_state = 'unknown', trajectory = 'unknown' } = {}) {
    return {
        entity_id:    _id('ent', 'e'),
        session_id:   sessionId,
        entity,
        type:         type || 'general',
        current_state,
        trajectory,
        opportunities: [],
        risks:         [],
        confidence:    0.5,
        last_updated:  Date.now(),
    };
}

// ── In-memory stores ───────────────────────────────────────────────────────────

const _store      = new Map(); // sessionId → Objective[]
const _world      = new Map(); // sessionId → WorldEntity[]
const _initStore  = new Map(); // sessionId → Initiative[]

function _getObjs(sid) {
    if (!_store.has(sid)) _store.set(sid, []);
    return _store.get(sid);
}
function _getWorld(sid) {
    if (!_world.has(sid)) _world.set(sid, []);
    return _world.get(sid);
}

// ── Relevance scoring ──────────────────────────────────────────────────────────

const _RESUME_RE = /\b(strategy|objective|plan|goal|progress|how (is|are)|continue|status|update|where (are|is) (we|it)|follow.?up|next steps?|what'?s next|roadmap|milestone|check in)\b/i;

function _relevance(obj, msg) {
    if (!msg || !obj.title) return 0;
    const msgWords = new Set(msg.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const objText  = (obj.title + ' ' + obj.target_outcomes.join(' ')).toLowerCase();
    const objWords = objText.split(/\W+/).filter(w => w.length > 3);
    if (!objWords.length || !msgWords.size) return 0;
    const overlap = objWords.filter(w => msgWords.has(w)).length;
    const base    = overlap / Math.max(objWords.length, msgWords.size);
    return Math.min(1, base + (_RESUME_RE.test(msg) ? 0.25 : 0));
}

// ── Core API ───────────────────────────────────────────────────────────────────

/**
 * Create a strategic objective for a session. Returns objective_id.
 */
function createObjective(sessionId, opts = {}) {
    const objs = _getObjs(sessionId);
    const obj  = _mkObjective(sessionId, opts);
    objs.push(obj);
    // Evict oldest completed/abandoned when over capacity
    if (objs.length > MAX_OBJECTIVES) {
        const ix = objs.findIndex(
            o => o.status === OBJECTIVE_STATUS.COMPLETED || o.status === OBJECTIVE_STATUS.ABANDONED
        );
        objs.splice(ix >= 0 ? ix : 0, 1);
    }
    return obj.objective_id;
}

/**
 * Fetch a single objective by ID across all sessions.
 */
function getObjective(objectiveId) {
    for (const objs of _store.values()) {
        const o = objs.find(x => x.objective_id === objectiveId);
        if (o) return o;
    }
    return null;
}

/**
 * Return all objectives for a session (snapshot copy).
 */
function getObjectivesForSession(sessionId) {
    return _getObjs(sessionId).slice();
}

/**
 * Update fields on an existing objective.
 */
function updateObjective(objectiveId, updates = {}) {
    const obj = getObjective(objectiveId);
    if (!obj) return null;
    Object.assign(obj, updates, { updated_at: Date.now() });
    compressStrategicState(obj);
    return obj;
}

/**
 * Decompose an objective into template-based plan nodes.
 * Activates the objective if still in PLANNING state.
 */
function decomposeObjective(objectiveId) {
    const obj = getObjective(objectiveId);
    if (!obj || obj.active_plans.length >= MAX_PLAN_NODES) return obj;

    const template = _TEMPLATES[obj.category] || _TEMPLATES.general;
    let prevId = null;

    for (const desc of template) {
        if (obj.active_plans.length >= MAX_PLAN_NODES) break;
        const node = _mkPlanNode(desc, { dependencies: prevId ? [prevId] : [], impact: 'high', uncertainty: 0.3 });
        obj.active_plans.push(node);
        prevId = node.node_id;
    }

    // Inject target outcomes as initial next_actions
    if (obj.active_plans.length && obj.target_outcomes.length) {
        obj.active_plans[0].next_actions = obj.target_outcomes.slice(0, 3);
    }

    obj.status     = OBJECTIVE_STATUS.ACTIVE;
    obj.updated_at = Date.now();
    return obj;
}

/**
 * Mark a plan step completed and advance progress.
 */
function updateProgress(objectiveId, { step, outcome } = {}) {
    const obj = getObjective(objectiveId);
    if (!obj) return;
    if (step)    obj.completed_steps.push(step);
    if (outcome) obj.opportunities.push(outcome);

    const total       = obj.active_plans.length || 1;
    obj.progress_score = +Math.min(0.95, obj.completed_steps.length / total).toFixed(2);
    obj.updated_at    = Date.now();

    if (obj.progress_score >= 0.95) {
        obj.status    = OBJECTIVE_STATUS.MONITORING;
        obj.confidence = 0.9;
    }
}

/**
 * Upsert a world-state entity for a session. Returns entity_id.
 */
function updateWorldState(sessionId, { entity, type, current_state, trajectory, opportunities = [], risks = [] } = {}) {
    if (!entity) return null;
    const entities = _getWorld(sessionId);

    let ent = entities.find(e => e.entity.toLowerCase() === entity.toLowerCase());
    if (ent) {
        if (current_state) ent.current_state = current_state;
        if (trajectory)    ent.trajectory    = trajectory;
        ent.opportunities.push(...opportunities.filter(Boolean));
        ent.risks.push(...risks.filter(Boolean));
        ent.last_updated = Date.now();
        if (ent.opportunities.length > 10) ent.opportunities = ent.opportunities.slice(-10);
        if (ent.risks.length > 10)         ent.risks         = ent.risks.slice(-10);
        return ent.entity_id;
    }

    const newEnt = _mkWorldEntity(sessionId, { entity, type, current_state, trajectory });
    newEnt.opportunities = opportunities.slice(0, 10);
    newEnt.risks         = risks.slice(0, 10);
    entities.push(newEnt);
    if (entities.length > MAX_WORLD_ENT) entities.shift();
    return newEnt.entity_id;
}

/**
 * Generate advisory strategic initiatives.
 * Advisory only — no execution side effects.
 */
function generateStrategicInitiatives(sessionId) {
    const objs  = _getObjs(sessionId).filter(
        o => o.status !== OBJECTIVE_STATUS.COMPLETED && o.status !== OBJECTIVE_STATUS.ABANDONED
    );
    const now   = Date.now();
    const out   = [];

    for (const obj of objs) {
        if (out.length >= MAX_INITIATIVES) break;
        const ageMins = (now - obj.created_at) / 60_000;

        if (obj.status === OBJECTIVE_STATUS.PLANNING && ageMins > 5) {
            out.push({
                initiative_id: _id('ini', 'i'),
                objective_id:  obj.objective_id,
                type:          'unresolved',
                description:   `"${obj.title.slice(0, 60)}" — plan decomposition pending.`,
                priority:      +(obj.strategic_value * 0.7).toFixed(2),
                generated_at:  now,
            });
        }

        if (obj.status === OBJECTIVE_STATUS.ACTIVE && obj.progress_score < 0.15 && ageMins > 15) {
            out.push({
                initiative_id: _id('ini', 'i'),
                objective_id:  obj.objective_id,
                type:          'optimization',
                description:   `"${obj.title.slice(0, 60)}" — no progress detected; next step: ${obj.active_plans.find(n => n.status === 'pending')?.description?.slice(0, 60) || 'plan activation'}.`,
                priority:      +(obj.strategic_value * 0.8).toFixed(2),
                generated_at:  now,
            });
        }

        if (obj.status === OBJECTIVE_STATUS.BLOCKED) {
            const constraints = obj.unresolved_constraints.slice(0, 2).join(', ') || 'unspecified';
            out.push({
                initiative_id: _id('ini', 'i'),
                objective_id:  obj.objective_id,
                type:          'unresolved',
                description:   `"${obj.title.slice(0, 60)}" is blocked — constraints: ${constraints}.`,
                priority:      +obj.strategic_value.toFixed(2),
                generated_at:  now,
            });
        }

        if (obj.opportunities.length > 0 && ageMins > 10) {
            out.push({
                initiative_id: _id('ini', 'i'),
                objective_id:  obj.objective_id,
                type:          'opportunity',
                description:   `Opportunity for "${obj.title.slice(0, 50)}": ${obj.opportunities[obj.opportunities.length - 1].slice(0, 80)}.`,
                priority:      +(obj.strategic_value * 0.6).toFixed(2),
                generated_at:  now,
            });
        }
    }

    out.sort((a, b) => b.priority - a.priority);
    const result = out.slice(0, MAX_INITIATIVES);
    _initStore.set(sessionId, result);
    _initiatives_count += result.length;
    return result;
}

/**
 * Load and resume strategic context for a user message.
 * Returns { activeObjective, initiatives, hint, hasStrategicContext }.
 */
function resumeStrategicContext({ sessionId, userMessage }) {
    if (!sessionId) return { activeObjective: null, initiatives: [], hint: null, hasStrategicContext: false };

    const candidates = _getObjs(sessionId).filter(
        o => o.status !== OBJECTIVE_STATUS.COMPLETED && o.status !== OBJECTIVE_STATUS.ABANDONED
    );

    if (!candidates.length) {
        return { activeObjective: null, initiatives: [], hint: null, hasStrategicContext: false };
    }

    const scored = candidates
        .map(o => ({ obj: o, score: _relevance(o, userMessage) }))
        .filter(x => x.score >= RESUME_THRESHOLD)
        .sort((a, b) => b.score - a.score);

    const initiatives = generateStrategicInitiatives(sessionId);

    if (!scored.length) {
        return { activeObjective: null, initiatives, hint: null, hasStrategicContext: false };
    }

    const top = scored[0].obj;
    top.updated_at = Date.now();
    if (top.status === OBJECTIVE_STATUS.PLANNING) top.status = OBJECTIVE_STATUS.ACTIVE;

    const hint = _buildHint(top);
    return { activeObjective: top, initiatives, hint, hasStrategicContext: true };
}

function _buildHint(obj) {
    if (obj.category === 'business')  return `Continuing ${obj.title.slice(0, 50)} — strategic objective active.`;
    if (obj.category === 'technical') return `Resuming technical planning: ${obj.title.slice(0, 50)}.`;
    return `Continuing long-horizon objective: ${obj.title.slice(0, 60)}.`;
}

/**
 * Return a compact strategic context summary for /chat injection.
 */
function getStrategicContext(sessionId) {
    if (!sessionId) return null;
    const active = _getObjs(sessionId).filter(
        o => o.status === OBJECTIVE_STATUS.ACTIVE || o.status === OBJECTIVE_STATUS.MONITORING
    ).sort((a, b) => b.strategic_value - a.strategic_value);

    if (!active.length) return null;
    const top = active[0];

    return {
        active_objective_count: active.length,
        top_objective: {
            objective_id:    top.objective_id,
            title:           top.title,
            category:        top.category,
            progress_score:  top.progress_score,
            strategic_value: top.strategic_value,
            next_step:       top.active_plans.find(n => n.status === 'pending')?.description || null,
            opportunities:   top.opportunities.slice(-2),
        },
    };
}

/**
 * Update strategic state after a response is delivered.
 * Creates objectives for high-value strategic messages; advances progress on existing ones.
 */
function updateFromResponse({ sessionId, userMessage, reply, intent, mode }) {
    if (!sessionId || !userMessage) return;

    const isStrategic = _isStrategicMsg(userMessage);
    const objs = _getObjs(sessionId);
    let matched = false;

    for (const obj of objs) {
        if (obj.status !== OBJECTIVE_STATUS.ACTIVE && obj.status !== OBJECTIVE_STATUS.MONITORING) continue;
        if (_relevance(obj, userMessage) >= RESUME_THRESHOLD) {
            obj.progress_score = +Math.min(0.95, (obj.progress_score || 0) + 0.04).toFixed(2);
            obj.confidence     = +Math.min(0.95, (obj.confidence || 0.5) + 0.03).toFixed(2);
            obj.updated_at     = Date.now();
            matched = true;
            // Trigger decomposition on first substantive reply
            if (!obj.active_plans.length && (reply || '').length > 100) {
                decomposeObjective(obj.objective_id);
            }
        }
    }

    // Create new objective for high-value strategic messages with no match
    if (!matched && isStrategic && intent !== 'SIMPLE_QUERY' && mode !== 'REFLEX') {
        const title = _extractTitle(userMessage);

        // Don't duplicate — check rough title similarity
        const duplicate = objs.some(
            o => _relevance({ title, target_outcomes: [] }, o.title + ' ' + o.target_outcomes.join(' ')) > 0.5
        );
        if (!duplicate) {
            const objId = createObjective(sessionId, { title });
            if ((reply || '').length > 150) decomposeObjective(objId);

            // Link to world-state if entity detected
            const entity = _extractEntity(userMessage);
            if (entity) {
                const entId = updateWorldState(sessionId, {
                    entity,
                    type:          _detectCategory(userMessage),
                    current_state: 'planning',
                    trajectory:    'unknown',
                });
                const obj = getObjective(objId);
                if (obj && entId) obj.world_state_refs.push(entId);

                // Link to matching PCM thread if possible
                try {
                    if (!_pcmLink) _pcmLink = require('./persistent-cognition-manager');
                    const threads = _pcmLink.getThreadsForSession(sessionId);
                    const active  = threads.find(t => t.status === 'ACTIVE' && !t.strategic_objective_id);
                    if (active) active.strategic_objective_id = objId;
                } catch (_) {}
            }
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const _STRAT_MSG_RE = /\b(build|create|develop|design|launch|plan|strategy|business|revenue|profit|automat|scale|grow|optimis|optimiz|research|analys|architect|implement|establish|deploy)\b/i;

function _isStrategicMsg(text) {
    return _STRAT_MSG_RE.test(text || '') && (text || '').length > 40;
}

function _extractTitle(msg) {
    const first = (msg.split(/[.!?]/)[0] || '').trim();
    return first.length > 10 && first.length <= 100 ? first : msg.slice(0, 80);
}

function _extractEntity(text) {
    const quoted = text.match(/"([^"]{3,40})"/);
    if (quoted) return quoted[1];
    const caps = text.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})\b/);
    if (caps && caps[1].length > 3) return caps[1];
    return null;
}

// ── Compression ────────────────────────────────────────────────────────────────

function compressStrategicState(obj) {
    if (obj.target_outcomes.length > 10)
        obj.target_outcomes = obj.target_outcomes.slice(-10);
    if (obj.completed_steps.length > 20)
        obj.completed_steps = obj.completed_steps.slice(-20);
    if (obj.unresolved_constraints.length > 10)
        obj.unresolved_constraints = obj.unresolved_constraints.slice(-10);
    if (obj.known_risks.length > 10)
        obj.known_risks = obj.known_risks.slice(-10);
    if (obj.opportunities.length > 10)
        obj.opportunities = obj.opportunities.slice(-10);
    if (obj.active_plans.length > MAX_PLAN_NODES)
        obj.active_plans = obj.active_plans.slice(-MAX_PLAN_NODES);
    obj.updated_at = Date.now();
    return obj;
}

// ── Lazy PCM ref for thread linkage ───────────────────────────────────────────

let _pcmLink = null;

// ── Observability ──────────────────────────────────────────────────────────────

let _initiatives_count = 0;

function stats(sessionId) {
    if (sessionId) {
        const objs = _getObjs(sessionId);
        return {
            session_id: sessionId,
            objectives: objs.map(o => ({
                objective_id:    o.objective_id,
                title:           o.title,
                category:        o.category,
                status:          o.status,
                strategic_value: o.strategic_value,
                progress_score:  o.progress_score,
                plan_nodes:      o.active_plans.length,
                completed_steps: o.completed_steps.length,
            })),
            world_entities: _getWorld(sessionId).length,
            initiatives:    (_initStore.get(sessionId) || []).length,
        };
    }

    // Global aggregated stats
    let total = 0, active = 0, blocked = 0;
    let totalStratVal = 0;
    for (const objs of _store.values()) {
        for (const o of objs) {
            total++;
            if (o.status === OBJECTIVE_STATUS.ACTIVE || o.status === OBJECTIVE_STATUS.MONITORING) {
                active++;
                totalStratVal += o.strategic_value;
            }
            if (o.status === OBJECTIVE_STATUS.BLOCKED) blocked++;
        }
    }
    const worldCount = [..._world.values()].reduce((n, e) => n + e.length, 0);

    return {
        strategic_objective_count:   total,
        active_objective_count:      active,
        blocked_objective_count:     blocked,
        initiative_generation_count: _initiatives_count,
        world_state_entity_count:    worldCount,
        autonomy_signal_score:       active > 0 ? +(totalStratVal / active).toFixed(2) : 0,
        total_sessions_tracked:      _store.size,
    };
}

// ── Event bus subscriptions (read-only — zero execution side effects) ─────────

bus.on(bus.E.USER_INTERRUPTED, (event) => {
    if (!event.session_id) return;
    for (const obj of _getObjs(event.session_id)) {
        if (obj.status === OBJECTIVE_STATUS.ACTIVE) {
            // Minor confidence dip on interruption — preserve objective
            obj.confidence = +Math.max(0.1, (obj.confidence || 0.5) - 0.02).toFixed(2);
        }
    }
});

bus.on(bus.E.AGENT_STARTED, (event) => {
    if (!event.session_id) return;
    for (const obj of _getObjs(event.session_id)) {
        if (obj.status === OBJECTIVE_STATUS.ACTIVE) {
            // Agent running on this session → execution is advancing this objective
            obj.confidence = +Math.min(0.95, (obj.confidence || 0.5) + 0.03).toFixed(2);
        }
    }
});

bus.on(bus.E.AGENT_COMPLETED, (event) => {
    if (!event.session_id) return;
    for (const obj of _getObjs(event.session_id)) {
        if (obj.status === OBJECTIVE_STATUS.ACTIVE) {
            obj.progress_score = +Math.min(0.95, (obj.progress_score || 0) + 0.05).toFixed(2);
            obj.updated_at     = Date.now();
        }
    }
});

bus.on(bus.E.SESSION_COMPLETED, (event) => {
    if (!event.session_id) return;
    for (const obj of _getObjs(event.session_id)) {
        if (obj.status !== OBJECTIVE_STATUS.COMPLETED) {
            obj.status     = OBJECTIVE_STATUS.DEFERRED;
            obj.updated_at = Date.now();
        }
    }
    // Defer eviction so other listeners can still query
    setTimeout(() => {
        _store.delete(event.session_id);
        _world.delete(event.session_id);
        _initStore.delete(event.session_id);
    }, OBJECTIVE_TTL_MS);
});

// ── Stale objective pruning (every 10 min) ─────────────────────────────────────

setInterval(() => {
    const now = Date.now();
    for (const [sid, objs] of _store.entries()) {
        for (const obj of objs) {
            if (obj.status === OBJECTIVE_STATUS.COMPLETED || obj.status === OBJECTIVE_STATUS.ABANDONED) continue;
            const idleMins = (now - obj.updated_at) / 60_000;
            // Low-value objectives: abandon after 60 min idle
            if (idleMins > 60 && obj.strategic_value < 0.5) {
                obj.status = OBJECTIVE_STATUS.ABANDONED; obj.updated_at = now;
            }
            // High-value objectives survive to 2 hours
            else if (idleMins > 120) {
                obj.status = OBJECTIVE_STATUS.ABANDONED; obj.updated_at = now;
            }
        }
        // Evict fully-expired sessions
        if (objs.length && objs.every(o =>
            (o.status === OBJECTIVE_STATUS.COMPLETED || o.status === OBJECTIVE_STATUS.ABANDONED) &&
            (now - o.updated_at) > OBJECTIVE_TTL_MS
        )) {
            _store.delete(sid); _world.delete(sid); _initStore.delete(sid);
        }
    }
}, 10 * 60 * 1000).unref();

module.exports = {
    createObjective,
    getObjective,
    getObjectivesForSession,
    updateObjective,
    decomposeObjective,
    updateProgress,
    updateWorldState,
    generateStrategicInitiatives,
    resumeStrategicContext,
    getStrategicContext,
    updateFromResponse,
    compressStrategicState,
    stats,
    OBJECTIVE_STATUS,
};
