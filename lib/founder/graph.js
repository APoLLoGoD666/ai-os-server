'use strict';
// lib/founder/graph.js — FounderGraphService
// Graph-based cognitive representation of the founder.
// The FKG is the root intelligence layer: all Apex systems reason against it.

const { getSupabaseClient } = require('../clients');
const cache  = require('../memory/cache');
const logger = require('../logger');
const { NODES, EDGES } = require('./graph-data');

function _sb() { return getSupabaseClient(); }

const GRAPH_CACHE_KEY = 'fkg:graph:v1';
const GRAPH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Graph Loading ─────────────────────────────────────────────────────────────

async function _loadGraph() {
  const hit = cache.get(GRAPH_CACHE_KEY);
  if (hit) return hit;

  const [nodesRes, edgesRes] = await Promise.allSettled([
    _sb().from('fkg_nodes').select('*'),
    _sb().from('fkg_edges').select('*'),
  ]);

  const nodes = nodesRes.status === 'fulfilled' ? (nodesRes.value.data || []) : [];
  const edges = edgesRes.status === 'fulfilled' ? (edgesRes.value.data || []) : [];

  const nodeMap  = new Map(nodes.map(n => [n.id, n]));
  const outEdges = new Map();
  const inEdges  = new Map();

  for (const node of nodes) {
    outEdges.set(node.id, []);
    inEdges.set(node.id, []);
  }
  for (const edge of edges) {
    if (!outEdges.has(edge.from_id)) outEdges.set(edge.from_id, []);
    if (!inEdges.has(edge.to_id))   inEdges.set(edge.to_id, []);
    outEdges.get(edge.from_id).push({ to_id: edge.to_id,   relationship: edge.relationship, weight: edge.weight });
    inEdges.get(edge.to_id).push(   { from_id: edge.from_id, relationship: edge.relationship, weight: edge.weight });
  }

  const graph = { nodeMap, outEdges, inEdges, nodes, edges };
  cache.set(GRAPH_CACHE_KEY, graph, GRAPH_CACHE_TTL);
  return graph;
}

function _invalidateCache() {
  cache.invalidatePattern('fkg:graph');
}

// ─── buildFounderGraph ─────────────────────────────────────────────────────────

async function buildFounderGraph() {
  const nodeRows = NODES.map(n => ({
    id: n.id, type: n.type, label: n.label,
    properties: n.properties || {}, weight: n.weight || 1.0, layer: n.layer || 'general',
  }));

  const { error: nodeErr } = await _sb().from('fkg_nodes').upsert(nodeRows, { onConflict: 'id' });
  if (nodeErr) throw new Error(`FKG buildNodes: ${nodeErr.message}`);

  const edgeRows = EDGES.map(e => ({
    id:           `${e.from}__${e.rel}__${e.to}`,
    from_id:      e.from,
    to_id:        e.to,
    relationship: e.rel,
    weight:       e.w || 1.0,
    properties:   e.props || {},
  }));

  const { error: edgeErr } = await _sb().from('fkg_edges').upsert(edgeRows, { onConflict: 'id' });
  if (edgeErr) throw new Error(`FKG buildEdges: ${edgeErr.message}`);

  _invalidateCache();
  logger.debug('founder-graph', 'built', { nodes: nodeRows.length, edges: edgeRows.length });
  return { nodes: nodeRows.length, edges: edgeRows.length };
}

// ─── getNode ───────────────────────────────────────────────────────────────────

async function getNode(nodeId) {
  const graph = await _loadGraph();
  const node  = graph.nodeMap.get(nodeId);
  if (!node) throw new Error(`FKG: node '${nodeId}' not found`);
  return node;
}

// ─── getNeighbors ──────────────────────────────────────────────────────────────

async function getNeighbors(nodeId, relationship = null) {
  const graph = await _loadGraph();

  const out = (graph.outEdges.get(nodeId) || [])
    .filter(e => !relationship || e.relationship === relationship)
    .map(e => {
      const n = graph.nodeMap.get(e.to_id);
      return n ? { ...n, via: e.relationship, edge_weight: e.weight, direction: 'out' } : null;
    })
    .filter(Boolean);

  const inc = (graph.inEdges.get(nodeId) || [])
    .filter(e => !relationship || e.relationship === relationship)
    .map(e => {
      const n = graph.nodeMap.get(e.from_id);
      return n ? { ...n, via: e.relationship, edge_weight: e.weight, direction: 'in' } : null;
    })
    .filter(Boolean);

  return { out, in: inc, total: out.length + inc.length };
}

// ─── getGoalDependencies ───────────────────────────────────────────────────────

const DEPENDENCY_RELS = new Set([
  'REQUIRES', 'DEPENDS_ON', 'ENABLES', 'PRODUCES',
  'BUILDS_THROUGH', 'CONTRIBUTES_TO', 'PATHWAY_TO', 'IS_PART_OF',
]);

