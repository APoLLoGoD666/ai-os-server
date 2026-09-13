'use strict';

// Layer 8: Knowledge Graph
// Nodes and edges for relationship intelligence.
// Nodes: Goal, Project, Task, Episode, Lesson, Skill, Decision, Procedure, Incident, Knowledge, Certification, Pattern
// Relationships: CAUSED, GENERATED, SUPPORTS, IMPROVES, DERIVED_FROM, SOLVES, CONTRIBUTES_TO,
//                SUPERSEDES, VALIDATES, CONTRADICTS, RELATES_TO
// Synced to Graphify as secondary interface. Postgres is source of truth.

const { getSupabaseClient }   = require('../clients');
const { generateMemoryId }    = require('./memory-governor');
const { randomUUID }          = require('crypto');

function _sb() { return getSupabaseClient(); }

const VALID_NODE_TYPES = ['Goal','Project','Task','Episode','Lesson','Skill','Decision','Procedure','Incident','Knowledge','Certification','Pattern'];
const VALID_RELATIONSHIPS = ['CAUSED','GENERATED','SUPPORTS','IMPROVES','DERIVED_FROM','SOLVES','CONTRIBUTES_TO','SUPERSEDES','VALIDATES','CONTRADICTS','RELATES_TO'];

// Create a knowledge graph node.
// Returns nodeId (e.g., 'kgn-ep-abc123') or null on failure.
async function createNode(nodeType, label, properties = {}, sourceMemoryId = null, sourceTable = null) {
    if (!VALID_NODE_TYPES.includes(nodeType)) {
        console.warn(`[knowledge-graph] invalid node type: ${nodeType}`);
        return null;
    }
    const nodeId   = generateMemoryId('node');
    const confidence = properties.confidence ?? 0.5;
    try {
        const { error } = await _sb().from('knowledge_graph_nodes').insert({
            node_id:          nodeId,
            node_type:        nodeType,
            label:            label.slice(0, 500),
            properties:       { ...properties, confidence: undefined },
            source_memory_id: sourceMemoryId,
            source_table:     sourceTable,
            confidence,
            status:           'active',
        });
        if (error) throw error;
        return nodeId;
    } catch (e) {
        console.error(`[knowledge-graph] createNode failed: ${e.message}`);
        return null;
    }
}

// Create an edge between two nodes. Idempotent by (from, to, relationship).
async function createEdge(fromNodeId, toNodeId, relationship, evidence = null, confidence = 0.5) {
    if (!VALID_RELATIONSHIPS.includes(relationship)) {
        console.warn(`[knowledge-graph] invalid relationship: ${relationship}`);
        return null;
    }
    const edgeId = generateMemoryId('edge');
    try {
        const { error } = await _sb().from('knowledge_graph_edges')
            .upsert({
                edge_id:      edgeId,
                from_node_id: fromNodeId,
                to_node_id:   toNodeId,
                relationship,
                evidence,
                confidence,
                weight:       confidence,
            }, { onConflict: 'from_node_id,to_node_id,relationship', ignoreDuplicates: true });
        if (error) throw error;
        return edgeId;
    } catch (e) {
        // Duplicate is not an error
        if (e.message?.includes('duplicate') || e.code === '23505') return null;
        console.error(`[knowledge-graph] createEdge failed: ${e.message}`);
        return null;
    }
}

// Get all neighbors of a node (outgoing by default, or incoming with direction='in').
async function getNeighbors(nodeId, relationship = null, direction = 'out') {
    try {
        let q;
        if (direction === 'out') {
            q = _sb().from('knowledge_graph_edges')
                .select('edge_id, to_node_id, relationship, confidence, weight')
                .eq('from_node_id', nodeId);
        } else {
            q = _sb().from('knowledge_graph_edges')
                .select('edge_id, from_node_id, relationship, confidence, weight')
                .eq('to_node_id', nodeId);
        }
        if (relationship) q = q.eq('relationship', relationship);
        const { data, error } = await q.order('confidence', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[knowledge-graph] getNeighbors failed: ${e.message}`);
        return [];
    }
}

// BFS path finding between two nodes. Returns path as array of nodeIds or null.
async function findPath(fromNodeId, toNodeId, maxDepth = 5) {
    try {
        const visited   = new Set([fromNodeId]);
        const queue     = [[fromNodeId, [fromNodeId]]];
        let depth       = 0;

        while (queue.length > 0 && depth < maxDepth) {
            const [current, path] = queue.shift();
            const neighbors = await getNeighbors(current);
            depth = path.length;

            for (const n of neighbors) {
                const nextId = n.to_node_id;
                if (nextId === toNodeId) return [...path, nextId];
                if (!visited.has(nextId) && path.length < maxDepth) {
                    visited.add(nextId);
                    queue.push([nextId, [...path, nextId]]);
                }
            }
        }
        return null;
    } catch (e) {
        console.error(`[knowledge-graph] findPath failed: ${e.message}`);
        return null;
    }
}

// Get a node by ID with its properties.
async function getNode(nodeId) {
    try {
        const { data, error } = await _sb().from('knowledge_graph_nodes')
            .select('*')
            .eq('node_id', nodeId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    } catch (e) {
        console.error(`[knowledge-graph] getNode failed: ${e.message}`);
        return null;
    }
}

// Get all nodes of a type — for graph overview.
async function getNodesByType(nodeType, limit = 50) {
    try {
        const { data, error } = await _sb().from('knowledge_graph_nodes')
            .select('node_id, label, properties, confidence, created_at')
            .eq('node_type', nodeType)
            .eq('status', 'active')
            .order('confidence', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[knowledge-graph] getNodesByType failed: ${e.message}`);
        return [];
    }
}

