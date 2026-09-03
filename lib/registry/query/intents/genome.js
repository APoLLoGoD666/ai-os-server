'use strict';

module.exports = function registerGenomeIntents(register) {
    register(
        'genome.validate',
        'Validate all ten domain genomes against live registry state (advisory mode)',
        {},
        () => {
            const genomeValidator = require('../../../../civilisation/genome-validator');
            return genomeValidator.validate();
        }
    );

    register(
        'genome.domain',
        'Validate a single domain genome — returns its invariant check results',
        { id: 'DOM-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const genomeValidator = require('../../../../civilisation/genome-validator');
            return genomeValidator.validateDomain(id);
        }
    );

    register(
        'genome.status',
        'Summary of genome health across all ten domains — healthy/advisory/failing counts',
        {},
        () => {
            const genomeValidator = require('../../../../civilisation/genome-validator');
            const result = genomeValidator.validate();
            return {
                ok:      result.ok,
                mode:    result.mode,
                summary: result.summary,
                domains: result.results.map(r => ({
                    domain_id:   r.domain_id,
                    domain_key:  r.domain_key,
                    name:        r.name,
                    criticality: r.criticality,
                    ok:          r.ok,
                    violations:  r.violations?.length || 0,
                    warnings:    r.warnings?.length || 0,
                })),
                generated_at: result.generated_at,
            };
        }
    );
};
