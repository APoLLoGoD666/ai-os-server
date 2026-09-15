'use strict';
module.exports = function registerMigrationIntents(register) {
    register(
        'migration.compliance',
        'Registry-governed migration compliance report',
        {},
        () => require('../../migration-lifecycle').complianceReport()
    );

    register(
        'migration.scan',
        'Scan all migration files for governance headers',
        {},
        () => ({ migrations: require('../../migration-lifecycle').scanMigrations() })
    );

    register(
        'migration.preflight',
        'Validate a migration against the Registry before applying',
        { filename: 'filename.sql (required)' },
        ({ filename }) => {
            if (!filename) throw new Error('filename is required');
            return require('../../migration-lifecycle').preflight(filename);
        }
    );

    register(
        'simulate.entity_change',
        'Predict the downstream effects of changing an entity\'s fields before committing the change',
        {
            id:      'ENT-NNNNNN (required)',
            status:  'proposed new status (optional)',
            family:  'proposed new family (optional)',
            type:    'proposed new type (optional)',
        },
        ({ id, ...proposedChanges }) => {
            if (!id) throw new Error('id is required');
            const result = require('../../prediction').simulateEntityChange(id, proposedChanges);
            if (!result.ok) throw new Error(result.error);
            return result;
        }
    );

    register(
        'simulate.migration',
        'Simulate applying a migration: extended preflight + health predictions for all referenced entities',
        { filename: 'migration filename (required), e.g. 059_entity_state.sql' },
        ({ filename }) => {
            if (!filename) throw new Error('filename is required');
            return require('../../prediction').simulateMigration(filename);
        }
    );
};
