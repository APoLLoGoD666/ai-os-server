'use strict';
const fs   = require('fs');
const path = require('path');

const VAULT      = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';
const SPECS_ROOT = path.join(VAULT, '11 Agents/Specifications');

// ─── CROSS-CATEGORY REPRESENTATIVE AGENTS ────────────────────────────────────
// When linking cross-category, use these representative slugs (full category/slug path)
const CATEGORY_REPS = {
  academic:             ['academic/academic-psychologist', 'academic/academic-historian'],
  design:               ['design/design-ux-architect', 'design/design-brand-guardian', 'design/design-ui-designer'],
  engineering:          ['engineering/engineering-software-architect', 'engineering/engineering-senior-developer', 'engineering/engineering-backend-architect'],
  finance:              ['finance/finance-financial-analyst', 'finance/finance-fpa-analyst'],
  'game-development':   ['game-development/game-designer', 'game-development/unity-architect', 'game-development/narrative-designer'],
  marketing:            ['marketing/marketing-content-creator', 'marketing/marketing-growth-hacker', 'marketing/marketing-seo-specialist'],
  'paid-media':         ['paid-media/paid-media-ppc-strategist', 'paid-media/paid-media-creative-strategist'],
  product:              ['product/product-manager', 'product/product-sprint-prioritizer'],
  'project-management': ['project-management/project-manager-senior', 'project-management/project-management-project-shepherd'],
  sales:                ['sales/sales-account-strategist', 'sales/sales-discovery-coach', 'sales/sales-outbound-strategist'],
  'spatial-computing':  ['spatial-computing/visionos-spatial-engineer', 'spatial-computing/xr-interface-architect'],
  specialized:          ['specialized/specialized-chief-of-staff', 'specialized/agents-orchestrator', 'specialized/specialized-workflow-architect'],
  strategy:             ['strategy/nexus-strategy', 'strategy/phase-1-strategy'],
  support:              ['support/support-infrastructure-maintainer', 'support/support-executive-summary-generator'],
  testing:              ['testing/testing-workflow-optimizer', 'testing/testing-test-results-analyzer'],
};

// ─── CROSS-CATEGORY LINKS PER CATEGORY ───────────────────────────────────────
const CROSS_LINKS = {
  academic:             ['strategy', 'specialized', 'product'],
  design:               ['product', 'marketing', 'game-development'],
  engineering:          ['product', 'testing', 'specialized'],
  finance:              ['sales', 'strategy', 'specialized'],
  'game-development':   ['design', 'spatial-computing', 'engineering'],
  marketing:            ['sales', 'paid-media', 'product'],
  'paid-media':         ['marketing', 'sales'],
  product:              ['engineering', 'project-management', 'marketing'],
  'project-management': ['strategy', 'support', 'product'],
  sales:                ['marketing', 'paid-media', 'finance'],
  'spatial-computing':  ['game-development', 'design', 'engineering'],
  specialized:          ['support', 'sales', 'engineering'],
  strategy:             ['project-management', 'support', 'product'],
  support:              ['project-management', 'strategy', 'testing'],
  testing:              ['engineering', 'support', 'product'],
};

