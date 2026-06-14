'use strict';
const fs   = require('fs');
const path = require('path');
const VAULT = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';
const AP    = path.join(VAULT, '10 SOPs/Agency-Playbooks');

// SOP network sections for each Agency-Playbook file
// Keys must match filenames (without .md)
const SOP_NETWORK = {
  'scenario-startup-mvp': {
    triggeredBy: [
      '[[01 Executive/North-Star|North Star — new product initiative]]',
      '[[02 Projects/Dashboard|Project Registry — new project created]]',
    ],
    responsibleAgents: [
      '[[11 Agents/Specifications/specialized/agents-orchestrator|Agents Orchestrator]] — pipeline controller',
      '[[11 Agents/Specifications/project-management/project-manager-senior|Senior Project Manager]] — spec-to-task',
      '[[11 Agents/Specifications/product/product-sprint-prioritizer|Sprint Prioritizer]] — backlog management',
      '[[11 Agents/Specifications/design/design-ux-architect|UX Architect]] — technical foundation',
      '[[11 Agents/Specifications/engineering/engineering-frontend-developer|Frontend Developer]] — UI',
      '[[11 Agents/Specifications/engineering/engineering-backend-architect|Backend Architect]] — API and database',
      '[[11 Agents/Specifications/engineering/engineering-devops-automator|DevOps Automator]] — CI/CD',
      '[[11 Agents/Specifications/testing/testing-evidence-collector|Evidence Collector]] — QA',
      '[[11 Agents/Specifications/testing/testing-reality-checker|Reality Checker]] — final gate',
      '[[11 Agents/Specifications/marketing/marketing-growth-hacker|Growth Hacker]] — acquisition (Week 3+)',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-0-discovery|Phase 0 — Discovery]]',
      '[[10 SOPs/Agency-Playbooks/phase-1-strategy|Phase 1 — Strategy]]',
      '[[10 SOPs/Agency-Playbooks/phase-2-foundation|Phase 2 — Foundation]]',
      '[[10 SOPs/Agency-Playbooks/phase-3-build|Phase 3 — Build]]',
      '[[10 SOPs/Agency-Playbooks/phase-4-hardening|Phase 4 — Hardening]]',
      '[[10 SOPs/Agency-Playbooks/phase-5-launch|Phase 5 — Launch]]',
      '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Runbook]]',
      '[[10 SOPs/Agency-Playbooks/workflow-startup-mvp|Startup MVP Workflow (step-by-step)]]',
    ],
    relatedProjects: [
      '[[02 Projects/Active/Apex-AI-OS|Apex AI OS — primary implementation]]',
      '[[02 Projects/Dashboard|Projects Dashboard]]',
    ],
  },
  'scenario-enterprise-feature': {
    triggeredBy: [
      '[[02 Projects/Active/Apex-AI-OS|Apex AI OS — feature request]]',
      '[[01 Executive/Features|Feature Registry — approved feature]]',
      '[[03 Clients/Dashboard|Client request]]',
    ],
    responsibleAgents: [
      '[[11 Agents/Specifications/specialized/agents-orchestrator|Agents Orchestrator]] — coordination',
      '[[11 Agents/Specifications/engineering/engineering-software-architect|Software Architect]] — design',
      '[[11 Agents/Specifications/product/product-manager|Product Manager]] — requirements',
      '[[11 Agents/Specifications/project-management/project-management-project-shepherd|Project Shepherd]] — delivery',
      '[[11 Agents/Specifications/engineering/engineering-senior-developer|Senior Developer]] — implementation',
      '[[11 Agents/Specifications/testing/testing-evidence-collector|Evidence Collector]] — QA',
      '[[11 Agents/Specifications/testing/testing-reality-checker|Reality Checker]] — release gate',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-3-build|Phase 3 — Build]]',
      '[[10 SOPs/Agency-Playbooks/phase-4-hardening|Phase 4 — Hardening]]',
      '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Runbook]]',
      '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Runbook]]',
      '[[10 SOPs/Agency-Playbooks/workflow-with-memory|Workflow with Memory]]',
    ],
    relatedProjects: [
      '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
      '[[02 Projects/Dashboard|Projects Dashboard]]',
      '[[08 Operations/System-Registry|System Registry]]',
    ],
  },
  'scenario-incident-response': {
    triggeredBy: [
      '[[01 Executive/VaultHealth|Vault Health — system alert]]',
      '[[08 Operations/System-Registry|System Registry — component failure]]',
      '[[08 Operations/Dashboard|Operations Dashboard — monitoring alert]]',
    ],
    responsibleAgents: [
      '[[11 Agents/Specifications/engineering/engineering-incident-response-commander|Incident Response Commander]] — command',
      '[[11 Agents/Specifications/engineering/engineering-sre|SRE]] — reliability',
      '[[11 Agents/Specifications/engineering/engineering-security-engineer|Security Engineer]] — security incidents',
      '[[11 Agents/Specifications/testing/testing-reality-checker|Reality Checker]] — verification',
      '[[11 Agents/Specifications/support/support-infrastructure-maintainer|Infrastructure Maintainer]] — recovery',
      '[[11 Agents/Specifications/support/support-executive-summary-generator|Executive Summary Generator]] — communication',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-4-hardening|Phase 4 — Hardening]]',
      '[[10 SOPs/Agency-Playbooks/phase-6-operate|Phase 6 — Operate]]',
      '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Runbook]]',
      '[[10 SOPs/System/Vault-Governance|Vault Governance SOP]]',
    ],
    relatedProjects: [
      '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
      '[[08 Operations/System-Registry|System Registry]]',
      '[[08 Operations/Dashboard|Operations]]',
    ],
  },
  'scenario-marketing-campaign': {
    triggeredBy: [
      '[[03 Clients/Dashboard|New client campaign request]]',
      '[[02 Projects/Dashboard|New product launch]]',
      '[[01 Executive/North-Star|Strategic growth initiative]]',
    ],
    responsibleAgents: [
      '[[11 Agents/Specifications/marketing/marketing-content-creator|Content Creator]] — content production',
      '[[11 Agents/Specifications/marketing/marketing-social-media-strategist|Social Media Strategist]] — distribution',
      '[[11 Agents/Specifications/marketing/marketing-seo-specialist|SEO Specialist]] — organic reach',
      '[[11 Agents/Specifications/paid-media/paid-media-ppc-strategist|PPC Strategist]] — paid channels',
      '[[11 Agents/Specifications/paid-media/paid-media-creative-strategist|Ad Creative Strategist]] — ad creative',
      '[[11 Agents/Specifications/marketing/marketing-growth-hacker|Growth Hacker]] — funnel optimization',
      '[[11 Agents/Specifications/product/product-trend-researcher|Trend Researcher]] — market intelligence',
      '[[11 Agents/Specifications/support/support-analytics-reporter|Analytics Reporter]] — performance tracking',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-5-launch|Phase 5 — Launch]]',
      '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Runbook]]',
      '[[10 SOPs/Agency-Playbooks/workflow-landing-page|Landing Page Workflow]]',
      '[[10 SOPs/Agency-Playbooks/workflow-book-chapter|Book Chapter Workflow]]',
    ],
    relatedProjects: [
      '[[03 Clients/Dashboard|Client Campaigns]]',
      '[[05 Finance/Dashboard|Revenue Tracking]]',
      '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
    ],
  },
  'phase-0-discovery': {
    responsibleAgents: [
      '[[11 Agents/Specifications/product/product-trend-researcher|Trend Researcher]]',
      '[[11 Agents/Specifications/product/product-manager|Product Manager]]',
      '[[11 Agents/Specifications/strategy/nexus-strategy|NEXUS Strategy]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-1-strategy|Phase 1 — Strategy]]',
      '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Runbook]]',
      '[[10 SOPs/Agency-Playbooks/QUICKSTART|NEXUS Quick-Start]]',
    ],
  },
  'phase-1-strategy': {
    responsibleAgents: [
      '[[11 Agents/Specifications/strategy/nexus-strategy|NEXUS Strategy]]',
      '[[11 Agents/Specifications/product/product-manager|Product Manager]]',
      '[[11 Agents/Specifications/engineering/engineering-software-architect|Software Architect]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-0-discovery|Phase 0 — Discovery]]',
      '[[10 SOPs/Agency-Playbooks/phase-2-foundation|Phase 2 — Foundation]]',
    ],
  },
  'phase-2-foundation': {
    responsibleAgents: [
      '[[11 Agents/Specifications/engineering/engineering-software-architect|Software Architect]]',
      '[[11 Agents/Specifications/design/design-ux-architect|UX Architect]]',
      '[[11 Agents/Specifications/engineering/engineering-devops-automator|DevOps Automator]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-1-strategy|Phase 1 — Strategy]]',
      '[[10 SOPs/Agency-Playbooks/phase-3-build|Phase 3 — Build]]',
    ],
  },
  'phase-3-build': {
    responsibleAgents: [
      '[[11 Agents/Specifications/specialized/agents-orchestrator|Agents Orchestrator]]',
      '[[11 Agents/Specifications/engineering/engineering-frontend-developer|Frontend Developer]]',
      '[[11 Agents/Specifications/engineering/engineering-backend-architect|Backend Architect]]',
      '[[11 Agents/Specifications/testing/testing-evidence-collector|Evidence Collector]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-2-foundation|Phase 2 — Foundation]]',
      '[[10 SOPs/Agency-Playbooks/phase-4-hardening|Phase 4 — Hardening]]',
      '[[10 SOPs/Agency-Playbooks/workflow-startup-mvp|Startup MVP Workflow]]',
    ],
  },
  'phase-4-hardening': {
    responsibleAgents: [
      '[[11 Agents/Specifications/testing/testing-reality-checker|Reality Checker]]',
      '[[11 Agents/Specifications/testing/testing-evidence-collector|Evidence Collector]]',
      '[[11 Agents/Specifications/testing/testing-performance-benchmarker|Performance Benchmarker]]',
      '[[11 Agents/Specifications/engineering/engineering-security-engineer|Security Engineer]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-3-build|Phase 3 — Build]]',
      '[[10 SOPs/Agency-Playbooks/phase-5-launch|Phase 5 — Launch]]',
      '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Runbook]]',
    ],
  },
  'phase-5-launch': {
    responsibleAgents: [
      '[[11 Agents/Specifications/engineering/engineering-devops-automator|DevOps Automator]]',
      '[[11 Agents/Specifications/marketing/marketing-growth-hacker|Growth Hacker]]',
      '[[11 Agents/Specifications/marketing/marketing-content-creator|Content Creator]]',
      '[[11 Agents/Specifications/support/support-analytics-reporter|Analytics Reporter]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-4-hardening|Phase 4 — Hardening]]',
      '[[10 SOPs/Agency-Playbooks/phase-6-operate|Phase 6 — Operate]]',
      '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Runbook]]',
    ],
  },
  'phase-6-operate': {
    responsibleAgents: [
      '[[11 Agents/Specifications/engineering/engineering-sre|SRE]]',
      '[[11 Agents/Specifications/support/support-infrastructure-maintainer|Infrastructure Maintainer]]',
      '[[11 Agents/Specifications/support/support-analytics-reporter|Analytics Reporter]]',
      '[[11 Agents/Specifications/engineering/engineering-incident-response-commander|Incident Response Commander]]',
    ],
    relatedSOPs: [
      '[[10 SOPs/Agency-Playbooks/phase-5-launch|Phase 5 — Launch]]',
      '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Runbook]]',
      '[[10 SOPs/System/Vault-Governance|Vault Governance SOP]]',
    ],
    relatedProjects: [
      '[[08 Operations/System-Registry|System Registry]]',
      '[[08 Operations/Dashboard|Operations]]',
    ],
  },
};

