'use strict';
// lib/models/runtime/subscriber.js
// Subscribes to MODEL_INVOKED events on the Apex event bus.
// Activated once at server startup via subscriber.activate().
// Does not initiate model calls. Observer only.

function activate() {
    const bus = require('../../event-bus');
    bus.on(bus.E.MODEL_INVOKED, (event) => {
        if (!event) return;
        try {
            const logger = require('../../logger');
            logger.info('model_invoked', 'model call recorded', {
                model:      event.model,
                caller:     event.caller,
                input_tok:  event.inputTokens,
                output_tok: event.outputTokens,
                cost_usd:   event.costUsd,
            });
        } catch {}
    });
}

module.exports = { activate };
