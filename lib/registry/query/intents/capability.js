'use strict';
module.exports = function registerCapabilityIntents(register) {
    register(
        'capability.list',
        'List all defined capabilities with name, criticality, and entity count',
        {},
        () => require('../../capabilities').all()
    );

    register(
        'capability.get',
        'Get full definition and current operational status of one capability',
        { id: 'capability id (required), e.g. authentication' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const caps = require('../../capabilities');
            const def  = caps.getCapability(id);
            if (!def) throw new Error(`Unknown capability: "${id}". Call capability.list to see all.`);
            const status = caps.statusOf(id);
            return { ...def, ...status };
        }
    );

    register(
        'capability.status',
        'System-wide capability health report — which capabilities are OPERATIONAL, DEGRADED, or DOWN?',
        {},
        () => require('../../capabilities').fullReport()
    );

    register(
        'capability.degradation',
        'Which business capabilities degrade if entity X fails? The human-readable impact layer.',
        { id: 'ENT-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            if (!require('../../engine').lookup(id)) throw new Error(`Not found: ${id}`);
            return require('../../capabilities').degradationFrom(id);
        }
    );
};
