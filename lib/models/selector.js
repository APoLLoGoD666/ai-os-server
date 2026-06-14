'use strict';
// lib/models/selector.js — runtime model selection by complexity tier or explicit ID

const registry      = require('./registry');
const AnthropicModel = require('./providers/anthropic');
const GeminiModel   = require('./providers/google');

const _instances = new Map();

// select(complexity, options) → ModelInterface instance
// complexity: 'simple' | 'moderate' | 'complex' | 'critical' | 'balanced' | 'fast'
// options.domain: 'voice' → routes to Gemini
// options.forceModel: explicit model ID override
function select(complexity, options = {}) {
  if (options.forceModel) return _getInstance(options.forceModel);
  if (options.domain === 'voice') return _getInstance('gemini-2.5-flash');

  const modelSpec = registry.getModelForTier(complexity);
  return _getInstance(modelSpec.id);
}

function _getInstance(modelId) {
  if (_instances.has(modelId)) return _instances.get(modelId);
  const spec     = registry.getModel(modelId);
  let   instance;
  switch (spec.provider) {
    case 'anthropic': instance = new AnthropicModel(modelId, spec); break;
    case 'google':    instance = new GeminiModel(modelId, spec);    break;
    default:
      throw new Error(`No provider implementation for: ${spec.provider} (${modelId}). Only 'anthropic' and 'google' are live.`);
  }
  _instances.set(modelId, instance);
  return instance;
}

module.exports = { select };
