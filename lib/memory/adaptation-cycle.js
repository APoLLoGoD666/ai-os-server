'use strict';

// Layer 13: Adaptation Cycle
// Weekly cycle: Lessons → Patterns → Knowledge → Policy Changes → Behavior Changes
// All adaptations must be measurable. Closed-loop only.
// Integrates with existing adaptation-engine.js (routing/model adaptations).
// This module handles the higher-level strategic adaptation cycle.

const { getSupabaseClient }  = require('../clients');
const { getAnthropicClient } = require('../clients');
const runtime                = require('../models/runtime');
const { generateMemoryId }   = require('./memory-governor');
const episodicMem            = require('./episodic-memory-pg');
const semanticMem            = require('./semantic-memory');
const skillMem               = require('./skill-memory');
const reflexionTracker       = require('./reflexion-tracker');
const improvementEngine      = require('./improvement-engine');

function _sb() { return getSupabaseClient(); }
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Run the full weekly adaptation cycle.
// Returns a cycle record with all changes and outcomes.
async function runWeeklyCycle() {
    const cycleId    = generateMemoryId('adaptation');
    const cycleStart = new Date().toISOString();

    console.log(`[adaptation-cycle] starting weekly cycle ${cycleId}`);

    try {
        const { error: insertError } = await _sb().from('adaptation_cycles').insert({
            cycle_id:   cycleId,
            cycle_type: 'weekly',
            started_at: cycleStart,
            status:     'running',
        });
        if (insertError) throw insertError;
    } catch (e) {
        console.error(`[adaptation-cycle] failed to create cycle record: ${e.message}`);
        return null;
    }

    const result = {
        lessons_analyzed:    0,
        patterns_discovered: 0,
        knowledge_updated:   0,
        skills_updated:      0,
        policy_changes:      [],
        routing_changes:     [],
        behavior_changes:    [],
        measurable_outcomes: {},
    };

    let _cycleCompleted = false;
    try {
        // Step 1: Analyze lessons from the past 7 days
        const lessons = await _fetchRecentLessons(7);
        result.lessons_analyzed = lessons.length;
        console.log(`[adaptation-cycle] analyzing ${lessons.length} lessons`);

        // Step 2: Discover patterns from recent episodes
        const episodes       = await episodicMem.getRecent(100);
        const patterns       = await _discoverPatterns(episodes, lessons);
        result.patterns_discovered = patterns.length;

        // Step 3: Update knowledge — consolidate patterns into semantic memory
        for (const pattern of patterns) {
            try {
                const dup = await semanticMem.findDuplicate(pattern.text, 0.85);
                if (!dup) {
                    await semanticMem.storeFact(pattern.text, 'pattern', {
                        domain:     pattern.domain || 'pipeline',
                        confidence: pattern.confidence || 0.6,
                        source:     'adaptation_cycle',
                        evidence:   { cycle_id: cycleId, evidence_count: pattern.evidenceCount },
                    });
                    result.knowledge_updated++;
                } else {
                    await semanticMem.addSupport(dup);
                    result.knowledge_updated++;
                }
            } catch (e) {
                console.warn(`[adaptation-cycle] knowledge update failed: ${e.message}`);
            }
        }

        // Step 4: Update skill memory from episode success rates
        const skillUpdates = await _updateSkillsFromEpisodes(episodes);
        result.skills_updated = skillUpdates;

        // Step 5: Verify reflexion records retroactively
        const verifiedReflexions = await reflexionTracker.retroactiveVerification(50);
        result.measurable_outcomes.reflexions_verified = verifiedReflexions;

        // Step 5.5: WS2 — Extract behavioral policies from verified reflexion records
        // Closes the Decision→Outcome→Reflexion→Policy→Future Decision loop
        setImmediate(async () => {
            try {
                const policyExtractor = require('./policy-extractor');
                const policyResult = await policyExtractor.extractAndStorePolicies();
                if (policyResult.extracted > 0) {
                    console.log(`[adaptation-cycle] policy extraction: ${policyResult.extracted} new policies for domains [${policyResult.domains.map(d => d.domain).join(', ')}]`);
                }
            } catch (e) {
                console.warn(`[adaptation-cycle] policy extraction failed: ${e.message}`);
            }
        });

        // Step 6: Propose routing changes based on patterns
        const routingChanges = await _proposeRoutingChanges(patterns, episodes);
        result.routing_changes = routingChanges;

        // Step 7: Propose behavior changes based on reflexion stats
        const reflexionStats = await reflexionTracker.getApplicationStats();
        result.measurable_outcomes.reflexion_stats = reflexionStats;

        const behaviorChanges = await _proposeBehaviorChanges(lessons, reflexionStats);
        result.behavior_changes = behaviorChanges;

        // Step 8: Auto-submit low-risk improvements discovered in cycle
        for (const change of [...routingChanges, ...behaviorChanges]) {
            if (change.riskLevel === 'minimal' || change.riskLevel === 'low') {
                await improvementEngine.submitCandidate(
                    change.title,
                    change.description,
                    change.type || 'routing',
                    `Discovered by adaptation cycle ${cycleId}`,
                    { riskLevel: change.riskLevel, estimatedImpact: change.estimatedImpact }
                );
            }
        }

        // Phase 3 — Route discovered patterns through gateway (lessons layer) for unified retrieval
        const gateway = require('./gateway');
        for (const pattern of patterns) {
            setImmediate(() => gateway.storeMemory({
                layer:           10,
                source:          'adaptation_cycle',
                content:         `Pattern: ${pattern.text}`,
                tags:            ['pattern', pattern.domain || 'pipeline', 'adaptation'],
                requestingEntity: 'consolidation_engine',
                taskId:          cycleId,
            }).catch(() => {}));
        }

        // Phase 4 — Governance memory: synthesize evidence_blocks into lessons
        setImmediate(async () => {
            try {
                const govSynth = require('./governance-synthesizer');
                await govSynth.synthesizeRecentFindings(30);
            } catch {}
        });

        // Phase 6 — Founder continuity: auto-promote high-confidence accumulated evidence
        setImmediate(async () => {
            try {
                const traitEvo = require('../founder/trait-evolution');
                const pending  = await traitEvo.getPendingEvidence(100);
                const byTrait  = {};
                for (const e of pending) {
                    if (!byTrait[e.trait]) byTrait[e.trait] = [];
                    byTrait[e.trait].push(e);
                }
                for (const [trait, items] of Object.entries(byTrait)) {
                    if (items.length < 3) continue; // require minimum 3 observations
                    const agg = await traitEvo.aggregateEvidence(trait);
                    if (agg && agg.avgConfidence >= 0.65) {
                        await traitEvo.promoteToTrait({
                            section:     'traits.observed',
                            trait,
                            newValue:    { text: agg.observations.slice(0, 300), observation_count: agg.count },
                            evidence:    agg.observations.slice(0, 200),
                            confidence:  agg.avgConfidence,
                            promotedBy:  `adaptation_cycle:${cycleId}`,
                        }).catch(() => {});
                    }
                }
            } catch {}
        });

        // Record successful cycle
        await _sb().from('adaptation_cycles').update({
            completed_at:        new Date().toISOString(),
            lessons_analyzed:    result.lessons_analyzed,
            patterns_discovered: result.patterns_discovered,
            knowledge_updated:   result.knowledge_updated,
            skills_updated:      result.skills_updated,
            policy_changes:      result.policy_changes,
            routing_changes:     result.routing_changes,
            behavior_changes:    result.behavior_changes,
            measurable_outcomes: result.measurable_outcomes,
            status:              'completed',
        }).eq('cycle_id', cycleId);

        _cycleCompleted = true;
        console.log(`[adaptation-cycle] cycle ${cycleId} completed: ${result.patterns_discovered} patterns, ${result.knowledge_updated} knowledge updates`);
        return { cycleId, ...result };

    } catch (e) {
        console.error(`[adaptation-cycle] cycle failed: ${e.message}`);
        return null;
    } finally {
        if (!_cycleCompleted) {
            // Always reset stuck 'running' row — prevents accumulation on crash or SIGTERM
            await _sb().from('adaptation_cycles')
                .update({ status: 'failed', completed_at: new Date().toISOString() })
                .eq('cycle_id', cycleId).eq('status', 'running')
                .catch(() => {});
        }
    }
}

