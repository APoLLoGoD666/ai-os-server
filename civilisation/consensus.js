'use strict';
// civilisation/consensus.js — Multi-domain Constitutional Consensus Protocol.
//
// Manages constitutional amendments and governed operations that require
// sign-off from multiple autonomous domains before they can be ratified.
//
// Session lifecycle: PENDING → APPROVED | REJECTED | EXPIRED
// Quorum:  majority of eligible voters (autonomy_level >= 1) = 5 of 9 domains
// Expiry:  48h from creation (matches genome.yaml amendment_review_period_hours)
//
// Persistence: Supabase consensus_sessions table (primary) + flat-file fallback.

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONSENSUS_DIR = path.join(__dirname, '../.civilisation/consensus');
const EXPIRY_MS     = 48 * 60 * 60 * 1000;  // 48 hours

// Lazy Supabase client — avoids circular dependency at module load
function _sb() {
    try { return require('../lib/clients').getSupabaseClient(); } catch { return null; }
}

// Domains eligible to vote (autonomy_level >= 1 from rights.yaml)
const ELIGIBLE_VOTERS = [
    'DOM-000001', 'DOM-000002', 'DOM-000003', 'DOM-000004', 'DOM-000005',
    'DOM-000006', 'DOM-000007', 'DOM-000008', 'DOM-000009',
    // DOM-000010 excluded (autonomy_level: 0 — fully governed)
];
const QUORUM = Math.ceil(ELIGIBLE_VOTERS.length / 2);  // 5

const SESSION_TYPES = Object.freeze({
    CONSTITUTIONAL_AMENDMENT: 'CONSTITUTIONAL_AMENDMENT',
    LAW_CHANGE:               'LAW_CHANGE',
    DOMAIN_OPERATION:         'DOMAIN_OPERATION',
    AUTONOMY_GRANT:           'AUTONOMY_GRANT',
});

const DECISIONS = Object.freeze({
    APPROVE: 'APPROVE',
    REJECT:  'REJECT',
    ABSTAIN: 'ABSTAIN',
});

function _ensureDir() {
    if (!fs.existsSync(CONSENSUS_DIR)) fs.mkdirSync(CONSENSUS_DIR, { recursive: true });
}

function _sessionPath(id) {
    return path.join(CONSENSUS_DIR, `${id}.json`);
}

// In-memory index seeded by init() for fast ID generation without filesystem scan
const _knownIds = new Set();

