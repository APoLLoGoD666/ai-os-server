'use strict';
const fs   = require('fs');
const path = require('path');
const VAULT = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';
const CS249R = path.join(VAULT, '09 Knowledge/CS249R');

// Semantic chapter clusters for cross-linking
// Maps each chapter filename (no .md) to its cluster and related chapters
const CHAPTER_RELATIONS = {
  // Vol 1
  'vol1/introduction':       { cluster: 'foundations',   related: ['vol1/ml_systems', 'vol1/ml_workflow', 'vol1/nn_architectures'] },
  'vol1/ml_systems':         { cluster: 'foundations',   related: ['vol1/introduction', 'vol1/ml_workflow', 'vol1/nn_computation'] },
  'vol1/ml_workflow':        { cluster: 'foundations',   related: ['vol1/introduction', 'vol1/ml_systems', 'vol1/training', 'vol1/data_engineering'] },
  'vol1/nn_architectures':   { cluster: 'neural-nets',   related: ['vol1/nn_computation', 'vol1/training', 'vol1/introduction'] },
  'vol1/nn_computation':     { cluster: 'neural-nets',   related: ['vol1/nn_architectures', 'vol1/training', 'vol1/hw_acceleration'] },
  'vol1/training':           { cluster: 'neural-nets',   related: ['vol1/nn_computation', 'vol1/nn_architectures', 'vol1/data_engineering', 'vol2/distributed_training'] },
  'vol1/data_engineering':   { cluster: 'practical',     related: ['vol1/ml_workflow', 'vol1/training', 'vol2/data_storage'] },
  'vol1/frameworks':         { cluster: 'practical',     related: ['vol1/data_engineering', 'vol1/model_compression', 'vol1/model_serving'] },
  'vol1/benchmarking':       { cluster: 'practical',     related: ['vol1/model_serving', 'vol2/performance_engineering', 'vol2/inference'] },
  'vol1/model_compression':  { cluster: 'practical',     related: ['vol1/model_serving', 'vol1/frameworks', 'vol2/inference'] },
  'vol1/model_serving':      { cluster: 'practical',     related: ['vol1/model_compression', 'vol1/benchmarking', 'vol2/inference', 'vol2/ops_scale'] },
  'vol1/hw_acceleration':    { cluster: 'infrastructure',related: ['vol1/nn_computation', 'vol2/compute_infrastructure', 'vol2/network_fabrics'] },
  'vol1/ml_ops':             { cluster: 'practical',     related: ['vol1/ml_workflow', 'vol2/ops_scale', 'vol2/fault_tolerance'] },
  'vol1/responsible_engr':   { cluster: 'responsible',   related: ['vol2/responsible_ai', 'vol2/security_privacy', 'vol2/sustainable_ai'] },
  // Vol 2
  'vol2/distributed_training':   { cluster: 'distributed', related: ['vol2/collective_communication', 'vol2/fault_tolerance', 'vol1/training', 'vol2/compute_infrastructure'] },
  'vol2/collective_communication':{ cluster:'distributed', related: ['vol2/distributed_training', 'vol2/network_fabrics', 'vol2/compute_infrastructure'] },
  'vol2/fault_tolerance':        { cluster: 'distributed', related: ['vol2/distributed_training', 'vol2/ops_scale', 'vol1/ml_ops'] },
  'vol2/compute_infrastructure': { cluster: 'infrastructure', related: ['vol2/network_fabrics', 'vol2/data_storage', 'vol1/hw_acceleration', 'vol2/distributed_training'] },
  'vol2/network_fabrics':        { cluster: 'infrastructure', related: ['vol2/compute_infrastructure', 'vol2/collective_communication', 'vol2/data_storage'] },
  'vol2/data_storage':           { cluster: 'infrastructure', related: ['vol2/compute_infrastructure', 'vol1/data_engineering', 'vol2/distributed_training'] },
  'vol2/inference':              { cluster: 'deployment',   related: ['vol1/model_serving', 'vol2/performance_engineering', 'vol2/ops_scale', 'vol1/model_compression'] },
  'vol2/performance_engineering':{ cluster: 'deployment',   related: ['vol2/inference', 'vol2/ops_scale', 'vol1/benchmarking'] },
  'vol2/ops_scale':              { cluster: 'deployment',   related: ['vol2/inference', 'vol2/performance_engineering', 'vol1/ml_ops', 'vol2/fault_tolerance'] },
  'vol2/fleet_orchestration':    { cluster: 'deployment',   related: ['vol2/ops_scale', 'vol2/fault_tolerance', 'vol2/compute_infrastructure'] },
  'vol2/edge_intelligence':      { cluster: 'deployment',   related: ['vol2/inference', 'vol1/model_compression', 'vol2/performance_engineering'] },
  'vol2/responsible_ai':         { cluster: 'responsible',  related: ['vol1/responsible_engr', 'vol2/security_privacy', 'vol2/robust_ai', 'vol2/sustainable_ai'] },
  'vol2/security_privacy':       { cluster: 'responsible',  related: ['vol2/responsible_ai', 'vol2/robust_ai', 'vol1/responsible_engr'] },
  'vol2/robust_ai':              { cluster: 'responsible',  related: ['vol2/responsible_ai', 'vol2/security_privacy', 'vol2/sustainable_ai'] },
  'vol2/sustainable_ai':         { cluster: 'responsible',  related: ['vol2/responsible_ai', 'vol2/robust_ai', 'vol1/responsible_engr'] },
};