async function _fetchRecentLessons(days) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await _sb().from('apex_lessons')
            .select('id, lesson, task_id, trace_id, created_at')
            .gte('created_at', cutoff)
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[adaptation-cycle] _fetchRecentLessons failed: ${e.message}`);
        return [];
    }
}

async function _discoverPatterns(episodes, lessons) {
    const patterns = [];
    if (episodes.length === 0 && lessons.length === 0) return patterns;

    // Analyze failure stage frequency
    const stageFreq = {};
    for (const ep of episodes) {
        if (!ep.success && ep.failed_stage) {
            stageFreq[ep.failed_stage] = (stageFreq[ep.failed_stage] || 0) + 1;
        }
    }
    for (const [stage, count] of Object.entries(stageFreq)) {
        if (count >= 3) {
            patterns.push({
                text:          `Recurring failures at ${stage} stage (${count} occurrences in recent episodes)`,
                domain:        'pipeline',
                confidence:    Math.min(0.9, 0.5 + count * 0.1),
                evidenceCount: count,
            });
        }
    }

    // Analyze success rate trend
    const stats = await episodicMem.getStats();
    if (stats && stats.successRate !== null) {
        if (stats.successRate < 0.5) {
            patterns.push({
                text:          `System success rate is below 50% (${(stats.successRate * 100).toFixed(1)}%) — requires attention`,
                domain:        'system',
                confidence:    0.95,
                evidenceCount: stats.total,
            });
        } else if (stats.successRate >= 0.85) {
            patterns.push({
                text:          `System success rate is high (${(stats.successRate * 100).toFixed(1)}%) — current approach is effective`,
                domain:        'system',
                confidence:    0.9,
                evidenceCount: stats.total,
            });
        }
    }

    // Use Haiku to synthesize patterns from lessons if enough data
    if (lessons.length >= 5) {
        try {
            const lessonTexts = lessons.slice(0, 20).map(l => l.lesson).join('\n- ');
            const client = getAnthropicClient();
            const { result: resp } = await runtime.execute({
                client, caller: 'adaptation-cycle',
                model: HAIKU_MODEL, maxTokens: 300,
                messages: [{
                    role:    'user',
                    content: `Identify up to 3 recurring patterns from these lessons:\n- ${lessonTexts}\n\nRespond with JSON array only: [{"text": "<pattern>", "domain": "<domain>", "confidence": <0-1>}]`,
                }],
            });
            const raw   = resp.content?.[0]?.text?.trim() || '[]';
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
                const aiPatterns = JSON.parse(match[0]);
                for (const p of aiPatterns) {
                    patterns.push({ ...p, evidenceCount: lessons.length });
                }
            }
        } catch (e) {
            console.warn(`[adaptation-cycle] AI pattern discovery failed: ${e.message}`);
        }
    }

    return patterns;
}

async function _updateSkillsFromEpisodes(episodes) {
    let updated = 0;
    const stageStats = {};
    for (const ep of episodes) {
        if (!ep.failed_stage && ep.success) {
            stageStats['pipeline'] = stageStats['pipeline'] || { success: 0, total: 0 };
            stageStats['pipeline'].success++;
            stageStats['pipeline'].total++;
        } else if (ep.failed_stage) {
            const stage = ep.failed_stage;
            stageStats[stage] = stageStats[stage] || { success: 0, total: 0 };
            stageStats[stage].total++;
        }
    }
    for (const [stage, stats] of Object.entries(stageStats)) {
        const successRate = stats.total > 0 ? stats.success / stats.total : 0.5;
        try {
            await skillMem.upsertSkill(stage, 'pipeline', {
                successRate,
                failureRate:    1 - successRate,
                executionCount: stats.total,
            }, { source: 'adaptation_cycle' });
            updated++;
        } catch (e) {
            console.warn(`[adaptation-cycle] skill update failed for ${stage}: ${e.message}`);
        }
    }
    return updated;
}

async function _proposeRoutingChanges(patterns, episodes) {
    const changes = [];
    const failPatterns = patterns.filter(p => p.text.includes('failure') || p.text.includes('fail'));
    for (const fp of failPatterns) {
        changes.push({
            title:           `Routing adjustment based on: ${fp.text.slice(0, 60)}`,
            description:     `Pattern detected: ${fp.text}. Consider adjusting routing logic for affected pipeline stages.`,
            type:            'routing',
            riskLevel:       'low',
            estimatedImpact: fp.confidence * 0.6,
        });
    }
    return changes.slice(0, 3); // Cap at 3 routing change proposals per cycle
}

async function _proposeBehaviorChanges(lessons, reflexionStats) {
    const changes = [];
    if (reflexionStats.dead > 5) {
        changes.push({
            title:           'Improve lesson retrieval integration',
            description:     `${reflexionStats.dead} lessons have never been retrieved. Improve retrieval weight for recent lessons in orchestrator context building.`,
            type:            'procedure',
            riskLevel:       'minimal',
            estimatedImpact: 0.4,
        });
    }
    if (reflexionStats.verificationRate < 0.2 && reflexionStats.total > 10) {
        changes.push({
            title:           'Increase lesson-to-decision influence tracking',
            description:     `Only ${(reflexionStats.verificationRate * 100).toFixed(1)}% of lessons have verified behavior change. Add influenced_by_lesson field population to routing decisions.`,
            type:            'routing',
            riskLevel:       'minimal',
            estimatedImpact: 0.5,
        });
    }
    return changes;
}

// Get the most recent completed cycle.
async function getLatestCycle() {
    try {
        const { data, error } = await _sb().from('adaptation_cycles')
            .select('*')
            .eq('status', 'completed')
            .order('started_at', { ascending: false })
            .limit(1)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (e) {
        console.error(`[adaptation-cycle] getLatestCycle failed: ${e.message}`);
        return null;
    }
}

// List recent cycles.
async function listCycles(limit = 10) {
    try {
        const { data, error } = await _sb().from('adaptation_cycles')
            .select('cycle_id, cycle_type, started_at, completed_at, lessons_analyzed, patterns_discovered, knowledge_updated, status')
            .order('started_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[adaptation-cycle] listCycles failed: ${e.message}`);
        return [];
    }
}

// Reset any cycles stuck in 'running' from prior server instances (called on startup).
async function repairStuckCycles() {
    try {
        const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { error } = await _sb().from('adaptation_cycles')
            .update({ status: 'failed', completed_at: new Date().toISOString() })
            .eq('status', 'running')
            .lt('started_at', cutoff);
        if (!error) console.log('[adaptation-cycle] stuck cycle repair completed');
    } catch (e) {
        console.warn(`[adaptation-cycle] repairStuckCycles failed: ${e.message}`);
    }
}

module.exports = { runWeeklyCycle, getLatestCycle, listCycles, repairStuckCycles };
