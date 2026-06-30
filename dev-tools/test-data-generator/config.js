'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const path = require('path');

const VAULT = path.resolve(__dirname, '..', '..', 'APEX AI OS');

const PATHS = {
  VAULT,
  EPISODES_DIR:       path.join(VAULT, '12 Memory', 'Episodes'),
  MEMORY_INDEX:       path.join(VAULT, '12 Memory', 'memory-index.json'),
  GOALS_DIR:          path.join(VAULT, 'System', 'Goals'),
  PLAN_QUALITY_FILE:  path.join(VAULT, 'System', 'PlanQuality', 'plan-quality-registry.json'),
  ADAPTATION_FILE:    path.join(VAULT, 'System', 'Adaptations', 'adaptation-registry.json'),
  LESSONS_FILE:       path.join(VAULT, '01 Executive', 'Lessons.md'),
  CONVERSATIONS_DIR:  path.join(VAULT, '13 Briefings', 'Conversations'),
  PROJECTS_ARCHIVE:   path.join(VAULT, '02 Projects', 'Archive'),
  PROJECTS_ACTIVE:    path.join(VAULT, '02 Projects', 'Active'),
  IMPROVEMENTS_FILE:  path.join(VAULT, 'System', 'Improvements', 'proposals.json'),
};

const DATASET_IDS = {
  TIER1: 'sdv1-dim',
  TIER2: 'sdv1-loop',
  TIER3: 'sdv1-scale',
};

function synthMeta(datasetId) {
  return {
    synthetic: true,
    dataset_id: datasetId,
    removable: true,
    source: 'test',
  };
}

module.exports = { PATHS, DATASET_IDS, synthMeta };
