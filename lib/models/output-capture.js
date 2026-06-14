'use strict';
// lib/models/output-capture.js — write ModelResult metadata to cost_accounting

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

async function capture(modelResult, taskId, traceId) {
  try {
    const { error } = await _sb().from('cost_accounting').insert({
      task_id:      taskId,
      trace_id:     traceId,
      model_id:     modelResult.modelId,
      provider:     modelResult.provider,
      input_tokens: modelResult.inputTokens,
      output_tokens: modelResult.outputTokens,
      amount_usd:   modelResult.costUsd,
      duration_ms:  modelResult.durationMs,
      stop_reason:  modelResult.stopReason,
      description:  `${modelResult.provider}/${modelResult.modelId} for ${taskId || 'unknown'}`,
      created_at:   new Date().toISOString(),
    });
    if (error) logger.warn('output-capture', 'cost write failed', { error: error.message });
  } catch (e) {
    logger.warn('output-capture', 'capture error', { error: e.message });
  }
}

module.exports = { capture };
