'use strict';
// Lightweight subsystem consumption instrumentation.
// Logs when a subsystem output is read downstream — converts "is this used?" from opinion to data.
const logger = require('./logger');

function record({ subsystem, output_key, consumer, task_id, meta }) {
    logger.info('consumption', `${subsystem} → ${consumer}`, { output_key, task_id, ...meta });
}

module.exports = { record };
