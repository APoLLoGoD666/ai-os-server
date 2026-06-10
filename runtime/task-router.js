'use strict';
// runtime/task-router.js
// Classifies every incoming request and returns a RouteDecision.
// The router is the first thing the runtime touches — before any model call,
// memory read, or agent stage.

const logger = require('../lib/logger');

// ─────────────────────────────────────────────────────────────────────────────
// RouteDecision — what gets returned for every request
// ─────────────────────────────────────────────────────────────────────────────
class RouteDecision {
  constructor({ route, entity, priority, complexity, reasoning, flags }) {
    this.route      = route;       // 'agent_pipeline' | 'executive_runtime' | 'research_system' | 'founder_escalation'
    this.entity     = entity;      // null | 'cso' | 'cio' | 'cfo' | 'cto' | 'coo' | 'cgo'
    this.priority   = priority;    // 'critical' | 'high' | 'normal' | 'low'
    this.complexity = complexity;  // 'simple' | 'moderate' | 'complex' | 'critical'
    this.reasoning  = reasoning;   // human-readable explanation
    this.flags      = flags || {}; // { requiresApproval, skipResearch, isPersonal, touchesSecurity }
    this.decidedAt  = new Date().toISOString();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern libraries
// ─────────────────────────────────────────────────────────────────────────────
const EXEC_PATTERNS = {
  cso: /\b(strategy|roadmap|initiative|priorit|vision|quarter|goal|mission|pivot|expand|direction)\b/i,
  cio: /\b(memory.policy|retention|benchmark|cognitive.policy|knowledge.decay|learning.rate|context.quality)\b/i,
  cfo: /\b(budget|spend|cost.cap|billing|pricing|subscription|model.cost|token.cost|roi)\b/i,
  cto: /\b(architect|infrastructure|deploy.strategy|migration|new.depend|npm.install|breaking.change|schema)\b/i,
  coo: /\b(pipeline.fail|retry.budget|cron.schedule|incident|success.rate|timeout.adjust|ops.report)\b/i,
  cgo: /\b(new.feature|opportunity|experiment|integration.test|capability|expand|grow)\b/i,
};

const ESCALATION_PATTERNS =
  /\b(kill.switch|constitution|shutdown|delete.all|drop.table|purge.memory|override.safety|disable.governance)\b/i;

const RESEARCH_PATTERNS =
  /\b(research|look.?up|find.?info|what.?is|how.?does|latest|current.?price|api.?docs?|documentation|competitive)\b/i;

const SECURITY_PATTERNS =
  /\b(auth(?:entication|oriz)?|password|secret|api.?key|jwt|oauth|stripe|payment|billing|sql.?inject|xss|csrf|rls|rbac|permiss|encrypt|hash|salt|session.?token)\b/i;

const COMPLEXITY_RULES = {
  critical: /\b(auth|password|secret|api.?key|jwt|oauth|stripe|payment|billing|sql.?inject|xss|csrf|rls|rbac|permiss|encrypt|hash|salt|session.?token)\b/i,
  complex:  /\b(refactor|architect|orchestrat|embed|vector|agent.pipeline|rebuild|rewrit|multi.?step|integrat)\b/i,
  simple:   /\b(add.?route|fix.?typo|update.?text|config|stub|rename|delete.?comment|format)\b/i,
};

// ─────────────────────────────────────────────────────────────────────────────
// route(request) → RouteDecision
// request: { objective, filesToModify?, taskId?, source? }
// ─────────────────────────────────────────────────────────────────────────────
function route(request) {
  const obj = (request.objective || request.description || '').toLowerCase();

  // 1. Hard escalation — always Founder
  if (ESCALATION_PATTERNS.test(obj)) {
    return new RouteDecision({
      route:      'founder_escalation',
      entity:     null,
      priority:   'critical',
      complexity: 'critical',
      reasoning:  'Objective matches constitutional/destructive pattern — requires Founder approval',
      flags:      { requiresApproval: true, touchesSecurity: true },
    });
  }

  // 2. Executive Runtime — strategy/policy/ops questions
  for (const [entityId, pattern] of Object.entries(EXEC_PATTERNS)) {
    if (pattern.test(obj) && !_looksLikeCode(obj)) {
      return new RouteDecision({
        route:      'executive_runtime',
        entity:     entityId,
        priority:   entityId === 'cfo' ? 'high' : 'normal',
        complexity: 'moderate',
        reasoning:  `Matches ${entityId.toUpperCase()} domain — routed to executive entity`,
        flags:      { requiresApproval: false },
      });
    }
  }

  // 3. Pure research — no code changes
  if (RESEARCH_PATTERNS.test(obj) && !_looksLikeCode(obj)) {
    return new RouteDecision({
      route:      'research_system',
      entity:     null,
      priority:   'normal',
      complexity: 'simple',
      reasoning:  'Objective requests information gathering — no code changes needed',
      flags:      { skipResearch: false },
    });
  }

  // 4. Agent Pipeline — code implementation (default)
  const complexity = _classifyComplexity(obj, request.filesToModify || []);
  const touchesSecurity = SECURITY_PATTERNS.test(obj);

  return new RouteDecision({
    route:      'agent_pipeline',
    entity:     null,
    priority:   touchesSecurity || complexity === 'critical' ? 'critical' : complexity === 'complex' ? 'high' : 'normal',
    complexity,
    reasoning:  `Code implementation task — ${complexity} complexity${touchesSecurity ? ', touches security' : ''}`,
    flags: {
      requiresApproval: touchesSecurity || complexity === 'critical',
      touchesSecurity,
      skipResearch:     !RESEARCH_PATTERNS.test(obj),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// routeAndLog — route + write to logger + return RouteDecision
// ─────────────────────────────────────────────────────────────────────────────
function routeAndLog(request) {
  const decision = route(request);
  logger.info('task-router', 'routed', {
    taskId:     request.taskId,
    route:      decision.route,
    entity:     decision.entity,
    priority:   decision.priority,
    complexity: decision.complexity,
    flags:      decision.flags,
  });
  return decision;
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────
function _looksLikeCode(obj) {
  // Heuristic: if it mentions files, implementation verbs, or code artifacts — it's a code task
  return /\b(implement|create|build|add|fix|update|patch|write|edit|refactor|delete|install|deploy|migrate|route|endpoint|function|class|module|file|\.js|\.ts|\.html|\.css|\.sql)\b/i.test(obj);
}

function _classifyComplexity(obj, files) {
  if (COMPLEXITY_RULES.critical.test(obj)) return 'critical';
  if (files.length >= 4 || COMPLEXITY_RULES.complex.test(obj)) return 'complex';
  if (files.length <= 1 && COMPLEXITY_RULES.simple.test(obj)) return 'simple';
  return 'moderate';
}

module.exports = { route, routeAndLog, RouteDecision };
