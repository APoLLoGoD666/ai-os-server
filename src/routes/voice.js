'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const runtime = require('../../lib/models/runtime');

// Voice end-to-end pipeline route
// transcript → intent → browser/research → RAG → Claude → TTS → WebSocket
router.post('/api/voice/pipeline', requireAppAccess, async (req, res) => {
    try {
        const { transcript, sessionId, tts = true } = req.body;
        if (!transcript) return res.status(400).json({ ok: false, error: 'transcript required' });

        const _ba = require('../../agent-system/browser-agent');
        const _fc = (() => { try { const m = require('../../agent-system/firecrawl-bridge'); return m.isAvailable() ? m : null; } catch { return null; } })();
        const _rag = require('../../agent-system/rag-bridge');

        // 1. Intent classification
        const { result: intentRes } = await runtime.execute({
            tier: 'fast', caller: 'voice-intent',
            maxTokens: 200,
            system: 'Classify the user intent. Reply with JSON only: {"intent":"research|browser|rag|direct","query":"refined query or null"}',
            messages: [{ role: 'user', content: transcript }]
        });
        let intent = { intent: 'direct', query: transcript };
        try {
            const txt = intentRes.content[0].text;
            intent = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        } catch {}

        // 2. Fetch context based on intent
        let context = '';
        if (intent.intent === 'research' && _fc) {
            try {
                const sr = await _fc.search(intent.query || transcript, { limit: 3 });
                context = (sr.results || []).map(r => `${r.title}: ${r.snippet || r.markdown || ''}`).join('\n').slice(0, 1500);
            } catch {}
        } else if (intent.intent === 'browser') {
            try {
                const aria = await _ba.ariaSnapshot(intent.query || transcript);
                context = aria.ariaTree ? aria.ariaTree.slice(0, 1500) : '';
            } catch {}
        } else if (intent.intent === 'rag') {
            try {
                const ragRes = await _rag.query(intent.query || transcript, 'hybrid', 5);
                context = ragRes.answer ? ragRes.answer.slice(0, 1500) : '';
            } catch {}
        }

        // 3. Generate response via Claude
        const { result: finalRes } = await runtime.execute({
            tier: 'fast', caller: 'voice-response',
            maxTokens: 500,
            system: 'You are Apex, a concise voice assistant. Respond in 1-3 sentences suitable for speech synthesis. No markdown, no bullet points.',
            messages: [{ role: 'user', content: `${context ? `Context:\n${context}\n\n` : ''}User: ${transcript}` }]
        });
        const answer = finalRes.content[0].text.trim();

        // 4. Push via WebSocket if session connected
        if (global._wsBroadcast) {
            global._wsBroadcast({ type: 'voice_response', sessionId, answer },
                meta => !sessionId || meta.sessionId === sessionId);
        }

        res.json({ ok: true, transcript, intent: intent.intent, answer, context: context.slice(0, 200) });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