// ─── SUBCLUSTERS FOR LARGE CATEGORIES (>12 agents) ───────────────────────────
const SUBCLUSTERS = {
  engineering: {
    'ai-ml':         ['engineering-ai-engineer', 'engineering-ai-data-remediation-engineer', 'engineering-autonomous-optimization-architect', 'engineering-voice-ai-integration-engineer'],
    backend:         ['engineering-backend-architect', 'engineering-database-optimizer', 'engineering-data-engineer', 'engineering-sre', 'engineering-senior-developer'],
    'frontend-mobile':['engineering-frontend-developer', 'engineering-mobile-app-builder', 'engineering-cms-developer', 'engineering-rapid-prototyper'],
    security:        ['engineering-security-engineer', 'engineering-threat-detection-engineer', 'engineering-incident-response-commander'],
    'devops-quality': ['engineering-devops-automator', 'engineering-git-workflow-master', 'engineering-code-reviewer', 'engineering-minimal-change-engineer'],
    architecture:    ['engineering-software-architect', 'engineering-technical-writer', 'engineering-codebase-onboarding-engineer'],
    integrations:    ['engineering-email-intelligence-engineer', 'engineering-feishu-integration-developer', 'engineering-wechat-mini-program-developer', 'engineering-embedded-firmware-engineer', 'engineering-filament-optimization-specialist', 'engineering-solidity-smart-contract-engineer'],
  },
  marketing: {
    'seo-search':    ['marketing-seo-specialist', 'marketing-agentic-search-optimizer', 'marketing-ai-citation-strategist', 'marketing-app-store-optimizer', 'marketing-baidu-seo-specialist'],
    'western-social':['marketing-instagram-curator', 'marketing-twitter-engager', 'marketing-reddit-community-builder', 'marketing-linkedin-content-creator', 'marketing-tiktok-strategist'],
    'china-social':  ['marketing-xiaohongshu-specialist', 'marketing-douyin-strategist', 'marketing-weibo-strategist', 'marketing-kuaishou-strategist', 'marketing-bilibili-content-strategist', 'marketing-wechat-official-account', 'marketing-private-domain-operator', 'marketing-china-market-localization-strategist'],
    'content-media': ['marketing-content-creator', 'marketing-podcast-strategist', 'marketing-book-co-author', 'marketing-video-optimization-specialist', 'marketing-short-video-editing-coach', 'marketing-carousel-growth-engine', 'marketing-social-media-strategist'],
    'ecom-growth':   ['marketing-growth-hacker', 'marketing-cross-border-ecommerce', 'marketing-china-ecommerce-operator', 'marketing-livestream-commerce-coach'],
  },
  'game-development': {
    engines:         ['unity-architect', 'unity-editor-tool-developer', 'unity-multiplayer-engineer', 'unity-shader-graph-artist', 'godot-gameplay-scripter', 'godot-multiplayer-engineer', 'godot-shader-developer', 'unreal-multiplayer-architect', 'unreal-systems-engineer', 'unreal-technical-artist', 'unreal-world-builder'],
    design:          ['game-designer', 'level-designer', 'narrative-designer', 'roblox-experience-designer', 'roblox-avatar-creator', 'roblox-systems-scripter'],
    technical:       ['blender-addon-engineer', 'game-audio-engineer', 'technical-artist'],
  },
  specialized: {
    legal:           ['compliance-auditor', 'legal-billing-time-tracking', 'legal-client-intake', 'legal-document-review', 'healthcare-marketing-compliance'],
    healthcare:      ['healthcare-customer-service', 'healthcare-marketing-compliance'],
    'customer-svc':  ['customer-service', 'hospitality-guest-services', 'retail-customer-returns', 'healthcare-customer-service'],
    'finance-adj':   ['accounts-payable-agent', 'loan-officer-assistant', 'real-estate-buyer-seller', 'supply-chain-strategist'],
    'hr-training':   ['hr-onboarding', 'recruitment-specialist', 'corporate-training-designer', 'study-abroad-advisor'],
    technical:       ['lsp-index-engineer', 'automation-governance-architect', 'agentic-identity-trust', 'identity-graph-operator', 'specialized-mcp-builder', 'specialized-workflow-architect', 'agents-orchestrator', 'zk-steward', 'blockchain-security-auditor', 'specialized-model-qa'],
    'biz-sales':     ['sales-outreach', 'sales-data-extraction-agent', 'specialized-salesforce-architect', 'government-digital-presales-consultant', 'specialized-developer-advocate'],
    cultural:        ['specialized-cultural-intelligence-strategist', 'specialized-french-consulting-market', 'specialized-korean-business-navigator', 'language-translator'],
    operations:      ['data-consolidation-agent', 'report-distribution-agent', 'specialized-document-generator', 'specialized-chief-of-staff', 'specialized-civil-engineer'],
  },
};

