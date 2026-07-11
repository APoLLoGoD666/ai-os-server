'use strict';

module.exports = function registerConsensusIntents(register) {
    register(
        'consensus.propose',
        'Propose a new constitutional consensus session requiring multi-domain vote',
        { type: 'SESSION_TYPE', title: 'string', description: 'string', proposer_id: 'DOM-NNNNNN' },
        ({ type, title, description, proposer_id, changes }) => {
            const consensus = require('../../../../civilisation/consensus');
            return consensus.propose({ type, title, description, proposer_id, changes });
        }
    );

    register(
        'consensus.vote',
        'Cast a vote on a pending consensus session',
        { session_id: 'CSS-NNNNNN', domain_id: 'DOM-NNNNNN', decision: 'APPROVE|REJECT|ABSTAIN' },
        ({ session_id, domain_id, decision, reason }) => {
            const consensus = require('../../../../civilisation/consensus');
            return consensus.vote(session_id, domain_id, decision, reason);
        }
    );

    register(
        'consensus.status',
        'Get status of one session (pass session_id) or list all sessions (omit session_id)',
        { session_id: 'CSS-NNNNNN (optional)' },
        ({ session_id } = {}) => {
            const consensus = require('../../../../civilisation/consensus');
            return consensus.status(session_id);
        }
    );

    register(
        'consensus.ratify',
        'Manually ratify an already-approved consensus session',
        { session_id: 'CSS-NNNNNN' },
        ({ session_id }) => {
            const consensus = require('../../../../civilisation/consensus');
            return consensus.ratify(session_id);
        }
    );

    register(
        'consensus.types',
        'List all valid session types, quorum requirement, and eligible voter domains',
        {},
        () => {
            const consensus = require('../../../../civilisation/consensus');
            return {
                ok:              true,
                types:           Object.keys(consensus.SESSION_TYPES),
                quorum:          consensus.QUORUM,
                eligible_voters: consensus.ELIGIBLE_VOTERS,
                total_eligible:  consensus.ELIGIBLE_VOTERS.length,
            };
        }
    );
};
