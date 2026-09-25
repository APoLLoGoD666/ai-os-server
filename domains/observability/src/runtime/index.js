'use strict';
// domains/observability/src/runtime/index.js — Observability domain runtime operations

const DOMAIN_ID = 'DOM-000008';

function fitnessCheck() {
    try {
        const { Registry } = require('../../../../registry/kernel');
        const health = Registry.health ? Registry.health.score() : null;
        return { ok: true, domain_id: DOMAIN_ID, op: 'fitness_check', health, generated_at: new Date().toISOString() };
    } catch (e) {
        return { ok: false, domain_id: DOMAIN_ID, op: 'fitness_check', error: e.message };
    }
}

function eventTimeline(limit) {
    try {
        const { Registry } = require('../../../../registry/kernel');
        const events = Registry.events.history ? Registry.events.history(limit || 20) : [];
        return { ok: true, domain_id: DOMAIN_ID, op: 'event_timeline', events, generated_at: new Date().toISOString() };
    } catch (e) {
        return { ok: false, domain_id: DOMAIN_ID, op: 'event_timeline', error: e.message };
    }
}

module.exports = Object.freeze({ fitnessCheck, eventTimeline, DOMAIN_ID });
