const fs = require('fs');
const path = require('path');

const VAULT = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS';

function toTitleCase(str) {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function deriveTitle(content, filename) {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  const base = path.basename(filename, path.extname(filename));
  return toTitleCase(base);
}

function hasFrontmatter(content) {
  return content.startsWith('---');
}

function buildCS249RFrontmatter(title) {
  return `---
title: "${title}"
type: knowledge
status: active
created: 2026-05-21
updated: 2026-06-04
domain: Knowledge
tags: [ml, cs249r, knowledge]
parent: "[[09 Knowledge/CS249R/INDEX]]"
---

`;
}

function buildAgencyPlaybooksFrontmatter(title) {
  return `---
title: "${title}"
type: sop
status: active
created: 2026-06-04
updated: 2026-06-04
domain: SOPs
tags: [sop, agents, playbooks]
parent: "[[10 SOPs/Agency-Playbooks/INDEX]]"
---

`;
}

function processDirectory(dirPath, frontmatterBuilder, label) {
  if (!fs.existsSync(dirPath)) {
    console.log(`[SKIP] Directory not found: ${dirPath}`);
    return { processed: 0, skipped: 0, errors: 0 };
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
  let processed = 0, skipped = 0, errors = 0;

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      if (hasFrontmatter(content)) {
        console.log(`[SKIP]    ${label}/${file} — already has frontmatter`);
        skipped++;
        continue;
      }

      const title = deriveTitle(content, file);
      const frontmatter = frontmatterBuilder(title);
      const newContent = frontmatter + content;

      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`[UPDATED] ${label}/${file} — title: "${title}"`);
      processed++;
    } catch (err) {
      console.log(`[ERROR]   ${label}/${file} — ${err.message}`);
      errors++;
    }
  }

  return { processed, skipped, errors };
}

function main() {
  console.log('=== Adding YAML Frontmatter to Vault Files ===\n');

  const cs249rDirs = [
    path.join(VAULT, '09 Knowledge/CS249R/vol1'),
    path.join(VAULT, '09 Knowledge/CS249R/vol2'),
  ];

  const agencyPlaybooksDir = path.join(VAULT, '10 SOPs/Agency-Playbooks');

  let totalProcessed = 0, totalSkipped = 0, totalErrors = 0;

  console.log('--- CS249R Chapters ---');
  for (const dir of cs249rDirs) {
    const label = dir.replace(VAULT + '/', '').replace(VAULT + '\\', '');
    const result = processDirectory(dir, buildCS249RFrontmatter, label);
    totalProcessed += result.processed;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  console.log('\n--- Agency Playbooks ---');
  const apResult = processDirectory(agencyPlaybooksDir, buildAgencyPlaybooksFrontmatter, '10 SOPs/Agency-Playbooks');
  totalProcessed += apResult.processed;
  totalSkipped += apResult.skipped;
  totalErrors += apResult.errors;

  console.log('\n=== Summary ===');
  console.log(`Updated : ${totalProcessed}`);
  console.log(`Skipped : ${totalSkipped}`);
  console.log(`Errors  : ${totalErrors}`);
}

main();