// ─── CAPABILITIES PER CATEGORY ───────────────────────────────────────────────
const CAPABILITIES = {
  academic: [
    '[[09 Knowledge/MOCs/Knowledge-MOC|Knowledge Management]]',
    '[[09 Knowledge/CS249R/INDEX|ML Systems Research]]',
    '[[04 University/Dashboard|Academic Operations]]',
    '[[09 Knowledge/MOCs/Business-MOC|Strategic Research]]',
  ],
  design: [
    '[[09 Knowledge/MOCs/Business-MOC|Brand Strategy]]',
    '[[03 Clients/Dashboard|Client Design Work]]',
    '[[02 Projects/Active/Apex-AI-OS|Product Design]]',
    '[[11 Agents/Agent-Registry|Design Agent Network]]',
  ],
  engineering: [
    '[[08 Operations/System-Registry|System Architecture]]',
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS Build]]',
    '[[09 Knowledge/MOCs/System-MOC|Technical Knowledge]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup Build Playbook]]',
  ],
  finance: [
    '[[05 Finance/Dashboard|Financial Operations]]',
    '[[09 Knowledge/MOCs/Finance-MOC|Finance Knowledge]]',
    '[[03 Clients/Dashboard|Client Finance]]',
    '[[01 Executive/North-Star|Strategic Finance]]',
  ],
  'game-development': [
    '[[09 Knowledge/MOCs/Knowledge-MOC|Game Knowledge]]',
    '[[09 Knowledge/MOCs/Business-MOC|Game Business]]',
    '[[02 Projects/Dashboard|Game Projects]]',
    '[[11 Agents/Agent-Registry|Creative Agent Network]]',
  ],
  marketing: [
    '[[03 Clients/Dashboard|Client Marketing]]',
    '[[09 Knowledge/MOCs/Business-MOC|Business Growth]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
    '[[05 Finance/Dashboard|Marketing ROI]]',
  ],
  'paid-media': [
    '[[03 Clients/Dashboard|Client Campaigns]]',
    '[[05 Finance/Dashboard|Budget Management]]',
    '[[09 Knowledge/MOCs/Finance-MOC|Media Finance]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
  ],
  product: [
    '[[02 Projects/Active/Apex-AI-OS|Product Development]]',
    '[[02 Projects/Dashboard|Project Portfolio]]',
    '[[09 Knowledge/MOCs/Project-MOC|Product Knowledge]]',
    '[[08 Operations/Dashboard|Operations]]',
  ],
  'project-management': [
    '[[02 Projects/Dashboard|Project Portfolio]]',
    '[[08 Operations/Dashboard|Operations Management]]',
    '[[09 Knowledge/MOCs/Operations-MOC|Operations Knowledge]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup Execution]]',
  ],
  sales: [
    '[[03 Clients/Dashboard|Client Acquisition]]',
    '[[05 Finance/Dashboard|Revenue Tracking]]',
    '[[09 Knowledge/MOCs/Relationships-MOC|Relationship Management]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Revenue Playbook]]',
  ],
  'spatial-computing': [
    '[[09 Knowledge/MOCs/Knowledge-MOC|Spatial Knowledge]]',
    '[[02 Projects/Dashboard|Spatial Projects]]',
    '[[08 Operations/System-Registry|Technical Systems]]',
    '[[11 Agents/Agent-Registry|Spatial Agent Network]]',
  ],
  specialized: [
    '[[09 Knowledge/MOCs/Business-MOC|Domain Business]]',
    '[[08 Operations/Dashboard|Operations Support]]',
    '[[03 Clients/Dashboard|Client Services]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  strategy: [
    '[[01 Executive/North-Star|Strategic Vision]]',
    '[[02 Projects/Dashboard|Project Strategy]]',
    '[[09 Knowledge/MOCs/Business-MOC|Business Strategy]]',
    '[[01 Executive/Decisions|Decision Records]]',
  ],
  support: [
    '[[03 Clients/Dashboard|Client Support]]',
    '[[09 Knowledge/MOCs/Relationships-MOC|Relationship Management]]',
    '[[08 Operations/Dashboard|Operational Support]]',
    '[[01 Executive/VaultHealth|System Health]]',
  ],
  testing: [
    '[[02 Projects/Active/Apex-AI-OS|System Testing]]',
    '[[08 Operations/System-Registry|System Registry]]',
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
    '[[09 Knowledge/MOCs/System-MOC|Technical Standards]]',
  ],
};

