'use strict';
// routes/civilisation.js — HTTP surface for the civilisation layer.
// Mounted at /api via app.use('/api', require('./routes/civilisation'))
// Auth: inherited from kernelChain (resolveIdentity → checkAuthority → checkGovernance)

const router  = require('express').Router();
const { Registry } = require('../lib/registry/kernel');

// ── Status ────────────────────────────────────────────────────────────────────

router.get('/civilisation/status', (req, res) => {
    try {
        const genome    = Registry.genome.validate();
        const clock     = Registry.clock.status();
        const contracts = Registry.contracts.validate();
        const domains   = Registry.domains.list();
        const consensus = Registry.consensus.status();

        res.json({
            ok: genome.ok,
            constitutional_gate: genome.ok ? 'PASS' : 'FAIL',
            genome:    { ok: genome.ok, mode: genome.mode, summary: genome.summary },
            clock:     { domains: Object.keys(clock.domains).length, generated_at: clock.generated_at },
            contracts: { ok: contracts.ok, mode: contracts.mode, summary: contracts.summary },
            domains:   { total: domains.length, migrated: domains.filter(d => d.migrated).length },
            consensus: { total: consensus.total, pending: consensus.pending, approved: consensus.approved },
            generated_at: new Date().toISOString(),
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Genome ────────────────────────────────────────────────────────────────────

router.get('/civilisation/genome', (req, res) => {
    try { res.json(Registry.genome.validate()); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilisation/genome/:domainId', (req, res) => {
    try {
        const r = Registry.genome.validateDomain(req.params.domainId);
        if (!r || r.error) return res.status(404).json({ ok: false, error: r?.error || 'not found' });
        res.json(r);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Clock ─────────────────────────────────────────────────────────────────────

router.get('/civilisation/clock', (req, res) => {
    try { res.json(Registry.clock.status()); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilisation/clock/drift', (req, res) => {
    try { res.json(Registry.clock.drift()); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilisation/clock/:domainId', (req, res) => {
    try {
        const rate = Registry.clock.tickRate(req.params.domainId);
        res.json({ ok: true, domain_id: req.params.domainId, tick_rate_per_hour: rate });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Contracts ─────────────────────────────────────────────────────────────────

router.get('/civilisation/contracts', (req, res) => {
    try { res.json(Registry.contracts.validate()); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilisation/contracts/:domainId', (req, res) => {
    try {
        const r = Registry.contracts.validateDomain(req.params.domainId);
        if (!r || r.error) return res.status(404).json({ ok: false, error: r?.error || 'not found' });
        res.json(r);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Domains ───────────────────────────────────────────────────────────────────

router.get('/civilisation/domains', (req, res) => {
    try {
        const list   = Registry.domains.list();
        const all    = Registry.domains.loadAll();
        const result = list.map(entry => {
            try {
                const dom = all[entry.name];
                const s   = dom.status();
                return { ...entry, ...s };
            } catch { return { ...entry, error: 'status unavailable' }; }
        });
        res.json({ ok: true, domains: result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilisation/domains/:name', (req, res) => {
    try {
        const dom = Registry.domains.load(req.params.name);
        if (!dom) return res.status(404).json({ ok: false, error: 'domain not found' });
        res.json({ ok: true, domain: dom.status(), entities: dom.entities(), health: dom.health() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Consensus ─────────────────────────────────────────────────────────────────

router.get('/civilisation/consensus', (req, res) => {
    try { res.json(Registry.consensus.status()); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/civilisation/consensus/:id', (req, res) => {
    try {
        const r = Registry.consensus.status(req.params.id);
        if (!r.ok) return res.status(404).json(r);
        res.json(r);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilisation/consensus/propose', (req, res) => {
    try {
        const { type, title, description, proposer_id, changes } = req.body || {};
        const r = Registry.consensus.propose({ type, title, description, proposer_id, changes });
        res.status(r.ok ? 201 : 400).json(r);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilisation/consensus/vote', (req, res) => {
    try {
        const { session_id, domain_id, decision, reason } = req.body || {};
        const r = Registry.consensus.vote(session_id, domain_id, decision, reason);
        res.status(r.ok ? 200 : 400).json(r);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/civilisation/consensus/:id/ratify', (req, res) => {
    try {
        const r = Registry.consensus.ratify(req.params.id);
        res.status(r.ok ? 200 : 400).json(r);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