async function getGoalDependencies(goalId) {
  const graph = await _loadGraph();
  const root  = graph.nodeMap.get(goalId);
  if (!root) throw new Error(`FKG: goal '${goalId}' not found`);

  const visited = new Set([goalId]);
  const queue   = [{ id: goalId, depth: 0, path: [goalId] }];
  const deps    = [];

  while (queue.length) {
    const { id, depth, path } = queue.shift();
    if (depth >= 4) continue;

    for (const edge of (graph.outEdges.get(id) || [])) {
      if (!DEPENDENCY_RELS.has(edge.relationship)) continue;
      const toNode = graph.nodeMap.get(edge.to_id);
      if (!toNode || visited.has(edge.to_id)) continue;
      visited.add(edge.to_id);
      const dep = { node: toNode, relationship: edge.relationship, weight: edge.weight, depth: depth + 1, path: [...path, edge.to_id] };
      deps.push(dep);
      queue.push({ id: edge.to_id, depth: dep.depth, path: dep.path });
    }
  }

  const CONCRETE_TYPES = new Set(['empire_domain', 'health_goal', 'lifestyle', 'project', 'spiritual', 'person']);
  const pathToCompletion = deps
    .filter(d => CONCRETE_TYPES.has(d.node.type))
    .sort((a, b) => a.depth - b.depth)
    .map(d => ({ id: d.node.id, label: d.node.label, type: d.node.type, relationship: d.relationship, depth: d.depth }));

  return { root: { id: root.id, label: root.label, type: root.type }, dependencies: deps, path_to_completion: pathToCompletion };
}

// ─── calculateFounderAlignment ────────────────────────────────────────────────

async function calculateFounderAlignment(text) {
  if (!text) return { score: 0, matched_nodes: [], anti_goal_triggers: [], graph_paths: [], breakdown: {} };
  const graph = await _loadGraph();
  const lower = text.toLowerCase();

  // Find all keyword-matched nodes
  const matched = [];
  for (const node of graph.nodes) {
    const kws  = (node.properties?.keywords || []);
    const hits = kws.filter(kw => lower.includes(kw.toLowerCase()));
    if (hits.length) matched.push({ node, hits });
  }

  if (!matched.length) return { score: 0, matched_nodes: [], anti_goal_triggers: [], graph_paths: [], breakdown: { no_matches: true } };

  // Score by type with propagation bonuses
  let raw = 0;
  const breakdown = { values: 0, goals: 0, principles: 0, anti_goals: 0, empire: 0, project: 0, other: 0 };
  const antiGoalTriggers = [];
  const graphPaths       = [];

  for (const { node, hits } of matched) {
    const base = node.weight * hits.length;

    switch (node.type) {
      case 'value':         raw += base * 1.2; breakdown.values     += base * 1.2; break;
      case 'goal':          raw += base * 1.5; breakdown.goals      += base * 1.5; break;
      case 'principle':     raw += base * 1.0; breakdown.principles += base * 1.0; break;
      case 'empire_domain': raw += base * 0.8; breakdown.empire     += base * 0.8; break;
      case 'project':       raw += base * 1.0; breakdown.project    += base * 1.0; break;
      case 'strength':      raw += base * 0.4; breakdown.other      += base * 0.4; break;
      case 'anti_goal':
        raw -= base * 2.5;
        breakdown.anti_goals -= base * 2.5;
        antiGoalTriggers.push({ id: node.id, label: node.label, severity: node.properties?.severity || 'high', hits });
        break;
      default: raw += base * 0.3; breakdown.other += base * 0.3; break;
    }

    // Propagation: lifestyle/health matches carry goal-connection bonus
    if (['lifestyle', 'health_goal', 'spiritual', 'legacy'].includes(node.type)) {
      for (const edge of (graph.inEdges.get(node.id) || [])) {
        const src = graph.nodeMap.get(edge.from_id);
        if (src?.type === 'goal') {
          raw += src.weight * 0.4;
          graphPaths.push(`${node.label} → ${edge.relationship} → ${src.label}`);
        }
      }
    }
  }

  // Normalize: max theoretical raw ~180 (3 high-weight goals, 2 kw hits, multiplier)
  const score = Math.max(0, Math.min(100, Math.round((raw / 180) * 100)));

  return {
    score,
    matched_nodes:     matched.map(m => ({ id: m.node.id, label: m.node.label, type: m.node.type, hits: m.hits })),
    anti_goal_triggers: antiGoalTriggers,
    graph_paths:        graphPaths.slice(0, 6),
    breakdown:          Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  };
}

// ─── detectAntiGoalConflicts ───────────────────────────────────────────────────

