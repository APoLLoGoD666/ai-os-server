'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  'episodic_memory','working_memory','semantic_memory','apex_lessons',
  'reflexion_records','improvement_candidates','knowledge_graph_nodes',
  'knowledge_graph_edges','memory_consolidation_queue','knowledge_validation_queue',
  'cognitive_policy_settings','adaptation_cycles','apex_sync_checkpoints',
  'executive_roles','executive_verdicts','strategic_memory',
  'apex_notifications','agent_tasks',
];

(async () => {
  let pass=0,fail=0;
  for (const t of TABLES) {
    const { count, error } = await sb.from(t).select('*',{count:'exact',head:true});
    const ok = !error;
    console.log(`${ok?'[PASS]':'[FAIL]'} TABLE ${t}${ok?' ('+count+' rows)':' — '+error.message}`);
    ok?pass++:fail++;
  }
  console.log(`\nTables: ${pass}/${TABLES.length} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
