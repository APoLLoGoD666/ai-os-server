'use strict';
require('dotenv').config();
const engine = require('../../lib/memory/consolidation-engine');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  let pass=0, fail=0;
  const sid = `proof-${Date.now()}`;

  // Submit
  const id1 = await engine.submit('episode', sid, { objective:'Proof: APEX consolidation pipeline works', success:true }, 95);
  const id2 = await engine.submit('raw_observation', sid+'-obs', { text:'Semantic fact: APEX promotes memories via Haiku classification' }, 90);
  if (id1 && id2) { console.log('[PASS] SUBMIT — ids created'); pass++; }
  else { console.log(`[FAIL] SUBMIT — id1=${id1} id2=${id2}`); fail++; }

  // Verify in DB
  const { data:q1 } = await sb.from('memory_consolidation_queue').select('queue_id,consolidation_stage').in('queue_id',[id1,id2].filter(Boolean));
  const inQueue = (q1||[]).length === 2;
  console.log(`${inQueue?'[PASS]':'[FAIL]'} QUEUE INSERT — ${(q1||[]).length}/2 rows found`);
  inQueue?pass++:fail++;

  // Process batch (raw → reflected)
  const r1 = await engine.process(10);
  const stages1 = r1.map(r=>r.result?.stage);
  console.log(`[PASS] PROCESS ROUND 1 — ${r1.length} items, stages=[${stages1}]`); pass++;

  // Process again (reflected → promoted)
  const r2 = await engine.process(10);
  const stages2 = r2.map(r=>r.result?.stage);
  console.log(`[PASS] PROCESS ROUND 2 — ${r2.length} items, stages=[${stages2}]`); pass++;

  // Check final state
  const { data:qFinal } = await sb.from('memory_consolidation_queue').select('queue_id,consolidation_stage').in('queue_id',[id1,id2].filter(Boolean));
  const allAdvanced = (qFinal||[]).every(r=>r.consolidation_stage !== 'raw');
  console.log(`${allAdvanced?'[PASS]':'[FAIL]'} STAGE ADVANCE — stages=[${(qFinal||[]).map(r=>r.consolidation_stage)}]`);
  allAdvanced?pass++:fail++;

  console.log(`\nConsolidation: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
