'use strict';

// Graph Reasoning Engine — Phase 8
// Structured reasoning queries against the knowledge graph.
// Answers: What causes incidents? What lessons reduce failures?
// Which skills improve outcomes? Which decisions create risk?
// All relationships must be evidence-backed. Postgres is source of truth.

const knowledgeGraph        = require('../memory/knowledge-graph');
const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

// ── Structured reasoning queries ──────────────────────────────────────────────

// Find causal chains: what leads to incidents?
// Returns list of { nodeId, nodeType, label, pathLength, confidence }
async function findIncidentCauses(incidentNodeId, maxDepth = 4) {
    try {
        // Traverse incoming CAUSED edges to find what caused this incident
        const causes = [];
        const visited = new Set([incidentNodeId]);
        const queue   = [[incidentNodeId, 0]];

        while (queue.length > 0) {
            const [nodeId, depth] = queue.shift();
            if (depth >= maxDepth) continue;

            const incomingEdges = await knowledgeGraph.getNeighbors(nodeId, 'CAUSED', 'in');
            for (const edge of incomingEdges) {
                const sourceId = edge.from_node_id;
                if (visited.has(sourceId)) continue;
                visited.add(sourceId);

                const node = await knowledgeGraph.getNode(sourceId);
                if (node) {
                    causes.push({
                        nodeId:     sourceId,
                        nodeType:   node.node_type,
                        label:      node.label,
                        pathLength: depth + 1,
                        confidence: edge.confidence || 0.5,
                    });
                    queue.push([sourceId, depth + 1]);
                }
            }
        }
        return causes.sort((a, b) => b.confidence - a.confidence);
    } catch (e) {
        console.error(`[graph-reasoning] findIncidentCauses failed: ${e.message}`);
        return [];
    }
}

// Find lessons that reduce failures — traverse Lesson→SOLVES→Episode(failure) paths.
async function findLessonsThatReduceFailures(limit = 10) {
    try {
        const lessonNodes = await knowledgeGraph.getNodesByType('Lesson', 50);
        const results     = [];

        for (const lesson of lessonNodes) {
            const solvedEdges = await knowledgeGraph.getNeighbors(lesson.node_id, 'SOLVES', 'out');
            if (solvedEdges.length > 0) {
                results.push({
                    lessonId:    lesson.node_id,
                    lessonLabel: lesson.label,
                    confidence:  lesson.confidence || 0.5,
                    solvedCount: solvedEdges.length,
                    impact:      solvedEdges.reduce((s, e) => s + (e.weight || 0.5), 0) / solvedEdges.length,
                });
            }
        }
        return results.sort((a, b) => b.impact * b.confidence - a.impact * a.confidence).slice(0, limit);
    } catch (e) {
        console.error(`[graph-reasoning] findLessonsThatReduceFailures failed: ${e.message}`);
        return [];
    }
}

// Find skills that improve outcomes — traverse Skill→IMPROVES→Episode(success) paths.
async function findImpactfulSkills(limit = 10) {
    try {
        const skillNodes = await knowledgeGraph.getNodesByType('Skill', 50);
        const results    = [];

        for (const skill of skillNodes) {
            const improvedEdges = await knowledgeGraph.getNeighbors(skill.node_id, 'IMPROVES', 'out');
            if (improvedEdges.length > 0) {
                results.push({
                    skillId:      skill.node_id,
                    skillLabel:   skill.label,
                    confidence:   skill.confidence || 0.5,
                    improvedCount: improvedEdges.length,
                    avgImpact:    improvedEdges.reduce((s, e) => s + (e.weight || 0.5), 0) / improvedEdges.length,
                });
            }
        }
        return results.sort((a, b) => b.avgImpact - a.avgImpact).slice(0, limit);
    } catch (e) {
        console.error(`[graph-reasoning] findImpactfulSkills failed: ${e.message}`);
        return [];
    }
}

// Find procedures that improve certifications.
async function findProceduresCertificationPath(certificationNodeId) {
    try {
        const path = await knowledgeGraph.findPath(certificationNodeId, certificationNodeId, 4);
        // More useful: find what CONTRIBUTES_TO certifications
        const contributors = await knowledgeGraph.getNeighbors(certificationNodeId, 'CONTRIBUTES_TO', 'in');
        const results = [];
        for (const edge of contributors) {
            const node = await knowledgeGraph.getNode(edge.from_node_id);
            if (node && node.node_type === 'Procedure') {
                results.push({ procedure: node, edge });
            }
        }
        return results;
    } catch (_) { return []; }
}

