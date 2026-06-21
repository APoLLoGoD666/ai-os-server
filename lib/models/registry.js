'use strict';
// lib/models/registry.js — model catalog and tier routing

const MODELS = {
  // Anthropic Claude
  'claude-haiku-4-5-20251001': { provider: 'anthropic', contextK: 200,  costPerMtok: 0.80,  tier: 'fast'     },
  'claude-sonnet-4-6':         { provider: 'anthropic', contextK: 200,  costPerMtok: 3.00,  tier: 'balanced' },
  'claude-opus-4-7':           { provider: 'anthropic', contextK: 200,  costPerMtok: 15.00, tier: 'powerful' },
  // Google Gemini
  'gemini-2.5-flash':          { provider: 'google',    contextK: 1000, costPerMtok: 0.075, tier: 'fast'     },
  'gemini-2.5-pro':            { provider: 'google',    contextK: 1000, costPerMtok: 1.25,  tier: 'powerful' },
  // OpenAI (future — stub)
  'gpt-4o-mini':               { provider: 'openai',    contextK: 128,  costPerMtok: 0.15,  tier: 'fast'     },
  'gpt-4o':                    { provider: 'openai',    contextK: 128,  costPerMtok: 2.50,  tier: 'balanced' },
  // Local (future — stub)
  'local-llama':               { provider: 'local',     contextK: 8,    costPerMtok: 0,     tier: 'local'    },
};

// Change only this map to swap models — nothing else in the codebase changes.
const TIER_ROUTING = {
  simple:   'claude-haiku-4-5-20251001',
  moderate: 'claude-sonnet-4-6',
  complex:  'claude-sonnet-4-6',
  critical: 'claude-opus-4-7',
  balanced: 'claude-sonnet-4-6',
  fast:     'claude-haiku-4-5-20251001',
  powerful: 'claude-opus-4-7',
  voice:    'claude-haiku-4-5-20251001',
};

function getModel(modelId) {
  if (!MODELS[modelId]) throw new Error(`Unknown model: ${modelId}`);
  return { id: modelId, ...MODELS[modelId] };
}

function getModelForTier(tier) {
  const modelId = TIER_ROUTING[tier] || TIER_ROUTING.moderate;
  return getModel(modelId);
}

function estimateCost(modelId, inputTokens, outputTokens) {
  const m = MODELS[modelId];
  if (!m) return 0;
  return ((inputTokens + outputTokens) / 1_000_000) * m.costPerMtok;
}

module.exports = { MODELS, TIER_ROUTING, getModel, getModelForTier, estimateCost };
