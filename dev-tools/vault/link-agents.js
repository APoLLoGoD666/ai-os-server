'use strict';
const fs   = require('fs');
const path = require('path');

const VAULT      = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';
const SPECS_ROOT = path.join(VAULT, '11 Agents/Specifications');

// Domain links per category — semantically valid connections to the broader graph
const CATEGORY_LINKS = {
    academic: [
        '[[04 University/Dashboard|University Dashboard]]',
        '[[09 Knowledge/CS249R/INDEX|CS249R — ML Systems textbook]]',
        '[[09 Knowledge/MOCs/Knowledge-MOC|Knowledge MOC]]',
    ],
    design: [
        '[[03 Clients/Dashboard|Clients Dashboard]]',
        '[[09 Knowledge/MOCs/Business-MOC|Business MOC]]',
        '[[11 Agents/Specifications/engineering/engineering-frontend-developer|Frontend Developer Agent]]',
    ],
    engineering: [
        '[[02 Projects/Active/Apex-AI-OS|Apex AI OS Project]]',
        '[[08 Operations/System-Registry|System Registry]]',
        '[[09 Knowledge/MOCs/System-MOC|System MOC]]',
    ],
    finance: [
        '[[05 Finance/Dashboard|Finance Dashboard]]',
        '[[09 Knowledge/MOCs/Finance-MOC|Finance MOC]]',
        '[[03 Clients/Dashboard|Clients Dashboard]]',
    ],
    'game-development': [
        '[[09 Knowledge/MOCs/Knowledge-MOC|Knowledge MOC]]',
        '[[09 Knowledge/MOCs/Business-MOC|Business MOC]]',
    ],
    marketing: [
        '[[03 Clients/Dashboard|Clients Dashboard]]',
        '[[09 Knowledge/MOCs/Business-MOC|Business MOC]]',
        '[[10 SOPs/Agency-Playbooks/scenario-marketing-campaign|Marketing Campaign Playbook]]',
    ],
    'paid-media': [
        '[[03 Clients/Dashboard|Clients Dashboard]]',
        '[[05 Finance/Dashboard|Finance Dashboard]]',
        '[[09 Knowledge/MOCs/Finance-MOC|Finance MOC]]',
    ],
    product: [
        '[[02 Projects/Dashboard|Projects Dashboard]]',
        '[[02 Projects/Active/Apex-AI-OS|Apex AI OS Project]]',
        '[[09 Knowledge/MOCs/Project-MOC|Project MOC]]',
    ],
    'project-management': [
        '[[02 Projects/Dashboard|Projects Dashboard]]',
        '[[08 Operations/Dashboard|Operations Dashboard]]',
        '[[09 Knowledge/MOCs/Operations-MOC|Operations MOC]]',
    ],
    sales: [
        '[[03 Clients/Dashboard|Clients Dashboard]]',
        '[[05 Finance/Dashboard|Finance Dashboard]]',
        '[[09 Knowledge/MOCs/Relationships-MOC|Relationships MOC]]',
    ],
    'spatial-computing': [
        '[[09 Knowledge/MOCs/Knowledge-MOC|Knowledge MOC]]',
        '[[09 Knowledge/MOCs/Business-MOC|Business MOC]]',
    ],
    specialized: [
        '[[09 Knowledge/MOCs/Business-MOC|Business MOC]]',
        '[[08 Operations/Dashboard|Operations Dashboard]]',
    ],
    strategy: [
        '[[01 Executive/North-Star|North Star]]',
        '[[02 Projects/Dashboard|Projects Dashboard]]',
        '[[09 Knowledge/MOCs/Business-MOC|Business MOC]]',
    ],
    support: [
        '[[03 Clients/Dashboard|Clients Dashboard]]',
        '[[09 Knowledge/MOCs/Relationships-MOC|Relationships MOC]]',
    ],
    testing: [
        '[[02 Projects/Active/Apex-AI-OS|Apex AI OS Project]]',
        '[[08 Operations/System-Registry|System Registry]]',
        '[[10 SOPs/Agency-Playbooks/scenario-incident-response|Incident Response Playbook]]',
    ],
};

function buildFooter(category, slug) {
    const categoryDisplay = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const indexPath = `11 Agents/Specifications/${category}/INDEX`;
    const domainLinks = CATEGORY_LINKS[category] || ['[[09 Knowledge/MOCs/Business-MOC|Business MOC]]'];

    return [
        '',
        '---',
        '',
        '## Vault Navigation',
        '',
        `**Category:** [[${indexPath}|${categoryDisplay} Agents]]`,
        '**Registry:** [[11 Agents/Agent-Registry|Agent Registry]]',
        '**Discovery:** [[09 Knowledge/MOCs/Agent-MOC|Agent MOC — find agents by use case]]',
        '',
        '**Related vault notes:**',
        ...domainLinks.map(l => `- ${l}`),
        '- [[10 SOPs/Agency-Playbooks/INDEX|Agency Playbooks — multi-agent workflows]]',
        '',
    ].join('\n');
}

let updated = 0;
let skipped = 0;

const categories = fs.readdirSync(SPECS_ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

for (const category of categories) {
    const catDir = path.join(SPECS_ROOT, category);
    const files  = fs.readdirSync(catDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md');

    for (const filename of files) {
        const filepath = path.join(catDir, filename);
        const content  = fs.readFileSync(filepath, 'utf8');

        // Skip if already has a Vault Navigation section
        if (content.includes('## Vault Navigation')) {
            skipped++;
            continue;
        }

        const slug   = path.basename(filename, '.md');
        const footer = buildFooter(category, slug);
        fs.writeFileSync(filepath, content + footer, 'utf8');
        updated++;
    }
}

console.log(`Done. Updated: ${updated}  Skipped (already linked): ${skipped}`);
