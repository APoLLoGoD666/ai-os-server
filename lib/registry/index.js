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

const { Registry }        = require('./kernel');
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
const { ProjectedGraph }  = require('./projected-graph');
const universe            = require('./universe');
const architectureGen     = require('./architecture-generator');
const runtimeMirror       = require('./runtime-mirror');
const temporalCognition   = require('./temporal-cognition');
const observatory         = require('./observatory');
const constitution        = require('./constitution');
const shadowRegistry      = require('../../civilisation/shadow-registry');
const genomeValidator     = require('../../civilisation/genome-validator');
const contractValidator   = require('../../civilisation/contract-validator');
const civilisationClock   = require('../../civilisation/clock');

// ── Injection order matters ───────────────────────────────────────────────────
// 1. CAP-* capabilities (needed by impact._buildGraph on first analyze())
capabilityGraph.inject();
// 2. DOM-* domains, AGT-* agents, SVC-* services (universe entities)
universe.inject();
// 3. Start living architecture layer (debounced, non-blocking)
architectureGen.init();
// 4. Start runtime mirror layer (debounced, non-blocking)
runtimeMirror.init();
// 5. Start shadow registry generator (debounced, non-blocking)
shadowRegistry.init();
// 6. Start civilisation clock (measures domain tick rates)
civilisationClock.init();

module.exports = {
    Registry, engine, relationships, validator, projections, migrationLifecycle,
    discovery, twin, healthScore, impact, query, constraints, prediction, temporal,
    capabilities, snapshot, facts, scenario, capabilityGraph, capabilityMonitor,
    ProjectedGraph, universe, architectureGen, runtimeMirror, temporalCognition,
    observatory, constitution, shadowRegistry, genomeValidator,
    contractValidator, civilisationClock,
};
