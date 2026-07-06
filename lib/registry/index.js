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

module.exports = { engine, relationships, validator, projections, migrationLifecycle, discovery, twin, healthScore };
