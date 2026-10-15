'use strict';

// Layer 1: Working Memory
// TTL-based, session-scoped. Holds active task, active goal, current plan,
// execution context, and temporary reasoning state. Auto-expires.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('./memory-governor');

const DEFAULT_TTL = 3600; // 1 hour

function _sb() { return getSupabaseClient(); }

// Store or replace a working memory entry for a session.
// content: any JSON-serialisable object
// options: { ttlSeconds, traceId, taskId, confidence }
async function set(sessionId, memoryType, content, options = {}) {
    const ttl      = options.ttlSeconds || DEFAULT_TTL;
    const memoryId = generateMemoryId('working');
    const payload  = {
        memory_id:   memoryId,
        session_id:  sessionId,
        memory_type: memoryType,
        content,
        ttl_seconds: ttl,
        expires_at:  new Date(Date.now() + ttl * 1000).toISOString(),
        confidence:  options.confidence ?? 1.0,
        source:      options.source || 'orchestrator',
        trace_id:    options.traceId || null,
        task_id:     options.taskId  || null,
        updated_at:  new Date().toISOString(),
    };
    try {
        // Upsert by session_id + memory_type — one entry per type per session
        const { error } = await _sb().from('working_memory')
            .upsert(payload, { onConflict: 'session_id,memory_type' });
        if (error) throw error;
        return memoryId;
    } catch (e) {
        console.error(`[working-memory] set failed: ${e.message}`);
        return null;
    }
}

// Retrieve a specific working memory type for a session.
async function get(sessionId, memoryType) {
    try {
        const { data, error } = await _sb().from('working_memory')
            .select('*')
            .eq('session_id', sessionId)
            .eq('memory_type', memoryType)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (e) {
        console.error(`[working-memory] get failed: ${e.message}`);
        return null;
    }
}

// Get all active working memory for a session.
async function getAll(sessionId) {
    try {
        const { data, error } = await _sb().from('working_memory')
            .select('*')
            .eq('session_id', sessionId)
            .gt('expires_at', new Date().toISOString())
            .order('memory_type');
        if (error) throw error;
        // Return as a map: memoryType → content
        const result = {};
        for (const row of (data || [])) result[row.memory_type] = row;
        return result;
    } catch (e) {
        console.error(`[working-memory] getAll failed: ${e.message}`);
        return {};
    }
}

// Extend TTL of all working memory entries for a session.
async function extend(sessionId, extraSeconds = 1800) {
    try {
        const newExpiry = new Date(Date.now() + extraSeconds * 1000).toISOString();
        const { error } = await _sb().from('working_memory')
            .update({ expires_at: newExpiry, updated_at: new Date().toISOString() })
            .eq('session_id', sessionId)
            .gt('expires_at', new Date().toISOString());
        if (error) throw error;
    } catch (e) {
        console.error(`[working-memory] extend failed: ${e.message}`);
    }
}

// Clear all working memory for a session (e.g., task complete).
async function clear(sessionId) {
    try {
        const { error } = await _sb().from('working_memory')
            .delete()
            .eq('session_id', sessionId);
        if (error) throw error;
    } catch (e) {
        console.error(`[working-memory] clear failed: ${e.message}`);
    }
}

// Purge all expired entries. Called by cron.
async function clearExpired() {
    try {
        const { data, error } = await _sb().from('working_memory')
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select('id');
        if (error) throw error;
        const count = (data || []).length;
        if (count > 0) console.log(`[working-memory] purged ${count} expired entries`);
        return count;
    } catch (e) {
        console.error(`[working-memory] clearExpired failed: ${e.message}`);
        return 0;
    }
}

// Build a compact context string from all active working memory for a session.
async function buildContextSummary(sessionId) {
    const all = await getAll(sessionId);
    const lines = [];
    if (all.active_task)       lines.push(`Task: ${JSON.stringify(all.active_task.content)}`);
    if (all.active_goal)       lines.push(`Goal: ${JSON.stringify(all.active_goal.content)}`);
    if (all.current_plan)      lines.push(`Plan: ${JSON.stringify(all.current_plan.content)}`);
    if (all.execution_context) lines.push(`Context: ${JSON.stringify(all.execution_context.content)}`);
    if (all.reasoning_state)   lines.push(`State: ${JSON.stringify(all.reasoning_state.content)}`);
    return lines.join('\n');
}

module.exports = { set, get, getAll, extend, clear, clearExpired, buildContextSummary };