async function detectAntiGoalConflicts(text) {
  if (!text) return { clean: true, triggered: [], block_execution: false };
  const graph = await _loadGraph();
  const lower = text.toLowerCase();

  const triggered = [];
  for (const node of graph.nodes) {
    if (node.type !== 'anti_goal') continue;
    const hits = (node.properties?.keywords || []).filter(kw => lower.includes(kw.toLowerCase()));
    if (hits.length) {
      triggered.push({ id: node.id, label: node.label, severity: node.properties?.severity || 'high', hits, weight: node.weight });
    }
  }

  triggered.sort((a, b) => b.weight - a.weight);
  return {
    clean:           triggered.length === 0,
    triggered,
    block_execution: triggered.some(t => t.severity === 'critical' || t.severity === 'existential'),
  };
}

// ─── searchFounderGraph ────────────────────────────────────────────────────────

async function searchFounderGraph(query) {
  if (!query) return [];
  const graph = await _loadGraph();
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!terms.length) return [];

  const results = [];
  for (const node of graph.nodes) {
    const haystack = [
      node.label,
      node.type,
      node.layer || '',
      ...(node.properties?.keywords || []),
      node.properties?.description || '',
    ].join(' ').toLowerCase();

    const matchCount = terms.filter(t => haystack.includes(t)).length;
    if (!matchCount) continue;

    const neighborCount = (graph.outEdges.get(node.id) || []).length + (graph.inEdges.get(node.id) || []).length;
    results.push({ ...node, match_count: matchCount, neighbor_count: neighborCount, relevance: Math.round(matchCount * node.weight * 10) / 10 });
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
}

// ─── updateFounderGraph ────────────────────────────────────────────────────────

async function updateFounderGraph(nodeId, properties) {
  _invalidateCache();
  const { data, error } = await _sb()
    .from('fkg_nodes')
    .update({ properties, updated_at: new Date().toISOString() })
    .eq('id', nodeId)
    .select()
    .single();
  if (error) throw new Error(`FKG updateNode ${nodeId}: ${error.message}`);
  return data;
}

// ─── getFounderGraphContext ─────────────────────────────────────────────────────
// Returns a concise context summary for prompt injection — used by context-provider.

async function getFounderGraphContext(description = '') {
  const graph = await _loadGraph();
  if (!graph.nodes.length) return null;

  const founderNode = graph.nodeMap.get('founder');

  const topValues = (graph.outEdges.get('founder') || [])
    .filter(e => e.relationship === 'VALUES')
    .map(e => graph.nodeMap.get(e.to_id)).filter(Boolean)
    .sort((a, b) => b.weight - a.weight).slice(0, 5).map(n => n.label);

  const activeGoals = (graph.outEdges.get('founder') || [])
    .filter(e => e.relationship === 'PURSUES')
    .map(e => graph.nodeMap.get(e.to_id)).filter(Boolean)
    .sort((a, b) => b.weight - a.weight).slice(0, 5).map(n => n.label);

  const topAntiGoals = graph.nodes
    .filter(n => n.type === 'anti_goal')
    .sort((a, b) => b.weight - a.weight).slice(0, 5).map(n => n.label);

  const principles = (graph.outEdges.get('founder') || [])
    .filter(e => e.relationship === 'FOLLOWS')
    .map(e => graph.nodeMap.get(e.to_id)).filter(Boolean).slice(0, 5).map(n => n.label);

  const graphAlignment = description ? await calculateFounderAlignment(description) : null;

  return {
    archetype:       founderNode?.properties?.archetype || 'Architect-Builder',
    top_values:      topValues,
    active_goals:    activeGoals,
    top_anti_goals:  topAntiGoals,
    principles:      principles,
    graph_alignment: graphAlignment?.score ?? null,
    anti_goal_clean: graphAlignment ? graphAlignment.anti_goal_triggers.length === 0 : true,
    graph_paths:     graphAlignment?.graph_paths || [],
    graph_summary:   `${founderNode?.properties?.archetype || 'Architect-Builder'} — values: ${topValues.slice(0,3).join(', ')}. Goals: ${activeGoals.slice(0,3).join(', ')}. Hard limits: ${topAntiGoals.slice(0,3).join(', ')}.`,
  };
}

// ─── getGraphStats ─────────────────────────────────────────────────────────────

async function getGraphStats() {
  const graph = await _loadGraph();
  const byType  = {};
  const byLayer = {};
  for (const node of graph.nodes) {
    byType[node.type]   = (byType[node.type]   || 0) + 1;
    byLayer[node.layer] = (byLayer[node.layer] || 0) + 1;
  }
  const byRel = {};
  for (const edge of graph.edges) {
    byRel[edge.relationship] = (byRel[edge.relationship] || 0) + 1;
  }
  return { total_nodes: graph.nodes.length, total_edges: graph.edges.length, nodes_by_type: byType, nodes_by_layer: byLayer, edges_by_relationship: byRel };
}

module.exports = {
  buildFounderGraph,
  getNode,
  getNeighbors,
  getGoalDependencies,
  calculateFounderAlignment,
  detectAntiGoalConflicts,
  searchFounderGraph,
  updateFounderGraph,
  getFounderGraphContext,
  getGraphStats,
};
