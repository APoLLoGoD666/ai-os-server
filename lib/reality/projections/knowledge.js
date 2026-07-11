'use strict';

// Knowledge → Reality projection
// Projects vault entity index and domain knowledge into reality claims.

const { claimReality, advanceClaim } = require('../fabric');
const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

async function project() {
    const results = { created: 0, errors: [] };

    try {
        const { data: entities } = await _sb()
            .from('entity_index')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(20);

        for (const ent of (entities || [])) {
            try {
                const id = await claimReality({
                    entityId:    ent.entity_id || ent.id,
                    domain:      'knowledge',
                    content:     `Entity in vault: ${ent.name || ent.title || ent.entity_id}`,
                    source:      'knowledge-entity-projection',
                    claimType:   'factual',
                    confidence:  0.85,
                    evidence:    { entity_type: ent.entity_type, vault_path: ent.vault_path },
                    projectedBy: ['knowledge'],
                });
                await advanceClaim({ claimId: id, toStage: 'integrated', trigger: 'vault_entity_indexed', actor: 'knowledge-projection' });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`entity_index: ${e.message}`); }

    try {
        const { data: docs } = await _sb()
            .from('apex_documents')
            .select('id, title, domain, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        for (const doc of (docs || [])) {
            try {
                await claimReality({
                    entityId:    doc.domain || 'knowledge',
                    domain:      'knowledge',
                    content:     `Document available: ${doc.title}`,
                    source:      'knowledge-document-projection',
                    claimType:   'factual',
                    confidence:  0.9,
                    evidence:    { document_id: doc.id },
                    projectedBy: ['knowledge'],
                });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`documents: ${e.message}`); }

    return results;
}

module.exports = { project };