// Find decisions that create risk — traverse Decision→CAUSED→Incident paths.
async function findRiskyDecisionPatterns(limit = 10) {
    try {
        const decisionNodes = await knowledgeGraph.getNodesByType('Decision', 100);
        const results       = [];

        for (const decision of decisionNodes) {
            const causedEdges = await knowledgeGraph.getNeighbors(decision.node_id, 'CAUSED', 'out');
            const incidents   = causedEdges.filter(e => e.to_node_type === 'Incident' || true); // all caused items
            if (incidents.length > 0) {
                results.push({
                    decisionId:    decision.node_id,
                    decisionLabel: decision.label,
                    riskScore:     incidents.reduce((s, e) => s + (e.confidence || 0.5), 0),
                    incidentCount: incidents.length,
                    confidence:    decision.confidence || 0.5,
                });
            }
        }
        return results.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
    } catch (e) {
        console.error(`[graph-reasoning] findRiskyDecisionPatterns failed: ${e.message}`);
        return [];
    }
}

// Pattern discovery: find nodes with many CAUSED relationships (high-risk nodes).
async function discoverHighRiskPatterns(minEdges = 3) {
    try {
        const { data, error } = await _sb().from('knowledge_graph_edges')
            .select('from_node_id')
            .eq('relationship', 'CAUSED');
        if (error || !data) return [];

        const freq = {};
        for (const e of data) freq[e.from_node_id] = (freq[e.from_node_id] || 0) + 1;

        const highRisk = Object.entries(freq)
            .filter(([, count]) => count >= minEdges)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);

        const results = [];
        for (const [nodeId, count] of highRisk) {
            const node = await knowledgeGraph.getNode(nodeId);
            if (node) results.push({ ...node, causal_count: count });
        }
        return results;
    } catch (e) {
        console.error(`[graph-reasoning] discoverHighRiskPatterns failed: ${e.message}`);
        return [];
    }
}

// Neighborhood analysis: get the full context neighborhood of a memory object.
async function getNeighborhoodContext(nodeId, maxDepth = 2) {
    try {
        const visited = new Set([nodeId]);
        const nodes   = [];
        const edges   = [];
        const queue   = [[nodeId, 0]];

        while (queue.length > 0) {
            const [current, depth] = queue.shift();
            if (depth >= maxDepth) continue;

            const [outEdges, inEdges] = await Promise.all([
                knowledgeGraph.getNeighbors(current, null, 'out'),
                knowledgeGraph.getNeighbors(current, null, 'in'),
            ]);

            for (const e of [...outEdges, ...inEdges]) {
                const nextId = e.to_node_id || e.from_node_id;
                if (!nextId || visited.has(nextId)) continue;
                visited.add(nextId);
                edges.push(e);
                const node = await knowledgeGraph.getNode(nextId);
                if (node) {
                    nodes.push(node);
                    if (depth + 1 < maxDepth) queue.push([nextId, depth + 1]);
                }
            }
        }

        return { centerNodeId: nodeId, nodes, edges, depth: maxDepth };
    } catch (e) {
        console.error(`[graph-reasoning] getNeighborhoodContext failed: ${e.message}`);
        return { centerNodeId: nodeId, nodes: [], edges: [] };
    }
}

// Sync key memory objects to knowledge graph.
// Called after major memory writes to keep the graph current.
async function syncMemoryToGraph(memoryType, memoryId, label, properties = {}) {
    const typeMap = {
        episodic_memory:   'Episode',
        semantic_memory:   'Knowledge',
        procedural_memory: 'Procedure',
        strategic_memory:  'Goal',
        skill_memory:      'Skill',
        decision_memory:   'Decision',
        apex_lessons:      'Lesson',
    };
    const nodeType = typeMap[memoryType] || 'Knowledge';
    return knowledgeGraph.syncFromMemory(nodeType, memoryId, memoryType, label, properties);
}

// Build a reasoning summary for a given objective — used by planning-influence-engine.
async function buildReasoningSummary(objective) {
    try {
        const [highRisk, impactfulLessons, impactfulSkills] = await Promise.all([
            discoverHighRiskPatterns(2).catch(() => []),
            findLessonsThatReduceFailures(3).catch(() => []),
            findImpactfulSkills(3).catch(() => []),
        ]);

        const parts = [];
        if (highRisk.length > 0) {
            parts.push(`High-risk patterns: ${highRisk.slice(0,2).map(n => n.label).join(', ')}`);
        }
        if (impactfulLessons.length > 0) {
            parts.push(`Lessons that reduce failures: ${impactfulLessons.slice(0,2).map(l => l.lessonLabel.slice(0,60)).join('; ')}`);
        }
        if (impactfulSkills.length > 0) {
            parts.push(`High-impact skills: ${impactfulSkills.slice(0,2).map(s => s.skillLabel).join(', ')}`);
        }

        return parts.length > 0 ? 'GRAPH INTELLIGENCE:\n' + parts.map(p => `  • ${p}`).join('\n') : null;
    } catch (_) { return null; }
}

module.exports = {
    findIncidentCauses,
    findLessonsThatReduceFailures,
    findImpactfulSkills,
    findProceduresCertificationPath,
    findRiskyDecisionPatterns,
    discoverHighRiskPatterns,
    getNeighborhoodContext,
    syncMemoryToGraph,
    buildReasoningSummary,
};
