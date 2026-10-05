'use strict';
// lib/models/interface.js — Abstract contract all model providers must implement

class ModelInterface {
  constructor({ modelId, provider, contextK, costPerMtok }) {
    this.modelId      = modelId;
    this.provider     = provider;
    this.contextK     = contextK;
    this.costPerMtok  = costPerMtok;
  }

  // Complete a task. Returns ModelResult.
  async complete(taskDescription, contextPackage, options = {}) {
    throw new Error(`${this.constructor.name}.complete() not implemented`);
  }

  // Streaming completion. Yields string chunks.
  async * stream(taskDescription, contextPackage, options = {}) {
    throw new Error(`${this.constructor.name}.stream() not implemented`);
  }

  // Health check. Returns true if model is reachable.
  async ping() {
    throw new Error(`${this.constructor.name}.ping() not implemented`);
  }

  // Convert Context Package to model-native format. Must be overridden.
  _adaptContext(contextPackage) {
    throw new Error(`${this.constructor.name}._adaptContext() not implemented`);
  }
}

// Standardized result all providers must return.
class ModelResult {
  constructor({ content, inputTokens, outputTokens, stopReason, modelId, provider, durationMs }) {
    this.content      = content;
    this.inputTokens  = inputTokens  || 0;
    this.outputTokens = outputTokens || 0;
    this.totalTokens  = this.inputTokens + this.outputTokens;
    this.stopReason   = stopReason   || 'end_turn';
    this.modelId      = modelId;
    this.provider     = provider;
    this.durationMs   = durationMs   || 0;
    this.costUsd      = require('./registry').estimateCost(modelId, this.inputTokens, this.outputTokens);
    this.createdAt    = new Date().toISOString();
  }
}

module.exports = { ModelInterface, ModelResult };
