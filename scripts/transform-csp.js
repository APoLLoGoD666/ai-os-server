/**
 * transform-csp.js
 * Converts all inline event handler attributes (onclick, onchange, etc.)
 * to data-* attributes consumed by the APEX event dispatcher.
 * Run once: node transform-csp.js
 */

'use strict';
const fs = require('fs');
const filePath = __dirname + '\\dashboard.html';
let html = fs.readFileSync(filePath, 'utf8');

// ── Arg parser: "arg1, arg2" → JSON array, or null if unparseable ────────
function parseArgs(str) {
    str = str.trim();
    if (!str) return [];
    // Replace bare `this` with sentinel string
    let s = str.replace(/\bthis\b/g, '"__this__"');
    // Convert JS single-quoted string literals to JSON double-quoted strings
    s = s.replace(/'([^']*)'/g, '"$1"');
    try {
        return JSON.parse('[' + s + ']');
    } catch (e) {
        return null;
    }
}

function argsAttr(args) {
    if (!args || !args.length) return '';
    return ` data-args='${JSON.stringify(args)}'`;
}

// ── Is this value from dynamic JS (template literal / concat)? ───────────
function isDynamic(v) {
    return /\$\{|\\['"]|'\s*\+|"\s*\+|\bvar\b|\bconst\b|\blet\b/.test(v);
}

// ── Convert a single onclick value to data-* attribute string ─────────────
const COMPLEX = {
    "document.getElementById('apexFileInput').click()":                '_apexTriggerFileInput',
    "document.getElementById('comms-qr-modal').remove()":              '_apexRemoveQrModal',
    "document.getElementById('compose-modal').remove()":               '_apexRemoveComposeModal',
};

function convertClick(value) {
    value = value.trim();
    if (isDynamic(value)) return null;

    // Named complex cases
    if (COMPLEX[value]) return `data-fn="${COMPLEX[value]}"`;

    // Multi-statement sys-suggestions toggle (match on unique substr)
    if (value.includes('sys-suggestions') && value.includes('sys-sugg-chev')) {
        return 'data-fn="_apexToggleSysSuggestions"';
    }

    let extra = '';

    // event.stopPropagation() prefix
    if (/^event\.stopPropagation\s*\(\s*\)\s*;/.test(value)) {
        value = value.replace(/^event\.stopPropagation\s*\(\s*\)\s*;\s*/, '');
        extra += ' data-stop="1"';
    }

    // if(event.target===this)fn()
    const selfM = value.match(/^if\s*\(\s*event\.target\s*===\s*this\s*\)\s*(.+)$/);
    if (selfM) { value = selfM[1].trim(); extra += ' data-self-only="1"'; }

    // if(!event.target.closest('.x'))fn()
    const notInM = value.match(/^if\s*\(!event\.target\.closest\('([^']+)'\)\)\s*(.+)$/);
    if (notInM) { extra += ` data-not-in="${notInM[1]}"`; value = notInM[2].trim(); }

    // window.fn && window.fn() — guard pattern
    const guardM = value.match(/^window\.(\w+)\s*&&\s*window\.\1\s*\(\s*\)$/);
    if (guardM) return `data-fn="${guardM[1]}" data-guard="1"${extra}`;

    // window.fn(...) or fn(...)
    const fnM = value.match(/^(?:window\.)?(\w[\w.]*)\s*\((.*)\)$/s);
    if (fnM) {
        const fn = fnM[1];
        const args = parseArgs(fnM[2]);
        if (args !== null) return `data-fn="${fn}"${argsAttr(args)}${extra}`;
    }

    return null; // Complex — leave unconverted
}

// ── Convert other event types ─────────────────────────────────────────────
function convertSimpleFn(value, dataAttr) {
    if (isDynamic(value)) return null;
    value = value.trim();
    const fnM = value.match(/^(\w+)\s*\(([^)]*)\)$/);
    if (fnM) {
        const args = parseArgs(fnM[2]);
        if (args !== null) return ` ${dataAttr}="${fnM[1]}"${argsAttr(args)}`;
    }
    return null;
}

// ── Track unconverted handlers ────────────────────────────────────────────
const remaining = [];

// ── onclick ───────────────────────────────────────────────────────────────
html = html.replace(/ onclick="([^"]*)"/g, (match, value) => {
    const converted = convertClick(value);
    if (converted !== null) return ' ' + converted;
    if (!isDynamic(value)) remaining.push('onclick: ' + value.trim().substring(0, 120));
    return match;
});

// ── onchange ──────────────────────────────────────────────────────────────
// apexFileRead(this.files[0]) — special: needs file object at call time
html = html.replace(/ onchange="apexFileRead\(this\.files\[0\]\)"/g,
    ' data-change="_apexFileReadProxy"');

