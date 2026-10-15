'use strict';
// lib/entities/resolver.js — resolve any identifier to a canonical entity_id
// Implements the 3-tier resolution strategy from the civilisation blueprint.
// Tier 1 (auto-link):  exact name/alias match          → return entity_id immediately
// Tier 2 (review):     fuzzy name match only            → queue for human merge review, return provisional
// Tier 3 (auto-create): no match at all                 → create entity, return new entity_id

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// Normalise a name for comparison (lowercase, trim, collapse spaces)
function _normalise(name) {
    return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolve kind + identifier to a canonical entity_id.
 * @param {string} kind - 'person' | 'organisation' | 'project' | 'asset' | 'concept' | 'place'
 * @param {string} identifier - name or email address
 * @param {object} [attrs={}] - extra attributes to store on auto-create
 * @returns {Promise<{entity_id: string, created: boolean, queued: boolean}>}
 */
async function resolveEntity(kind, identifier, attrs = {}) {
    if (!kind || !identifier) throw new Error('resolveEntity: kind and identifier required');

    const norm = _normalise(identifier);

    // Tier 1 — exact name match or alias match
    const { data: exact } = await _sb()
        .from('entities')
        .select('entity_id')
        .eq('kind', kind)
        .is('merged_into', null)
        .or(`name.ilike.${norm},aliases.cs.{"${norm}"}`)
        .limit(1);

    if (exact && exact.length > 0) {
        return { entity_id: exact[0].entity_id, created: false, queued: false };
    }

    // Tier 2 — fuzzy match: words in identifier appear in existing entity names
    const words = norm.split(' ').filter(w => w.length > 2);
    if (words.length > 0) {
        const { data: fuzzy } = await _sb()
            .from('entities')
            .select('entity_id, name')
            .eq('kind', kind)
            .is('merged_into', null)
            .ilike('name', `%${words[0]}%`)
            .limit(5);

        if (fuzzy && fuzzy.length > 0) {
            // Create a provisional new entity AND queue for merge review
            const { data: provisional } = await _sb()
                .from('entities')
                .insert({ kind, name: identifier.trim(), attrs, provenance: { resolver: 'fuzzy_provisional' } })
                .select('entity_id')
                .single();

            if (provisional) {
                // Queue the best candidate for merge review
                await _sb().from('entity_merge_queue').insert({
                    candidate_a: fuzzy[0].entity_id,
                    candidate_b: provisional.entity_id,
                    confidence:  0.5,
                    evidence:    { trigger: 'fuzzy_name_match', query: identifier, matched_name: fuzzy[0].name },
                }).catch(() => {});

                logger.info('entities.resolver', 'fuzzy match — provisional entity created, queued for review', { identifier, matched: fuzzy[0].name });
                return { entity_id: provisional.entity_id, created: true, queued: true };
            }
        }
    }

    // Tier 3 — auto-create
    const { data: created, error } = await _sb()
        .from('entities')
        .insert({ kind, name: identifier.trim(), attrs, provenance: { resolver: 'auto_create' } })
        .select('entity_id')
        .single();

    if (error) throw new Error(`resolveEntity auto-create failed: ${error.message}`);
    logger.info('entities.resolver', 'auto-created entity', { kind, identifier });
    return { entity_id: created.entity_id, created: true, queued: false };
}

module.exports = { resolveEntity };
