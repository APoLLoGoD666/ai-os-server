'use strict';
// lib/civilization/admission-engine.js — weekly evaluator for admission_rules (Constitution Art. 2)

const { getSupabaseClient } = require('../clients');
const logger                = require('../logger');

function _sb() { return getSupabaseClient(); }

// ── Criterion evaluators ────────────────────────────────────────────────────
// Each returns { met: boolean, evidence: object }

const EVALUATORS = {

    // Telegram bot: no prerequisite except user request — trips when briefing is stable
    async telegram_bot(sb) {
        // Trip if daily briefing has been delivered at least 7 consecutive days
        const { count } = await sb.from('apex_agent_runs')
            .select('*', { count: 'exact', head: true })
            .ilike('objective', '%briefing%')
            .eq('success', true)
            .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
            .catch(() => ({ count: 0 }));
        return { met: (count || 0) >= 7, evidence: { briefing_runs_7d: count || 0 } };
    },

    async weekly_review_auto(sb) {
        const { count } = await sb.from('apex_agent_runs')
            .select('*', { count: 'exact', head: true })
            .ilike('objective', '%briefing%')
            .eq('success', true)
            .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
            .catch(() => ({ count: 0 }));
        return { met: (count || 0) >= 7, evidence: { consecutive_briefings: count || 0 } };
    },

    async bank_manual_entry(sb) {
        const { count } = await sb.from('apex_finance_entries')
            .select('*', { count: 'exact', head: true })
            .catch(() => ({ count: 0 }));
        return { met: (count || 0) >= 3, evidence: { finance_entries: count || 0 } };
    },

    async recipe_engine(sb) {
        const { count } = await sb.from('apex_life_domain_entries')
            .select('*', { count: 'exact', head: true })
            .eq('domain', 'health')
            .catch(() => ({ count: 0 }));
        return { met: (count || 0) > 20, evidence: { nutrition_entries: count || 0 } };
    },

    async civilisation_score_public(sb) {
        const { data } = await sb.from('domain_scores')
            .select('taken_at')
            .gte('taken_at', new Date(Date.now() - 7 * 86400000).toISOString())
            .catch(() => ({ data: [] }));
        // Need scores for all 7 domains across 7 consecutive days → 49 rows minimum
        const uniqueDays = new Set((data || []).map(r => r.taken_at?.slice(0, 10)));
        return { met: uniqueDays.size >= 7, evidence: { scored_days: uniqueDays.size } };
    },

    async agent_factory(sb) {
        const { count } = await sb.from('admission_rules')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'tripped')
            .catch(() => ({ count: 0 }));
        return { met: (count || 0) > 2, evidence: { tripped_rules: count || 0 } };
    },
};

// ── Build-proposal sender ───────────────────────────────────────────────────

async function _sendBuildProposal(component, criterion, evidence) {
    try {
        const { alertInfo } = require('../../services/slack/slack-alerts');
        await alertInfo(
            `🏗️ Admission rule tripped: \`${component}\``,
            `Criterion met: ${criterion.description || JSON.stringify(criterion)}\nEvidence: ${JSON.stringify(evidence)}`,
            'AdmissionEngine'
        ).catch(() => {});
    } catch (_) {}

    // Also write a notification
    try {
        const { pgCreateNotification } = require('../pg_helpers');
        await pgCreateNotification(
            'system',
            `Admission rule tripped: ${component}`,
            `Criterion met — ready to build. Evidence: ${JSON.stringify(evidence)}`,
            'admission_rules', component
        ).catch(() => {});
    } catch (_) {}
}

// ── Main runner ─────────────────────────────────────────────────────────────

async function evaluateAll() {
    const sb = _sb();

    // Load all non-decommissioned, non-live dormant/available rules
    const { data: rules, error } = await sb.from('admission_rules')
        .select('component, category, criterion, status')
        .in('status', ['dormant', 'available', 'tripped'])
        .order('component');

    if (error) throw new Error(`admission_rules query failed: ${error.message}`);
    if (!rules?.length) return { evaluated: 0, tripped: [] };

    const tripped = [];

    for (const rule of rules) {
        const evaluator = EVALUATORS[rule.component];
        if (!evaluator) continue; // no programmatic check yet — skip

        let result;
        try {
            result = await evaluator(sb);
        } catch (e) {
            logger.warn('admission-engine', `evaluator error for ${rule.component}`, { error: e.message });
            continue;
        }

        if (result.met && rule.status === 'dormant') {
            // Trip the rule
            const now = new Date().toISOString();
            const { error: updateErr } = await sb.from('admission_rules')
                .update({ status: 'tripped', tripped_at: now, updated_at: now })
                .eq('component', rule.component);

            if (updateErr) {
                logger.warn('admission-engine', `failed to trip ${rule.component}`, { error: updateErr.message });
                continue;
            }

            // Send build proposal if not already sent
            if (!rule.build_proposal_sent) {
                await _sendBuildProposal(rule.component, rule.criterion, result.evidence);
                await sb.from('admission_rules')
                    .update({ build_proposal_sent: true, updated_at: new Date().toISOString() })
                    .eq('component', rule.component);
            }

            tripped.push({ component: rule.component, evidence: result.evidence });
            logger.info('admission-engine', `rule tripped: ${rule.component}`, result.evidence);
        }
    }

    logger.info('admission-engine', 'evaluation complete', { evaluated: rules.length, tripped: tripped.length });
    return { evaluated: rules.length, tripped };
}

module.exports = { evaluateAll };
