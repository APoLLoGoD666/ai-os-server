'use strict';
// lib/models/output-capture.js — write ModelResult metadata to cost_accounting

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

async function capture(modelResult, taskId, traceId) {
  try {
    const { error } = await _sb().from('cost_accounting').insert({
      task_id:       taskId,
      trace_id:      traceId || 'none',
      model:         modelResult.modelId,
      tokens_in:     modelResult.inputTokens  || 0,
      tokens_out:    modelResult.outputTokens || 0,
      amount_usd:    modelResult.costUsd      || 0,
    });
    if (error) logger.warn('output-capture', 'cost write failed', { error: error.message });
  } catch (e) {
    logger.warn('output-capture', 'capture error', { error: e.message });
  }
}

module.exports = { capture };
