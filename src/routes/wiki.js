'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const runtime = require('../../lib/models/runtime');
const sbAdmin = require('../../lib/clients').getSupabaseClient();
const Anthropic = require('@anthropic-ai/sdk');

router.get('/api/wiki/health', requireAppAccess, async (req, res) => {
    try {
        const { checkVaultHealth } = require('../../agent-system/wiki-reader');
        const report = await checkVaultHealth();
        res.json({ ok: true, ...report });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/api/wiki/status', requireAppAccess, async (req, res) => {
    try {
        const obsidianMemory = require('../../agent-system/obsidian-memory');
        const fs = require('fs');
        const path = require('path');
        const { OBSIDIAN_VAULT_PATH: VAULT } = require('../../config');
        let lastWrite = null;
        let noteCount = 0;
        try {
            const stat = fs.statSync(path.join(VAULT, '01 Executive/Lessons.md'));
            lastWrite = stat.mtime.toISOString();
        } catch {}
        try {
            const health = fs.readFileSync(path.join(VAULT, '01 Executive/VaultHealth.md'), 'utf8');
            const m = health.match(/Total notes:\*\* (\d+)/);
            if (m) noteCount = parseInt(m[1]);
        } catch {}
        const recentLessons = obsidianMemory.getRecentLessons(3);
        res.json({ ok: true, vaultConfigured: !!process.env.OBSIDIAN_VAULT_PATH, lastWrite, noteCount, recentLessons: recentLessons?.slice(0, 300) || '' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/api/wiki/entity/:name', requireAppAccess, async (req, res) => {
    try {
        const { getEntityContext } = require('../../agent-system/wiki-reader');
        const result = await getEntityContext(req.params.name);
        if (!result) return res.status(404).json({ ok: false, error: 'Entity not found in vault' });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/wiki/search', requireAppAccess, async (req, res) => {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ ok: false, error: 'query required' });
    try {
        const obsidianMemory = require('../../agent-system/obsidian-memory');
        const results = obsidianMemory.searchVault(query);
        res.json({ ok: true, results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Voice-to-note: classify spoken text and write to correct vault note
router.post('/api/wiki/voice-note', requireAppAccess, async (req, res) => {
    const { text, source } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });
    try {
        const lower = text.toLowerCase();
        const isMemoryIntent = /\b(remember|note that|keep in mind|don't forget|save this|store this|record that)\b/.test(lower);
        if (!isMemoryIntent) return res.json({ ok: true, saved: false, reason: 'No memory intent detected' });

        const content = text.replace(/^(hey apex[,.]?\s*)?(please\s+)?(remember|note that|keep in mind|don't forget|save this|store this|record that)[,:]?\s*/i, '').trim();
        if (!content) return res.json({ ok: true, saved: false, reason: 'Empty content after stripping trigger' });

        const { result: classifyRes } = await runtime.execute({
            tier: 'fast', caller: 'voice-note-classify',
            maxTokens: 80,
            messages: [{ role: 'user', content:
                `Classify this spoken note into a wiki page path.\nOptions: People/User.md, System/Decisions.md, System/WIKI.md, Entities/<Name>.md, Concepts/<Name>.md\nNote: "${content.slice(0, 300)}"\nReply ONLY with the path.`
            }]
        });
        const page = classifyRes.content[0]?.text?.trim() || 'People/User.md';
        const { obsidianAppend } = require('../../agent-system/obsidian-client');
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        await obsidianAppend(page, `## ${date} ${time} — Voice Note\n${content}\n*Source: ${source || 'voice'}*`);
        console.log(`[VoiceNote] Saved to ${page}: "${content.slice(0, 60)}..."`);
        res.json({ ok: true, saved: true, page, content: content.slice(0, 100) });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// CS249R ML Systems Book Routes
const cs249r = require('../../agent-system/cs249r-reader');

router.get('/api/wiki/cs249r', requireAppAccess, (req, res) => {
    const chapters = Object.entries(cs249r.CHAPTERS).map(([key, ch]) => ({
        key, vol: ch.vol, title: ch.title,
        keywords: ch.keywords.slice(0, 5)
    }));
    res.json({ ok: true, total: chapters.length, chapters });
});

router.post('/api/wiki/cs249r/search', requireAppAccess, (req, res) => {
    const { objective } = req.body || {};
    if (!objective) return res.status(400).json({ ok: false, error: 'objective required' });
    const matches = cs249r.findRelevantChapters(objective, 5);
    const isMLRelated = cs249r.ML_TRIGGER.test(objective);
    res.json({ ok: true, isMLRelated, matches });
});

router.get('/api/wiki/cs249r/chapter/:name', requireAppAccess, async (req, res) => {
    try {
        const content = await cs249r.fetchChapter(req.params.name);
        if (!content) return res.status(404).json({ ok: false, error: `Chapter "${req.params.name}" not found or fetch failed` });
        const ch = cs249r.CHAPTERS[req.params.name];
        res.json({ ok: true, key: req.params.name, title: ch?.title, vol: ch?.vol, content });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/wiki/cs249r/context', requireAppAccess, async (req, res) => {
    const { objective } = req.body || {};
    if (!objective) return res.status(400).json({ ok: false, error: 'objective required' });
    try {
        const context = await cs249r.getBookContext(objective);
        res.json({ ok: true, context, chars: context.length, triggered: context.length > 0 });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/wiki/ingest-cs249r', requireAppAccess, async (req, res) => {
    res.json({ ok: true, status: 'running', message: 'Ingesting 32 CS249R chapters into vault — this takes ~3 minutes' });
    setImmediate(async () => {
        try {
            const obsidianMemory = require('../../agent-system/obsidian-memory');
            const result = await cs249r.ingestAllToVault(obsidianMemory);
            await sbAdmin.from('apex_notifications').insert({
                id: `cs249r-ingest-${Date.now()}`, type: 'success', read: false,
                message: `CS249R ingest complete — ${result.succeeded}/${result.total} chapters written to 09 Knowledge/CS249R/`
            });
        } catch (e) {
            console.error('[CS249R] ingest error:', e.message);
        }
    });
});

// Wiki Ingest Route
router.post('/api/wiki/ingest', requireAppAccess, async (req, res) => {
    const { content, source } = req.body || {};
    if (!content) return res.status(400).json({ ok: false, error: 'content required' });
    try {
        const { getAnthropicClient: _wikiIngestAc } = require('../../lib/clients');
        const HAIKU_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5';
        const wikiClient = process.env.OPENROUTER_API_KEY
            ? new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' })
            : _wikiIngestAc();
        const wikiModel = process.env.OPENROUTER_API_KEY
            ? 'meta-llama/llama-3.1-8b-instruct:free' : HAIKU_MODEL;
        const { obsidianRead, obsidianWrite } = require('../../agent-system/obsidian-client');
        const today = new Date().toISOString().split('T')[0];

        const { result: classifyRes } = await runtime.execute({
            client: wikiClient, model: wikiModel,
            caller: 'wiki_ingest_classify', maxTokens: 80,
            messages: [{ role: 'user', content:
                `Classify this content into the best wiki page path. Options:\n` +
                `01 Executive/North-Star.md\n01 Executive/Decisions.md\n02 Projects/Active/Apex-AI-OS.md\n` +
                `12 Memory/Identity/Alex.md\n01 Executive/WIKI.md\n` +
                `Entities/<Name>.md  (tools, services, companies, APIs)\n` +
                `Concepts/<Name>.md  (ideas, patterns, techniques)\n` +
                `07 Relationships/People/<Name>.md    (other people)\n\n` +
                `Content: ${content.slice(0, 400)}\n\n` +
                `Reply with ONLY the page path. Replace <Name> with the actual name.`
            }]
        });
        const _rawPage = (classifyRes.content[0]?.text?.trim() || '').replace(/\.\.\//g, '').replace(/^\/+/, '').replace(/[<>:"|?*\x00-\x1f]/g, '_');
        const page = (_rawPage.endsWith('.md') ? _rawPage : (_rawPage || '01 Executive/Decisions.md') + '.md').slice(0, 200);

        const existing = await obsidianRead(page).catch(() => null);
        let merged;
        if (!existing) {
            const pageName = page.split('/').pop().replace('.md', '');
            merged = `# ${pageName}\n*Created ${today} — source: ${source || 'ingest'}*\n\n${content}`;
        } else {
            const { result: mergeRes } = await runtime.execute({
                client: wikiClient, model: wikiModel,
                caller: 'wiki_ingest_merge', maxTokens: 2000,
                system: `You maintain a living knowledge base. Merge new information into the page.
Rules:
- Update existing sections with new info rather than duplicating
- Add new sections only for genuinely new topics
- Remove redundant or superseded content
- Keep the page concise and structured for AI retrieval
- Return ONLY the complete merged markdown. No explanation.`,
                messages: [{ role: 'user', content:
                    `PAGE: ${page}  TODAY: ${today}\n\nEXISTING:\n${existing.slice(0, 3000)}\n\n` +
                    `NEW INFO (source: ${source || 'unknown'}):\n${content.slice(0, 1200)}\n\nReturn merged page only.`
                }]
            });
            merged = mergeRes.content[0]?.text?.trim() || (existing + '\n\n' + content);
        }

        await obsidianWrite(page, merged);
        res.json({ ok: true, page, action: existing ? 'merged' : 'created' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/wiki/consolidate', requireAppAccess, async (req, res) => {
    try {
        await require('../../agent-system/wiki-reader').consolidateWiki();
        res.json({ ok: true, message: 'Wiki consolidated' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
