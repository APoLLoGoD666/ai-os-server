'use strict';

const express = require('express');
const router  = express.Router();
router.use(require('../lib/app-auth'));
const kg      = require('../lib/memory/knowledge-graph');

// Create a node
router.post('/nodes', async (req, res) => {
    const { nodeType, label, properties, sourceMemoryId, sourceTable } = req.body;
    if (!nodeType || !label) return res.status(400).json({ ok: false, error: 'nodeType, label required' });
    const nodeId = await kg.createNode(nodeType, label, properties || {}, sourceMemoryId, sourceTable);
    res.json({ ok: !!nodeId, nodeId });
});

// Get a specific node
router.get('/nodes/:nodeId', async (req, res) => {
    const data = await kg.getNode(req.params.nodeId);
    res.json({ ok: !!data, data });
});

// Get all nodes of a type
router.get('/nodes/type/:nodeType', async (req, res) => {
    if (!kg.VALID_NODE_TYPES.includes(req.params.nodeType)) {
        return res.status(400).json({ ok: false, error: `invalid nodeType. valid: ${kg.VALID_NODE_TYPES.join(', ')}` });
    }
    const data = await kg.getNodesByType(req.params.nodeType, parseInt(req.query.limit) || 50);
    res.json({ ok: true, data });
});

// Create an edge
router.post('/edges', async (req, res) => {
    const { fromNodeId, toNodeId, relationship, evidence, confidence } = req.body;
    if (!fromNodeId || !toNodeId || !relationship) {
        return res.status(400).json({ ok: false, error: 'fromNodeId, toNodeId, relationship required' });
    }
    const edgeId = await kg.createEdge(fromNodeId, toNodeId, relationship, evidence, confidence);
    res.json({ ok: true, edgeId });
});

// Get neighbors of a node
router.get('/nodes/:nodeId/neighbors', async (req, res) => {
    const { relationship, direction } = req.query;
    const data = await kg.getNeighbors(req.params.nodeId, relationship || null, direction || 'out');
    res.json({ ok: true, data });
});

// Find path between two nodes (BFS)
router.get('/path', async (req, res) => {
    const { from, to, maxDepth } = req.query;
    if (!from || !to) return res.status(400).json({ ok: false, error: 'from and to required' });
    const path = await kg.findPath(from, to, parseInt(maxDepth) || 5);
    res.json({ ok: true, path, found: path !== null });
});

// High-confidence subgraph
router.get('/subgraph', async (req, res) => {
    const { minConfidence, nodeLimit } = req.query;
    const data = await kg.getHighConfidenceSubgraph(
        parseFloat(minConfidence) || 0.7,
        parseInt(nodeLimit) || 100
    );
    res.json({ ok: true, data });
});

// Sync a memory object to the graph
router.post('/sync', async (req, res) => {
    const { nodeType, sourceMemoryId, sourceTable, label, properties } = req.body;
    if (!nodeType || !sourceMemoryId || !sourceTable || !label) {
        return res.status(400).json({ ok: false, error: 'nodeType, sourceMemoryId, sourceTable, label required' });
    }
    const nodeId = await kg.syncFromMemory(nodeType, sourceMemoryId, sourceTable, label, properties || {});
    res.json({ ok: !!nodeId, nodeId });
});

// Graph statistics
router.get('/stats', async (req, res) => {
    const data = await kg.getStats();
    res.json({ ok: true, data });
});

// Valid node types and relationships reference
router.get('/schema', async (req, res) => {
    res.json({
        ok:            true,
        nodeTypes:     kg.VALID_NODE_TYPES,
        relationships: kg.VALID_RELATIONSHIPS,
    });
});

module.exports = router;
