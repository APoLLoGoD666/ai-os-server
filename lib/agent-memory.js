'use strict';
// lib/agent-memory.js — Per-agent memory partitions backed by Supabase agent_memory table
// Namespace rules:
//   council-cso       → council:cso
//   director-finance  → director:finance
//   ministry-intel    → ministry:intel
//   anything else     → agent:{id}

const { getSupabaseClient } = require('./clients');
const logger = require('./logger');

const TABLE = 'agent_memory';

function _sb() { return getSupabaseClient(); }

function _toPartition(id) {
    if (!id) return 'agent:unknown';
    if (id.startsWith('council-'))   return `council:${id.slice(8)}`;
    if (id.startsWith('director-'))  return `director:${id.slice(9)}`;
    if (id.startsWith('ministry-'))  return `ministry:${id.slice(9)}`;
    return `agent:${id}`;
}

// Read all memory entries for one agent
async function getAgentMemory(agentId, { limit = 50, type = null } = {}) {
    const partition = _toPartition(agentId);
    try {
        let q = _sb().from(TABLE)
            .select('id, partition_key, memory_type, content, metadata, created_at')
            .eq('partition_key', partition)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (type) q = q.eq('memory_type', type);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (e) {
        logger.warn('agent-memory', 'read failed', { partition, error: e.message });
        return [];
    }
}

// Write one memory entry for an agent
async function writeAgentMemory(agentId, data, { type = 'general', ttl = null } = {}) {
    const partition = _toPartition(agentId);
    const entry = {
        partition_key: partition,
        memory_type:   type,
        content:       typeof data === 'string' ? data : JSON.stringify(data),
        metadata:      typeof data === 'object' && data !== null ? data : null,
        expires_at:    ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null,
    };
    try {
        const { error } = await _sb().from(TABLE).insert(entry);
        if (error) throw error;
        return true;
    } catch (e) {
        logger.warn('agent-memory', 'write failed', { partition, error: e.message });
        return false;
    }
}

// Read recent memories from an entire namespace (e.g. all council:* partitions)
async function getPartitionMemories(namespace, { limit = 100 } = {}) {
    try {
        const { data, error } = await _sb().from(TABLE)
            .select('partition_key, memory_type, content, created_at')
            .ilike('partition_key', `${namespace}:%`)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        logger.warn('agent-memory', 'namespace read failed', { namespace, error: e.message });
        return [];
    }
}

// Founder reads all partitions (omniscient view)
async function getAllAgentMemories({ limit = 200, partition = null } = {}) {
    try {
        let q = _sb().from(TABLE)
            .select('partition_key, memory_type, content, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (partition) q = q.eq('partition_key', partition);
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
    } catch (e) {
        logger.warn('agent-memory', 'all-memories read failed', { error: e.message });
        return [];
    }
}

module.exports = { getAgentMemory, writeAgentMemory, getPartitionMemories, getAllAgentMemories, _toPartition };
