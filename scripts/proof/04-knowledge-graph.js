'use strict';
require('dotenv').config();
const kg = require('../../lib/memory/knowledge-graph');

(async () => {
  let pass=0, fail=0;

  // createNode returns nodeId string directly
  const epId  = await kg.createNode('Episode','Proof episode: pipeline completed',{source:'proof',source_id:'proof-kg-001'},null,null);
  console.log(`${typeof epId==='string'?'[PASS]':'[FAIL]'} CREATE EPISODE NODE — node_id=${epId}`);
  typeof epId==='string'?pass++:fail++;

  const lesId = await kg.createNode('Lesson','Proof lesson: KG edges connect memories',{source:'proof',source_id:'proof-kg-001'},null,null);
  console.log(`${typeof lesId==='string'?'[PASS]':'[FAIL]'} CREATE LESSON NODE — node_id=${lesId}`);
  typeof lesId==='string'?pass++:fail++;

  if (epId && lesId) {
    const eid = await kg.createEdge(epId, lesId, 'GENERATED', 'proof-test', 0.9);
    console.log(`${eid!==undefined?'[PASS]':'[FAIL]'} CREATE EDGE — edgeId=${eid}`);
    eid!==undefined?pass++:fail++;

    const neighbors = await kg.getNeighbors(epId,'GENERATED','out');
    const found = neighbors.some(n=>n.to_node_id===lesId);
    console.log(`${found?'[PASS]':'[FAIL]'} GET NEIGHBORS — found=${found} count=${neighbors.length}`);
    found?pass++:fail++;
  }

  const stats = await kg.getStats();
  console.log(`${stats.totalNodes>0?'[PASS]':'[FAIL]'} KG STATS — nodes=${stats.totalNodes} edges=${stats.totalEdges}`);
  stats.totalNodes>0?pass++:fail++;

  console.log(`\nKnowledge Graph: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
