'use strict';
const router = require('express').Router();
const _auth  = require('../lib/app-auth');

const _gateway        = require('../lib/memory/gateway');
const _wm             = require('../lib/memory/working-memory');
const _sessionTracker = require('../lib/temporal/session-tracker');
const _agentQueue     = require('../lib/agent-queue');
const { _startAutoPipeline }                                        = require('../lib/auto-pipeline');
const { APEX_TOOLS, executeApexTool }                               = require('../lib/apex-tools');
const { formatRecentMemory, getMemorySummary, extractAndSaveFacts, buildAlexContext } = require('../lib/chat-context');
const { detectDomain }                                              = require('../lib/server-utils');
const { obsidianAppend }                                            = require('../agent-system/obsidian-client');
const { DOMAIN_AGENTS: _DOMAIN_AGENTS }                             = require('../agent-system/domain-agents');
const { pgSearchDocuments }                                         = require('../lib/pg_helpers');
const { getSupabaseClient, getAnthropicClient }                     = require('../lib/clients');
const { HAIKU_MODEL, SONNET_MODEL }                                 = require('../config');
const _vcRuntime = require('../lib/models/runtime');

const client  = getAnthropicClient();
const sbAdmin = getSupabaseClient();

router.post('/voice-chat', _auth, async (req, res) => {
    try {
        const rawMessage = req.body?.message;

        if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
            return res.status(400).json({ ok: false, reply: 'Please enter a message.' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({ ok: false, reply: 'Missing ANTHROPIC_API_KEY in .env' });
        }

        const vcTimeout = setTimeout(() => {
            if (!res.headersSent) res.status(504).json({ ok: false, reply: 'Request timed out. Please try again.' });
        }, 45000);

        const t0 = Date.now();
        console.log('[LATENCY] +0ms request received');

        const userMessage = rawMessage.trim();

        setImmediate(() => _gateway.storeMemory({ layer: 2, source: 'voice_chat', content: JSON.stringify({ role: 'user', message: userMessage }), tags: ['conversation', 'voice'], requestingEntity: 'voice_chat', taskId: req.conversationId }).catch(() => {}));

        // Phase 13 — Conversational influence closure
        {
            const _p13words  = userMessage.trim().split(/\s+/).length;
            const _p13affirm = /^(yes|yep|yeah|perfect|exactly|that'?s(?: right)?|confirmed|correct|spot on|absolutely|precisely|indeed)\b[\s!.]*$/i.test(userMessage.trim());
            if (_p13words <= 5 && _p13affirm && req.conversationId) {
                setImmediate(async () => {
                    try {
                        const priorLessons = await _wm.get(req.conversationId, 'execution_context').catch(() => null);
                        if (priorLessons?.length) {
                            const _rfx = require('../lib/memory/reflexion-tracker');
                            for (const l of priorLessons) {
                                if (l.content) await _rfx.recordInfluence(l.content, req.conversationId, 'conversational').catch(() => {});
                            }
                        }
                    } catch {}
                });
            }
        }

        // Query classification — zero-latency, decides which context sources to load
        const _words = userMessage.trim().split(/\s+/);
        const _isGreeting = _words.length <= 5 &&
            /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|yep|nope|sure|what time|what date|what day|how are you|good morning|good evening|good night|bye|goodbye)[\s?!.]*$/i.test(userMessage.trim());
        const _isConversational = !_isGreeting && _words.length <= 15 &&
            /\b(your (purpose|goal|name|role|job|mission|function|design)|who (are|is) you|what (are|is) (you|apex|this)|what can you (do|help)|tell me about (yourself|apex)|introduce yourself|explain (yourself|apex|what you do)|how (do|does|did) you (work|learn|think|grow)|your (capabilities|abilities|skills))\b/i.test(userMessage.trim());
        const _isFastPath = _isGreeting || _isConversational;

        // Context fetch
        const _wikiReader = (() => { try { return require('../agent-system/wiki-reader'); } catch { return null; } })();
        let memSummary = '', recentMem = '', alexContext = '', relevantDocs = [], wikiCtx = '', gatewayCtx = null, _voiceTemporal = null;
        if (_isConversational) {
            // zero context — fastest possible path
        } else if (_isGreeting) {
            [alexContext, gatewayCtx] = await Promise.race([
                Promise.all([
                    buildAlexContext().catch(() => ''),
                    _gateway.getContext({ description: userMessage, requestingEntity: 'api_client', tokenBudget: 500, layers: [0, 2, 10], taskId: req.conversationId }).catch(() => null),
                ]),
                new Promise(r => setTimeout(() => r(['', null]), 3000))
            ]).catch(() => ['', null]);
        } else {
            [memSummary, recentMem, alexContext, relevantDocs, wikiCtx, gatewayCtx, _voiceTemporal] = await Promise.all([
                getMemorySummary().catch(() => ''),
                formatRecentMemory().catch(() => ''),
                buildAlexContext().catch(() => ''),
                pgSearchDocuments(userMessage.toLowerCase()).catch(() => []),
                _wikiReader ? _wikiReader.getWikiContext(userMessage).catch(() => '') : Promise.resolve(''),
                _gateway.getContext({ description: userMessage, requestingEntity: 'api_client', tokenBudget: 2000, taskId: req.conversationId }).catch(() => null),
                _sessionTracker.getSessionContext(req.conversationId).catch(() => null),
            ]);
            setImmediate(() => _wm.set(req.conversationId || 'voice', 'current_conversation', { message: userMessage, at: new Date().toISOString() }, { source: 'voice_chat', ttlSeconds: 7200 }).catch(() => {}));
        }
        console.log(`[LATENCY] +${Date.now() - t0}ms context fetch done (${_isConversational ? 'zero-ctx' : _isGreeting ? 'greeting' : 'full'})`);

        // Keyword-only domain routing
        const _kwDomain = detectDomain(userMessage);
        const lcRoute = { domain: _kwDomain || 'general', confidence: _kwDomain ? 0.8 : 0, needs_data: !!_kwDomain };

        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, i) => `DOC ${i + 1}: ${doc.filename} — ${doc.summary || 'No summary'}`).join('\n')
            : '';

        const contextParts = [];
        if (wikiCtx)    contextParts.push(`VAULT CONTEXT:\n${wikiCtx}`);
        if (memSummary) contextParts.push(`MEMORY SUMMARY:\n${memSummary}`);
        if (recentMem)  contextParts.push(`RECENT CONVERSATION:\n${recentMem}`);
        if (docsText)   contextParts.push(`WORKSPACE DOCUMENTS:\n${docsText}`);
        const enrichedContext = contextParts.join('\n\n---\n\n');

        console.log(`[LATENCY] +${Date.now() - t0}ms building request | domain:${lcRoute.domain}`);

        const _domainSlug  = detectDomain(userMessage);
        let _domainAgent   = _domainSlug ? _DOMAIN_AGENTS[_domainSlug] : null;
        if (_domainAgent && _domainSlug) {
            const _sra = require('../lib/cognitive/skill-routing-advisor');
            const _vcSkillConf = await _sra.getConfidence(_domainSlug).catch(() => 0.5);
            if (_vcSkillConf < 0.4) _domainAgent = null;
        }
        if (_domainAgent) console.log(`[LATENCY] +${Date.now() - t0}ms domain: ${_domainAgent.name}`);
        let finalReply = '';

        if (!finalReply) {
            const _voiceModel = _isFastPath ? HAIKU_MODEL : SONNET_MODEL;
            const messages    = [{ role: 'user', content: userMessage }];
            let loopCount = 0;
            const maxLoops = 8;

            while (loopCount < maxLoops) {
                loopCount++;
                const { result: response } = await _vcRuntime.execute({
                    client,
                    model:     _voiceModel,
                    caller:    'voice_chat',
                    maxTokens: _isConversational ? 45 : 200,
                    system: [
                        _voiceTemporal ? `TEMPORAL CONTEXT: ${_sessionTracker.formatForPrompt(_voiceTemporal)}` : '',
                        enrichedContext ? enrichedContext + '\n\n---\n\n' : '',
                        alexContext,
                        gatewayCtx?.lessons?.length ? `LESSONS LEARNED:\n${gatewayCtx.lessons.slice(0, 3).map(l => `• ${l.content}`).join('\n')}` : '',
                        gatewayCtx?.historical_context?.length ? `RELEVANT PAST CONTEXT:\n${gatewayCtx.historical_context.slice(0, 2).map(h => `• ${(typeof h.content === 'string' ? h.content : JSON.stringify(h.content)).slice(0, 120)}`).join('\n')}` : '',
                        (() => { try { const fc = gatewayCtx?.founder_context; if (!fc) return ''; const { abstractForExternalPrompt } = require('../lib/founder/privacy-guard'); const abs = abstractForExternalPrompt(fc); if (!abs) return ''; const parts = [abs.alignment_guidance, abs.peak_state_prompt, abs.abstracted_behavioral_guidance?.length ? `Behavioral guidance:\n${abs.abstracted_behavioral_guidance.map(g => `• ${g}`).join('\n')}` : null, abs.relevant_values?.length ? `Values: ${abs.relevant_values.slice(0,3).join(', ')}` : null, abs.applicable_principles?.length ? `Principles: ${abs.applicable_principles.slice(0,2).join(' | ')}` : null].filter(Boolean); return parts.length ? `FOUNDER ALIGNMENT:\n${parts.join('\n')}` : ''; } catch { return ''; } })(),
                        `You are Apex — Alex's personal AI operating system and intelligence engine. Address Alex as "sir". Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Alex is based in Leamington Spa, Warwickshire, England.`,
                        `VOICE RULES — mandatory: Responses are spoken aloud. Speak naturally — like a composed, intelligent aide, not a clipped command-line tool. For simple facts: 1-2 natural sentences. For complex topics: 3-4 sentences, flowing and connected. Never trail off mid-thought. No preamble, no hollow affirmations ("Certainly!", "Great question!"). No markdown, no lists, no asterisks. End cleanly — no dangling questions unless essential.`,
                        `You have full access to Alex's world: calendar, emails, tasks, files, finances, health data, notifications, the web, and persistent memory. Use tools without hesitation. When greeted, call get_notifications and get_calendar_events simultaneously. Never say you cannot access something without trying first.`,
                        `You are direct, confident, and loyal. You remember everything. You grow sharper with every conversation.`,
                        _domainAgent ? `SPECIALIST CONTEXT — ${_domainAgent.name.toUpperCase()}:\n${_domainAgent.system_prompt}` : '',
                    ].filter(Boolean).join('\n\n'),
                    tools:    _isConversational ? undefined : APEX_TOOLS,
                    messages,
                });

                if (response.stop_reason === 'tool_use') {
                    const assistantMessage = { role: 'assistant', content: response.content };
                    messages.push(assistantMessage);
                    const toolResults = [];
                    for (const block of response.content) {
                        if (block.type === 'tool_use') {
                            console.log(`[APEX] Tool call: ${block.name}`, block.input);
                            const result = await executeApexTool(block.name, block.input);
                            console.log(`[APEX] Tool result:`, result);
                            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
                        }
                    }
                    messages.push({ role: 'user', content: toolResults });
                    continue;
                }

                finalReply = response.content
                    .filter(b => b.type === 'text')
                    .map(b => b.text)
                    .join(' ')
                    .trim();
                break;
            }
        }

        if (!finalReply) finalReply = 'I was unable to complete that request, sir.';
        const reply = finalReply;

        setImmediate(() => _gateway.storeMemory({ layer: 2, source: 'voice_chat', content: JSON.stringify({ user: userMessage, assistant: reply }), tags: ['conversation', 'voice', 'exchange'], requestingEntity: 'voice_chat', taskId: req.conversationId }).catch(() => {}));
        setImmediate(() => { _sessionTracker.recordMessage(req.conversationId).catch(() => {}); require('../lib/memory/skill-memory').recordExecution('voice', 'conversation', true, { source: 'voice_chat' }).catch(() => {}); });

        setImmediate(() => extractAndSaveFacts(userMessage, reply).catch(() => {}));
        setImmediate(() => {
            try {
                const _te  = require('../lib/founder/trait-evolution');
                const _imp = require('../lib/memory/importance-engine');
                const { classification } = _imp.score(userMessage, { source: 'voice_chat' });
                if (classification !== 'IGNORE' && classification !== 'SHORT_TERM') {
                    _te.recordEvidence({ trait: 'communication_pattern', observation: userMessage.slice(0, 200), confidence: 0.4, evidence: userMessage.slice(0, 300), originatingEvent: 'voice_chat' }).catch(() => {});
                }
            } catch {}
        });

        setImmediate(async () => {
            const actionWords = /\b(remind|add|schedule|book|create|set|buy|order|call|email|text|send|check|research|find|draft|write|plan|note|do|make)\b/i;
            if (actionWords.test(userMessage)) {
                try {
                    const vtId = `voice-task-${Date.now()}`;
                    await sbAdmin.from('apex_tasks').insert({
                        id: vtId,
                        title: userMessage.slice(0, 200),
                        status: 'pending',
                        source: 'voice',
                        created_at: new Date().toISOString()
                    });
                    _agentQueue.enqueue(vtId, () => _startAutoPipeline(vtId), { label: userMessage.slice(0, 80) });
                } catch {}
            }
        });

        const today     = new Date().toISOString().split('T')[0];
        const noteTitle = `13 Briefings/Conversations/${today}.md`;
        const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const noteContent = `## ${timestamp}\n\n**You:** ${userMessage}\n\n**Apex:** ${reply}\n`;
        obsidianAppend(noteTitle, noteContent).catch(e =>
            console.warn('[Obsidian] write failed:', e.message)
        );

        clearTimeout(vcTimeout);
        if (res.headersSent) return;
        return res.status(200).json({ ok: true, reply });
    } catch (error) {
        clearTimeout(vcTimeout);
        console.error('VOICE CHAT ERROR:', error);
        if (res.headersSent) return;
        return res.status(error?.status || 500).json({
            ok:    false,
            reply: error?.error?.message || error?.message || 'Server error',
        });
    }
});

module.exports = router;
