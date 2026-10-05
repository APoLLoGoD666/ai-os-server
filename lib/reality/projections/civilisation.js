'use strict';

// Civilisation → Reality projection
// Projects civilization cycle state, health scores, and ministry outputs into reality claims.

const { claimReality, advanceClaim } = require('../fabric');
const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

async function project() {
    const results = { created: 0, advanced: 0, errors: [] };

    try {
        const { data: cycles } = await _sb()
            .from('civilization_cycle_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        for (const cycle of (cycles || [])) {
            try {
                const id = await claimReality({
                    entityId:    'civilisation',
                    domain:      'civilisation',
                    content:     `Civilization cycle ${cycle.id} completed phase ${cycle.phase} with status ${cycle.status}`,
                    source:      'civilisation-projection',
                    claimType:   'factual',
                    confidence:  0.9,
                    evidence:    { cycle_id: cycle.id, phase: cycle.phase, duration_ms: cycle.duration_ms },
                    projectedBy: ['civilisation'],
                });
                await advanceClaim({ claimId: id, toStage: 'observed', trigger: 'cycle_logged', actor: 'civilisation-projection' });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`cycles: ${e.message}`); }

    try {
        const { data: events } = await _sb()
            .from('civilization_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        for (const ev of (events || [])) {
            try {
                await claimReality({
                    entityId:    ev.domain || 'civilisation',
                    domain:      ev.domain || 'civilisation',
                    content:     ev.description || ev.title || JSON.stringify(ev),
                    source:      'civilisation-event-projection',
                    claimType:   'factual',
                    confidence:  ev.confidence || 0.7,
                    evidence:    { event_id: ev.id, event_type: ev.event_type },
                    projectedBy: ['civilisation'],
                });
                results.created++;
            } catch (e) { results.errors.push(e.message); }
        }
    } catch (e) { results.errors.push(`events: ${e.message}`); }

    return results;
}

module.exports = { project };
