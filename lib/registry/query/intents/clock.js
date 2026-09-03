'use strict';

module.exports = function registerClockIntents(register) {
    register(
        'clock.status',
        'Civilisation clock — current tick rate per domain vs genome baseline',
        {},
        () => require('../../../../civilisation/clock').status()
    );

    register(
        'clock.drift',
        'Detect tick-rate drift between dependent domain pairs (fast domain → slow dependency)',
        {},
        () => require('../../../../civilisation/clock').drift()
    );

    register(
        'clock.domain',
        'Tick rate and baseline for a single domain',
        { id: 'DOM-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const clock  = require('../../../../civilisation/clock');
            const status = clock.status();
            const domain = status.domains[id];
            if (!domain) throw new Error(`Unknown domain: ${id}`);
            return { domain_id: id, ...domain };
        }
    );
};
