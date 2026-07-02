'use strict';
// lib/constitution/evolution-manager.js — Authorized constitutional evolution pathway
// Every constitutional change must be proposed, approved, recorded, then activated.
// Phase 26: attack resistance — rate limiting, content hashing, PRIVACY/AUTHORITY escalation, attack log.

const fs     = require('fs');
const path   = require('path');
const logger = require('../logger');

const AMENDMENTS_PATH = path.join(__dirname, 'amendments.json');

// Entities authorized to approve general amendments
const AUTHORIZED_APPROVERS = ['orchestrator', 'founder', 'founder_os', 'system'];

// Entities authorized to approve PRIVACY or AUTHORITY amendments (must be FOUNDER class)
const FOUNDER_CLASS_APPROVERS = ['founder', 'founder_os'];

// Categories requiring FOUNDER-class approval
const ESCALATED_CATEGORIES = ['PRIVACY', 'AUTHORITY'];

// Rate limit: max proposals for the same principleId within this window
const RATE_LIMIT_COUNT  = 3;
const RATE_LIMIT_WINDOW = 60_000; // 60s

// In-memory attack log (evidence preserved across calls, cleared by clearAmendments)
let _attackLog = [];

function _loadAmendments() {
    if (!fs.existsSync(AMENDMENTS_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(AMENDMENTS_PATH, 'utf8')); }
    catch { return []; }
}

function _saveAmendments(amendments) {
    fs.writeFileSync(AMENDMENTS_PATH, JSON.stringify(amendments, null, 2), 'utf8');
}

// FNV-1a hash for content integrity
function _contentHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
}

function _logAttack(type, details) {
    const entry = { type, details, detectedAt: new Date().toISOString() };
    _attackLog.push(entry);
    logger.warn('evolution-manager', 'GOVERNANCE ATTACK DETECTED', { type, ...details });
}

function getAttackLog() { return [..._attackLog]; }