html = html.replace(/ onchange="([^"]*)"/g, (match, value) => {
    const r = convertSimpleFn(value, 'data-change');
    if (r !== null) return r;
    remaining.push('onchange: ' + value);
    return match;
});

// ── oninput ───────────────────────────────────────────────────────────────
// renderCmdList(this.value) — passes current input value
html = html.replace(/ oninput="renderCmdList\(this\.value\)"/g,
    ' data-input="_apexCmdInputProxy"');

html = html.replace(/ oninput="([^"]*)"/g, (match, value) => {
    const r = convertSimpleFn(value, 'data-input');
    if (r !== null) return r;
    remaining.push('oninput: ' + value);
    return match;
});

// ── onkeydown ─────────────────────────────────────────────────────────────
// cmdKeyNav(event) — passes event
html = html.replace(/ onkeydown="cmdKeyNav\(event\)"/g,
    ' data-keydown="cmdKeyNav"');

// if(event.key==='Enter')apexResearch('search') — conditional
html = html.replace(/ onkeydown="if\s*\(event\.key\s*===\s*'Enter'\s*\)\s*apexResearch\s*\('search'\)"/g,
    ' data-keydown="_apexEnterResearchProxy"');

// if(event.key==='Enter')sendDomainAgentMsg() — conditional
html = html.replace(/ onkeydown="if\s*\(event\.key\s*===\s*'Enter'\s*\)\s*sendDomainAgentMsg\s*\(\s*\)"/g,
    ' data-keydown="_apexEnterDomainMsgProxy"');

html = html.replace(/ onkeydown="([^"]*)"/g, (match, value) => {
    const r = convertSimpleFn(value, 'data-keydown');
    if (r !== null) return r;
    remaining.push('onkeydown: ' + value);
    return match;
});

// ── onmouseover / onmouseout — replaced with CSS :hover where possible ────
// Inline style-manipulation → strip entirely (CSS handles hover effects)
html = html.replace(/ onmouseover="this\.style\.[^"]*"/g, '');
html = html.replace(/ onmouseout="this\.style\.[^"]*"/g, '');

html = html.replace(/ onmouseover="([^"]*)"/g, (match, value) => {
    const r = convertSimpleFn(value, 'data-hover');
    if (r !== null) return r;
    remaining.push('onmouseover: ' + value);
    return match;
});

html = html.replace(/ onmouseout="([^"]*)"/g, (match, value) => {
    const r = convertSimpleFn(value, 'data-unhover');
    if (r !== null) return r;
    remaining.push('onmouseout: ' + value);
    return match;
});

// ── Dynamic JS-generated onclick inside innerHTML strings ─────────────────
// These appear inside <script> template literals / string concatenation.
// Convert the most common patterns so rendered elements also work.

// approveAgentTask(${parseInt(task.id,10)||0}, this)
html = html.replace(
    /onclick="approveAgentTask\(\$\{parseInt\(task\.id,10\)\|\|0\},\s*this\)"/g,
    'data-fn="approveAgentTask" data-args=\'[${parseInt(task.id,10)||0},"__this__"]\''
);

// rejectAgentTask(${parseInt(task.id,10)||0}, this)
html = html.replace(
    /onclick="rejectAgentTask\(\$\{parseInt\(task\.id,10\)\|\|0\},\s*this\)"/g,
    'data-fn="rejectAgentTask" data-args=\'[${parseInt(task.id,10)||0},"__this__"]\''
);

// approveFeature('${fid}', true/false)
html = html.replace(
    /onclick="approveFeature\('(\$\{[^}]+\})',\s*(true|false)\)"/g,
    (m, fid, val) => `data-fn="approveFeature" data-args='["${fid}",${val}]'`
);

// toggleRoutine(${parseInt(r.id,10)||0}, ${!r.active})
html = html.replace(
    /onclick="toggleRoutine\((\$\{[^}]+\}),\s*(\$\{[^}]+\})\)"/g,
    (m, id, active) => `data-fn="toggleRoutine" data-args='[${id},${active}]'`
);

// toggleTimelineLogs('${tid}')
html = html.replace(
    /onclick="toggleTimelineLogs\('(\$\{[^}]+\})'\)"/g,
    (m, tid) => `data-fn="toggleTimelineLogs" data-args='["${tid}"]'`
);

// switchPage('${...}' or \'...\' + concat patterns)
html = html.replace(
    /onclick="switchPage\('(\$\{[^}]+\})'\)"/g,
    (m, page) => `data-fn="switchPage" data-args='["${page}"]'`
);

