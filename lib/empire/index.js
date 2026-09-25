'use strict';
// lib/empire/index.js — Empire Graph public API

const graph  = require('./graph');
const health = require('./health');

module.exports = {
  // Build / Mutate
  buildEmpireGraph:    graph.buildEmpireGraph,
  addNode:             graph.addNode,
  addEdge:             graph.addEdge,
  updateNode:          graph.updateNode,

  // Read
  getNode:             graph.getNode,
  getNeighbors:        graph.getNeighbors,
  getGraphStats:       graph.getGraphStats,

  // Intelligence
  findHighestLeverageProjects: graph.findHighestLeverageProjects,
  findMostInfluentialPeople:   graph.findMostInfluentialPeople,
  detectEmpireThreats:         graph.detectEmpireThreats,
  discoverOpportunities:       graph.discoverOpportunities,
  getResourceConstraints:      graph.getResourceConstraints,
  getCapitalSummary:           graph.getCapitalSummary,
  findCriticalDependencies:    graph.findCriticalDependencies,
  rankAssets:                  graph.rankAssets,
  searchEmpireGraph:           graph.searchEmpireGraph,

  // Context / Dashboard
  getEmpireContext:       graph.getEmpireContext,
  generateEmpireDashboard: graph.generateEmpireDashboard,

  // Health
  computeEmpireHealth: health.computeEmpireHealth,
};
