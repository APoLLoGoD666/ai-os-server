'use strict';

// Planning Influence Engine — Phase 4
// Front door for orchestrator. Called once at task start.
// Retrieves context from all memory layers, composes it for each agent,
// and exposes WHY each memory item was selected (evidence chain).
// Replaces the current 500-char memory-retriever call in orchestrator.js.

const retrievalEngine = require('./memory-retrieval-engine');
const contextComposer = require('./context-composer');

// ── Main entry point: called before ARCHITECT runs ────────────────────────────
// Returns { contextPack, composedContext, evidence, risks, opportunities }
async function assembleForTask(spec, options = {}) {
    const { traceId, taskId, sessionId, retrievalLimits } = options;

    // Step 1: Retrieve from all memory layers
    const contextPack = await retrievalEngine.retrieveForTask(spec, { traceId, taskId, sessionId, retrievalLimits });

    // Step 2: Compose for ARCHITECT (full budget)
    const { context: composedContext, charsUsed, sections } = contextComposer.compose(contextPack, 'ARCHITECT');

    // Step 3: Extract structured intelligence for planning
    const risks         = _extractRisks(contextPack);
    const opportunities = _extractOpportunities(contextPack);
    const evidence      = _buildEvidenceChain(contextPack);

    return {
        contextPack,
        composedContext,
        charsUsed,
        sections,
        risks,
        opportunities,
        evidence,
    };
}

// Build per-agent context from an already-retrieved contextPack.
// Use this to get DEVELOPER / REVIEWER context without re-querying.
function composeForAgent(contextPack, agentRole) {
    if (!contextPack) return '';
    return contextComposer.compose(contextPack, agentRole).context;
}

// ── Intelligence extraction ───────────────────────────────────────────────────

function _extractRisks(pack) {
    const risks = [];

    // Active incidents
    for (const inc of (pack.incidents || [])) {
        risks.push({
            type:       'active_incident',
            severity:   inc.severity || 'LOW',
            description: (inc.description || '').slice(0, 150),
            evidence_source: 'incidents',
        });
    }

    // Skill warnings
    for (const skill of (pack.skills || [])) {
        if ((skill.success_rate || 0.5) < 0.5 && (skill.execution_count || 0) > 3) {
            risks.push({
                type:        'skill_weakness',
                severity:    skill.success_rate < 0.3 ? 'HIGH' : 'MEDIUM',
                description: `${skill.skill_name} has low success rate (${((skill.success_rate || 0) * 100).toFixed(0)}%)`,
                evidence_source: 'skill_memory',
            });
        }
    }

    // Past failures at similar tasks
    const failures = (pack.episodes || []).filter(e => e.success === false);
    for (const ep of failures.slice(0, 2)) {
        risks.push({
            type:        'past_failure',
            severity:    'MEDIUM',
            description: `Similar task failed at ${ep.failed_stage || ep.failedStage || 'unknown'}: ${(ep.failure_reason || ep.failureReason || '').slice(0, 100)}`,
            evidence_source: 'episodic_memory',
        });
    }

    // Bad past decisions with same pattern
    const badDecisions = (pack.decisions || []).filter(d => d.outcome_quality === 'poor' || d.outcome_quality === 'catastrophic');
    for (const d of badDecisions.slice(0, 2)) {
        risks.push({
            type:        'past_bad_decision',
            severity:    d.outcome_quality === 'catastrophic' ? 'CRITICAL' : 'HIGH',
            description: `Similar decision resulted in ${d.outcome_quality} outcome: ${(d.decision || '').slice(0, 100)}`,
            evidence_source: 'decision_memory',
        });
    }

    return risks.sort((a, b) => _severityScore(b.severity) - _severityScore(a.severity));
}

