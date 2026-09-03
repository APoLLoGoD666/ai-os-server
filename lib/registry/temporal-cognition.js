'use strict';
// lib/registry/temporal-cognition.js — Health trajectory tracking and anomaly detection.
//
// Stores health score snapshots per entity per StateVersion. Detects trend lines
// (improving/stable/degrading), anomalies (2-sigma deviations), and produces
// forward predictions via linear regression.
//
// In-memory only: a sliding window of the last 100 readings per entity.
// Non-destructive: never modifies entity state, purely observational.

const { EventBus, EVENTS } = require('./events');

const MAX_HISTORY  = 100;
const ANOMALY_SIGMA = 2.0;

// Map<entityId, Array<{ stateVersion, score, timestamp }>>
const _history = new Map();
// Recent anomalies (last 50)
const _anomalies = [];

// ── Statistical helpers ───────────────────────────────────────────────────────

function mean(arr)   { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function stddev(arr) {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// Linear regression: returns { slope, intercept }
function linreg(points) {
    const n  = points.length;
    if (n < 2) return { slope: 0, intercept: points[0] || 0 };
    const sx = points.reduce((s, _, i) => s + i, 0);
    const sy = points.reduce((s, v)    => s + v, 0);
    const sxy= points.reduce((s, v, i) => s + i * v, 0);
    const sx2= points.reduce((s, _, i) => s + i * i, 0);
    const slope     = (n * sxy - sx * sy) / (n * sx2 - sx * sx || 1);
    const intercept = (sy - slope * sx)   / n;
    return { slope, intercept };
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Record a health score snapshot for an entity.
 *
 * @param {string} entityId
 * @param {number} score  — 0–100
 */
function track(entityId, score) {
    if (!_history.has(entityId)) _history.set(entityId, []);
    const arr = _history.get(entityId);
    const sv  = require('./state-version').StateVersion.current();
    arr.push({ stateVersion: sv, score, timestamp: Date.now() });
    if (arr.length > MAX_HISTORY) arr.shift();

    // Anomaly detection
    if (arr.length >= 5) {
        const scores  = arr.map(p => p.score);
        const m       = mean(scores.slice(0, -1));   // mean of all but the latest
        const sd      = stddev(scores.slice(0, -1));
        const current = scores[scores.length - 1];
        if (sd > 0 && Math.abs(current - m) > ANOMALY_SIGMA * sd) {
            const anomaly = {
                entityId,
                score:        current,
                mean:         +m.toFixed(2),
                stddev:       +sd.toFixed(2),
                deviation:    +((current - m) / sd).toFixed(2),
                stateVersion: sv,
                timestamp:    Date.now(),
            };
            _anomalies.push(anomaly);
            if (_anomalies.length > 50) _anomalies.shift();
            EventBus.emit(EVENTS.TEMPORAL_ANOMALY_DETECTED, anomaly);
        }
    }
}

/**
 * Return the full history for an entity.
 *
 * @returns Array<{ stateVersion, score, timestamp }>
 */
function trajectory(entityId) {
    return [...(_history.get(entityId) || [])];
}

/**
 * Return trend analysis for an entity.
 *
 * @returns { trend: 'improving'|'stable'|'degrading', slope, current, mean, readings }
 */
function trend(entityId) {
    const arr = _history.get(entityId) || [];
    if (arr.length < 2) return { trend: 'stable', slope: 0, current: arr[0]?.score || 0, mean: arr[0]?.score || 0, readings: arr.length };
    const scores  = arr.map(p => p.score);
    const { slope } = linreg(scores);
    const m       = mean(scores);
    const label   = slope > 1.0 ? 'improving' : slope < -1.0 ? 'degrading' : 'stable';
    return { trend: label, slope: +slope.toFixed(4), current: scores[scores.length - 1], mean: +m.toFixed(2), readings: arr.length };
}

/**
 * Predict the next N health scores for an entity via linear extrapolation.
 *
 * @param {string} entityId
 * @param {number} steps  — how many future readings to project (default 5)
 * @returns Array<{ step, predicted_score }>
 */
function predict(entityId, steps = 5) {
    const arr = _history.get(entityId) || [];
    if (arr.length < 2) return [];
    const scores = arr.map(p => p.score);
    const { slope, intercept } = linreg(scores);
    const n = scores.length;
    return Array.from({ length: steps }, (_, i) => ({
        step:            i + 1,
        predicted_score: Math.min(100, Math.max(0, +(intercept + slope * (n + i)).toFixed(2))),
    }));
}

/**
 * Return all tracked entity IDs with trend summaries.
 */
function summary() {
    return [..._history.keys()].map(id => ({ id, ...trend(id) }));
}

/**
 * Return recent anomalies (last N).
 */
function anomalies(limit = 20) {
    return _anomalies.slice(-limit).reverse();
}

// ── Auto-track on ENTITY_UPDATED events ──────────────────────────────────────

EventBus.on(EVENTS.ENTITY_UPDATED, ({ id } = {}) => {
    if (!id) return;
    try {
        const healthModule = require('./health-score');
        const engine       = require('./engine');
        const entity       = engine.lookup(id);
        if (!entity) return;
        const h = healthModule.compute(entity);
        if (h && typeof h.score === 'number') track(id, h.score);
    } catch { /* non-fatal */ }
});

module.exports = { track, trajectory, trend, predict, summary, anomalies };