// String-concat patterns: onclick="fn(\''+var+'\')
html = html.replace(
    /onclick="approveTask\(\\''\+([^+]+)\+'\\'\)"/g,
    (m, id) => `data-fn="approveTask" data-args=\'["'+${id}+'"]\' `
);
html = html.replace(
    /onclick="denyTask\(\\''\+([^+]+)\+'\\'\)"/g,
    (m, id) => `data-fn="denyTask" data-args=\'["'+${id}+'"]\' `
);
html = html.replace(
    /onclick="editCrmClient\(\\''\+([^+]+)\+'\\'\)"/g,
    (m, id) => `data-fn="editCrmClient" data-args=\'["'+${id}+'"]\' `
);
html = html.replace(
    /onclick="openAgentDrawer\(\\''\s*\+\s*([^+]+)\+\s*'\\'\)"/g,
    (m, role) => `data-fn="openAgentDrawer" data-args=\'["'+${role.trim()}+'"]\' `
);
html = html.replace(
    /onclick="openDomainAgent\(\\''\+([^+]+)\+'\\'\)"/g,
    (m, id) => `data-fn="openDomainAgent" data-args=\'["'+${id}+'"]\' `
);
html = html.replace(
    /onclick="toggleSupplement\(\\''\+([^+]+)\+'\\'\)"/g,
    (m, id) => `data-fn="toggleSupplement" data-args=\'["'+${id}+'"]\' `
);

// rejectEmail / openReplyDraft / previewEmailDraft with template literals
html = html.replace(
    /onclick="rejectEmail\('(\$\{[^}]+\})'\)"/g,
    (m, id) => `data-fn="rejectEmail" data-args='["${id}"]'`
);
html = html.replace(
    /onclick="openReplyDraft\('(\$\{[^}]+\})'\)"/g,
    (m, id) => `data-fn="openReplyDraft" data-args='["${id}"]'`
);
html = html.replace(
    /onclick="previewEmailDraft\('(\$\{[^}]+\})'\)"/g,
    (m, id) => `data-fn="previewEmailDraft" data-args='["${id}"]'`
);

// runTaskById
html = html.replace(
    /onclick="runTaskById\('(\$\{[^}]+\})'\)"/g,
    (m, id) => `data-fn="runTaskById" data-args='["${id}"]'`
);

// viewNotification('${id}', '${title}')
html = html.replace(
    /onclick="viewNotification\('(\$\{[^}]+\})',\s*'(\$\{[^}]+\})'\)"/g,
    (m, id, title) => `data-fn="viewNotification" data-args='["${id}","${title}"]'`
);

// invokeAgentFromDash with template literals
html = html.replace(
    /onclick="invokeAgentFromDash\('(\$\{[^}]+\})','(\$\{[^}]+\})'\)"/g,
    (m, slug, name) => `data-fn="invokeAgentFromDash" data-args='["${slug}","${name}"]'`
);

// executeCmdItem(${expr})
html = html.replace(
    /onclick="executeCmdItem\((\$\{[^}]+\})\)"/g,
    (m, idx) => `data-fn="executeCmdItem" data-args='[${idx}]'`
);

// _agentSetCat('${c}') — template
html = html.replace(
    /onclick="_agentSetCat\('(\$\{[^}]+\})'\)"/g,
    (m, c) => `data-fn="_agentSetCat" data-args='["${c}"]'`
);

// _agentSetCat('') — static empty string (should have been caught, safety net)
html = html.replace(
    /onclick="_agentSetCat\(''\)"/g,
    `data-fn="_agentSetCat" data-args='[""]'`
);

// selectMood with concat: onclick="selectMood(' + ((i+1)*2) + ', this)"
html = html.replace(
    /onclick="selectMood\('\s*\+\s*([^+]+)\+\s*',\s*this\)"/g,
    (m, expr) => `data-fn="selectMood" data-args='['+${expr.trim()}+',"__this__"]'`
);

// switchPage with concat: onclick="switchPage(\'' + var + '\')"
html = html.replace(
    /onclick="switchPage\(\\''\s*\+\s*([^+]+)\+\s*'\\'\)"/g,
    (m, page) => `data-fn="switchPage" data-args='["'+${page.trim()}+'"]\' `
);

// ' + refetchFnName + '() — ultra-dynamic, convert to registry call
html = html.replace(
    /onclick="'\s*\+\s*refetchFnName\s*\+\s*'\(\)"/g,
    `data-fn="_apexRefetchProxy" data-refetch="1"`
);

fs.writeFileSync(filePath, html, 'utf8');

console.log('\n✓ dashboard.html written.');
if (remaining.length) {
    console.log('\n⚠ Remaining unconverted handlers:');
    remaining.forEach(r => console.log('  ' + r));
} else {
    console.log('✓ All static handlers converted.');
}
