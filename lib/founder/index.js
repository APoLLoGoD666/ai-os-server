'use strict';
// lib/founder/index.js
// Founder OS — unified entry point.
// All subsystems import from here: require('../founder')

const profile          = require('./profile');
const alignmentEngine  = require('./alignment-engine');
const antiGoalMonitor  = require('./anti-goal-monitor');
const opportunityScorer = require('./opportunity-scorer');
const contextProvider  = require('./context-provider');
const privacyGuard     = require('./privacy-guard');
const stateTracker     = require('./state-tracker');
const graph            = require('./graph');

module.exports = {
  // Context (most used — call this first)
  getContext:               contextProvider.getContext,
  getAlignmentGuidance:     contextProvider.getAlignmentGuidanceForPrompt,
  getDecisionWeights:       contextProvider.getDecisionWeights,
  getRiskProfile:           contextProvider.getRiskProfile,

  // Alignment scoring
  score:                    alignmentEngine.score,
  batchScore:               alignmentEngine.batchScore,
  getAlignmentHistory:      alignmentEngine.getHistory,

  // Anti-goal monitoring
  checkAntiGoals:           antiGoalMonitor.check,
  checkFailurePattern:      antiGoalMonitor.checkFailurePattern,
  getActiveAlerts:          antiGoalMonitor.getActiveAlerts,
  acknowledgeAlert:         antiGoalMonitor.acknowledge,
  acknowledgeAllAlerts:     antiGoalMonitor.acknowledgeAll,

  // Opportunity scoring
  scoreOpportunity:         opportunityScorer.score,
  scoreOpportunities:       opportunityScorer.scoreAll,

  // Profile
  loadProfile:              profile.load,
  invalidateProfile:        profile.invalidate,
  getProfileSection:        profile.getSection,

  // State tracking
  getDomains:               stateTracker.getDomains,
  getGoals:                 stateTracker.getGoals,
  updateGoalProgress:       stateTracker.updateGoalProgress,
  updateDomainState:        stateTracker.updateDomainState,
  snapshotState:            stateTracker.snapshot,
  getLatestState:           stateTracker.getLatestSnapshot,

  // Privacy
  redact:                   privacyGuard.redact,
  sanitizeForModel:         privacyGuard.sanitizeForModel,
  checkAccess:              privacyGuard.checkAccess,
  guardContextPackage:      privacyGuard.guardContextPackage,

  // Knowledge Graph
  buildFounderGraph:        graph.buildFounderGraph,
  getGraphNode:             graph.getNode,
  getGraphNeighbors:        graph.getNeighbors,
  getGoalDependencies:      graph.getGoalDependencies,
  graphAlign:               graph.calculateFounderAlignment,
  graphDetectAntiGoals:     graph.detectAntiGoalConflicts,
  searchGraph:              graph.searchFounderGraph,
  updateGraphNode:          graph.updateFounderGraph,
  getGraphContext:          graph.getFounderGraphContext,
  getGraphStats:            graph.getGraphStats,
};
