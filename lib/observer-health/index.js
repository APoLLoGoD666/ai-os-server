'use strict';

// lib/observer-health/index.js — Sensor registry and calibration management
// Validates sensor output quality. Ground Truth Calibration Events gate sensor health.

const { getSupabaseClient } = require('../clients');

function _sb() { return getSupabaseClient(); }

const HEALTH_DIMS = Object.freeze(['accuracy', 'freshness', 'coverage', 'reliability', 'calibration']);

// ── Sensor registration ───────────────────────────────────────────────────────

async function registerSensor({ sensorId, sensorName, sensorType, domain, description, config = {} }) {
    if (!sensorId || !sensorName || !sensorType || !domain) throw new Error('registerSensor: sensorId, sensorName, sensorType, domain required');
    const { data, error } = await _sb().from('observer_registry').upsert({
        sensor_id:   sensorId,
        sensor_name: sensorName,
        sensor_type: sensorType,
        domain,
        description: description || null,
        config,
        updated_at:  new Date().toISOString(),
    }, { onConflict: 'sensor_id' }).select('id').single();
    if (error) throw new Error(`registerSensor failed: ${error.message}`);
    return data.id;
}

async function recordReading(sensorId) {
    const { error } = await _sb().from('observer_registry')
        .update({ last_reading_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('sensor_id', sensorId);
    if (error) throw new Error(`recordReading failed: ${error.message}`);
}

// ── Calibration ───────────────────────────────────────────────────────────────

async function recordCalibration({ sensorId, expectedValue, actualValue, calibratedBy = 'system', notes }) {
    const deviation = _computeDeviation(expectedValue, actualValue);
    const passed    = deviation !== null ? deviation <= 0.15 : null;

    const { error: insErr } = await _sb().from('calibration_events').insert({
        sensor_id:      sensorId,
        event_type:     'calibration',
        expected_value: expectedValue ?? null,
        actual_value:   actualValue ?? null,
        deviation:      deviation,
        passed,
        notes:          notes || null,
        calibrated_by:  calibratedBy,
    });
    if (insErr) throw new Error(`recordCalibration insert failed: ${insErr.message}`);

    const newScore = passed === true ? 95 : passed === false ? Math.max(0, 70 - Math.round(deviation * 100)) : 80;
    await _sb().from('observer_registry').update({
        health_score:    newScore,
        last_calibrated: new Date().toISOString(),
        calibration_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at:      new Date().toISOString(),
    }).eq('sensor_id', sensorId);

    await _scoreSensorHealth(sensorId);
    return { sensorId, deviation, passed, newScore };
}

// ── Health scoring ────────────────────────────────────────────────────────────

async function _scoreSensorHealth(sensorId) {
    const { data: sensor } = await _sb().from('observer_registry').select('*').eq('sensor_id', sensorId).single();
    if (!sensor) return;

    const { data: calibs } = await _sb().from('calibration_events')
        .select('*').eq('sensor_id', sensorId).order('created_at', { ascending: false }).limit(10);

    const recCalib = (calibs || []);
    const passRate = recCalib.length > 0 ? recCalib.filter(c => c.passed).length / recCalib.length : 0.5;

    const lastReadingAge = sensor.last_reading_at
        ? (Date.now() - new Date(sensor.last_reading_at).getTime()) / (60 * 60 * 1000) : 999;
    const lastCalibAge   = sensor.last_calibrated
        ? (Date.now() - new Date(sensor.last_calibrated).getTime()) / (24 * 60 * 60 * 1000) : 999;

    const scores = {
        accuracy:     Math.round(passRate * 100),
        freshness:    Math.max(0, Math.min(100, Math.round(100 - lastReadingAge * 4))),
        coverage:     sensor.is_active ? 80 : 0,
        reliability:  Math.round(sensor.health_score),
        calibration:  Math.max(0, Math.min(100, Math.round(100 - lastCalibAge * 14))),
    };

    const rows = HEALTH_DIMS.map(dim => ({
        sensor_id:   sensorId,
        dimension:   dim,
        score:       scores[dim] ?? 0,
        detail:      { pass_rate: passRate, last_reading_age_h: lastReadingAge, last_calib_age_d: lastCalibAge },
        measured_at: new Date().toISOString(),
    }));

    await _sb().from('sensor_health_scores').upsert(rows, { onConflict: 'sensor_id,dimension' });
}

async function getSensorHealth(sensorId) {
    const { data, error } = await _sb().from('sensor_health_scores').select('*').eq('sensor_id', sensorId);
    if (error) throw new Error(`getSensorHealth failed: ${error.message}`);
    return data || [];
}

async function listSensors(domain) {
    let q = _sb().from('observer_registry').select('*');
    if (domain) q = q.eq('domain', domain);
    const { data, error } = await q.order('health_score', { ascending: false });
    if (error) throw new Error(`listSensors failed: ${error.message}`);
    return data || [];
}

async function seedCoreSensors() {
    const sensors = [
        { sensorId: 'sensor-cron-monitor',   sensorName: 'Cron Monitor',         sensorType: 'internal', domain: 'infrastructure',  description: 'Monitors cron job execution success rates' },
        { sensorId: 'sensor-news-ingest',     sensorName: 'News Ingest',          sensorType: 'external', domain: 'intelligence',    description: 'External news feed ingestion' },
        { sensorId: 'sensor-db-health',       sensorName: 'Database Health',      sensorType: 'internal', domain: 'infrastructure',  description: 'Supabase connection and query health' },
        { sensorId: 'sensor-governance-probe',sensorName: 'Governance Probe',     sensorType: 'internal', domain: 'governance',      description: '10-check governance probe' },
        { sensorId: 'sensor-memory-gateway',  sensorName: 'Memory Gateway',       sensorType: 'internal', domain: 'memory',          description: '13-layer memory retrieval' },
        { sensorId: 'sensor-agent-pipeline',  sensorName: 'Agent Pipeline',       sensorType: 'internal', domain: 'development',     description: '8-stage agent orchestration pipeline' },
    ];
    const results = await Promise.allSettled(sensors.map(s => registerSensor(s)));
    return results.filter(r => r.status === 'fulfilled').length;
}

function _computeDeviation(expected, actual) {
    if (expected === null || expected === undefined || actual === null || actual === undefined) return null;
    if (typeof expected === 'number' && typeof actual === 'number') {
        return expected !== 0 ? Math.abs((actual - expected) / expected) : Math.abs(actual);
    }
    if (typeof expected === 'boolean' && typeof actual === 'boolean') {
        return expected === actual ? 0 : 1;
    }
    return expected === actual ? 0 : 0.5;
}

module.exports = { registerSensor, recordReading, recordCalibration, getSensorHealth, listSensors, seedCoreSensors };
