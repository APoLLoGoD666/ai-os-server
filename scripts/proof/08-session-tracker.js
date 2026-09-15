'use strict';
require('dotenv').config();
const tracker = require('../../lib/temporal/session-tracker');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  let pass=0, fail=0;
  const cid = `proof-session-${Date.now()}`;

  await tracker.recordMessage(cid);
  console.log('[PASS] RECORD MESSAGE'); pass++;

  const { data } = await sb.from('apex_sync_checkpoints').select('key,value,updated_at').eq('key','temporal:last_message_at');
  const ok = data?.length > 0;
  console.log(`${ok?'[PASS]':'[FAIL]'} CHECKPOINT WRITTEN — ${JSON.stringify(data?.[0])?.slice(0,80)}`);
  ok?pass++:fail++;

  // Force old timestamp to trigger gap detection
  await sb.from('apex_sync_checkpoints').upsert({
    key:'temporal:last_message_at',
    value: JSON.stringify({ conversationId:'old-session', ts: new Date(Date.now()-3*60*60*1000).toISOString() }),
    updated_at: new Date(Date.now()-3*60*60*1000).toISOString(),
  }, { onConflict:'key' });

  const ctx = await tracker.getSessionContext(cid);
  console.log(`${ctx!==null?'[PASS]':'[FAIL]'} GAP DETECTION — ${ctx?`gap=${Math.round(ctx.gapMs/60000)}min lastSession=${ctx.lastSessionAt}`:'no gap detected'}`);
  ctx!==null?pass++:fail++;

  if (ctx) {
    const line = tracker.formatForPrompt(ctx);
    console.log(`${line.length>10?'[PASS]':'[FAIL]'} FORMAT PROMPT — "${line}"`);
    line.length>10?pass++:fail++;
  }

  // formatForPrompt(null) safety
  const safe = tracker.formatForPrompt(null);
  console.log(`${safe===''||safe===undefined?'[PASS]':'[FAIL]'} NULL SAFETY — returns "${safe}"`);
  (safe===''||safe===undefined)?pass++:fail++;

  await tracker.recordMessage(cid);
  console.log(`\nSession Tracker: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