// ─── USED IN WORKFLOWS ────────────────────────────────────────────────────────
const USED_IN = {
  academic: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  design: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
  ],
  engineering: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
  ],
  finance: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  'game-development': [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  marketing: [
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
  ],
  'paid-media': [
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  product: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
  ],
  'project-management': [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
  ],
  sales: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
  ],
  'spatial-computing': [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  specialized: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
  ],
  strategy: [
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
  ],
  support: [
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks]]',
  ],
  testing: [
    '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-startup-mvp|Startup MVP Playbook]]',
    '[[10 SOPs/Agency-Playbooks/scenario-enterprise-feature|Enterprise Feature Playbook]]',
  ],
};

// ─── SUPPORTS LINKS ───────────────────────────────────────────────────────────
const SUPPORTS = {
  academic: [
    '[[04 University/Dashboard|University Domain]]',
    '[[09 Knowledge/MOCs/Knowledge-MOC|Knowledge Base]]',
    '[[01 Executive/North-Star|Strategic Goals]]',
  ],
  design: [
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
    '[[03 Clients/Dashboard|Client Projects]]',
    '[[09 Knowledge/MOCs/Business-MOC|Brand Strategy]]',
  ],
  engineering: [
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
    '[[08 Operations/System-Registry|System Registry]]',
    '[[08 Operations/Dashboard|Operations]]',
  ],
  finance: [
    '[[05 Finance/Dashboard|Finance Domain]]',
    '[[01 Executive/North-Star|Business Goals]]',
    '[[03 Clients/Dashboard|Client Finance]]',
  ],
  'game-development': [
    '[[02 Projects/Dashboard|Game Projects]]',
    '[[09 Knowledge/MOCs/Knowledge-MOC|Game Knowledge Base]]',
    '[[08 Operations/Dashboard|Studio Operations]]',
  ],
  marketing: [
    '[[03 Clients/Dashboard|Client Campaigns]]',
    '[[05 Finance/Dashboard|Revenue Goals]]',
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS Marketing]]',
  ],
  'paid-media': [
    '[[03 Clients/Dashboard|Client Ad Accounts]]',
    '[[05 Finance/Dashboard|Ad Budget]]',
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS Growth]]',
  ],
  product: [
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
    '[[02 Projects/Dashboard|Product Portfolio]]',
    '[[01 Executive/Features|Feature Registry]]',
  ],
  'project-management': [
    '[[02 Projects/Dashboard|All Projects]]',
    '[[08 Operations/Dashboard|Operations]]',
    '[[01 Executive/North-Star|Strategic Goals]]',
  ],
  sales: [
    '[[03 Clients/Dashboard|Client Relationships]]',
    '[[05 Finance/Dashboard|Revenue Tracking]]',
    '[[01 Executive/North-Star|Business Goals]]',
  ],
  'spatial-computing': [
    '[[02 Projects/Dashboard|Spatial Projects]]',
    '[[08 Operations/System-Registry|Technical Infrastructure]]',
    '[[09 Knowledge/MOCs/Knowledge-MOC|Spatial Knowledge]]',
  ],
  specialized: [
    '[[03 Clients/Dashboard|Client Services]]',
    '[[08 Operations/Dashboard|Operations]]',
    '[[09 Knowledge/MOCs/Business-MOC|Business Operations]]',
  ],
  strategy: [
    '[[01 Executive/North-Star|Vision & Strategy]]',
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS]]',
    '[[01 Executive/Decisions|Decision Records]]',
  ],
  support: [
    '[[03 Clients/Dashboard|Client Support]]',
    '[[08 Operations/Dashboard|Operations Support]]',
    '[[01 Executive/VaultHealth|System Health]]',
  ],
  testing: [
    '[[02 Projects/Active/Apex-AI-OS|Apex AI OS QA]]',
    '[[08 Operations/System-Registry|System Registry]]',
    '[[08 Operations/Dashboard|Operations]]',
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Build the full agent map: { category: [slug, ...] }
const ALL_AGENTS = {};
const categories = fs.readdirSync(SPECS_ROOT, { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => e.name);

for (const cat of categories) {
  ALL_AGENTS[cat] = fs.readdirSync(path.join(SPECS_ROOT, cat))
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .map(f => path.basename(f, '.md'));
}

function toDisplayName(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function agentLink(catSlug) {
  // catSlug format: 'category/slug' or just 'slug' (within same category)
  const parts = catSlug.includes('/') ? catSlug.split('/') : [null, catSlug];
  const [cat, slug] = parts;
  const displayName = toDisplayName(slug);
  if (cat) {
    return `[[11 Agents/Specifications/${cat}/${slug}|${displayName}]]`;
  }
  return null;
}

// Find which subcluster a slug belongs to in large categories
function getSubcluster(category, slug) {
  const subs = SUBCLUSTERS[category];
  if (!subs) return null;
  for (const [name, members] of Object.entries(subs)) {
    if (members.includes(slug)) return name;
  }
  return null;
}

function buildRelatedAgents(category, slug) {
  const sameCategory = ALL_AGENTS[category].filter(s => s !== slug);
  let siblings;

  if (SUBCLUSTERS[category]) {
    // Large category — find subcluster siblings
    const subName = getSubcluster(category, slug);
    if (subName) {
      siblings = SUBCLUSTERS[category][subName].filter(s => s !== slug);
    } else {
      // Not in a defined subcluster, use first 6 of category
      siblings = sameCategory.slice(0, 6);
    }
  } else {
    // Small category — all siblings
    siblings = sameCategory;
  }

  const siblingLinks = siblings.map(s => {
    const display = toDisplayName(s);
    return `- [[11 Agents/Specifications/${category}/${s}|${display}]]`;
  });

  // Cross-category links
  const crossCats = CROSS_LINKS[category] || [];
  const crossLinks = [];
  for (const crossCat of crossCats) {
    const reps = CATEGORY_REPS[crossCat] || [];
    for (const rep of reps.slice(0, 2)) {
      const lnk = agentLink(rep);
      if (lnk) crossLinks.push(`- ${lnk}`);
    }
  }

  const lines = [
    '',
    '## Related Agents',
    '',
    '**In this category:**',
    ...siblingLinks,
    '',
    '**Cross-domain:**',
    ...crossLinks,
  ];

  return lines.join('\n');
}

function buildCapabilities(category) {
  const caps = CAPABILITIES[category] || CAPABILITIES.specialized;
  return [
    '',
    '## Capabilities',
    '',
    ...caps.map(c => `- ${c}`),
  ].join('\n');
}

function buildUsedIn(category) {
  const workflows = USED_IN[category] || USED_IN.specialized;
  return [
    '',
    '## Used In',
    '',
    ...workflows.map(w => `- ${w}`),
  ].join('\n');
}

function buildSupports(category) {
  const items = SUPPORTS[category] || SUPPORTS.specialized;
  return [
    '',
    '## Supports',
    '',
    ...items.map(i => `- ${i}`),
  ].join('\n');
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────

const VAULT_NAV_MARKER = '\n---\n\n## Vault Navigation';
let updated = 0;
let skipped = 0;

for (const category of categories) {
  const catDir = path.join(SPECS_ROOT, category);
  const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md');

  for (const filename of files) {
    const filepath = path.join(catDir, filename);
    const content  = fs.readFileSync(filepath, 'utf8');

    if (content.includes('## Related Agents')) {
      skipped++;
      continue;
    }

    const slug = path.basename(filename, '.md');

    const newSections = [
      buildRelatedAgents(category, slug),
      buildCapabilities(category),
      buildUsedIn(category),
      buildSupports(category),
    ].join('\n');

    let newContent;
    const navIdx = content.indexOf(VAULT_NAV_MARKER);
    if (navIdx !== -1) {
      newContent = content.slice(0, navIdx) + newSections + '\n' + content.slice(navIdx);
    } else {
      newContent = content + newSections + '\n';
    }

    fs.writeFileSync(filepath, newContent, 'utf8');
    updated++;
  }
}

console.log(`Done. Updated: ${updated}  Skipped: ${skipped}`);
