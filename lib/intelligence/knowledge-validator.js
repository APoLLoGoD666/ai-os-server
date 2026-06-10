'use strict';

// Knowledge Validator — Phase 6
// No lesson becomes knowledge automatically.
// Pipeline: Observation → Lesson Candidate → Evidence Aggregation → Validation → Knowledge
// Creates VALIDATES / SUPPORTS / CONTRADICTS / SUPERSEDES relationships in knowledge graph.

const { getSupabaseClient }   = require('../clients');
const { generateMemoryId }    = require('../memory/memory-governor');
const semanticMem             = require('../memory/semantic-memory');
const knowledgeGraph          = require('../memory/knowledge-graph');
const { embedText }           = require('../embed');

function _sb() { return getSupabaseClient(); }

const MIN_CONFIRMATIONS = 2;
const MIN_CONFIDENCE    = 0.60;
const MIN_EVIDENCE      = 1;
const HAIKU_MODEL       = 'claude-haiku-4-5-20251001';

// Submit a lesson for knowledge validation.
// Returns validationId immediately; processing is async.
async function submitLesson(lessonText, options = {}) {
    const { lessonSourceId, traceId, taskId, sourceType = 'lesson' } = options;
    if (!lessonText || lessonText.length < 10) return null;

    const validationId = generateMemoryId('validation').replace('mem-', 'kvq-');

    // Check if we already have this lesson in the queue
    try {
        const duplicate = await _findExistingValidation(lessonText);
        if (duplicate) {
            // Increment confirmations on existing record
            await _addConfirmation(duplicate.validation_id, { traceId, taskId });
            return duplicate.validation_id;
        }
    } catch (_) {}

    try {
        const { error } = await _sb().from('knowledge_validation_queue').insert({
            validation_id:    validationId,
            lesson_text:      lessonText,
            lesson_source_id: lessonSourceId || null,
            trace_id:         traceId        || null,
            task_id:          taskId         || null,
            source_type:      sourceType,
            confirmations:    1,
            min_confirmations: MIN_CONFIRMATIONS,
            confidence:       0.0,
            min_confidence:   MIN_CONFIDENCE,
            evidence:         JSON.stringify([{ traceId, taskId, at: new Date().toISOString() }]),
            status:           'pending',
        });
        if (error) throw error;
        return validationId;
    } catch (e) {
        console.error(`[knowledge-validator] submitLesson failed: ${e.message}`);
        return null;
    }
}

// Process pending validations. Called by hourly cron.
// Returns { processed, validated, rejected }
async function processPending(batchSize = 20) {
    const stats = { processed: 0, validated: 0, rejected: 0 };
    try {
        const { data, error } = await _sb().from('knowledge_validation_queue')
            .select('*')
            .in('status', ['pending','confirming'])
            .order('confirmations', { ascending: false })
            .limit(batchSize);
        if (error || !data) return stats;

        for (const item of data) {
            try {
                const result = await _processValidationItem(item);
                stats.processed++;
                if (result === 'validated') stats.validated++;
                else if (result === 'rejected') stats.rejected++;
            } catch (e) {
                console.warn(`[knowledge-validator] item ${item.validation_id} failed: ${e.message}`);
            }
        }
    } catch (e) {
        console.error(`[knowledge-validator] processPending failed: ${e.message}`);
    }
    return stats;
}

async function _processValidationItem(item) {
    const { validation_id, lesson_text, confirmations } = item;
    const evidenceArr = _parseEvidence(item.evidence);

    // Step 1: Score the lesson
    const score = await _scoreLessonText(lesson_text);

    // Step 2: Check for contradictions in existing semantic memory
    const contradictions = await _findContradictions(lesson_text);

    // Step 3: Update confidence based on confirmations and score
    const confidence = _computeConfidence(confirmations, score, contradictions.length);

    // Step 4: Check if ready for promotion
    const meetsMin = confirmations >= MIN_CONFIRMATIONS &&
                     confidence >= MIN_CONFIDENCE &&
                     evidenceArr.length >= MIN_EVIDENCE &&
                     contradictions.length === 0;

    if (meetsMin) {
        return _promoteToKnowledge(item, confidence, contradictions);
    } else if (confirmations < MIN_CONFIRMATIONS) {
        // Still gathering confirmations
        await _sb().from('knowledge_validation_queue').update({
            status:      'confirming',
            confidence:  parseFloat(confidence.toFixed(3)),
            updated_at:  new Date().toISOString(),
        }).eq('validation_id', validation_id);
        return 'pending';
    } else if (contradictions.length > 0) {
        // Has contradictions — flag for review
        await _sb().from('knowledge_validation_queue').update({
            status:         'confirming',
            confidence:     parseFloat(confidence.toFixed(3)),
            contradictions: JSON.stringify(contradictions),
            updated_at:     new Date().toISOString(),
        }).eq('validation_id', validation_id);
        return 'contradicted';
    }

    return 'pending';
}

