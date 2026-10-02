'use strict';

// Context Composer — Phase 3
// Converts a contextPack from memory-retrieval-engine into a structured,
// token-budgeted context string for agent prompt injection.
// Different agents receive different context views from the same pack.
// Priority: high confidence → recent → validated → high impact.

const CHARS_PER_TOKEN = 4; // conservative estimate

const ROLE_BUDGETS = {
    ARCHITECT:  6000,  // needs full context for planning
    DEVELOPER:  3000,  // procedures + past failures
    REVIEWER:   2000,  // security patterns + known issues
    VALIDATOR:  1500,  // success criteria + test patterns
    REFLECTOR:  2000,  // similar episodes + lesson patterns
    DEFAULT:    2500,
};

const ROLE_PRIORITIES = {
    ARCHITECT:  ['incidents', 'knowledge', 'episodes', 'decisions', 'procedures', 'lessons', 'skills', 'graph'],
    DEVELOPER:  ['procedures', 'episodes', 'lessons', 'knowledge', 'skills'],
    REVIEWER:   ['knowledge', 'lessons', 'incidents', 'episodes'],
    VALIDATOR:  ['episodes', 'procedures', 'lessons'],
    REFLECTOR:  ['episodes', 'lessons', 'decisions'],
    DEFAULT:    ['incidents', 'episodes', 'lessons', 'knowledge', 'decisions', 'procedures', 'skills'],
};