function _extractOpportunities(pack) {
    const opportunities = [];

    // Proven procedures
    for (const proc of (pack.procedures || [])) {
        if ((proc.success_rate || 0) >= 0.7 && (proc.execution_count || 0) >= 3) {
            opportunities.push({
                type:        'proven_procedure',
                description: `${proc.name}: ${(proc.description || '').slice(0, 100)} (success: ${((proc.success_rate || 0) * 100).toFixed(0)}%)`,
                confidence:  proc.success_rate,
                evidence_source: 'procedural_memory',
            });
        }
    }

    // Good past decisions
    const goodDecisions = (pack.decisions || []).filter(d => d.outcome_quality === 'excellent' || d.outcome_quality === 'good');
    for (const d of goodDecisions.slice(0, 2)) {
        opportunities.push({
            type:        'successful_decision_pattern',
            description: `Similar decision succeeded: ${(d.decision || '').slice(0, 100)} [${d.decision_type}]`,
            confidence:  d.confidence || 0.7,
            evidence_source: 'decision_memory',
        });
    }

    // High-confidence knowledge
    const highConfKnowledge = (pack.knowledge || []).filter(k => (k.confidence || 0) >= 0.8);
    for (const k of highConfKnowledge.slice(0, 3)) {
        opportunities.push({
            type:        'validated_knowledge',
            description: (k.fact || '').slice(0, 150),
            confidence:  k.confidence,
            evidence_source: 'semantic_memory',
        });
    }

    return opportunities;
}

function _buildEvidenceChain(pack) {
    const chain = [];
    const countOf = (arr) => (arr || []).length;

    if (countOf(pack.episodes) > 0) {
        chain.push({
            source: 'episodic_memory',
            count:  countOf(pack.episodes),
            why:    `${countOf(pack.episodes)} similar task executions found`,
        });
    }
    if (countOf(pack.lessons) > 0) {
        chain.push({
            source: 'apex_lessons',
            count:  countOf(pack.lessons),
            why:    `${countOf(pack.lessons)} relevant lessons retrieved`,
        });
    }
    if (countOf(pack.decisions) > 0) {
        chain.push({
            source: 'decision_memory',
            count:  countOf(pack.decisions),
            why:    `${countOf(pack.decisions)} similar past decisions found`,
        });
    }
    if (countOf(pack.knowledge) > 0) {
        chain.push({
            source: 'semantic_memory',
            count:  countOf(pack.knowledge),
            why:    `${countOf(pack.knowledge)} validated knowledge items matched`,
        });
    }
    if (countOf(pack.incidents) > 0) {
        chain.push({
            source: 'incidents',
            count:  countOf(pack.incidents),
            why:    `${countOf(pack.incidents)} active incidents may be relevant`,
        });
    }

    return {
        sources:      chain,
        total_items:  chain.reduce((s, c) => s + c.count, 0),
        confidence:   pack.confidence,
        retrieved_at: pack.retrieved_at,
    };
}

function _severityScore(s) {
    return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 }[s] || 1;
}

// Format the full influence package as a string for direct prompt injection.
// agentRole determines budget and section priorities.
function formatForPrompt(assemblyResult, agentRole = 'ARCHITECT') {
    const { contextPack, risks, opportunities, evidence, composedContext } = assemblyResult;
    if (!contextPack) return '';

    // For ARCHITECT: add risks and opportunities as structured sections
    if (agentRole === 'ARCHITECT' && (risks.length > 0 || opportunities.length > 0)) {
        const parts = [];
        if (composedContext) parts.push(composedContext);
        if (risks.length > 0) {
            const riskLines = risks.slice(0, 5).map(r => `  [${r.severity}] ${r.description}`);
            parts.push(`── MEMORY-DERIVED RISKS ──────────────────────────\n${riskLines.join('\n')}`);
        }
        if (opportunities.length > 0) {
            const oppLines = opportunities.slice(0, 3).map(o => `  • ${o.description}`);
            parts.push(`── MEMORY-DERIVED OPPORTUNITIES ─────────────────\n${oppLines.join('\n')}`);
        }
        return parts.join('\n\n');
    }

    // For other agents: return composed context for their role
    return agentRole === 'DEFAULT'
        ? composedContext
        : contextComposer.compose(contextPack, agentRole).context;
}

module.exports = { assembleForTask, composeForAgent, formatForPrompt };