function _nextId() {
    _ensureDir();
    // Derive next from known IDs (seeded from Supabase + flat files at init)
    const nums = [..._knownIds]
        .map(id => parseInt(id.replace('CSS-', ''), 10))
        .filter(n => !isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `CSS-${String(next).padStart(6, '0')}`;
}

function _flatLoad(id) {
    try { return JSON.parse(fs.readFileSync(_sessionPath(id), 'utf8')); }
    catch { return null; }
}

function _flatSave(session) {
    _ensureDir();
    fs.writeFileSync(_sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
}

async function _sbUpsert(session) {
    const sb = _sb();
    if (!sb) return;
    try {
        const row = {
            id:           session.id,
            type:         session.type,
            title:        session.title,
            description:  session.description,
            proposer_id:  session.proposer_id,
            status:       session.status,
            quorum:       session.quorum,
            votes:        session.votes,
            content_hash: session.content_hash || null,
            expires_at:   session.expires_at,
            ratified_at:  session.ratified_at || null,
            created_at:   session.created_at,
        };
        const { error } = await sb.from('consensus_sessions').upsert(row, { onConflict: 'id' });
        if (error) console.warn('[Consensus] Supabase upsert error:', error.message);
    } catch (e) {
        console.warn('[Consensus] Supabase upsert failed:', e.message);
    }
}

async function _sbLoad(id) {
    const sb = _sb();
    if (!sb) return null;
    try {
        const { data, error } = await sb.from('consensus_sessions').select('*').eq('id', id).single();
        if (error || !data) return null;
        return { ...data, votes: data.votes || [] };
    } catch { return null; }
}

// _save writes flat-file synchronously + fires async Supabase upsert (best-effort)
function _save(session) {
    _flatSave(session);
    _knownIds.add(session.id);
    _sbUpsert(session).catch(() => {});
    return session;
}

// _load: try Supabase first (async context), fall back to flat file
async function _loadAsync(id) {
    const sb = await _sbLoad(id);
    if (sb) return sb;
    return _flatLoad(id);
}

// Sync _load for callers that can't await — reads flat file only
function _load(id) {
    return _flatLoad(id);
}

// ── Startup hydration ─────────────────────────────────────────────────────────

// Hydrates _knownIds + restores flat files from Supabase on fresh deploys.
// Called once by civilization-runtime.js start().
async function init() {
    try {
        const sb = _sb();
        if (sb) {
            const { data } = await sb.from('consensus_sessions').select('*');
            if (data && data.length) {
                _ensureDir();
                data.forEach(r => {
                    _knownIds.add(r.id);
                    // Restore flat file so sync _load() / status() keep working
                    const session = { ...r, votes: r.votes || [] };
                    if (!fs.existsSync(_sessionPath(r.id))) {
                        try { fs.writeFileSync(_sessionPath(r.id), JSON.stringify(session, null, 2), 'utf8'); } catch {}
                    }
                });
                console.log(`[Consensus] Hydrated ${data.length} sessions from Supabase`);
                return;
            }
        }
    } catch {}
    // Fallback: scan flat files
    try {
        _ensureDir();
        fs.readdirSync(CONSENSUS_DIR).filter(f => f.endsWith('.json')).forEach(f => _knownIds.add(f.replace('.json', '')));
        console.log(`[Consensus] Hydrated ${_knownIds.size} session IDs from flat files`);
    } catch {}
}

function _isExpired(session) {
    return Date.now() > new Date(session.expires_at).getTime();
}

function _tally(session) {
    const approve  = session.votes.filter(v => v.decision === DECISIONS.APPROVE).length;
    const reject   = session.votes.filter(v => v.decision === DECISIONS.REJECT).length;
    const abstain  = session.votes.filter(v => v.decision === DECISIONS.ABSTAIN).length;
    const voted    = session.votes.length;
    const pending  = ELIGIBLE_VOTERS.length - voted;
    const quorum_met = approve >= QUORUM;
    const rejected   = reject > (ELIGIBLE_VOTERS.length - QUORUM);  // majority rejects
    return { approve, reject, abstain, voted, pending, quorum_met, rejected };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Propose a new consensus session.
 * @param {{ type, title, description, proposer_id, changes? }} opts
 * @returns {{ ok, session }}
 */
function propose({ type, title, description, proposer_id, changes } = {}) {
    if (!SESSION_TYPES[type]) {
        return { ok: false, error: `Unknown session type: ${type}. Valid: ${Object.keys(SESSION_TYPES).join(', ')}` };
    }
    if (!title || !description) return { ok: false, error: 'title and description are required' };
    if (!proposer_id) return { ok: false, error: 'proposer_id is required' };

    const now       = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_MS);
    const session   = {
        id:               _nextId(),
        type,
        title,
        description,
        proposer_id,
        changes:          changes || null,
        content_hash:     crypto.createHash('sha256').update(title + description + (proposer_id || '')).digest('hex').slice(0, 16),
        eligible_voters:  [...ELIGIBLE_VOTERS],
        quorum:           QUORUM,
        votes:            [],
        status:           'PENDING',
        created_at:       now.toISOString(),
        expires_at:       expiresAt.toISOString(),
        ratified_at:      null,
    };

    _save(session);
    return { ok: true, session };
}

/**
 * Cast a vote on a pending session.
 * @param {string} sessionId
 * @param {string} domainId
 * @param {'APPROVE'|'REJECT'|'ABSTAIN'} decision
 * @param {string} [reason]
 * @returns {{ ok, session, tally }}
 */
function vote(sessionId, domainId, decision, reason = '') {
    const session = _load(sessionId);
    if (!session) return { ok: false, error: `Session not found: ${sessionId}` };
    if (session.status !== 'PENDING') return { ok: false, error: `Session is ${session.status} — voting closed` };
    if (_isExpired(session)) {
        session.status = 'EXPIRED';
        _save(session);
        return { ok: false, error: 'Session has expired' };
    }
    if (!ELIGIBLE_VOTERS.includes(domainId)) return { ok: false, error: `${domainId} is not an eligible voter` };
    if (session.votes.some(v => v.domain_id === domainId)) {
        return { ok: false, error: `${domainId} has already voted` };
    }
    if (!DECISIONS[decision]) {
        return { ok: false, error: `Invalid decision: ${decision}. Valid: APPROVE, REJECT, ABSTAIN` };
    }

    session.votes.push({ domain_id: domainId, decision, reason, timestamp: new Date().toISOString() });
    const tally = _tally(session);

    if (tally.quorum_met)  { session.status = 'APPROVED'; session.ratified_at = new Date().toISOString(); }
    if (tally.rejected)    { session.status = 'REJECTED'; }

    _save(session);
    return { ok: true, session, tally };
}

/**
 * Get status of one or all sessions.
 * @param {string} [sessionId] — omit to list all
 */
function status(sessionId) {
    if (sessionId) {
        const session = _load(sessionId);
        if (!session) return { ok: false, error: `Session not found: ${sessionId}` };
        if (session.status === 'PENDING' && _isExpired(session)) {
            session.status = 'EXPIRED';
            _save(session);
        }
        return { ok: true, session, tally: _tally(session) };
    }

    _ensureDir();
    const ids      = fs.readdirSync(CONSENSUS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    const sessions = ids.map(id => _load(id)).filter(Boolean);
    return {
        ok:       true,
        total:    sessions.length,
        pending:  sessions.filter(s => s.status === 'PENDING').length,
        approved: sessions.filter(s => s.status === 'APPROVED').length,
        rejected: sessions.filter(s => s.status === 'REJECTED').length,
        expired:  sessions.filter(s => s.status === 'EXPIRED').length,
        sessions: sessions.map(s => ({ id: s.id, type: s.type, title: s.title, status: s.status, created_at: s.created_at })),
    };
}

/**
 * Manually ratify an approved session (idempotent).
 */
function ratify(sessionId) {
    const session = _load(sessionId);
    if (!session) return { ok: false, error: `Session not found: ${sessionId}` };
    if (session.status !== 'APPROVED') return { ok: false, error: `Session is not APPROVED (status: ${session.status})` };
    session.ratified_at = session.ratified_at || new Date().toISOString();
    _save(session);
    return { ok: true, session };
}

module.exports = {
    propose, vote, status, ratify, init,
    SESSION_TYPES, DECISIONS, ELIGIBLE_VOTERS, QUORUM,
};
