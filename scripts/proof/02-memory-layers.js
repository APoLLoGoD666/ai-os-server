'use strict';
require('dotenv').config();
const gateway = require('../../lib/memory/gateway');

const tid = `proof-${Date.now()}`;

async function w(layer, content, label, extra={}) {
  try {
    const r = await gateway.storeMemory({ layer, content, source:`proof-L${layer}`, taskId:tid, requestingEntity:'orchestrator', ...extra });
    console.log(`[PASS] L${layer} ${label} WRITE — ${JSON.stringify(r)?.slice(0,60)}`);
    return true;
  } catch(e) {
    console.log(`[FAIL] L${layer} ${label} WRITE — ${e.message}`);
    return false;
  }
}

(async () => {
  let pass=0, fail=0;
  const results = await Promise.allSettled([
    w(1,  'proof working memory entry', 'Working Memory'),
    w(2,  JSON.stringify({objective:'proof episode',success:true}), 'Episodic', {outcome:true}),
    w(3,  'proof procedure: run smoke tests before deploy', 'Procedural'),
    w(4,  'proof association: APEX links lessons to episodes', 'Associative'),
    w(5,  'proof strategic direction: reliability over speed', 'Strategic'),
    w(6,  'proof skill: chat response generation', 'Skill'),
    w(7,  'proof decision: use Supabase for persistence', 'Decision'),
    w(8,  'proof KG node: APEX AI OS architecture', 'KnowledgeGraph'),
    w(9,  'proof semantic fact: APEX uses 13-layer memory', 'Semantic'),
    w(10, 'proof lesson: always validate column names before upsert', 'Lessons'),
    w(11, 'proof reflexion: COO veto is now blocking', 'Reflexion'),
    w(12, 'proof improvement: add dynamic task router', 'Improvement'),
  ]);
  results.forEach(r => r.value ? pass++ : fail++);

  // L0 read
  try {
    const ctx = await gateway.retrieveFounderContext({requestingEntity:'orchestrator'});
    console.log(`[PASS] L0 Founder READ — keys=${Object.keys(ctx||{}).slice(0,5).join(',')}`);
    pass++;
  } catch(e) { console.log(`[FAIL] L0 Founder READ — ${e.message}`); fail++; }

  // getContext package
  try {
    const ctx = await gateway.getContext({taskId:tid, description:'proof test architecture strategy knowledge graph', category:'general', complexity:'standard', requestingEntity:'orchestrator'});
    const checks = {
      'layers_queried ≥11': ctx.assembly_metadata.layers_queried.length >= 11,
      'has working_memory': Array.isArray(ctx.working_memory),
      'has skill_context':  Array.isArray(ctx.skill_context),
      'has knowledge_nodes':Array.isArray(ctx.knowledge_nodes),
      'has lessons':        Array.isArray(ctx.lessons),
      'has semantic_facts': Array.isArray(ctx.semantic_facts),
      'has founder_context':!!ctx.founder_context,
      'has constraints':    !!ctx.constraints?.cost_cap_usd,
    };
    for (const [k,v] of Object.entries(checks)) {
      console.log(`${v?'[PASS]':'[FAIL]'} getContext: ${k}`);
      v?pass++:fail++;
    }
  } catch(e) { console.log(`[FAIL] getContext — ${e.message}`); fail++; }

  // searchMemory cross-layer
  try {
    const res = await gateway.searchMemory({query:'proof', layers:[1,2,9,10], limit:10, requestingEntity:'orchestrator'});
    console.log(`[PASS] searchMemory — ${res.length} results, layers=[${[...new Set(res.map(r=>r.layer))]}]`);
    pass++;
  } catch(e) { console.log(`[FAIL] searchMemory — ${e.message}`); fail++; }

  console.log(`\nMemory layers: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
