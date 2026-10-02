'use strict';
// lib/executive/domain-memory.js
// Per-executive domain memory. Lessons from deliberations reinforce the relevant domain.
// Each executive accumulates independent institutional knowledge that persists across sessions.
// Called by executive-council.js after every deliberation.

const gateway = require('../memory/gateway');
const { getSupabaseClient } = require('../clients');
function _sb() { return getSupabaseClient(); }

const EXEC_DOMAINS = {
    ceo: { name: 'CEO', domain: 'strategy',     layer: 5 },
    cto: { name: 'CTO', domain: 'technology',   layer: 9 },
    cfo: { name: 'CFO', domain: 'finance',      layer: 9 },
    coo: { name: 'COO', domain: 'operations',   layer: 9 },
    cso: { name: 'CSO', domain: 'security',     layer: 9 },
    cio: { name: 'CIO', domain: 'intelligence', layer: 9 },
    cgo: { name: 'CGO', domain: 'governance',   layer: 9 },
    cho: { name: 'CHO', domain: 'health',       layer: 9 },
    clo: { name: 'CLO', domain: 'legal',        layer: 9 },
    cro: { name: 'CRO', domain: 'risk',         layer: 9 },
};

// Store the council's final decision to Layer 7 (decision_memory) for long-term decision history.
async function recordCouncilDecision({ question, recommendation, votes, consensusLevel, deliberationId }) {
    const voteSummary = (votes || [])
        .map(v => `${(v.entityId || '').toUpperCase()}: ${v.vote} (${(v.confidence || 0.7).toFixed(2)})`)
        .join('; ');

    return gateway.storeMemory({
        layer:           7,
        source:          'executive_council',
        content:         JSON.stringify({
            question:         question.slice(0, 300),
            recommendation:   recommendation.slice(0, 300),
            vote_summary:     voteSummary,
            consensus:        consensusLevel,
            deliberation_id:  deliberationId,
        }),
        tags:            ['executive', 'council', 'decision', 'institutional'],
        requestingEntity: 'system',
        importance:      8,
    });
}

// Store each executive's vote outcome to their domain memory.
// Operational failures strengthen COO memory. Financial lessons strengthen CFO memory. Etc.
async function recordDomainLessons({ question, recommendation, votes, deliberationId }) {
    const ops = (votes || []).map(v => {
        const exec = EXEC_DOMAINS[v.entityId?.toLowerCase()];
        if (!exec) return null;
        const content = `[${exec.name}/${exec.domain}] ${question.slice(0, 200)} → ${(v.rationale || recommendation).slice(0, 200)}`;
        return gateway.storeMemory({
            layer:           exec.layer,
            source:          `executive.${v.entityId}`,
            content,
            tags:            ['executive', exec.domain, v.entityId, 'lesson'],
            requestingEntity: 'system',
            importance:      7,
        }).catch(() => null);
    }).filter(Boolean);

    return Promise.allSettled(ops);
}

// Retrieve domain context for a specific executive (used to enrich future decisions).
// Prioritises source-tagged memories from this exact executive, then falls back to domain-wide.
async function getDomainContext(entityId, limit = 5) {
    const exec = EXEC_DOMAINS[entityId?.toLowerCase()];
    if (!exec) return [];
    try {
        // Phase 1: direct source query — most reliable, bypasses embedding RPC limitations
        const { data: exactRows } = await _sb()
            .from('semantic_memory')
            .select('memory_id, fact, source, tags, domain, category, created_at')
            .eq('source', `executive.${entityId}`)
            .in('status', ['candidate', 'validated'])
            .order('created_at', { ascending: false })
            .limit(limit);

        const exactSource = (exactRows || []).map(r => ({ layer: 9, content: r.fact, ...r }));

        if (exactSource.length >= limit) return exactSource.slice(0, limit);

        // Phase 2: fallback — direct DB query for domain-tagged non-executive items
        const remaining = limit - exactSource.length;
        if (remaining <= 0) return exactSource;
        const exactIds = new Set(exactSource.map(r => r.memory_id));
        const { data: domainRows } = await _sb()
            .from('semantic_memory')
            .select('memory_id, fact, source, tags, domain, category, created_at')
            .not('source', 'like', 'executive.%')
            .ilike('fact', `%${exec.domain}%`)
            .in('status', ['candidate', 'validated'])
            .order('created_at', { ascending: false })
            .limit(remaining);
        const domainRemainder = (domainRows || [])
            .filter(r => !exactIds.has(r.memory_id))
            .map(r => ({ layer: 9, content: r.fact, ...r }));

        return [...exactSource, ...domainRemainder];
    } catch {
        return [];
    }
}

module.exports = { recordCouncilDecision, recordDomainLessons, getDomainContext, EXEC_DOMAINS };
