'use strict';
// lib/empire/health.js — Empire health scoring across 7 dimensions.

const { getSupabaseClient } = require('../clients');
const cache = require('../memory/cache');

const HEALTH_CACHE_KEY = 'egraph:health:v1';
const HEALTH_CACHE_TTL = 10 * 60 * 1000;

const DIMENSIONS = ['capital', 'momentum', 'risk', 'opportunity', 'people', 'assets', 'execution'];

async function computeEmpireHealth() {
  const hit = cache.get(HEALTH_CACHE_KEY);
  if (hit) return hit;

  const graph = require('./graph');
  const [nodes, threats, opps, assets, constraints, projects] = await Promise.allSettled([
    _allNodes(),
    graph.detectEmpireThreats(),
    graph.discoverOpportunities(),
    graph.rankAssets(),
    graph.getResourceConstraints(),
    graph.findHighestLeverageProjects(),
  ]);

  const safe = r => r.status === 'fulfilled' ? r.value : [];

  const allNodes   = safe(nodes);
  const threatList = safe(threats);
  const oppList    = safe(opps);
  const assetList  = safe(assets);
  const consList   = safe(constraints);
  const projList   = safe(projects);

  const scores = {
    capital:   _scoreCapital(allNodes, consList),
    momentum:  _scoreMomentum(projList),
    risk:      _scoreRisk(threatList),
    opportunity: _scoreOpportunity(oppList),
    people:    _scorePeople(allNodes),
    assets:    _scoreAssets(assetList),
    execution: _scoreExecution(projList),
  };

  const overall = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / DIMENSIONS.length);

  const result = {
    computed_at: new Date().toISOString(),
    overall,
    dimensions: scores,
    signals: _generateSignals(scores, threatList, consList),
    grade: _grade(overall),
  };

  cache.set(HEALTH_CACHE_KEY, result, HEALTH_CACHE_TTL);
  return result;
}

// ── Dimension Scorers ──────────────────────────────────────────────────────────

function _scoreCapital(nodes, constraints) {
  const capitalNodes = nodes.filter(n => n.type === 'capital');
  if (!capitalNodes.length) return 50;
  const constrained = capitalNodes.filter(n => n.properties?.status === 'constrained').length;
  const ratio = constrained / capitalNodes.length;
  return Math.round(100 - (ratio * 60) - (constraints.length * 5));
}

function _scoreMomentum(projects) {
  if (!projects.length) return 20;
  const active  = projects.filter(p => p.properties?.status === 'active').length;
  const shipped = projects.filter(p => p.properties?.stage === 'shipped' || p.properties?.stage === 'live').length;
  return Math.min(100, Math.round((active / projects.length) * 60 + shipped * 20));
}

function _scoreRisk(threats) {
  if (!threats.length) return 90;
  const critical    = threats.filter(t => t.properties?.severity === 'critical' || t.properties?.severity === 'existential').length;
  const high        = threats.filter(t => t.properties?.severity === 'high').length;
  const penaltyBase = critical * 20 + high * 8 + (threats.length - critical - high) * 3;
  return Math.max(0, 100 - penaltyBase);
}

function _scoreOpportunity(opps) {
  if (!opps.length) return 30;
  const open    = opps.filter(o => o.properties?.status === 'open').length;
  const readyHi = opps.filter(o => (o.readiness_score || 0) >= 60).length;
  return Math.min(100, Math.round(open * 15 + readyHi * 20));
}

function _scorePeople(nodes) {
  const people = nodes.filter(n => n.type === 'person');
  if (!people.length) return 30;
  const allies = people.filter(n => n.properties?.relationship_type === 'ally').length;
  return Math.min(100, Math.round(allies * 20 + people.length * 5));
}

function _scoreAssets(assets) {
  if (!assets.length) return 20;
  const compounding = assets.filter(a => a.properties?.value_stage === 'compounding').length;
  const building    = assets.filter(a => a.properties?.value_stage === 'building').length;
  return Math.min(100, Math.round(compounding * 30 + building * 15 + assets.length * 5));
}

function _scoreExecution(projects) {
  if (!projects.length) return 20;
  const active = projects.filter(p => p.properties?.status === 'active').length;
  return Math.min(100, Math.round((active / projects.length) * 100));
}

// ── Signals ────────────────────────────────────────────────────────────────────

function _generateSignals(scores, threats, constraints) {
  const signals = [];
  if (scores.capital < 50)   signals.push({ type: 'warning', dimension: 'capital',   message: 'Capital is constrained — protect runway' });
  if (scores.risk < 40)      signals.push({ type: 'critical', dimension: 'risk',     message: 'Multiple high-severity threats active' });
  if (scores.momentum < 40)  signals.push({ type: 'warning', dimension: 'momentum',  message: 'No shipped products yet — execution velocity low' });
  if (scores.opportunity > 70) signals.push({ type: 'positive', dimension: 'opportunity', message: 'Strong opportunity pipeline identified' });
  if (scores.assets > 60)    signals.push({ type: 'positive', dimension: 'assets',   message: 'Asset base compounding well' });
  const criticalThreats = threats.filter(t => t.properties?.severity === 'critical' || t.properties?.severity === 'existential');
  for (const t of criticalThreats.slice(0, 2)) signals.push({ type: 'critical', dimension: 'risk', message: `Critical threat: ${t.label}` });
  return signals;
}

function _grade(score) {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

async function _allNodes() {
  const { data } = await getSupabaseClient().from('egraph_nodes').select('*');
  return data || [];
}

module.exports = { computeEmpireHealth, DIMENSIONS };
