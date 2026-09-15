'use strict';
// lib/reality/observation-channel-registry.js
// T3-07: Observation Channel Bootstrap Registry.
//
// Authority: APEX-CONSTITUTION-v1.0 → D8 INV-1 (Source Traceability);
//            RT08-INV-5 (ObservationChannelRecord before activation);
//            D6 §4.2 (registered instruments with known calibration states);
//            IDR-W2-11-001 Resolution Step 3.
//
// CONSTITUTIONAL BOUNDARY:
// This registry creates bootstrap observation channel records — NOT constitutional
// ObservationChannelRecord type instances. Full constitutional instantiation
// requires RT-02 authority_resolution_ref (T3-08 scope).
//
// Storage: runtime-local (in-memory). Re-registration on each server start.

// ── Registry state ────────────────────────────────────────────────────────────

const _registry = new Map(); // channel_id → frozen channel record

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TYPES    = Object.freeze(['INTERNAL', 'EXTERNAL', 'SENSOR']);
const VALID_STATUSES = Object.freeze(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

// ── Validation ────────────────────────────────────────────────────────────────

// Validates a channel record. Returns { valid: boolean, errors: string[] }. No throw.
function validateChannel(record) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        return { valid: false, errors: ['channel record must be a non-null, non-array object'] };
    }

    const errors = [];

    if (typeof record.channel_id !== 'string' || record.channel_id.trim() === '') {
        errors.push('channel_id: required non-empty string');
    }
    if (typeof record.channel_name !== 'string' || record.channel_name.trim() === '') {
        errors.push('channel_name: required non-empty string');
    }
    if (!VALID_TYPES.includes(record.channel_type)) {
        errors.push(`channel_type: required, must be one of ${VALID_TYPES.join('|')}`);
    }
    if (typeof record.observer_ref !== 'string' || record.observer_ref.trim() === '') {
        errors.push('observer_ref: required non-empty string (references observer_id)');
    }
    if (typeof record.observation_scope !== 'string' || record.observation_scope.trim() === '') {
        errors.push('observation_scope: required non-empty string');
    }
    if (typeof record.observation_method !== 'string' || record.observation_method.trim() === '') {
        errors.push('observation_method: required non-empty string');
    }
    if (typeof record.registration_timestamp !== 'string' || record.registration_timestamp.trim() === '') {
        errors.push('registration_timestamp: required ISO timestamp string');
    } else if (Number.isNaN(Date.parse(record.registration_timestamp))) {
        errors.push('registration_timestamp: must be a valid ISO 8601 timestamp');
    }
    if (!VALID_STATUSES.includes(record.status)) {
        errors.push(`status: required, must be one of ${VALID_STATUSES.join('|')}`);
    }

    return { valid: errors.length === 0, errors };
}

// ── Registration ──────────────────────────────────────────────────────────────

// Registers a new observation channel. Returns the frozen channel record.
// Throws on duplicate channel_id, missing required fields, invalid values.
// registration_timestamp generated internally. status defaults to 'ACTIVE'.
//
// Parameters:
//   channel_id          {string} — deterministic unique identifier
//   channel_name        {string} — human-readable name
//   channel_type        {string} — INTERNAL | EXTERNAL | SENSOR
//   observer_ref        {string} — observer_id this channel belongs to
//   observation_scope   {string} — ExternalRealitySegment scope description
//   observation_method  {string} — how observations arrive through this channel
function registerChannel({
    channel_id,
    channel_name,
    channel_type,
    observer_ref,
    observation_scope,
    observation_method,
} = {}) {
    if (typeof channel_id !== 'string' || channel_id.trim() === '') {
        throw new Error('registerChannel: channel_id required non-empty string');
    }
    if (_registry.has(channel_id)) {
        throw new Error(`registerChannel: channel_id '${channel_id}' is already registered`);
    }
    if (!channel_type) {
        throw new Error('registerChannel: channel_type required');
    }
    if (!observer_ref) {
        throw new Error('registerChannel: observer_ref required');
    }
    if (!observation_scope) {
        throw new Error('registerChannel: observation_scope required');
    }
    if (!observation_method) {
        throw new Error('registerChannel: observation_method required');
    }

    const record = Object.freeze({
        channel_id,
        channel_name:         channel_name || channel_id,
        channel_type,
        observer_ref,
        observation_scope,
        observation_method,
        registration_timestamp: new Date().toISOString(),
        status:               'ACTIVE',
    });

    const { valid, errors } = validateChannel(record);
    if (!valid) {
        throw new Error(`registerChannel: ${errors.join('; ')}`);
    }

    _registry.set(channel_id, record);
    return record;
}

// ── Lookup ────────────────────────────────────────────────────────────────────

function getChannel(channel_id) {
    return _registry.get(channel_id) ?? null;
}

function listChannels() {
    return Array.from(_registry.values());
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({ registerChannel, getChannel, validateChannel, listChannels });
