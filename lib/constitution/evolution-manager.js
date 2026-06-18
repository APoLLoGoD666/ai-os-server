'use strict';
// lib/constitution/evolution-manager.js — Authorized constitutional evolution pathway
// Every constitutional change must be proposed, approved, recorded, then activated.
// Unauthorized changes are detectable via the drift detector.

const fs     = require('fs');
const path   = require('path');
const logger = require('../logger');

const AMENDMENTS_PATH = path.join(__dirname, 'amendments.json');

// Entities authorized to approve constitutional amendments
const AUTHORIZED_APPROVERS = ['orchestrator', 'founder', 'founder_os', 'system'];

function _loadAmendments() {
    if (!fs.existsSync(AMENDMENTS_PATH)) return [];
    try { return JSON.parse(fs.readFileSync(AMENDMENTS_PATH, 'utf8')); }
    catch { return []; }
}

function _saveAmendments(amendments) {
    fs.writeFileSync(AMENDMENTS_PATH, JSON.stringify(amendments, null, 2), 'utf8');
}

// propose — create a new amendment in PROPOSED status
// Returns amendment record
function propose(principleId, proposedChange, rationale, proposedBy = 'orchestrator') {
    if (!principleId || !proposedChange || !rationale) throw new Error('propose: principleId, proposedChange, and rationale are required');
    const amendments = _loadAmendments();
    const id = `AMD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const amendment = {
        id,
        principleId,
        proposedChange,
        rationale,
        proposedBy,
        status:     'PROPOSED',
        proposedAt: new Date().toISOString(),
        approvedBy:  null,
        approvedAt:  null,
        activatedAt: null,
    };
    amendments.push(amendment);
    _saveAmendments(amendments);
    logger.info('evolution-manager', 'amendment proposed', { id, principleId, proposedBy });
    return amendment;
}

// approve — move amendment to APPROVED status; only authorized approvers may approve
function approve(amendmentId, approvedBy) {
    if (!AUTHORIZED_APPROVERS.includes(approvedBy)) {
        throw new Error(`${approvedBy} is not authorized to approve constitutional amendments. Authorized: ${AUTHORIZED_APPROVERS.join(', ')}`);
    }
    const amendments = _loadAmendments();
    const idx = amendments.findIndex(a => a.id === amendmentId);
    if (idx === -1) throw new Error(`Amendment ${amendmentId} not found`);
    if (amendments[idx].status !== 'PROPOSED') throw new Error(`Amendment ${amendmentId} is in ${amendments[idx].status} state; only PROPOSED amendments can be approved`);

    amendments[idx].status     = 'APPROVED';
    amendments[idx].approvedBy = approvedBy;
    amendments[idx].approvedAt = new Date().toISOString();
    _saveAmendments(amendments);
    logger.info('evolution-manager', 'amendment approved', { id: amendmentId, approvedBy });
    return amendments[idx];
}

// activate — record amendment as ACTIVATED and update baseline fingerprint via drift-detector
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

function listAmendments() { return _loadAmendments(); }

function getAmendment(id) { return _loadAmendments().find(a => a.id === id) || null; }

function clearAmendments() {
    _saveAmendments([]);
}

module.exports = { propose, approve, activate, isAuthorizedDrift, listAmendments, getAmendment, clearAmendments, AUTHORIZED_APPROVERS };
