'use strict';

module.exports = function registerContractIntents(register) {
    register(
        'contract.validate',
        'Validate all domain event contracts for phantom events, orphans, and consumer mismatches (advisory)',
        {},
        () => {
            const cv = require('../../../../civilisation/contract-validator');
            return cv.validate();
        }
    );

    register(
        'contract.domain',
        'Validate event contracts for a single domain — phantoms, orphans, mismatches',
        { id: 'DOM-NNNNNN (required)' },
        ({ id }) => {
            if (!id) throw new Error('id is required');
            const cv = require('../../../../civilisation/contract-validator');
            return cv.validateDomain(id);
        }
    );

    register(
        'contract.status',
        'Summary of contract health across all domains — emit/accept counts and finding totals',
        {},
        () => {
            const cv = require('../../../../civilisation/contract-validator');
            const r  = cv.validate();
            return {
                ok:      r.ok,
                mode:    r.mode,
                summary: r.summary,
                domains: r.domains.map(d => ({
                    domain_id:    d.domain_id,
                    domain_key:   d.domain_key,
                    emit_count:   d.emit_count,
                    accept_count: d.accept_count,
                    phantoms:     d.phantoms.length,
                    orphans:      d.orphans.length,
                    mismatches:   d.mismatches.length,
                    clean:        d.warnings.length === 0,
                })),
                generated_at: r.generated_at,
            };
        }
    );
};
