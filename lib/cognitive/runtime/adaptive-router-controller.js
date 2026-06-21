'use strict';

// Adaptive Router Controller — Phase 6 enforcement
// Uses historical stage success rates (apex_agent_stages) to dynamically adjust
// agent model assignments. Routing is no longer static complexity-based only.

const { getSupabaseClient } = require('../../clients');
const { TIER_ROUTING } = require('../../models/registry');

const M = {
    HAIKU:  TIER_ROUTING.fast,
    SONNET: TIER_ROUTING.balanced,
    OPUS:   TIER_ROUTING.powerful,
};

const THRESHOLDS = {
    ARCHITECT_ESCALATE:   0.70, // escalate if success_rate < 70%
    REVIEWER_ESCALATE:    0.65, // escalate if success_rate < 65%
    DEVELOPER_ESCALATE:   0.60, // escalate (non-simple) if success_rate < 60%
    REVIEWER_DOWNSCALE:   0.95, // downscale if success_rate >= 95% (for 30+ run streak)
    MIN_SAMPLE_SIZE:      10,   // require at least 10 runs for adaptation
};

async function selectModels(spec, complexity, defaultModels) {
    const models      = { ...defaultModels };
    const adaptations = [];

    try {
        const cutoff = new Date(Date.now() - 14 * 86400000).toISOString(); // 14 days

        const { data: stages } = await getSupabaseClient()
            .from('apex_agent_stages')
            .select('stage, success, duration_ms, created_at')
            .gte('created_at', cutoff)
            .limit(300);

        if (!stages || stages.length < THRESHOLDS.MIN_SAMPLE_SIZE) {
            return { models, adaptations, reason: 'insufficient_history' };
        }

        // Compute per-stage success rate and sample size
        const stageStats = {};
        for (const s of stages) {
            if (!stageStats[s.stage]) stageStats[s.stage] = { pass: 0, fail: 0 };
            if (s.success) stageStats[s.stage].pass++;
            else           stageStats[s.stage].fail++;
        }

        const rate = (stage) => {
            const d = stageStats[stage];
            if (!d) return null;
            const total = d.pass + d.fail;
            if (total < THRESHOLDS.MIN_SAMPLE_SIZE) return null;
            return { rate: d.pass / total, total };
        };

        // ── ARCHITECT adaptation ──────────────────────────────────────────
        const archStats = rate('ARCHITECT');
        if (archStats && archStats.rate < THRESHOLDS.ARCHITECT_ESCALATE && models.architect === M.HAIKU) {
            models.architect = M.SONNET;
            adaptations.push({
                agent: 'architect', from: 'HAIKU', to: 'SONNET',
                reason: `success_rate=${(archStats.rate * 100).toFixed(0)}%<${(THRESHOLDS.ARCHITECT_ESCALATE * 100)}% (n=${archStats.total})`
            });
        }

        // ── REVIEWER adaptation ───────────────────────────────────────────
        const revStats = rate('REVIEWER');
        if (revStats) {
            if (revStats.rate < THRESHOLDS.REVIEWER_ESCALATE && models.reviewer === M.HAIKU) {
                models.reviewer = M.SONNET;
                adaptations.push({
                    agent: 'reviewer', from: 'HAIKU', to: 'SONNET',
                    reason: `success_rate=${(revStats.rate * 100).toFixed(0)}%<${(THRESHOLDS.REVIEWER_ESCALATE * 100)}% (n=${revStats.total})`
                });
            } else if (revStats.rate >= THRESHOLDS.REVIEWER_DOWNSCALE &&
                       revStats.total >= 30 &&
                       models.reviewer === M.SONNET &&
                       complexity !== 'critical') {
                // Downscale opportunity — cost optimisation
                models.reviewer = M.HAIKU;
                adaptations.push({
                    agent: 'reviewer', from: 'SONNET', to: 'HAIKU',
                    reason: `success_rate=${(revStats.rate * 100).toFixed(0)}%>=${(THRESHOLDS.REVIEWER_DOWNSCALE * 100)}% (n=${revStats.total}) — cost optimisation`
                });
            }
        }

        // ── DEVELOPER adaptation ──────────────────────────────────────────
        if (complexity !== 'simple') {
            const devStats = rate('DEVELOPER');
            if (devStats && devStats.rate < THRESHOLDS.DEVELOPER_ESCALATE && models.developer === M.HAIKU) {
                models.developer = M.SONNET;
                adaptations.push({
                    agent: 'developer', from: 'HAIKU', to: 'SONNET',
                    reason: `success_rate=${(devStats.rate * 100).toFixed(0)}%<${(THRESHOLDS.DEVELOPER_ESCALATE * 100)}% (n=${devStats.total})`
                });
            }
        }

        if (adaptations.length > 0) {
            console.log(`[AdaptiveRouter] ${adaptations.map(a => `${a.agent}: ${a.from}→${a.to} (${a.reason})`).join(' | ')}`);
        } else {
            console.log(`[AdaptiveRouter] no adaptations needed (${stages.length} stage records reviewed)`);
        }

    } catch (e) {
        console.warn('[AdaptiveRouter] historical analysis failed (non-fatal):', e.message);
    }

    return { models, adaptations };
}

module.exports = { selectModels, M };
