require('dotenv').config();
const gateway = require('../lib/memory/gateway');

async function main() {
  const ctx = await gateway.getContext({
    taskId: 'synthetic-test-001',
    description: 'test memory architecture',
    category: 'general',
    complexity: 'standard',
    requestingEntity: 'orchestrator',
  });
  console.log('layers_queried:', ctx.assembly_metadata?.layers_queried);
  console.log('has working_memory:', Array.isArray(ctx.working_memory));
  console.log('has skill_context:', Array.isArray(ctx.skill_context));
  console.log('has knowledge_nodes:', Array.isArray(ctx.knowledge_nodes));
  console.log('has lessons:', Array.isArray(ctx.lessons));
  console.log('has semantic_facts:', Array.isArray(ctx.semantic_facts));
  console.log('has founder_context:', !!ctx.founder_context);
  console.log('top-level keys:', Object.keys(ctx).join(', '));
}
main().catch(e => { console.error(e.message); process.exit(1); });
