'use strict';
module.exports = function registerObservatoryIntents(register) {
    register(
        'observatory.topology',
        'Full civilisation topology: all domain, agent, service and capability nodes with edges',
        {},
        () => require('../../observatory').topology()
    );

    register(
        'observatory.health_matrix',
        'Health score for every entity grouped by family, with trend direction',
        {},
        () => require('../../observatory').healthMatrix()
    );

    register(
        'observatory.timeline',
        'Recent civilisation events — what the system has been doing (newest first)',
        { limit: 'max events to return (default 50)' },
        ({ limit = 50 }) => require('../../observatory').eventTimeline(parseInt(limit))
    );

    register(
        'observatory.evolution',
        'How each tracked entity has evolved over time — trajectories and anomalies',
        {},
        () => require('../../observatory').evolution()
    );

    register(
        'observatory.predictions',
        'Forward health predictions for domains and capabilities via linear regression',
        { steps: 'number of future steps to predict (default 5)' },
        ({ steps = 5 }) => require('../../observatory').predictions(parseInt(steps))
    );

    register(
        'observatory.fitness',
        'Run all architectural fitness functions — invariants that must always hold',
        {},
        () => require('../../observatory').fitnessCheck()
    );

    register(
        'constitution.laws',
        'List all constitutional laws that govern how the civilisation may change',
        {},
        () => {
            const c = require('../../constitution');
            return { laws: c.laws(), hash: c.hash(), count: c.count() };
        }
    );

    register(
        'constitution.check',
        'Run a proposed operation against all constitutional laws',
        { operation: 'operation string (e.g. entity.delete)', context: 'JSON context object' },
        ({ operation, context = '{}' }) => {
            if (!operation) throw new Error('operation is required');
            const ctx = typeof context === 'string' ? JSON.parse(context) : context;
            return require('../../constitution').check(operation, ctx);
        }
    );
};
