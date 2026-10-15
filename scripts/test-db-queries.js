require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CONV_ID = process.argv[2] || 'synthetic-test-1782867729786';

async function main() {
  console.log('=== Test 3: memory_consolidation_queue ===');
  const { data: cq, error: cqErr } = await sb.from('memory_consolidation_queue')
    .select('queue_id, source_type, source_id, consolidation_stage, priority, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (cqErr) console.log('FAIL error:', cqErr.message);
  else {
    console.log('total rows (last 10):', cq.length);
    const episodeRows = cq.filter(r => r.source_type === 'episode');
    console.log('episode rows:', episodeRows.length);
    const convRows = cq.filter(r => r.source_id?.includes('synthetic-test'));
    console.log('synthetic-test rows:', convRows.length);
    console.log('latest 3:', JSON.stringify(cq.slice(0,3), null, 2));
  }

  console.log('\n=== Test 4: knowledge_validation_queue ===');
  const { data: kvq, error: kvqErr } = await sb.from('knowledge_validation_queue')
    .select('validation_id, lesson_text, source_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (kvqErr) console.log('FAIL error:', kvqErr.message);
  else {
    console.log('total rows:', kvq.length);
    const chatRows = kvq.filter(r => r.source_type === 'chat_exchange');
    console.log('chat_exchange rows:', chatRows.length);
    console.log('latest 3:', JSON.stringify(kvq.slice(0,3), null, 2));
  }

  console.log('\n=== Test 5: episodic_memory ===');
  const { data: em, error: emErr } = await sb.from('episodic_memory')
    .select('memory_id, objective, success, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (emErr) console.log('FAIL error:', emErr.message);
  else {
    console.log('rows:', em.length);
    console.log('latest:', JSON.stringify(em.slice(0,2), null, 2));
  }

  console.log('\n=== Test 8: knowledge_graph_nodes + edges ===');
  const [nodesRes, edgesRes] = await Promise.all([
    sb.from('knowledge_graph_nodes').select('node_id, label, node_type, source_table, created_at').order('created_at', { ascending: false }).limit(10),
    sb.from('knowledge_graph_edges').select('edge_id, from_node_id, to_node_id, relationship, confidence').order('created_at', { ascending: false }).limit(10),
  ]);
  if (nodesRes.error) console.log('nodes FAIL:', nodesRes.error.message);
  else console.log('KG Nodes:', nodesRes.data.length, 'latest:', JSON.stringify(nodesRes.data.slice(0,3), null, 2));
  if (edgesRes.error) console.log('edges FAIL:', edgesRes.error.message);
  else console.log('KG Edges:', edgesRes.data.length, 'latest:', JSON.stringify(edgesRes.data.slice(0,3), null, 2));

  console.log('\n=== Test 9: cognitive_policy_settings (adaptation:) ===');
  const { data: cps, error: cpsErr } = await sb.from('cognitive_policy_settings')
    .select('policy_name, policy_value, applies_to, active, applied_at')
    .ilike('policy_name', 'adaptation:%')
    .order('applied_at', { ascending: false })
    .limit(5);
  if (cpsErr) console.log('FAIL error:', cpsErr.message);
  else {
    console.log('rows:', cps.length);
    if (cps.length > 0) {
      const allValid = cps.every(r => r.policy_value !== null && r.applies_to === 'all');
      console.log('all have policy_value non-null:', cps.every(r => r.policy_value !== null));
      console.log('all applies_to=all:', cps.every(r => r.applies_to === 'all'));
      console.log('sample:', JSON.stringify(cps[0], null, 2));
    }
  }

  console.log('\n=== Test 10: apex_sync_checkpoints (temporal:) ===');
  const { data: asc, error: ascErr } = await sb.from('apex_sync_checkpoints')
    .select('key, value, updated_at')
    .ilike('key', 'temporal:%')
    .limit(5);
  if (ascErr) console.log('FAIL error:', ascErr.message);
  else {
    console.log('rows:', asc.length);
    console.log(JSON.stringify(asc, null, 2));
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