// High-confidence subgraph — nodes and edges above a confidence threshold.
async function getHighConfidenceSubgraph(minConfidence = 0.7, nodeLimit = 100) {
    try {
        const { data: nodes, error: ne } = await _sb().from('knowledge_graph_nodes')
            .select('node_id, node_type, label, confidence')
            .eq('status', 'active')
            .gte('confidence', minConfidence)
            .order('confidence', { ascending: false })
            .limit(nodeLimit);
        if (ne) throw ne;

        const nodeIds = (nodes || []).map(n => n.node_id);
        if (nodeIds.length === 0) return { nodes: [], edges: [] };

        const { data: edges, error: ee } = await _sb().from('knowledge_graph_edges')
            .select('edge_id, from_node_id, to_node_id, relationship, confidence')
            .in('from_node_id', nodeIds)
            .in('to_node_id', nodeIds)
            .gte('confidence', minConfidence);
        if (ee) throw ee;

        return { nodes: nodes || [], edges: edges || [] };
    } catch (e) {
        console.error(`[knowledge-graph] getHighConfidenceSubgraph failed: ${e.message}`);
        return { nodes: [], edges: [] };
    }
}

// Auto-create node from memory write — called by consolidation engine.
// Idempotent: if node for sourceMemoryId already exists, returns existing nodeId.
async function syncFromMemory(nodeType, sourceMemoryId, sourceTable, label, properties = {}) {
    try {
        // Check if node already exists for this memory object
        const { data: existing } = await _sb().from('knowledge_graph_nodes')
            .select('node_id')
            .eq('source_memory_id', sourceMemoryId)
            .eq('source_table', sourceTable)
            .single();
        if (existing) return existing.node_id;
        return createNode(nodeType, label, properties, sourceMemoryId, sourceTable);
    } catch (e) {
        if (e.code === 'PGRST116') {
            return createNode(nodeType, label, properties, sourceMemoryId, sourceTable);
        }
        console.error(`[knowledge-graph] syncFromMemory failed: ${e.message}`);
        return null;
    }
}

// Graph statistics — total nodes, edges, breakdown by type.
async function getStats() {
    try {
        const [nodesRes, edgesRes] = await Promise.all([
            _sb().from('knowledge_graph_nodes').select('node_type').eq('status', 'active'),
            _sb().from('knowledge_graph_edges').select('relationship'),
        ]);
        const nodesByType = {};
        for (const n of (nodesRes.data || [])) {
            nodesByType[n.node_type] = (nodesByType[n.node_type] || 0) + 1;
        }
        const edgesByRel = {};
        for (const e of (edgesRes.data || [])) {
            edgesByRel[e.relationship] = (edgesByRel[e.relationship] || 0) + 1;
        }
        return {
            totalNodes: (nodesRes.data || []).length,
            totalEdges: (edgesRes.data || []).length,
            nodesByType,
            edgesByRelationship: edgesByRel,
        };
    } catch (e) {
        console.error(`[knowledge-graph] getStats failed: ${e.message}`);
        return { totalNodes: 0, totalEdges: 0, nodesByType: {}, edgesByRelationship: {} };
    }
}

module.exports = {
    createNode, createEdge, getNeighbors, findPath, getNode,
    getNodesByType, getHighConfidenceSubgraph, syncFromMemory, getStats,
    VALID_NODE_TYPES, VALID_RELATIONSHIPS,
};