const NAV_MARKER = '\n---\n\n## Vault Navigation';

let updated = 0;
let skipped  = 0;

for (const [slug, network] of Object.entries(SOP_NETWORK)) {
  const filepath = path.join(AP, slug + '.md');
  if (!fs.existsSync(filepath)) { console.log('Missing:', slug); continue; }

  const content = fs.readFileSync(filepath, 'utf8');
  if (content.includes('## Responsible Agents') || content.includes('## Related SOPs')) {
    skipped++; continue;
  }

  const sections = [];

  if (network.triggeredBy?.length) {
    sections.push('', '## Triggered By', '', ...network.triggeredBy.map(l => `- ${l}`));
  }
  if (network.responsibleAgents?.length) {
    sections.push('', '## Responsible Agents', '', ...network.responsibleAgents.map(l => `- ${l}`));
  }
  if (network.relatedSOPs?.length) {
    sections.push('', '## Related SOPs', '', ...network.relatedSOPs.map(l => `- ${l}`));
  }
  if (network.relatedProjects?.length) {
    sections.push('', '## Related Projects', '', ...network.relatedProjects.map(l => `- ${l}`));
  }

  const insertion = sections.join('\n');
  let newContent;
  const navIdx = content.indexOf(NAV_MARKER);
  if (navIdx !== -1) {
    newContent = content.slice(0, navIdx) + '\n' + insertion + content.slice(navIdx);
  } else {
    newContent = content + '\n' + insertion + '\n';
  }

  fs.writeFileSync(filepath, newContent, 'utf8');
  updated++;
}

console.log(`SOPs updated: ${updated}  Skipped: ${skipped}`);
