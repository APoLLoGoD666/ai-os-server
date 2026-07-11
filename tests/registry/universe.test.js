'use strict';
// Phases A+B — Entity Universe: DOM-*, AGT-*, SVC-* entities + ownership discovery.

const assert = require('assert');
const { test, suite } = require('./_runner');

const engine = require('../../lib/registry/engine');
const rels   = require('../../lib/registry/relationships');

module.exports = async function run() {
    await suite('Domain entities (DOM-*)', async () => {
        await test('ten DOM-* domains are registered', () => {
            const domains = engine.find({ family: 'DOMAIN' });
            assert.strictEqual(domains.length, 10, `expected 10 domains, got ${domains.length}`);
        });

        await test('all domains have required fields', () => {
            for (const d of engine.find({ family: 'DOMAIN' })) {
                assert(d.id.startsWith('DOM-'), `bad id: ${d.id}`);
                assert(d.name, `domain missing name: ${d.id}`);
                assert(d.criticality, `domain missing criticality: ${d.id}`);
                assert(d.owner, `domain missing owner: ${d.id}`);
                assert(d._domain_key, `domain missing _domain_key: ${d.id}`);
            }
        });

        await test('DOM-000001 is Civilisation (root domain)', () => {
            const d = engine.lookup('DOM-000001');
            assert(d, 'DOM-000001 should exist');
            assert.strictEqual(d.name, 'Civilisation');
            assert.strictEqual(d.criticality, 'CRITICAL');
        });

        await test('DOM-000003 is Registry', () => {
            const d = engine.lookup('DOM-000003');
            assert(d);
            assert.strictEqual(d.name, 'Registry');
        });

        await test('engine.find({ family: DOMAIN }) returns all domains', () => {
            const domains = engine.find({ family: 'DOMAIN' });
            assert(domains.length >= 10);
        });

        await test('domain entities are frozen', () => {
            const d = engine.lookup('DOM-000001');
            assert(Object.isFrozen(d), 'domain entity should be frozen');
        });

        await test('domain → domain edges exist (e.g. DOM-000002 depends_on DOM-000003)', () => {
            const edges = rels.relationsOf('DOM-000002');
            assert(Array.isArray(edges));
            const dep = edges.find(e => e.to === 'DOM-000003' && e.type === 'depends_on');
            assert(dep, 'Intelligence should depend_on Registry');
        });
    });

    await suite('Agent entities (AGT-*)', async () => {
        await test('five AGT-* agents are registered', () => {
            const agents = engine.find({ family: 'AGENT' });
            assert.strictEqual(agents.length, 5, `expected 5 agents, got ${agents.length}`);
        });

        await test('all agents have required fields', () => {
            for (const a of engine.find({ family: 'AGENT' })) {
                assert(a.id.startsWith('AGT-'), `bad id: ${a.id}`);
                assert(a.name, `agent missing name: ${a.id}`);
                assert(a.purpose, `agent missing purpose: ${a.id}`);
                assert(a._agent_key, `agent missing _agent_key: ${a.id}`);
                assert(a._domain, `agent missing _domain: ${a.id}`);
            }
        });

        await test('AGT-000001 is System Agent', () => {
            const a = engine.lookup('AGT-000001');
            assert(a, 'AGT-000001 should exist');
            assert(a.name.toLowerCase().includes('system'), `unexpected name: ${a.name}`);
        });

        await test('each agent belongs_to a domain', () => {
            for (const a of engine.find({ family: 'AGENT' })) {
                const edges = rels.relationsOf(a.id);
                const belongs = edges.find(e => e.type === 'belongs_to');
                assert(belongs, `agent ${a.id} should have belongs_to edge to its domain`);
            }
        });

        await test('agent entities are frozen', () => {
            const a = engine.lookup('AGT-000001');
            assert(Object.isFrozen(a), 'agent entity should be frozen');
        });
    });

    await suite('Service entities (SVC-*)', async () => {
        await test('eight SVC-* services are registered', () => {
            const svcs = engine.find({ family: 'SERVICE' });
            assert.strictEqual(svcs.length, 8, `expected 8 services, got ${svcs.length}`);
        });

        await test('all services have required fields', () => {
            for (const s of engine.find({ family: 'SERVICE' })) {
                assert(s.id.startsWith('SVC-'), `bad id: ${s.id}`);
                assert(s.name, `service missing name: ${s.id}`);
                assert(s.criticality, `service missing criticality: ${s.id}`);
                assert(s._service_key, `service missing _service_key: ${s.id}`);
            }
        });

        await test('SVC-000001 is Supabase (CRITICAL)', () => {
            const s = engine.lookup('SVC-000001');
            assert(s, 'SVC-000001 should exist');
            assert.strictEqual(s.name, 'Supabase');
            assert.strictEqual(s.criticality, 'CRITICAL');
        });

        await test('SVC-000003 is Anthropic Claude API', () => {
            const s = engine.lookup('SVC-000003');
            assert(s);
            assert(s.name.includes('Anthropic') || s.name.includes('Claude'));
        });
    });

    await suite('Universe query intents', async () => {
        await test('domain.list returns 10 domains', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('domain.list', {});
            assert.strictEqual(r.ok, true, r.error);
            assert.strictEqual(r.result.count, 10);
        });

        await test('domain.entity returns DOM-000003 (Registry)', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('domain.entity', { id: 'DOM-000003' });
            assert.strictEqual(r.ok, true, r.error);
            assert.strictEqual(r.result.name, 'Registry');
            assert(Array.isArray(r.result.agents));
        });

        await test('domain.health returns health for all domains', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('domain.health', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(Array.isArray(r.result.domains));
            assert.strictEqual(r.result.domains.length, 10);
        });

        await test('domain.graph returns domain nodes and edges', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('domain.graph', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(Array.isArray(r.result.nodes));
            assert(Array.isArray(r.result.edges));
            assert(r.result.edges.length > 0, 'should have domain-to-domain edges');
        });

        await test('agent.list returns 5 agents', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('agent.list', {});
            assert.strictEqual(r.ok, true, r.error);
            assert.strictEqual(r.result.count, 5);
        });

        await test('agent.status returns AGT-000001 detail', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('agent.status', { id: 'AGT-000001' });
            assert.strictEqual(r.ok, true, r.error);
            assert(r.result.id.startsWith('AGT-'));
        });

        await test('agent.capabilities returns capability listing', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('agent.capabilities', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(Array.isArray(r.result));
            assert.strictEqual(r.result.length, 5);
        });
    });

    await suite('Observatory intents', async () => {
        await test('observatory.topology returns node + edge graph', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('observatory.topology', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(r.result.node_count > 0);
            assert(Array.isArray(r.result.nodes));
            assert(Array.isArray(r.result.edges));
        });

        await test('observatory.health_matrix returns summary with counts', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('observatory.health_matrix', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.summary.healthy === 'number');
            assert(typeof r.result.total === 'number');
        });

        await test('observatory.timeline returns recent events', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('observatory.timeline', { limit: 10 });
            assert.strictEqual(r.ok, true, r.error);
            assert(Array.isArray(r.result.events));
        });

        await test('observatory.fitness returns fitness check results', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('observatory.fitness', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(typeof r.result.pass  === 'number');
            assert(typeof r.result.fail  === 'number');
            assert(typeof r.result.total === 'number');
            assert(Array.isArray(r.result.checks));
        });
    });

    await suite('Constitutional Engine', async () => {
        await test('constitution.laws returns array of laws', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('constitution.laws', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(Array.isArray(r.result.laws));
            assert(r.result.laws.length >= 5, `expected >= 5 laws, got ${r.result.laws.length}`);
            assert(typeof r.result.hash === 'string', 'should have constitutional hash');
        });

        await test('constitution hash is stable across calls', () => {
            const constitution = require('../../lib/registry/constitution');
            const h1 = constitution.hash();
            const h2 = constitution.hash();
            assert.strictEqual(h1, h2, 'constitutional hash must be deterministic');
        });

        await test('constitution.check with safe operation returns ok:true', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('constitution.check', { operation: 'entity.read', context: '{}' });
            assert.strictEqual(r.ok, true, r.error);
            assert.strictEqual(r.result.ok, true, 'a read operation should not violate any law');
        });

        await test('constitution.check with LAW-001 threshold triggers violation', () => {
            const constitution = require('../../lib/registry/constitution');
            const r = constitution.check('entity.delete', { blast_radius: { total: 20 } });
            assert.strictEqual(r.ok, false, 'should flag violation when blast_radius >= 10');
            assert(r.violations.length > 0);
            assert(r.violations.some(v => v.law === 'LAW-001'));
        });

        await test('constitution.check LAW-002 blocks agent code edit', () => {
            const constitution = require('../../lib/registry/constitution');
            const r = constitution.check('code.edit', { agent: 'system_agent' });
            assert.strictEqual(r.ok, false, 'agent code.edit should be blocked by LAW-002');
            assert(r.violations.some(v => v.law === 'LAW-002'));
        });
    });

    await suite('Temporal Cognition', async () => {
        await test('track() and trajectory() work correctly', () => {
            const tc = require('../../lib/registry/temporal-cognition');
            tc.track('TEST-001', 80);
            tc.track('TEST-001', 75);
            tc.track('TEST-001', 70);
            const traj = tc.trajectory('TEST-001');
            assert(Array.isArray(traj));
            assert(traj.length >= 3);
            assert(traj.every(p => typeof p.score === 'number'));
        });

        await test('trend() returns trend object with slope and label', () => {
            const tc = require('../../lib/registry/temporal-cognition');
            const t  = tc.trend('TEST-001');
            assert(typeof t.slope   === 'number');
            assert(typeof t.trend   === 'string');
            assert(typeof t.current === 'number');
            assert(['improving', 'stable', 'degrading'].includes(t.trend));
        });

        await test('predict() returns forward projections', () => {
            const tc = require('../../lib/registry/temporal-cognition');
            const p  = tc.predict('TEST-001', 3);
            assert(Array.isArray(p));
            assert.strictEqual(p.length, 3);
            assert(p.every(x => typeof x.predicted_score === 'number'));
        });

        await test('declining series is labelled degrading', () => {
            const tc = require('../../lib/registry/temporal-cognition');
            for (let i = 0; i < 10; i++) tc.track('DECLINE-TEST', 90 - i * 5);
            const t = tc.trend('DECLINE-TEST');
            assert.strictEqual(t.trend, 'degrading', 'sharply declining scores should be "degrading"');
        });

        await test('summary() lists all tracked entities', () => {
            const tc = require('../../lib/registry/temporal-cognition');
            const s  = tc.summary();
            assert(Array.isArray(s));
            assert(s.some(e => e.id === 'TEST-001'));
        });

        await test('observatory.evolution returns trajectory data', () => {
            const { query } = require('../../lib/registry/query');
            const r = query('observatory.evolution', {});
            assert.strictEqual(r.ok, true, r.error);
            assert(Array.isArray(r.result.trajectories));
            assert(Array.isArray(r.result.anomalies));
        });
    });

    await suite('Registry kernel — new surfaces', async () => {
        await test('Registry.observatory is exposed', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.observatory.topology      === 'function');
            assert(typeof Registry.observatory.healthMatrix  === 'function');
            assert(typeof Registry.observatory.eventTimeline === 'function');
            assert(typeof Registry.observatory.fitnessCheck  === 'function');
        });

        await test('Registry.constitution is exposed', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.constitution.laws  === 'function');
            assert(typeof Registry.constitution.hash  === 'function');
            assert(typeof Registry.constitution.check === 'function');
        });

        await test('Registry.temporal is exposed', () => {
            const { Registry } = require('../../lib/registry/kernel');
            assert(typeof Registry.temporal.track      === 'function');
            assert(typeof Registry.temporal.trend      === 'function');
            assert(typeof Registry.temporal.predict    === 'function');
            assert(typeof Registry.temporal.anomalies  === 'function');
        });
    });
};
