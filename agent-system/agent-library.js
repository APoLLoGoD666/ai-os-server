'use strict';

const https     = require('https');
const path      = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const GITHUB_TREE = 'https://api.github.com/repos/msitarzewski/agency-agents/git/trees/main?recursive=1';
const RAW_BASE    = 'https://raw.githubusercontent.com/msitarzewski/agency-agents/main/';

// Directories that are agent personas (not meta/docs)
const AGENT_DIRS = new Set([
    'academic','design','engineering','finance','game-development',
    'marketing','paid-media','product','project-management','sales',
    'spatial-computing','specialized','strategy','support','testing'
]);

// In-memory cache: slug → agent
const _cache = new Map();
let   _syncedAt = 0;

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function _get(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'User-Agent': 'apex-ai-os/1.0', 'Accept': 'application/vnd.github+json' }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
        });
        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(new Error('timeout')); });
    });
}

function _getRaw(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'apex-ai-os/1.0' } }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
    });
}

// ── Markdown parser ───────────────────────────────────────────────────────────

function _parse(content, githubPath) {
    const lines = content.split('\n');

    // Title: first # heading
    const titleLine = lines.find(l => /^#{1,2}\s/.test(l));
    const name = titleLine ? titleLine.replace(/^#+\s+/, '').trim()
                           : path.basename(githubPath, '.md').replace(/[-_]/g, ' ');

    // Description: first non-empty, non-heading paragraph after title
    let desc = '';
    let pastTitle = false;
    for (const line of lines) {
        if (!pastTitle && /^#/.test(line)) { pastTitle = true; continue; }
        if (pastTitle && line.trim() && !/^#/.test(line) && !/^---/.test(line)) {
            desc = line.replace(/^>\s*/, '').trim();
            break;
        }
    }

    const parts    = githubPath.split('/');
    const category = AGENT_DIRS.has(parts[0]) ? parts[0] : 'general';
    const slug     = path.basename(githubPath, '.md');

    return { slug, name, category, description: desc.slice(0, 200), system_prompt: content, github_path: githubPath };
}

// ── Obsidian writer ───────────────────────────────────────────────────────────

function _writeToObsidian(agent) {
    try {
        const mem      = require('./obsidian-memory');
        const vaultPath = `11 Agents/Specifications/${agent.category}/${agent.slug}.md`;
        const frontmatter = [
            '---',
            `slug: "${agent.slug}"`,
            `name: "${agent.name.replace(/"/g, "'")}"`,
            `category: "${agent.category}"`,
            `source: agency-agents`,
            `synced: "${new Date().toISOString()}"`,
            '---', '', ''
        ].join('\n');
        mem.write(vaultPath, frontmatter + agent.system_prompt);
        return vaultPath;
    } catch (e) {
        console.warn('[AgentLib] Obsidian write failed for', agent.slug, ':', e.message);
        return null;
    }
}

// ── Supabase upsert ───────────────────────────────────────────────────────────

async function _upsertSupabase(sbAdmin, agents) {
    if (!sbAdmin) return;
    try {
        const rows = agents.map(a => ({
            slug:          a.slug,
            name:          a.name,
            category:      a.category,
            description:   a.description || null,
            system_prompt: a.system_prompt,
            vault_path:    a.vault_path   || null,
            github_path:   a.github_path,
            synced_at:     new Date().toISOString()
        }));

        // Batch upserts of 20
        for (let i = 0; i < rows.length; i += 20) {
            const { error } = await sbAdmin
                .from('apex_agents')
                .upsert(rows.slice(i, i + 20), { onConflict: 'slug' });
            if (error) console.warn('[AgentLib] Supabase batch error:', error.message);
        }
        console.log(`[AgentLib] ${rows.length} agents upserted to apex_agents`);
    } catch (e) {
        console.warn('[AgentLib] Supabase upsert error:', e.message);
    }
}

// ── Main sync ─────────────────────────────────────────────────────────────────

async function syncFromGitHub(sbAdmin, { obsidian = true } = {}) {
    console.log('[AgentLib] Syncing agency-agents from GitHub...');
    try {
        const tree    = await _get(GITHUB_TREE);
        const allBlobs = (tree.tree || []).filter(f => f.type === 'blob' && f.path.endsWith('.md'));

        // Agent persona files
        const agentFiles = allBlobs.filter(f => {
            const dir = f.path.split('/')[0];
            return AGENT_DIRS.has(dir);
        });

        // Strategy / playbook reference docs (write to vault only)
        const strategyFiles = allBlobs.filter(f =>
            f.path.startsWith('strategy/') || f.path.startsWith('examples/')
        );

        console.log(`[AgentLib] ${agentFiles.length} agent files | ${strategyFiles.length} strategy docs`);

        const agents = [];

        // Fetch agents in parallel batches of 12
        for (let i = 0; i < agentFiles.length; i += 12) {
            const batch = agentFiles.slice(i, i + 12);
            const results = await Promise.allSettled(
                batch.map(async f => {
                    const content = await _getRaw(`${RAW_BASE}${f.path}`);
                    return _parse(content, f.path);
                })
            );
            results.forEach(r => { if (r.status === 'fulfilled') agents.push(r.value); });
            if ((i + 12) % 60 === 0) console.log(`[AgentLib] Processed ${i + 12}/${agentFiles.length}`);
        }

        // Write strategy docs to vault (Obsidian only, not Supabase)
        if (obsidian && strategyFiles.length) {
            try {
                const mem = require('./obsidian-memory');
                for (const f of strategyFiles) {
                    try {
                        const content = await _getRaw(`${RAW_BASE}${f.path}`);
                        mem.write(`System/AgencyPlaybooks/${path.basename(f.path)}`, content);
                    } catch {}
                }
                console.log(`[AgentLib] ${strategyFiles.length} strategy docs written to vault`);
            } catch {}
        }

        // Write agent files to Obsidian in batches of 5
        if (obsidian) {
            for (let i = 0; i < agents.length; i += 5) {
                agents.slice(i, i + 5).forEach((a, j) => {
                    const vp = _writeToObsidian(a);
                    if (vp) agents[i + j].vault_path = vp;
                });
            }
            console.log('[AgentLib] Agents written to Obsidian vault under 11 Agents/Specifications/');
        }

        // Populate memory cache
        _cache.clear();
        agents.forEach(a => _cache.set(a.slug, a));
        _syncedAt = Date.now();

        // Sync index to Supabase
        if (sbAdmin) await _upsertSupabase(sbAdmin, agents);

        console.log(`[AgentLib] Sync complete — ${agents.length} agents ready`);
        return { ok: true, count: agents.length, syncedAt: new Date(_syncedAt).toISOString() };

    } catch (e) {
        console.error('[AgentLib] Sync failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// ── Load index from Supabase on startup (fast — no GitHub call) ───────────────

async function loadFromSupabase(sbAdmin) {
    if (!sbAdmin) return 0;
    try {
        const { data, error } = await sbAdmin
            .from('apex_agents')
            .select('slug,name,category,description,system_prompt,vault_path,github_path');
        if (error || !data) return 0;
        data.forEach(a => _cache.set(a.slug, a));
        _syncedAt = Date.now();
        console.log(`[AgentLib] Loaded ${data.length} agents from Supabase cache`);
        return data.length;
    } catch (e) {
        console.warn('[AgentLib] Supabase load error:', e.message);
        return 0;
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

function listAgents(category) {
    const all = [..._cache.values()];
    return category ? all.filter(a => a.category === category) : all;
}

function getAgent(slugOrKeyword) {
    if (!slugOrKeyword) return null;
    // Exact slug
    if (_cache.has(slugOrKeyword)) return _cache.get(slugOrKeyword);
    // Normalise query
    const q = slugOrKeyword.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
    // Contains match on slug
    for (const [k, v] of _cache) {
        if (k.includes(q) || k.replace(/-/g, '').includes(q.replace(/-/g, ''))) return v;
    }
    // Name fuzzy match
    const qWords = slugOrKeyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let best = null, bestScore = 0;
    for (const v of _cache.values()) {
        const nameLow = v.name.toLowerCase();
        const score   = qWords.filter(w => nameLow.includes(w)).length;
        if (score > bestScore) { bestScore = score; best = v; }
    }
    return bestScore >= 1 ? best : null;
}

function getCategories() {
    return [...new Set([..._cache.values()].map(a => a.category))].sort();
}

async function invokeAgent(slugOrKeyword, userMessage, { anthropicClient } = {}) {
    const agent = getAgent(slugOrKeyword);
    if (!agent) throw new Error(`Agent "${slugOrKeyword}" not found. Call /api/agents/sync first.`);

    const client = anthropicClient || new Anthropic();

    const response = await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system:     agent.system_prompt,
        messages:   [{ role: 'user', content: userMessage }]
    });

    return {
        agent: { slug: agent.slug, name: agent.name, category: agent.category },
        reply: response.content[0]?.text || '',
        usage: response.usage
    };
}

// Detect agent routing intent from a natural-language message.
// Returns { slug, task } or null.
function detectAgentIntent(message) {
    const patterns = [
        // "ask the frontend developer to write..."
        /\b(?:ask|get|have|tell)\s+the\s+([\w\s-]{3,40?}?)\s+(?:agent\s+)?to\s+(.{5,})/i,
        // "act as a security engineer and..."
        /\bact\s+as\s+(?:a|an|the)?\s*([\w\s-]{3,40?}?)\s+(?:and\s+)?(?:agent\s+)?[,:]?\s*(.{5,})/i,
        // "using the ux architect: do this"
        /\busing\s+(?:the\s+)?([\w\s-]{3,40?}?)\s+agent\s*[,:]?\s*(.{5,})/i,
        // "as a data engineer, ..."
        /\bas\s+(?:a|an|the)\s+([\w\s-]{3,40?}?)\s*[,:]\s*(.{5,})/i,
    ];

    for (const pat of patterns) {
        const m = message.match(pat);
        if (!m) continue;
        const roleRaw = m[1].trim().toLowerCase();
        const task    = m[2].trim();
        const agent   = getAgent(roleRaw);
        if (agent) return { slug: agent.slug, name: agent.name, task };
    }
    return null;
}

function status() {
    return {
        loaded:     _cache.size,
        syncedAt:   _syncedAt ? new Date(_syncedAt).toISOString() : null,
        categories: getCategories()
    };
}

module.exports = {
    syncFromGitHub,
    loadFromSupabase,
    listAgents,
    getAgent,
    getCategories,
    invokeAgent,
    detectAgentIntent,
    status
};
