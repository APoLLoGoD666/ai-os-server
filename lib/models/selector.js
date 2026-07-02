'use strict';
// lib/models/selector.js — runtime model selection by complexity tier or explicit ID

const registry       = require('./registry');
const AnthropicModel = require('./providers/anthropic');
const GeminiModel    = require('./providers/google');
const healthMonitor  = require('../health/monitor');
const containment    = require('../health/containment');

const _instances = new Map();

// select(complexity, options) → ModelInterface instance
// complexity: 'simple' | 'moderate' | 'complex' | 'critical' | 'balanced' | 'fast'
// options.domain: 'voice' → routes to Gemini
// options.forceModel: explicit model ID override
function select(complexity, options = {}) {
  if (options.forceModel) return _getInstance(options.forceModel);
  if (options.domain === 'voice') return _getInstance('gemini-2.5-flash');

  const override = containment.getProviderOverride();
  if (override === 'google') return _getInstance('gemini-2.5-flash');

  const modelSpec = registry.getModelForTier(complexity);
  return _getInstance(modelSpec.id);
}

// withFailover wraps a model completion call with automatic failover to Google
// if the primary Anthropic call fails. Records health metrics on both paths.
async function withFailover(complexity, contextPackage, opts = {}) {
  const primary = select(complexity, opts);
  const isGoogle = primary.modelId && primary.modelId.startsWith('gemini');
  const start = Date.now();

  try {
    const result = await primary.complete('', contextPackage, opts);
    const latency = Date.now() - start;
    if (!isGoogle) healthMonitor.recordProviderCall('anthropic', true, latency);
    else           healthMonitor.recordProviderCall('google',    true, latency);
    return result;
  } catch (err) {
    const latency = Date.now() - start;
    if (!isGoogle) {
      healthMonitor.recordProviderCall('anthropic', false, latency);
      containment.evaluateAndContain();

      // attempt Google fallback
      try {
        const fallback      = _getInstance('gemini-2.5-flash');
        const fallbackStart = Date.now();
        const result        = await fallback.complete('', contextPackage, opts);
        healthMonitor.recordProviderCall('google', true, Date.now() - fallbackStart);
        return result;
      } catch (fallbackErr) {
        healthMonitor.recordProviderCall('google', false, Date.now() - fallbackStart);
        throw fallbackErr;
      }
    }
    healthMonitor.recordProviderCall('google', false, latency);
    throw err;
  }
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

module.exports = { select, withFailover };