// Agent connections per knowledge cluster
const CLUSTER_AGENTS = {
  foundations:    ['[[11 Agents/Specifications/engineering/engineering-ai-engineer|AI Engineer]]', '[[11 Agents/Specifications/product/product-trend-researcher|Trend Researcher]]'],
  'neural-nets':  ['[[11 Agents/Specifications/engineering/engineering-ai-engineer|AI Engineer]]', '[[11 Agents/Specifications/engineering/engineering-ai-data-remediation-engineer|AI Data Remediation Engineer]]'],
  practical:      ['[[11 Agents/Specifications/engineering/engineering-data-engineer|Data Engineer]]', '[[11 Agents/Specifications/engineering/engineering-backend-architect|Backend Architect]]'],
  infrastructure: ['[[11 Agents/Specifications/engineering/engineering-sre|SRE]]', '[[11 Agents/Specifications/support/support-infrastructure-maintainer|Infrastructure Maintainer]]'],
  distributed:    ['[[11 Agents/Specifications/engineering/engineering-ai-engineer|AI Engineer]]', '[[11 Agents/Specifications/engineering/engineering-sre|SRE]]'],
  deployment:     ['[[11 Agents/Specifications/engineering/engineering-sre|SRE]]', '[[11 Agents/Specifications/engineering/engineering-devops-automator|DevOps Automator]]'],
  responsible:    ['[[11 Agents/Specifications/specialized/compliance-auditor|Compliance Auditor]]', '[[11 Agents/Specifications/specialized/blockchain-security-auditor|Security Auditor]]'],
};

function toDisplayTitle(chapterKey) {
  const base = path.basename(chapterKey);
  return base.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

let updated = 0, skipped = 0;

for (const [chKey, data] of Object.entries(CHAPTER_RELATIONS)) {
  const filepath = path.join(CS249R, chKey + '.md');
  if (!fs.existsSync(filepath)) { continue; }

  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes('## Related Chapters')) { skipped++; continue; }

  const relatedLinks = data.related
    .filter(r => CHAPTER_RELATIONS[r])  // only include known chapters
    .map(r => `- [[09 Knowledge/CS249R/${r}|${toDisplayTitle(r)}]]`);

  const agentLinks = (CLUSTER_AGENTS[data.cluster] || []).map(a => `- ${a}`);

  const section = [
    '',
    '## Related Chapters',
    '',
    ...relatedLinks,
    '',
    '## Applied By',
    '',
    ...agentLinks,
    `- [[09 Knowledge/CS249R/INDEX|CS249R — Full Index]]`,
    `- [[04 University/Dashboard|University Dashboard]]`,
    `- [[09 Knowledge/MOCs/Knowledge-MOC|Knowledge MOC]]`,
  ].join('\n');

  fs.writeFileSync(filepath, content + section + '\n', 'utf8');
  updated++;
}

console.log(`CS249R chapters updated: ${updated}  Skipped: ${skipped}`);