// propose — create a new amendment in PROPOSED status
function propose(principleId, proposedChange, rationale, proposedBy = 'orchestrator') {
    if (!principleId || !proposedChange || !rationale) throw new Error('propose: principleId, proposedChange, and rationale are required');

    const amendments = _loadAmendments();

    // Rate limiting — prevent amendment laundering
    const now    = Date.now();
    const recent = amendments.filter(a =>
        a.principleId === principleId &&
        now - new Date(a.proposedAt).getTime() < RATE_LIMIT_WINDOW
    );
    if (recent.length >= RATE_LIMIT_COUNT) {
        _logAttack('AMENDMENT_LAUNDERING', { principleId, proposedBy, recentCount: recent.length, windowMs: RATE_LIMIT_WINDOW });
        throw new Error(`Rate limit exceeded: ${recent.length} proposals for ${principleId} in last ${RATE_LIMIT_WINDOW / 1000}s — possible amendment laundering detected`);
    }

    const id          = `AMD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const contentHash = _contentHash(principleId + proposedChange + rationale);
    const amendment   = {
        id,
        principleId,
        proposedChange,
        rationale,
        proposedBy,
        contentHash,
        status:      'PROPOSED',
        proposedAt:  new Date().toISOString(),
        approvedBy:  null,
        approvedAt:  null,
        activatedAt: null,
    };
    amendments.push(amendment);
    _saveAmendments(amendments);
    logger.info('evolution-manager', 'amendment proposed', { id, principleId, proposedBy });
    return amendment;
}

// approve — move amendment to APPROVED status
function approve(amendmentId, approvedBy) {
    // General authorization check
    if (!AUTHORIZED_APPROVERS.includes(approvedBy)) {
        _logAttack('APPROVAL_SPOOFING', { amendmentId, approvedBy });
        throw new Error(`${approvedBy} is not authorized to approve constitutional amendments. Authorized: ${AUTHORIZED_APPROVERS.join(', ')}`);
    }

    const amendments = _loadAmendments();
    const idx = amendments.findIndex(a => a.id === amendmentId);
    if (idx === -1) throw new Error(`Amendment ${amendmentId} not found`);
    if (amendments[idx].status !== 'PROPOSED') throw new Error(`Amendment ${amendmentId} is in ${amendments[idx].status} state; only PROPOSED amendments can be approved`);

    const amendment = amendments[idx];

    // Content integrity check — detect tampering between propose() and approve()
    const expectedHash = _contentHash(amendment.principleId + amendment.proposedChange + amendment.rationale);
    if (amendment.contentHash && amendment.contentHash !== expectedHash) {
        _logAttack('CONTENT_TAMPERING', { amendmentId, expectedHash, recordedHash: amendment.contentHash });
        throw new Error(`Amendment content tampering detected: hash mismatch (expected ${expectedHash}, recorded ${amendment.contentHash})`);
    }

    // PRIVACY/AUTHORITY escalation — require FOUNDER-class approver
    try {
        const specMod = require('./spec');
        const principle = specMod.PRINCIPLES.find(p => p.id === amendment.principleId);
        if (principle && ESCALATED_CATEGORIES.includes(principle.category)) {
            if (!FOUNDER_CLASS_APPROVERS.includes(approvedBy)) {
                _logAttack('UNAUTHORIZED_ESCALATION', { amendmentId, approvedBy, principleCategory: principle.category });
                throw new Error(`${principle.category} amendments require FOUNDER-class approval (${FOUNDER_CLASS_APPROVERS.join(', ')}). ${approvedBy} is insufficient.`);
            }
        }
    } catch (e) {
        if (e.message.includes('FOUNDER-class') || e.message.includes('approval')) throw e;
        // spec load failure — proceed with general authorization
    }

    amendment.status     = 'APPROVED';
    amendment.approvedBy = approvedBy;
    amendment.approvedAt = new Date().toISOString();
    _saveAmendments(amendments);
    logger.info('evolution-manager', 'amendment approved', { id: amendmentId, approvedBy });
    return amendment;
}

// activate — record amendment as ACTIVATED
function activate(amendmentId, baselineSnapshot = null) {
    const amendments = _loadAmendments();
    const idx = amendments.findIndex(a => a.id === amendmentId);
    if (idx === -1) throw new Error(`Amendment ${amendmentId} not found`);
    if (amendments[idx].status !== 'APPROVED') throw new Error(`Amendment ${amendmentId} must be APPROVED before activation`);

    amendments[idx].status      = 'ACTIVATED';
    amendments[idx].activatedAt = new Date().toISOString();
    if (baselineSnapshot) amendments[idx].baselineSnapshot = baselineSnapshot;
    _saveAmendments(amendments);
    logger.info('evolution-manager', 'amendment activated', { id: amendmentId, principleId: amendments[idx].principleId });
    return amendments[idx];
}

// isAuthorizedDrift — check if each drift item has a corresponding activated amendment
function isAuthorizedDrift(driftItems) {
    const amendments = _loadAmendments();
    const activated  = amendments.filter(a => a.status === 'ACTIVATED');
    const unauthorized = driftItems
        .filter(d => d.severity === 'CRITICAL' || d.type === 'STRUCTURAL_DRIFT' || d.type === 'BEHAVIORAL_DRIFT')
        .filter(d => !activated.find(a => a.principleId === d.id));
    return {
        authorized:   unauthorized.length === 0,
        unauthorized,
        coveredBy:    driftItems.map(d => ({
            driftId:   d.id,
            amendment: activated.find(a => a.principleId === d.id) || null,
        })),
    };
}

function listAmendments()    { return _loadAmendments(); }
function getAmendment(id)    { return _loadAmendments().find(a => a.id === id) || null; }
function clearAmendments()   { _saveAmendments([]); _attackLog = []; }
function clearAmendmentsOnly() { _saveAmendments([]); } // resets amendments but preserves attack log

module.exports = {
    propose, approve, activate, isAuthorizedDrift,
    listAmendments, getAmendment, clearAmendments, clearAmendmentsOnly,
    getAttackLog, AUTHORIZED_APPROVERS, FOUNDER_CLASS_APPROVERS, ESCALATED_CATEGORIES,
};
