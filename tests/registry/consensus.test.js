'use strict';
// Phase 6 — Constitutional Consensus Protocol.

const assert = require('assert');
const { test, suite } = require('./_runner');

const consensus = require('../../civilisation/consensus');

module.exports = async function run() {
    await suite('Consensus — constants', async () => {
        await test('SESSION_TYPES has 4 types', () => {
            const types = Object.keys(consensus.SESSION_TYPES);
            assert.strictEqual(types.length, 4);
            assert('CONSTITUTIONAL_AMENDMENT' in consensus.SESSION_TYPES);
            assert('LAW_CHANGE'               in consensus.SESSION_TYPES);
            assert('DOMAIN_OPERATION'         in consensus.SESSION_TYPES);
            assert('AUTONOMY_GRANT'           in consensus.SESSION_TYPES);
        });

        await test('DECISIONS has APPROVE, REJECT, ABSTAIN', () => {
            assert('APPROVE' in consensus.DECISIONS);
            assert('REJECT'  in consensus.DECISIONS);
            assert('ABSTAIN' in consensus.DECISIONS);
        });

        await test('ELIGIBLE_VOTERS has 9 domains (DOM-000010 excluded)', () => {
            assert(Array.isArray(consensus.ELIGIBLE_VOTERS));
            assert.strictEqual(consensus.ELIGIBLE_VOTERS.length, 9);
            assert(!consensus.ELIGIBLE_VOTERS.includes('DOM-000010'), 'DOM-000010 must not vote (autonomy_level: 0)');
        });

        await test('QUORUM is 5 (ceiling of 9/2)', () => {
            assert.strictEqual(consensus.QUORUM, 5);
        });
    });

    await suite('Consensus — propose()', async () => {
        await test('propose() requires type, title, description, proposer_id', () => {
            const r = consensus.propose({});
            assert.strictEqual(r.ok, false);
            assert(r.error);
        });

        await test('propose() rejects unknown type', () => {
            const r = consensus.propose({ type: 'INVALID', title: 'T', description: 'D', proposer_id: 'DOM-000001' });
            assert.strictEqual(r.ok, false);
            assert(/unknown session type/i.test(r.error));
        });

        await test('propose() creates session with PENDING status', () => {
            const r = consensus.propose({
                type:         'LAW_CHANGE',
                title:        'Test Law Amendment',
                description:  'A test proposal to verify the consensus protocol.',
                proposer_id:  'DOM-000001',
            });
            assert.strictEqual(r.ok, true);
            assert(r.session);
            assert.strictEqual(r.session.status, 'PENDING');
            assert(r.session.id.startsWith('CSS-'));
            assert.strictEqual(r.session.type, 'LAW_CHANGE');
            assert.strictEqual(r.session.proposer_id, 'DOM-000001');
            assert.strictEqual(r.session.quorum, 5);
            assert(Array.isArray(r.session.votes));
            assert.strictEqual(r.session.votes.length, 0);
        });

        await test('propose() sets expires_at 48h from now', () => {
            const r = consensus.propose({
                type: 'DOMAIN_OPERATION', title: 'Op', description: 'Test op.', proposer_id: 'DOM-000002',
            });
            const exp    = new Date(r.session.expires_at).getTime();
            const now    = Date.now();
            const diffH  = (exp - now) / 3_600_000;
            assert(diffH > 47 && diffH <= 48, `expiry should be ~48h away, got ${diffH.toFixed(1)}h`);
        });

        await test('propose() sets content_hash', () => {
            const r = consensus.propose({
                type: 'AUTONOMY_GRANT', title: 'Grant', description: 'Grant autonomy.', proposer_id: 'DOM-000001',
            });
            assert(typeof r.session.content_hash === 'string');
            assert.strictEqual(r.session.content_hash.length, 16);
        });
    });

    await suite('Consensus — vote()', async () => {
        let sessionId;

        // Create a fresh session for vote tests
        const setup = () => {
            const r = consensus.propose({
                type: 'LAW_CHANGE', title: 'Vote Test Session', description: 'Testing voting.', proposer_id: 'DOM-000001',
            });
            assert.strictEqual(r.ok, true);
            return r.session.id;
        };

        await test('vote() rejects unknown session', () => {
            const r = consensus.vote('CSS-999999', 'DOM-000001', 'APPROVE');
            assert.strictEqual(r.ok, false);
            assert(/not found/i.test(r.error));
        });

        await test('vote() rejects ineligible voter (DOM-000010)', () => {
            sessionId = setup();
            const r = consensus.vote(sessionId, 'DOM-000010', 'APPROVE');
            assert.strictEqual(r.ok, false);
            assert(/not an eligible voter/i.test(r.error));
        });

        await test('vote() records an APPROVE vote', () => {
            sessionId = setup();
            const r = consensus.vote(sessionId, 'DOM-000002', 'APPROVE', 'Test reason');
            assert.strictEqual(r.ok, true);
            assert(r.session);
            assert.strictEqual(r.session.votes.length, 1);
            assert.strictEqual(r.session.votes[0].decision, 'APPROVE');
            assert.strictEqual(r.session.votes[0].domain_id, 'DOM-000002');
        });

        await test('vote() rejects duplicate vote from same domain', () => {
            sessionId = setup();
            consensus.vote(sessionId, 'DOM-000003', 'APPROVE');
            const r = consensus.vote(sessionId, 'DOM-000003', 'APPROVE');
            assert.strictEqual(r.ok, false);
            assert(/already voted/i.test(r.error));
        });

        await test('vote() rejects invalid decision', () => {
            sessionId = setup();
            const r = consensus.vote(sessionId, 'DOM-000004', 'MAYBE');
            assert.strictEqual(r.ok, false);
            assert(/invalid decision/i.test(r.error));
        });

        await test('session reaches APPROVED after quorum (5 APPROVE votes)', () => {
            sessionId = setup();
            const voters = ['DOM-000001', 'DOM-000002', 'DOM-000003', 'DOM-000004', 'DOM-000005'];
            let last;
            for (const v of voters) last = consensus.vote(sessionId, v, 'APPROVE');
            assert.strictEqual(last.ok, true);
            assert.strictEqual(last.session.status, 'APPROVED');
            assert(last.session.ratified_at);
        });

        await test('session APPROVED tally shows quorum_met:true', () => {
            sessionId = setup();
            const voters = ['DOM-000001', 'DOM-000002', 'DOM-000003', 'DOM-000004', 'DOM-000005'];
            let last;
            for (const v of voters) last = consensus.vote(sessionId, v, 'APPROVE');
            assert.strictEqual(last.tally.quorum_met, true);
            assert.strictEqual(last.tally.approve, 5);
        });
    });

    await suite('Consensus — status()', async () => {
        await test('status() without arg returns session list', () => {
            const r = consensus.status();
            assert.strictEqual(r.ok, true);
            assert(typeof r.total    === 'number');
            assert(typeof r.pending  === 'number');
            assert(typeof r.approved === 'number');
            assert(Array.isArray(r.sessions));
        });

        await test('status(sessionId) returns single session', () => {
            const proposed = consensus.propose({
                type: 'LAW_CHANGE', title: 'Status Test', description: 'Testing status.', proposer_id: 'DOM-000001',
            });
            const r = consensus.status(proposed.session.id);
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.session.id, proposed.session.id);
            assert(r.tally);
        });

        await test('status() with unknown id returns error', () => {
            const r = consensus.status('CSS-XXXXXX');
            assert.strictEqual(r.ok, false);
            assert(r.error);
        });
    });

    await suite('Consensus — ratify()', async () => {
        await test('ratify() requires an APPROVED session', () => {
            const proposed = consensus.propose({
                type: 'DOMAIN_OPERATION', title: 'Ratify Test', description: 'Test.', proposer_id: 'DOM-000001',
            });
            const r = consensus.ratify(proposed.session.id);
            assert.strictEqual(r.ok, false);
            assert(/not approved/i.test(r.error));
        });

        await test('ratify() succeeds on an APPROVED session', () => {
            const proposed = consensus.propose({
                type: 'LAW_CHANGE', title: 'Ratify Success', description: 'Test.', proposer_id: 'DOM-000001',
            });
            const voters = ['DOM-000001', 'DOM-000002', 'DOM-000003', 'DOM-000004', 'DOM-000005'];
            for (const v of voters) consensus.vote(proposed.session.id, v, 'APPROVE');
            const r = consensus.ratify(proposed.session.id);
            assert.strictEqual(r.ok, true);
            assert(r.session.ratified_at);
        });
    });

    await suite('Registry.consensus surface', async () => {
        await test('Registry.consensus.propose is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.consensus.propose === 'function');
        });

        await test('Registry.consensus.vote is a function', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.consensus.vote === 'function');
        });

        await test('Registry.consensus.SESSION_TYPES is frozen', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(Object.isFrozen(Registry.consensus.SESSION_TYPES));
        });

        await test('query(consensus.types) returns quorum and eligible voters', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('consensus.types', {});
            assert.strictEqual(r.ok, true);
            assert.strictEqual(r.result.quorum, 5);
            assert.strictEqual(r.result.total_eligible, 9);
            assert(Array.isArray(r.result.types));
        });

        await test('query(consensus.status) returns session list', () => {
            const { Registry } = require('../../lib/registry/kernel');
            const r = Registry.query('consensus.status', {});
            assert.strictEqual(r.ok, true);
            assert(typeof r.result.total === 'number');
        });
    });
};