// Build a structured context string for the given agent role.
// Returns { context: string, tokensUsed: number, sections: string[] }
function compose(contextPack, agentRole = 'DEFAULT', options = {}) {
    const budget    = options.tokenBudget
        ? options.tokenBudget * CHARS_PER_TOKEN
        : (ROLE_BUDGETS[agentRole] || ROLE_BUDGETS.DEFAULT);
    const priorities = ROLE_PRIORITIES[agentRole] || ROLE_PRIORITIES.DEFAULT;
    const sections  = [];
    let   usedChars = 0;

    function _add(section) {
        if (!section) return;
        if (usedChars + section.length > budget) {
            // Try to fit a truncated version
            const remaining = budget - usedChars - 20;
            if (remaining > 100) {
                sections.push(section.slice(0, remaining) + '...');
                usedChars += remaining + 20;
            }
            return;
        }
        sections.push(section);
        usedChars += section.length;
    }

    // Build sections in priority order
    for (const key of priorities) {
        if (usedChars >= budget) break;
        const section = _buildSection(key, contextPack, agentRole);
        if (section) _add(section);
    }

    const context = sections.join('\n\n');
    return {
        context,
        charsUsed:   usedChars,
        tokensUsed:  Math.ceil(usedChars / CHARS_PER_TOKEN),
        sections:    sections.map(s => s.split('\n')[0].replace(/^[#─]+\s*/, '').slice(0, 50)),
        confidence:  contextPack.confidence,
    };
}

function _buildSection(key, pack, role) {
    switch (key) {
        case 'incidents':   return _buildIncidentsSection(pack.incidents);
        case 'episodes':    return _buildEpisodesSection(pack.episodes, role);
        case 'lessons':     return _buildLessonsSection(pack.lessons);
        case 'decisions':   return _buildDecisionsSection(pack.decisions);
        case 'procedures':  return _buildProceduresSection(pack.procedures);
        case 'knowledge':   return _buildKnowledgeSection(pack.knowledge);
        case 'skills':      return _buildSkillsSection(pack.skills);
        case 'graph':       return _buildGraphSection(pack.graphNodes, pack.graph_evidence);
        default:            return null;
    }
}

function _buildIncidentsSection(incidents) {
    if (!incidents || incidents.length === 0) return null;
    const lines = incidents.map(i =>
        `  [${(i.severity || 'LOW').toUpperCase()}] ${(i.description || '').slice(0, 120)}`
    );
    return `── ACTIVE INCIDENTS (${incidents.length}) ──────────────\n${lines.join('\n')}`;
}

function _buildEpisodesSection(episodes, role) {
    if (!episodes || episodes.length === 0) return null;
    const successes = episodes.filter(e => e.success !== false);
    const failures  = episodes.filter(e => e.success === false);
    const lines     = [];

    if (successes.length > 0) {
        lines.push('Similar successes:');
        for (const ep of successes.slice(0, 3)) {
            const complexity = ep.complexity ? ` [${ep.complexity}]` : '';
            const score      = ep._score ? ` (${ep._score.toFixed(2)})` : '';
            lines.push(`  ✓ ${(ep.objective || '').slice(0, 100)}${complexity}${score}`);
        }
    }
    if (failures.length > 0) {
        lines.push('Similar failures:');
        for (const ep of failures.slice(0, 2)) {
            const stage = ep.failed_stage || ep.failedStage ? ` [failed:${ep.failed_stage || ep.failedStage}]` : '';
            lines.push(`  ✗ ${(ep.objective || '').slice(0, 100)}${stage}`);
            if (ep.failure_reason || ep.failureReason) {
                lines.push(`    reason: ${(ep.failure_reason || ep.failureReason || '').slice(0, 80)}`);
            }
        }
    }
    if (lines.length === 0) return null;
    return `── SIMILAR PAST EXPERIENCES ──────────────────────\n${lines.join('\n')}`;
}

function _buildLessonsSection(lessons) {
    if (!lessons || lessons.length === 0) return null;
    // Deduplicate by first 60 chars
    const seen  = new Set();
    const lines = [];
    for (const l of lessons) {
        const text = (l.lesson || l.text || '').slice(0, 200);
        const key  = text.slice(0, 60).toLowerCase();
        if (seen.has(key) || !text) continue;
        seen.add(key);
        lines.push(`  • ${text}`);
        if (lines.length >= 8) break;
    }
    if (lines.length === 0) return null;
    return `── RELEVANT LESSONS ──────────────────────────────\n${lines.join('\n')}`;
}

function _buildDecisionsSection(decisions) {
    if (!decisions || decisions.length === 0) return null;
    const lines = [];
    for (const d of decisions.slice(0, 3)) {
        const quality = d.outcome_quality ? ` → ${d.outcome_quality}` : '';
        const type    = d.decision_type ? ` [${d.decision_type}]` : '';
        lines.push(`  • ${(d.decision || '').slice(0, 120)}${type}${quality}`);
        if (d.rationale) lines.push(`    rationale: ${d.rationale.slice(0, 100)}`);
    }
    if (lines.length === 0) return null;
    return `── RELEVANT PAST DECISIONS ───────────────────────\n${lines.join('\n')}`;
}

function _buildProceduresSection(procedures) {
    if (!procedures || procedures.length === 0) return null;
    const lines = [];
    for (const p of procedures.slice(0, 2)) {
        const rate = p.success_rate ? ` (success: ${(p.success_rate * 100).toFixed(0)}%)` : '';
        lines.push(`  • ${p.name}${rate}: ${(p.description || '').slice(0, 100)}`);
        if (p.steps && Array.isArray(p.steps) && p.steps.length > 0) {
            const stepTexts = p.steps.slice(0, 3).map((s, i) => `    ${i+1}. ${typeof s === 'object' ? (s.description || s.step || '') : s}`);
            lines.push(...stepTexts);
        }
    }
    if (lines.length === 0) return null;
    return `── RECOMMENDED PROCEDURES ────────────────────────\n${lines.join('\n')}`;
}

function _buildKnowledgeSection(knowledge) {
    if (!knowledge || knowledge.length === 0) return null;
    const seen  = new Set();
    const lines = [];
    for (const k of knowledge) {
        const text = (k.fact || '').slice(0, 180);
        const key  = text.slice(0, 50).toLowerCase();
        if (seen.has(key) || !text) continue;
        seen.add(key);
        const category = k.category ? ` [${k.category}]` : '';
        const conf     = k.confidence ? ` (conf: ${k.confidence})` : '';
        lines.push(`  • ${text}${category}${conf}`);
        if (lines.length >= 6) break;
    }
    if (lines.length === 0) return null;
    return `── VALIDATED KNOWLEDGE ───────────────────────────\n${lines.join('\n')}`;
}

function _buildSkillsSection(skills) {
    if (!skills || skills.length === 0) return null;
    const warnings = skills.filter(s => (s.success_rate || 0.5) < 0.5 && s.execution_count > 3);
    if (warnings.length === 0) return null;
    const lines = warnings.map(s =>
        `  ⚠ ${s.skill_name} (${s.domain}): success rate ${((s.success_rate || 0) * 100).toFixed(0)}% — ${s.competency_level}`
    );
    return `── SKILL WARNINGS ────────────────────────────────\n${lines.join('\n')}`;
}

function _buildGraphSection(graphNodes, graphEvidence) {
    if (!graphNodes || graphNodes.length === 0 || !graphEvidence) return null;
    const top = graphNodes.slice(0, 4).map(n => `  • [${n.node_type}] ${(n.label || '').slice(0, 80)}`);
    return `── GRAPH INSIGHTS (${graphEvidence.total_nodes} nodes) ──────────────────\n${top.join('\n')}`;
}

// Build context pack summary for debugging / health check
function summarize(contextPack) {
    return {
        objective:    (contextPack.objective || '').slice(0, 80),
        sources:      contextPack.retrieval_sources,
        confidence:   contextPack.confidence,
        counts: {
            episodes:   (contextPack.episodes || []).length,
            lessons:    (contextPack.lessons || []).length,
            decisions:  (contextPack.decisions || []).length,
            procedures: (contextPack.procedures || []).length,
            knowledge:  (contextPack.knowledge || []).length,
            skills:     (contextPack.skills || []).length,
            incidents:  (contextPack.incidents || []).length,
            graphNodes: (contextPack.graphNodes || []).length,
        },
    };
}

module.exports = { compose, summarize, ROLE_BUDGETS, ROLE_PRIORITIES };
