'use strict';
// lib/models/feedback.js — route model outputs to memory layers after task completion
// Always called via setImmediate — never blocks the pipeline response.

const gateway = require('../memory/gateway');
const logger  = require('../logger');

// process(modelResult, task, outcome)
// outcome: { status: 'success'|'failed', error?, retryCount?, retryReason? }
async function process(modelResult, task, outcome) {
  try {
    // Store task episode (Layer 2)
    await gateway.storeMemory({
      layer:   2,
      content: JSON.stringify({
        task_id:     task.id,
        description: task.description,
        outcome:     outcome.status,
        duration_ms: modelResult.durationMs,
        provider:    modelResult.provider,
        model_id:    modelResult.modelId,
        cost_usd:    modelResult.costUsd,
      }),
      tags:             task.domains || [],
      source:           modelResult.provider,
      taskId:           task.id,
      requestingEntity: 'feedback_engine',
    });

    // Extract and store lesson if the task had notable characteristics (Layer 10)
    const lesson = _extractLesson(modelResult, task, outcome);
    if (lesson) {
      await gateway.storeMemory({
        layer:            10,
        content:          lesson.content,
        tags:             lesson.tags,
        source:           'feedback_engine',
        taskId:           task.id,
        importance:       lesson.importance,
        requestingEntity: 'feedback_engine',
      });
    }
  } catch (e) {
    logger.warn('feedback', 'memory update failed', { error: e.message, taskId: task.id });
  }
}

function _extractLesson(modelResult, task, outcome) {
  if (outcome.status === 'failed' && outcome.error) {
    return {
      content:    `Task "${task.description}" failed: ${outcome.error}. Root cause: ${outcome.rootCause || 'unknown'}.`,
      tags:       task.domains || [],
      importance: 7,
    };
  }
  if ((outcome.retryCount || 0) > 1) {
    return {
      content:    `Task "${task.description}" succeeded after ${outcome.retryCount} retries. Cause: ${outcome.retryReason || 'transient'}.`,
      tags:       task.domains || [],
      importance: 6,
    };
  }
  return null;
}

module.exports = { process };
