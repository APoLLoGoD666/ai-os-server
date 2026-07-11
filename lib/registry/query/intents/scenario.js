'use strict';
module.exports = function registerScenarioIntents(register) {
    register(
        'scenario.run',
        'Multi-entity what-if scenario: health impact → capability degradation → constraint violations → executive recommendation (INFERENCE)',
        {
            name:            'string (optional) — scenario name for logging',
            changes:         'array of { entity_id, proposed: { field: value } } (required)',
            edge_patches:    'array of { action:"add"|"remove", from, to, type, label?, strength?, reason?, confidence? } (optional)',
            record_decision: 'boolean (optional) — persist to decision_memory when urgency is HALT or REVIEW_REQUIRED',
        },
        ({ name, changes, edge_patches, record_decision }) => {
            if (!changes || !changes.length) throw new Error('changes array is required');
            return require('../../scenario').runScenario({ name, changes, edge_patches, record_decision: !!record_decision });
        }
    );
};
