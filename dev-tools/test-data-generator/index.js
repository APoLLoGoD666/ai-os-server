'use strict';
// Public API for the Synthetic Validation Framework.
// Every record produced by this module includes { synthetic: true, dataset_id, removable: true, source: 'test' }.
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const g = require('./generators');
const { loadTier } = require('./loader');
const { validateSyntheticDataset, statusSummary } = require('./validator');
const { cleanupSyntheticDataset } = require('./cleanup');
const { DATASET_IDS } = require('./config');

// ─── Generator functions (pure — return data arrays, no I/O) ──────────────────

function generateEpisodes(tier = 'all') {
  if (tier === 'all') {
    return [
      ...g.generateEpisodes(DATASET_IDS.TIER1),
      ...g.generateEpisodes(DATASET_IDS.TIER2),
      ...g.generateEpisodes(DATASET_IDS.TIER3),
    ];
  }
  const id = { tier1: DATASET_IDS.TIER1, tier2: DATASET_IDS.TIER2, tier3: DATASET_IDS.TIER3 }[tier] || tier;
  return g.generateEpisodes(id);
}

function generateGoals(tier = 'all') {
  if (tier === 'all') {
    return [
      ...g.generateGoals(DATASET_IDS.TIER1),
      ...g.generateGoals(DATASET_IDS.TIER2),
      ...g.generateGoals(DATASET_IDS.TIER3),
    ];
  }
  const id = { tier1: DATASET_IDS.TIER1, tier2: DATASET_IDS.TIER2, tier3: DATASET_IDS.TIER3 }[tier] || tier;
  return g.generateGoals(id);
}

function generatePlanRecords(tier = 'all') {
  if (tier === 'all') {
    return [
      ...g.generatePlanRecords(DATASET_IDS.TIER2),
      ...g.generatePlanRecords(DATASET_IDS.TIER3),
    ];
  }
  const id = { tier1: DATASET_IDS.TIER1, tier2: DATASET_IDS.TIER2, tier3: DATASET_IDS.TIER3 }[tier] || tier;
  return g.generatePlanRecords(id);
}

function generateLessons(tier = 'all') {
  if (tier === 'all') {
    return [
      ...g.generateLessons(DATASET_IDS.TIER2),
      ...g.generateLessons(DATASET_IDS.TIER3),
    ];
  }
  const id = { tier1: DATASET_IDS.TIER1, tier2: DATASET_IDS.TIER2, tier3: DATASET_IDS.TIER3 }[tier] || tier;
  return g.generateLessons(id);
}

function generateFinancialRecords() {
  return g.generateFinancialRecords(DATASET_IDS.TIER3);
}

function generateEmailThreads() {
  return g.generateEmailThreads(DATASET_IDS.TIER3);
}

function generateProjectArchives() {
  return g.generateProjectArchives(DATASET_IDS.TIER3);
}

function generateChatHistory() {
  return g.generateChatHistory(DATASET_IDS.TIER3);
}

// ─── Tier loaders (I/O) ───────────────────────────────────────────────────────

async function loadTier1() { return loadTier(1); }
async function loadTier2() { return loadTier(2); }
async function loadTier3() { return loadTier(3); }

module.exports = {
  // Required spec exports
  generateEpisodes,
  generateGoals,
  generatePlanRecords,
  generateLessons,
  generateFinancialRecords,
  generateEmailThreads,
  generateProjectArchives,
  generateChatHistory,
  validateSyntheticDataset,
  cleanupSyntheticDataset,

  // Tier loaders
  loadTier1,
  loadTier2,
  loadTier3,

  // Status
  statusSummary,

  // Constants
  DATASET_IDS,
};
