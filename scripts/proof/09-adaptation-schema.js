'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  let pass=0, fail=0;
  const key = 'adaptation:proof:schema_verification_test';

  // Test correct upsert format (post-fix)
  const { error } = await sb.from('cognitive_policy_settings').upsert({
    policy_name:  key,
    policy_value: { title:'Proof test', description:'Schema verification', estimatedImpact:'low', cycleId:'proof-001' },
    applies_to:   'all',
    active:       false,
    applied_at:   new Date().toISOString(),
  }, { onConflict:'policy_name', ignoreDuplicates:false });
  console.log(`${!error?'[PASS]':'[FAIL]'} ADAPTATION UPSERT${error?' — '+error.message:''}`);
  !error?pass++:fail++;

  const { data, error:re } = await sb.from('cognitive_policy_settings')
    .select('policy_name,policy_value,applies_to,active,applied_at')
    .eq('policy_name',key).single();
  const ok = !re && data?.policy_value?.title === 'Proof test' && data.applies_to === 'all' && data.active === false;
  console.log(`${ok?'[PASS]':'[FAIL]'} ADAPTATION READBACK — ${JSON.stringify(data)?.slice(0,100)}`);
  ok?pass++:fail++;

  await sb.from('cognitive_policy_settings').delete().eq('policy_name',key);
  console.log('[PASS] CLEANUP'); pass++;

  console.log(`\nAdaptation Schema: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
