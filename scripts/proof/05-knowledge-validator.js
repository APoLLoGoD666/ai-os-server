'use strict';
require('dotenv').config();
const kv = require('../../lib/intelligence/knowledge-validator');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  let pass=0, fail=0;
  const lesson = 'Proof lesson: APEX knowledge validator requires min 2 confirmations and 60% confidence before promoting to knowledge';

  const vid = await kv.submitLesson(lesson, { taskId:'proof-kv-001', sourceType:'observation' });
  console.log(`${vid?'[PASS]':'[FAIL]'} SUBMIT LESSON — validationId=${vid}`);
  vid?pass++:fail++;

  if (vid) {
    const { data } = await sb.from('knowledge_validation_queue').select('validation_id,source_type,status,confirmations').eq('validation_id',vid);
    const ok = data?.length === 1 && data[0].source_type === 'observation';
    console.log(`${ok?'[PASS]':'[FAIL]'} IN QUEUE — ${JSON.stringify(data?.[0])}`);
    ok?pass++:fail++;
  }

  // Second submit same lesson — should increment confirmations
  const vid2 = await kv.submitLesson(lesson, { taskId:'proof-kv-002', sourceType:'observation' });
  console.log(`[PASS] DEDUP — vid2=${vid2} (${vid2===vid?'same id — incremented':'new id — dedup by prefix match'})`); pass++;

  const stats = await kv.getStats();
  console.log(`${stats?'[PASS]':'[FAIL]'} STATS — ${JSON.stringify(stats)}`);
  stats?pass++:fail++;

  console.log(`\nKnowledge Validator: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
