'use strict';
// lib/empire/graph.js — EmpireGraphService
// Master world model: everything outside the founder.

const { getSupabaseClient } = require('../clients');
const cache  = require('../memory/cache');
const logger = require('../logger');
const { NODES, EDGES } = require('./graph-data');

function _sb() { return getSupabaseClient(); }

const GRAPH_CACHE_KEY = 'egraph:graph:v1';
const GRAPH_CACHE_TTL = 5 * 60 * 1000;

// ─── Graph Loading ─────────────────────────────────────────────────────────────

async function _loadGraph() {
  const hit = cache.get(GRAPH_CACHE_KEY);
  if (hit) return hit;

  const [nodesRes, edgesRes] = await Promise.allSettled([
    _sb().from('egraph_nodes').select('*'),
    _sb().from('egraph_edges').select('*'),
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
  cache.invalidatePattern('egraph:graph');
}

// ─── buildEmpireGraph ──────────────────────────────────────────────────────────

async function buildEmpireGraph() {
  const nodeRows = NODES.map(n => ({
    id: n.id, type: n.type, label: n.label, category: n.category || 'general',
    properties: n.properties || {}, weight: n.weight || 1.0, status: n.status || 'active',
  }));

  const { error: nodeErr } = await _sb().from('egraph_nodes').upsert(nodeRows, { onConflict: 'id' });
  if (nodeErr) throw new Error(`EmpireGraph buildNodes: ${nodeErr.message}`);

  const edgeRows = EDGES.map(e => ({
    id:           `${e.from}__${e.rel}__${e.to}`,
    from_id:      e.from,
    to_id:        e.to,
    relationship: e.rel,
    weight:       e.w || 1.0,
    properties:   e.props || {},
  }));

  const { error: edgeErr } = await _sb().from('egraph_edges').upsert(edgeRows, { onConflict: 'id' });
  if (edgeErr) throw new Error(`EmpireGraph buildEdges: ${edgeErr.message}`);

  _invalidateCache();
  logger.debug('empire-graph', 'built', { nodes: nodeRows.length, edges: edgeRows.length });
  return { nodes: nodeRows.length, edges: edgeRows.length };
}

// ─── addNode / addEdge ─────────────────────────────────────────────────────────

async function addNode(node) {
  const row = {
    id: node.id, type: node.type, label: node.label, category: node.category || 'general',
    properties: node.properties || {}, weight: node.weight || 1.0, status: node.status || 'active',
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await _sb().from('egraph_nodes').upsert(row, { onConflict: 'id' }).select().single();
  if (error) throw new Error(`EmpireGraph addNode: ${error.message}`);
  _invalidateCache();
  return data;
}

async function addEdge(from, relationship, to, weight = 1.0, props = {}) {
  const id = `${from}__${relationship}__${to}`;
  const { data, error } = await _sb().from('egraph_edges')
    .upsert({ id, from_id: from, to_id: to, relationship, weight, properties: props }, { onConflict: 'id' })
    .select().single();
  if (error) throw new Error(`EmpireGraph addEdge: ${error.message}`);
  _invalidateCache();
  return data;
}

// ─── getNode / getNeighbors ────────────────────────────────────────────────────

async function getNode(nodeId) {
  const graph = await _loadGraph();
  const node  = graph.nodeMap.get(nodeId);
  if (!node) throw new Error(`EmpireGraph: node '${nodeId}' not found`);
  return node;
}

async function getNeighbors(nodeId, relationship = null) {
  const graph = await _loadGraph();

  const out = (graph.outEdges.get(nodeId) || [])
    .filter(e => !relationship || e.relationship === relationship)
    .map(e => {
      const n = graph.nodeMap.get(e.to_id);
      return n ? { ...n, via: e.relationship, edge_weight: e.weight, direction: 'out' } : null;
    }).filter(Boolean);

  const inc = (graph.inEdges.get(nodeId) || [])
    .filter(e => !relationship || e.relationship === relationship)
    .map(e => {
      const n = graph.nodeMap.get(e.from_id);
      return n ? { ...n, via: e.relationship, edge_weight: e.weight, direction: 'in' } : null;
    }).filter(Boolean);

  return { out, in: inc, total: out.length + inc.length };
}

// ─── updateNode ────────────────────────────────────────────────────────────────

async function updateNode(nodeId, updates) {
  _invalidateCache();
  const { data, error } = await _sb()
    .from('egraph_nodes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', nodeId).select().single();
  if (error) throw new Error(`EmpireGraph updateNode ${nodeId}: ${error.message}`);
  return data;
}

// ─── findHighestLeverageProjects ───────────────────────────────────────────────

async function findHighestLeverageProjects() {
  const graph = await _loadGraph();
  const projects = graph.nodes.filter(n => n.type === 'project' && n.status !== 'abandoned');

  return projects.map(p => {
    const out = (graph.outEdges.get(p.id) || []);
    const inc = (graph.inEdges.get(p.id)  || []);
    const opportunityLinks = out.filter(e => {
      const t = graph.nodeMap.get(e.to_id);
      return t?.type === 'opportunity' || t?.type === 'goal';
    }).length;
    const resourceDeps = out.filter(e => e.relationship === 'DEPENDS_ON').length;
    const leverage = (p.weight * 10) + (opportunityLinks * 15) - (resourceDeps * 5);
    return { ...p, opportunity_links: opportunityLinks, resource_deps: resourceDeps, leverage_score: Math.round(leverage) };
  }).sort((a, b) => b.leverage_score - a.leverage_score);
}

// ─── findMostInfluentialPeople ─────────────────────────────────────────────────

async function findMostInfluentialPeople() {
  const graph = await _loadGraph();
  const people = graph.nodes.filter(n => n.type === 'person');

  return people.map(p => {
    const allEdges = [
      ...(graph.outEdges.get(p.id) || []),
      ...(graph.inEdges.get(p.id)  || []),
    ];
    const influence = allEdges.reduce((s, e) => s + (e.weight || 1), 0) * p.weight;
    return { ...p, edge_count: allEdges.length, influence_score: Math.round(influence * 10) / 10 };
  }).sort((a, b) => b.influence_score - a.influence_score);
}

// ─── detectEmpireThreats ───────────────────────────────────────────────────────

async function detectEmpireThreats() {
  const graph = await _loadGraph();
  const threats = graph.nodes.filter(n => n.type === 'threat' && n.status !== 'mitigated');

  return threats.map(t => {
    const impactedNodes = (graph.outEdges.get(t.id) || []).map(e => graph.nodeMap.get(e.to_id)).filter(Boolean);
    const severity = t.properties?.severity || 'medium';
    const severityScore = { existential: 5, critical: 4, high: 3, medium: 2, low: 1 }[severity] || 2;
    const probability   = t.properties?.probability || 'medium';
    const probScore     = { high: 3, medium: 2, low: 1 }[probability] || 2;
    return {
      ...t,
      impacted_nodes: impactedNodes.map(n => ({ id: n.id, label: n.label, type: n.type })),
      severity_score: severityScore,
      probability_score: probScore,
      risk_score: Math.round(severityScore * probScore * t.weight),
    };
  }).sort((a, b) => b.risk_score - a.risk_score);
}

// ─── discoverOpportunities ─────────────────────────────────────────────────────

async function discoverOpportunities() {
  const graph = await _loadGraph();
  const opps  = graph.nodes.filter(n => n.type === 'opportunity' && n.properties?.status !== 'closed');

  return opps.map(o => {
    const enablers = (graph.inEdges.get(o.id) || []).map(e => graph.nodeMap.get(e.from_id)).filter(Boolean);
    const goalLinks = (graph.outEdges.get(o.id) || [])
      .filter(e => graph.nodeMap.get(e.to_id)?.type === 'goal').length;
    const readiness = enablers.length > 0 ? Math.min(100, enablers.length * 20 + goalLinks * 15) : 10;
    return {
      ...o,
      enablers: enablers.map(n => ({ id: n.id, label: n.label, type: n.type })),
      goal_links: goalLinks,
      readiness_score: readiness,
    };
  }).sort((a, b) => (b.weight * b.readiness_score) - (a.weight * a.readiness_score));
}

// ─── getResourceConstraints ────────────────────────────────────────────────────

async function getResourceConstraints() {
  const graph = await _loadGraph();
  const capital = graph.nodes.filter(n => n.type === 'capital');
  const resources = graph.nodes.filter(n => n.type === 'resource');

  const constraints = [];
  for (const node of [...capital, ...resources]) {
    const consumers = (graph.inEdges.get(node.id) || [])
      .filter(e => e.relationship === 'CONSUMES' || e.relationship === 'DEPENDS_ON')
      .map(e => graph.nodeMap.get(e.from_id)).filter(Boolean);

    const status = node.properties?.status || 'ok';
    const constrained = status === 'constrained' || consumers.length >= 3;
    if (constrained) {
      constraints.push({ node, consumers: consumers.map(n => ({ id: n.id, label: n.label })), status, bottleneck_count: consumers.length });
    }
  }
  return constraints.sort((a, b) => b.bottleneck_count - a.bottleneck_count);
}

// ─── getCapitalSummary ─────────────────────────────────────────────────────────

async function getCapitalSummary() {
  const graph = await _loadGraph();
  const capital = graph.nodes.filter(n => n.type === 'capital');

  let apiCostMonthly = 0;
  try {
    const rae = require('../intelligence/resource-authority-engine');
    const costs = await rae.getMonthlyCosts();
    apiCostMonthly = costs?.total_usd || 0;
  } catch {}

  return {
    capital_nodes: capital.map(n => ({
      id: n.id, label: n.label,
      status: n.properties?.status || 'unknown',
      capital_type: n.properties?.capital_type || 'unknown',
    })),
    api_cost_monthly_usd: apiCostMonthly,
    constrained: capital.filter(n => n.properties?.status === 'constrained').map(n => n.label),
  };
}

// ─── findCriticalDependencies ──────────────────────────────────────────────────

async function findCriticalDependencies() {
  const graph = await _loadGraph();
  const critical = [];

  for (const node of graph.nodes) {
    const deps = (graph.outEdges.get(node.id) || []).filter(e => e.relationship === 'DEPENDS_ON');
    for (const dep of deps) {
      const target = graph.nodeMap.get(dep.to_id);
      if (!target) continue;
      const isCritical = dep.weight >= 7 || target.properties?.dependency === 'critical';
      if (isCritical) {
        critical.push({
          from: { id: node.id, label: node.label },
          to:   { id: target.id, label: target.label, type: target.type },
          weight: dep.weight,
          single_point_of_failure: (graph.inEdges.get(target.id) || []).length <= 1,
        });
      }
    }
  }
  return critical.sort((a, b) => b.weight - a.weight);
}

// ─── rankAssets ────────────────────────────────────────────────────────────────

async function rankAssets() {
  const graph = await _loadGraph();
  const assets = graph.nodes.filter(n => n.type === 'asset');

  return assets.map(a => {
    const leverages = (graph.outEdges.get(a.id) || []).length;
    const builtBy   = (graph.inEdges.get(a.id)  || []).filter(e => e.relationship === 'PRODUCES' || e.relationship === 'BUILDS').length;
    const value = a.weight * 10 + leverages * 8 + builtBy * 3;
    return { ...a, leverages, built_by: builtBy, asset_value_score: Math.round(value) };
  }).sort((a, b) => b.asset_value_score - a.asset_value_score);
}

// ─── searchEmpireGraph ─────────────────────────────────────────────────────────

async function searchEmpireGraph(query) {
  if (!query) return [];
  const graph = await _loadGraph();
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!terms.length) return [];

  const results = [];
  for (const node of graph.nodes) {
    const haystack = [
      node.label, node.type, node.category || '',
      ...(node.properties?.keywords || []),
      node.properties?.description || '',
    ].join(' ').toLowerCase();

    const matchCount = terms.filter(t => haystack.includes(t)).length;
    if (!matchCount) continue;

    const neighborCount = (graph.outEdges.get(node.id) || []).length + (graph.inEdges.get(node.id) || []).length;
    results.push({ ...node, match_count: matchCount, neighbor_count: neighborCount,
      relevance: Math.round(matchCount * node.weight * 10) / 10 });
  }

  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
}

// ─── computeEmpireHealth ───────────────────────────────────────────────────────

async function computeEmpireHealth() {
  return require('./health').computeEmpireHealth();
}

// ─── getEmpireContext ──────────────────────────────────────────────────────────
// Concise context summary for prompt injection.

async function getEmpireContext() {
  const graph = await _loadGraph();
  if (!graph.nodes.length) return null;

  const activeProjects = graph.nodes
    .filter(n => n.type === 'project' && n.properties?.status === 'active')
    .sort((a, b) => b.weight - a.weight).slice(0, 3).map(n => n.label);

  const activeGoals = graph.nodes
    .filter(n => n.type === 'goal' && n.properties?.status === 'active')
    .sort((a, b) => b.weight - a.weight).slice(0, 3).map(n => n.label);

  const openOpps = graph.nodes
    .filter(n => n.type === 'opportunity' && n.properties?.status === 'open')
    .sort((a, b) => b.weight - a.weight).slice(0, 3).map(n => n.label);

  const topThreats = graph.nodes
    .filter(n => n.type === 'threat')
    .sort((a, b) => b.weight - a.weight).slice(0, 3).map(n => n.label);

  const constrainedCapital = graph.nodes
    .filter(n => n.type === 'capital' && n.properties?.status === 'constrained')
    .map(n => n.label);

  return {
    total_nodes:         graph.nodes.length,
    active_projects:     activeProjects,
    active_goals:        activeGoals,
    open_opportunities:  openOpps,
    top_threats:         topThreats,
    constrained_capital: constrainedCapital,
    empire_summary:      `Empire: ${activeProjects[0] || 'pre-product'} phase. Goals: ${activeGoals.slice(0, 2).join(', ')}. Threats: ${topThreats[0] || 'none critical'}.`,
  };
}

// ─── generateEmpireDashboard ───────────────────────────────────────────────────

async function generateEmpireDashboard() {
  const [projects, people, threats, opps, assets, constraints, health] = await Promise.allSettled([
    findHighestLeverageProjects(),
    findMostInfluentialPeople(),
    detectEmpireThreats(),
    discoverOpportunities(),
    rankAssets(),
    getResourceConstraints(),
    computeEmpireHealth(),
  ]);

  const safe = r => r.status === 'fulfilled' ? r.value : [];

  return {
    generated_at:    new Date().toISOString(),
    top_projects:    safe(projects).slice(0, 5),
    top_people:      safe(people).slice(0, 5),
    active_threats:  safe(threats).slice(0, 5),
    opportunities:   safe(opps).slice(0, 5),
    top_assets:      safe(assets).slice(0, 5),
    constraints:     safe(constraints).slice(0, 5),
    health:          health.status === 'fulfilled' ? health.value : null,
  };
}

// ─── getGraphStats ─────────────────────────────────────────────────────────────

async function getGraphStats() {
  const graph = await _loadGraph();
  const byType     = {};
  const byCategory = {};
  for (const node of graph.nodes) {
    byType[node.type]         = (byType[node.type]         || 0) + 1;
    byCategory[node.category] = (byCategory[node.category] || 0) + 1;
  }
  const byRel = {};
  for (const edge of graph.edges) {
    byRel[edge.relationship] = (byRel[edge.relationship] || 0) + 1;
  }
  return { total_nodes: graph.nodes.length, total_edges: graph.edges.length, nodes_by_type: byType, nodes_by_category: byCategory, edges_by_relationship: byRel };
}

module.exports = {
  buildEmpireGraph,
  addNode,
  addEdge,
  getNode,
  getNeighbors,
  updateNode,
  findHighestLeverageProjects,
  findMostInfluentialPeople,
  detectEmpireThreats,
  discoverOpportunities,
  getResourceConstraints,
  getCapitalSummary,
  findCriticalDependencies,
  rankAssets,
  searchEmpireGraph,
  computeEmpireHealth,
  getEmpireContext,
  generateEmpireDashboard,
  getGraphStats,
};
