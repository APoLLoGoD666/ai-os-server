'use strict';
require('dotenv').config();
const rfx = require('../../lib/memory/reflexion-tracker');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  let pass=0, fail=0;
  const lesson = 'Proof reflexion: COO veto is now blocking — setImmediate removed';

  const rec = await rfx.createReflexion(lesson, null, `proof-rfx-${Date.now()}`);
  console.log(`${rec?'[PASS]':'[FAIL]'} CREATE REFLEXION — ${JSON.stringify(rec)?.slice(0,80)}`);
  rec?pass++:fail++;

  const ret = await rfx.recordRetrieval(lesson);
  console.log(`${ret!==false?'[PASS]':'[FAIL]'} RECORD RETRIEVAL`);
  ret!==false?pass++:fail++;

  const { data } = await sb.from('reflexion_records')
    .select('reflexion_id,lesson_text,retrieval_count,status')
    .ilike('lesson_text','%COO veto is now blocking%')
    .order('created_at',{ascending:false}).limit(1);
  console.log(`${data?.length>0?'[PASS]':'[FAIL]'} DB RECORD — ${JSON.stringify(data?.[0])?.slice(0,100)}`);
  data?.length>0?pass++:fail++;

  console.log(`\nReflexion Tracker: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