async function _promoteToKnowledge(item, confidence, contradictions) {
    const { validation_id, lesson_text, trace_id } = item;

    // Classify the lesson into a semantic category
    const category = await _classifyLesson(lesson_text);

    // Check for duplicates in semantic memory
    const dupId = await semanticMem.findDuplicate(lesson_text, 0.85);

    let memoryId;
    if (dupId) {
        // Already exists — add support
        await semanticMem.addSupport(dupId);
        memoryId = dupId;
    } else {
        // Create new semantic memory entry
        memoryId = await semanticMem.storeFact(lesson_text, category || 'fact', {
            source:     'knowledge_validator',
            confidence: confidence,
            traceId:    trace_id,
            evidence:   { validation_id, lesson_text: lesson_text.slice(0, 100) },
        });
        // Validate immediately since we've gone through the full pipeline
        if (memoryId) await semanticMem.validate(memoryId);
    }

    // Create VALIDATES edge in knowledge graph
    if (memoryId) {
        setImmediate(async () => {
            try {
                const knowledgeNodeId = await knowledgeGraph.syncFromMemory(
                    'Knowledge', memoryId, 'semantic_memory', lesson_text.slice(0, 80), { confidence }
                );
                // Link contradicted items if any
                for (const contra of contradictions.slice(0, 3)) {
                    if (contra.memory_id && knowledgeNodeId) {
                        const contraNodeId = await knowledgeGraph.syncFromMemory(
                            'Knowledge', contra.memory_id, 'semantic_memory', (contra.fact || '').slice(0, 80), {}
                        );
                        if (contraNodeId) {
                            await knowledgeGraph.createEdge(knowledgeNodeId, contraNodeId, 'CONTRADICTS',
                                { source: 'knowledge_validator' }, 0.7);
                        }
                    }
                }
            } catch (_) {}
        });
    }

    // Mark validation as complete
    await _sb().from('knowledge_validation_queue').update({
        status:          'validated',
        result_memory_id: memoryId,
        confidence:      parseFloat(confidence.toFixed(3)),
        reviewed_at:     new Date().toISOString(),
        updated_at:      new Date().toISOString(),
    }).eq('validation_id', validation_id);

    return 'validated';
}

async function _findExistingValidation(lessonText) {
    try {
        const { data } = await _sb().from('knowledge_validation_queue')
            .select('validation_id, confirmations, status')
            .ilike('lesson_text', `${lessonText.slice(0, 80)}%`)
            .in('status', ['pending','confirming'])
            .limit(1);
        return data?.[0] || null;
    } catch (_) { return null; }
}

async function _addConfirmation(validationId, evidence) {
    try {
        const { data } = await _sb().from('knowledge_validation_queue')
            .select('confirmations, evidence')
            .eq('validation_id', validationId)
            .single();
        if (!data) return;
        const evidenceArr = _parseEvidence(data.evidence);
        evidenceArr.push({ ...evidence, at: new Date().toISOString() });
        await _sb().from('knowledge_validation_queue').update({
            confirmations: (data.confirmations || 0) + 1,
            evidence:      JSON.stringify(evidenceArr),
            updated_at:    new Date().toISOString(),
        }).eq('validation_id', validationId);
    } catch (_) {}
}

async function _findContradictions(lessonText) {
    try {
        const similar = await semanticMem.search(lessonText, { limit: 5, minConfidence: 0.5 });
        // Simple heuristic: if a lesson says "always X" and we have "never X", flag it
        const contradictionPatterns = [
            { positive: /always\s+(\w+)/i, negative: /never\s+(\w+)/i },
            { positive: /must\s+(\w+)/i,   negative: /must not\s+(\w+)/i },
            { positive: /should\s+(\w+)/i, negative: /should not\s+(\w+)/i },
        ];
        const contradictions = [];
        for (const existing of similar) {
            for (const { positive, negative } of contradictionPatterns) {
                const lessonPositive  = positive.exec(lessonText);
                const lessonNegative  = negative.exec(lessonText);
                const existPositive   = positive.exec(existing.fact || '');
                const existNegative   = negative.exec(existing.fact || '');
                if ((lessonPositive && existNegative && lessonPositive[1] === existNegative[1]) ||
                    (lessonNegative && existPositive && lessonNegative[1] === existPositive[1])) {
                    contradictions.push(existing);
                }
            }
        }
        return contradictions;
    } catch (_) { return []; }
}

function _computeConfidence(confirmations, score, contradictionCount) {
    const confirmWeight = Math.min(1.0, confirmations / 5);   // 5 confirmations = max
    const scoreWeight   = score || 0.5;
    const contraWeight  = contradictionCount > 0 ? 0.3 : 1.0; // contradictions reduce confidence
    return confirmWeight * 0.4 + scoreWeight * 0.4 + (contraWeight - 1) * 0.2 + 0.5;
}

async function _scoreLessonText(text) {
    // Actionability keywords → higher score
    const actionWords = /always|never|must|avoid|check|ensure|wrap|add|replace|use|prefer|prevent|verify/i;
    return actionWords.test(text) ? 0.75 : 0.45;
}

async function _classifyLesson(text) {
    const patterns = [
        { cat: 'rule',    re: /always|never|must|must not|should|should not/i },
        { cat: 'pattern', re: /when.*then|if.*then|pattern|occurs|tends to/i },
        { cat: 'fact',    re: /is|are|has|have|was|were/i },
        { cat: 'concept', re: /means|represents|defined as|refers to/i },
    ];
    for (const { cat, re } of patterns) if (re.test(text)) return cat;
    return 'fact';
}

function _parseEvidence(evidenceField) {
    if (!evidenceField) return [];
    if (Array.isArray(evidenceField)) return evidenceField;
    try { return JSON.parse(evidenceField); } catch { return []; }
}

// Get validation queue stats.
async function getStats() {
    try {
        const { data } = await _sb().from('knowledge_validation_queue')
            .select('status, confirmations');
        const total     = (data || []).length;
        const byStatus  = {};
        let avgConf     = 0;
        for (const r of (data || [])) {
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
            avgConf += (r.confirmations || 0);
        }
        return { total, byStatus, avgConfirmations: total > 0 ? avgConf / total : 0 };
    } catch (e) {
        return { total: 0 };
    }
}

module.exports = { submitLesson, processPending, getStats };
