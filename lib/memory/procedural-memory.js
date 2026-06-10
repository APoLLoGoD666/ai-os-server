'use strict';

// Layer 4: Procedural Memory
// Stores playbooks, workflows, recovery procedures, and implementation methods.
// Represents accumulated knowledge about how we do things.
// Success/failure tracking updates confidence on each execution.

const { getSupabaseClient }  = require('../clients');
const { embedText }          = require('../embed');
const { generateMemoryId }   = require('./memory-governor');

function _sb() { return getSupabaseClient(); }

// Store a new procedure.
// steps: array of { step, description, validation? }
// options: { domain, description, preconditions, postconditions, triggers, traceId, evidence, source }
async function storeProcedure(name, procedureType, steps, options = {}) {
    const memoryId = generateMemoryId('procedural');
    const payload  = {
        memory_id:       memoryId,
        trace_id:        options.traceId   || null,
        source:          options.source    || 'system',
        evidence:        options.evidence  || null,
        name,
        procedure_type:  procedureType,
        domain:          options.domain    || null,
        description:     options.description || null,
        steps:           Array.isArray(steps) ? steps : [steps],
        preconditions:   options.preconditions  || null,
        postconditions:  options.postconditions || null,
        triggers:        options.triggers       || null,
        success_rate:    0.5,
        execution_count: 0,
        confidence:      0.5,
        status:          'candidate',
        validation_state:'pending',
    };
    try {
        const { error } = await _sb().from('procedural_memory').insert(payload);
        if (error) throw error;
    } catch (e) {
        console.error(`[procedural-memory] storeProcedure failed: ${e.message}`);
        return null;
    }

    setImmediate(async () => {
        try {
            const embedInput = `${procedureType} procedure: ${name}. ${options.description || ''}`;
            const embedding  = await embedText(embedInput);
            if (embedding) {
                await _sb().from('procedural_memory').update({ embedding }).eq('memory_id', memoryId);
            }
        } catch (e) {
            console.warn(`[procedural-memory] embed failed: ${e.message}`);
        }
    });

    return memoryId;
}

// Find a procedure matching query + optional type filter.
async function findProcedure(query, procedureType = null, limit = 5) {
    // Semantic path
    try {
        const embedding = await embedText(query);
        if (embedding) {
            let q = _sb().from('procedural_memory')
                .select('memory_id, name, procedure_type, domain, steps, success_rate, confidence')
                .in('status', ['candidate','validated'])
                .not('embedding', 'is', null);
            if (procedureType) q = q.eq('procedure_type', procedureType);
            // pgvector cosine distance — manual ordering not possible via JS client
            // Fall through to keyword if no RPC available for procedural
        }
    } catch (_) {}

    // Keyword / text search
    try {
        let q = _sb().from('procedural_memory')
            .select('memory_id, name, procedure_type, domain, steps, description, success_rate, confidence, execution_count')
            .in('status', ['candidate','validated'])
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
        if (procedureType) q = q.eq('procedure_type', procedureType);
        const { data, error } = await q
            .order('confidence', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[procedural-memory] findProcedure failed: ${e.message}`);
        return [];
    }
}

// Record an execution outcome — updates success_rate and execution_count.
async function recordExecution(memoryId, success, durationMs = null) {
    try {
        const { data } = await _sb().from('procedural_memory')
            .select('execution_count, success_rate, avg_duration_ms')
            .eq('memory_id', memoryId)
            .single();
        if (!data) return;

        const n          = (data.execution_count || 0) + 1;
        const prevRate   = data.success_rate || 0.5;
        const newRate    = ((prevRate * (n - 1)) + (success ? 1 : 0)) / n;
        const confidence = Math.min(0.99, 0.3 + (n / 30) * 0.4 + newRate * 0.3);

        let avgDuration = data.avg_duration_ms;
        if (durationMs) {
            avgDuration = avgDuration
                ? Math.round(((avgDuration * (n - 1)) + durationMs) / n)
                : durationMs;
        }

        const update = {
            execution_count: n,
            success_rate:    parseFloat(newRate.toFixed(3)),
            confidence:      parseFloat(confidence.toFixed(3)),
            updated_at:      new Date().toISOString(),
        };
        if (avgDuration) update.avg_duration_ms = avgDuration;
        if (!success && arguments[2]) update.last_failure_reason = null;

        await _sb().from('procedural_memory').update(update).eq('memory_id', memoryId);
    } catch (e) {
        console.error(`[procedural-memory] recordExecution failed: ${e.message}`);
    }
}

// Get all procedures for a domain.
async function getByDomain(domain, procedureType = null) {
    try {
        let q = _sb().from('procedural_memory')
            .select('memory_id, name, procedure_type, description, success_rate, confidence, execution_count')
            .in('status', ['candidate','validated'])
            .eq('domain', domain);
        if (procedureType) q = q.eq('procedure_type', procedureType);
        const { data, error } = await q.order('confidence', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[procedural-memory] getByDomain failed: ${e.message}`);
        return [];
    }
}

// Validate a procedure (mark as production-ready).
async function validate(memoryId) {
    try {
        const { error } = await _sb().from('procedural_memory').update({
            status:           'validated',
            validation_state: 'validated',
            updated_at:       new Date().toISOString(),
        }).eq('memory_id', memoryId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error(`[procedural-memory] validate failed: ${e.message}`);
        return false;
    }
}

module.exports = { storeProcedure, findProcedure, recordExecution, getByDomain, validate };
