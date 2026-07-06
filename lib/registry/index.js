'use strict';
// lib/registry/index.js — Unified Registry infrastructure export.
// Import this module anywhere in APEX to query the Registry.
//
// Usage:
//   const { engine, relationships, validator, projections } = require('./lib/registry');
//   engine.lookup('ENT-000001')
//   relationships.graph('ENT-001130', 2)
//   validator.validate()
//   projections.checkAllPhysical()

const engine              = require('./engine');
const relationships       = require('./relationships');
const validator           = require('./validator');
const projections         = require('./projections');
const migrationLifecycle  = require('./migration-lifecycle');
const discovery           = require('./relationship-discovery');
const twin                = require('./twin');
const healthScore         = require('./health-score');
const impact              = require('./impact');
const query               = require('./query');
const constraints         = require('./constraints');
const prediction          = require('./prediction');
const temporal            = require('./temporal');
const capabilities        = require('./capabilities');
const snapshot            = require('./snapshot');
const facts               = require('./facts');
const scenario            = require('./scenario');
const capabilityGraph     = require('./capability-graph');
const capabilityMonitor   = require('./capability-monitor');

// Promote CAP-* to first-class graph nodes.
// Must run before any impact.analyze() call so the implemented_by edges
// are included when impact._buildGraph() constructs the adjacency maps.
capabilityGraph.inject();

module.exports = { engine, relationships, validator, projections, migrationLifecycle, discovery, twin, healthScore, impact, query, constraints, prediction, temporal, capabilities, snapshot, facts, scenario, capabilityGraph, capabilityMonitor };
