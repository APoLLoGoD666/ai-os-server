'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { kernelChain } = require('../../lib/kernel');
const { getMastraAgents } = require('../../lib/server-state');
const runtime = require('../../lib/models/runtime');
const { detectDomain } = require('../../lib/server-utils');
const { loadMemory, buildPrompt, fetchSelfContext } = require('../../lib/chat-context');
const { getRelevantDocuments } = require('../../lib/workspace');
const { pgSearchDocuments } = require('../../lib/pg_helpers');
const _cogOrch = require('../../lib/cognitive-orchestrator');
const _sessionReg = require('../../lib/session-state-registry');
const _timingEng = require('../../lib/response-timing-engine');
const _pcm = require('../../lib/persistent-cognition-manager');
const _eae = require('../../lib/executive-arbitration-engine');
const _spe = require('../../lib/strategic-planning-engine');
const _gateway = require('../../lib/memory/gateway');
const _wm = require('../../lib/memory/working-memory');
const _sessionTracker = require('../../lib/temporal/session-tracker');
const { DOMAIN_AGENTS: _DOMAIN_AGENTS, invokeDomainAgent: _invokeDomainAgent, detectGovernanceIntent: _detectGovernanceIntent } = require('../../agent-system/domain-agents');
const agentLib = require('../../agent-system/agent-library');
const { handleCommand } = require('../../lib/agent-command-handler');
const { toolUseInputToCommand: _toolUseInputToCommand } = require('../../lib/agent-execution-utils');
const { timeAgo } = require('../../lib/chat-context');
const client = require('../../lib/clients').getAnthropicClient();
const { HAIKU_MODEL } = require('../../config');

// Module-level counter for cognitive evolution trigger (B5)
let _chatCountSinceEvolution = 0;

const TOOLS = [
    { name: "save_note", description: "Save a note to the workspace with a classification.", input_schema: { type: "object", properties: { content: { type: "string", description: "The note content to save." }, classification: { type: "string", enum: ["uni", "business", "personal"], description: "Category for the note." } }, required: ["content", "classification"] } },
    { name: "read_file", description: "Read a file from the workspace by filename.", input_schema: { type: "object", properties: { filename: { type: "string", description: "The filename to read." } }, required: ["filename"] } },
    { name: "delete_file", description: "Delete a file from the workspace by filename.", input_schema: { type: "object", properties: { filename: { type: "string", description: "The filename to delete." } }, required: ["filename"] } },
    { name: "rename_file", description: "Rename a file in the workspace.", input_schema: { type: "object", properties: { oldName: { type: "string", description: "Current filename." }, newName: { type: "string", description: "New filename." } }, required: ["oldName", "newName"] } },
    { name: "list_files", description: "List all files in the workspace.", input_schema: { type: "object", properties: {} } },
    { name: "list_documents", description: "List all saved documents in Postgres.", input_schema: { type: "object", properties: {} } },
    { name: "search_documents", description: "Search saved documents by keyword.", input_schema: { type: "object", properties: { keyword: { type: "string", description: "Keyword to search for." } }, required: ["keyword"] } },
    { name: "create_file", description: "Create a new file in the workspace with specific content.", input_schema: { type: "object", properties: { filename: { type: "string", description: "The filename to create." }, content: { type: "string", description: "The file content." } }, required: ["filename", "content"] } },
    { name: "summarise_file", description: "Summarise the contents of a workspace file.", input_schema: { type: "object", properties: { filename: { type: "string", description: "The filename to summarise." } }, required: ["filename"] } },
    { name: "delete_document", description: "Delete a saved document from Postgres.", input_schema: { type: "object", properties: { filename: { type: "string", description: "The document filename to delete." } }, required: ["filename"] } },
    { name: "log_expense", description: "Log a personal expense or income transaction.", input_schema: { type: "object", properties: { description: { type: "string", description: "What the transaction is for." }, amount: { type: "number", description: "The transaction amount in GBP." }, type: { type: "string", enum: ["expense", "income"], description: "Whether this is an expense or income." } }, required: ["description", "amount"] } },
    { name: "get_finance_summary", description: "Get this month's finance summary — total spend by category vs budgets.", input_schema: { type: "object", properties: {} } },
    { name: "set_budget", description: "Set a monthly budget limit for a spending category.", input_schema: { type: "object", properties: { category: { type: "string", enum: ["housing","food","transport","entertainment","business","health","savings","other"], description: "The spending category." }, amount: { type: "number", description: "Monthly budget limit in GBP." } }, required: ["category", "amount"] } },
    { name: "check_emails", description: "Check Gmail for new emails right now.", input_schema: { type: "object", properties: {} } },
    { name: "list_emails", description: "List the processed email queue — subjects, senders, summaries, priorities.", input_schema: { type: "object", properties: {} } },
    { name: "browser_research", description: "Research a URL or topic using the browser.", input_schema: { type: "object", properties: { objective: { type: "string", description: "What to research or find." }, url: { type: "string", description: "Optional starting URL." } }, required: ["objective"] } },
    { name: "browser_screenshot", description: "Take a screenshot of a webpage.", input_schema: { type: "object", properties: { url: { type: "string", description: "URL to screenshot." } }, required: ["url"] } },
    { name: "browser_pdf", description: "Generate a PDF of a webpage.", input_schema: { type: "object", properties: { url: { type: "string", description: "URL to convert to PDF." } }, required: ["url"] } },
    { name: "browser_scrape", description: "Extract structured data from a webpage.", input_schema: { type: "object", properties: { url: { type: "string", description: "URL to scrape." } }, required: ["url"] } },
    { name: "browser_fill_form", description: "Fill and submit a web form.", input_schema: { type: "object", properties: { url: { type: "string" }, fields: { type: "object" }, submit_selector: { type: "string" } }, required: ["url", "fields"] } },
    { name: "browser_click", description: "Click an element on a webpage.", input_schema: { type: "object", properties: { url: { type: "string" }, selector: { type: "string" } }, required: ["url", "selector"] } }
];

const _EXEC_ROLE_MAP = { finance: 'cfo', technology: 'cto', legal: 'clo', growth: 'cgo', strategy: 'cso', operations: 'coo' };

router.post('/chat', requireAppAccess, ...kernelChain, async (req, res) => {
    try {
        const rawMessage = req.body?.message;

        if (!rawMessage || typeof rawMessage !== "string" || !rawMessage.trim()) {
            return res.status(400).json({ ok: false, reply: "Please enter a message." });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({ ok: false, reply: "Missing ANTHROPIC_API_KEY in .env" });
        }

        const _chatT0 = Date.now();
        const chatTimeout = setTimeout(() => {
            if (!res.headersSent) res.status(504).json({ ok: false, reply: "Request timed out. Please try again." });
        }, 25000);

        const userMessage = rawMessage.trim();
        const _pcmCtx  = _pcm.resumeRelevantThreads({ userMessage, sessionId: req.conversationId });
        const _eaeSnap = _eae.generateExecutiveSnapshot(req.conversationId);
        const _speCtx  = _spe.resumeStrategicContext({ sessionId: req.conversationId, userMessage });
        const _ctxMeta = {
            resumed_cognition: _pcmCtx.hasResumed,
            resume_hint:       _pcmCtx.resumeHint,
            executive_focus:   _eaeSnap.current_focus,
            executive_summary: _eaeSnap.executive_summary,
            strategic_hint:    _speCtx.hasStrategicContext ? _speCtx.hint : null,
            strategic_context: _speCtx.activeObjective ? {
                objective_id:   _speCtx.activeObjective.objective_id,
                title:          _speCtx.activeObjective.title,
                progress_score: _speCtx.activeObjective.progress_score,
            } : null,
        };

        // Governance keyword routing
        const _govIntent = _detectGovernanceIntent(userMessage);
        if (_govIntent) {
            try {
                const _govResult = await _invokeDomainAgent(_govIntent.slug, _govIntent.task);
                clearTimeout(chatTimeout);
                const _govReplyRaw = `[${_govResult.agent.name}]\n\n${_govResult.reply}`;
                const { reply: _govReply, mode: _govMode, intent: _govIntent2 } = _cogOrch.shape(userMessage, _govReplyRaw, req.executionClass || 'EXECUTIVE', req.conversationId);
                const _govSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
                const _govPlan = _timingEng.buildStreamPlan(_govReply, _govIntent2, req.executionClass || 'EXECUTIVE', _govSnap);
                _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _govIntent2, userMessage, reply: _govReply, mode: _govMode, executionClass: req.executionClass });
                _eae.recordTransition({ sessionId: req.conversationId });
                _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply: _govReply, intent: _govIntent2, mode: _govMode });
                setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: _govReply }), tags: ['conversation', 'chat', 'governance'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
                setImmediate(() => { _sessionTracker.recordMessage(req.conversationId).catch(() => {}); });
                return res.status(200).json({ ok: true, reply: _govReply, response_mode: _govMode, stream_plan: _govPlan });
            } catch (e) {
                if (res.headersSent) return;
                console.warn('[DomainAgent] governance intent invoke failed, falling through:', e.message);
            }
        }

        // Agent library intent detection
        const _agentIntent = agentLib.detectAgentIntent(userMessage);
        if (_agentIntent) {
            try {
                const _agentResult = await agentLib.invokeAgent(_agentIntent.slug, _agentIntent.task);
                clearTimeout(chatTimeout);
                const _agentReplyRaw = `[${_agentResult.agent.name}]\n\n${_agentResult.reply}`;
                const { reply: _agentReply, mode: _agentMode, intent: _agentIntent2 } = _cogOrch.shape(userMessage, _agentReplyRaw, req.executionClass || 'EXECUTIVE', req.conversationId);
                const _agentSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
                const _agentPlan = _timingEng.buildStreamPlan(_agentReply, _agentIntent2, req.executionClass || 'EXECUTIVE', _agentSnap);
                _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _agentIntent2, userMessage, reply: _agentReply, mode: _agentMode, executionClass: req.executionClass });
                _eae.recordTransition({ sessionId: req.conversationId });
                _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply: _agentReply, intent: _agentIntent2, mode: _agentMode });
                setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: _agentReply }), tags: ['conversation', 'chat', 'agent'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
                setImmediate(() => { _sessionTracker.recordMessage(req.conversationId).catch(() => {}); require('../../lib/memory/skill-memory').recordExecution('chat', 'conversation', true, { source: 'chat' }).catch(() => {}); if ((_agentReply||'').split(/\s+/).length > 20) { require('../../lib/memory/consolidation-engine').submit('episode', req.conversationId||`chat-${Date.now()}`, { objective:`Chat: ${userMessage.slice(0,120)}`, success:true, source:'chat_agent', reply:(_agentReply||'').slice(0,200) }, 25).catch(()=>{}); require('../../lib/intelligence/knowledge-validator').submitLesson((_agentReply||'').slice(0,400), { taskId:req.conversationId, sourceType:'observation' }).catch(()=>{}); } });
                return res.status(200).json({ ok: true, reply: _agentReply, response_mode: _agentMode, stream_plan: _agentPlan });
            } catch (e) {
                if (res.headersSent) return;
                console.warn('[AgentLib] intent invoke failed, falling through to normal chat:', e.message);
            }
        }

        const [memory, _temporal, _wmSummary] = await Promise.all([
            loadMemory(),
            _sessionTracker.getSessionContext(req.conversationId).catch(() => null),
            _wm.buildContextSummary(req.conversationId).catch(() => ''),
        ]);

        const _memBase = memory.length
            ? memory.slice(-5).map(m => `[${m.role.toUpperCase()}]${m.time ? ` (${timeAgo(m.time)})` : ""} ${m.message}`).join("\n")
            : "";
        const _temporalLine = _temporal ? `[APEX TEMPORAL CONTEXT] ${_sessionTracker.formatForPrompt(_temporal)}\n\n` : '';
        const _wmLine = _wmSummary ? `[SESSION CONTEXT]\n${_wmSummary}\n\n` : '';
        const memoryText = _wmLine + _temporalLine + _memBase;

        const _chatGwPromise = _gateway.getContext({ description: userMessage, requestingEntity: 'api_client', tokenBudget: 1500, taskId: req.conversationId }).catch(() => null);

        const _wordCount = userMessage.trim().split(/\s+/).length;
        const _chatOppPromise = _wordCount > 6
            ? require('../../lib/intelligence/opportunity-engine').getTopOpportunities(3).catch(() => [])
            : Promise.resolve([]);

        const _isStrategic = _wordCount > 20
            && /plan|strategy|strateg|decision|priorit|business|revenue|growth|invest|roadmap|goal|focus|next.*step|what.*should/i.test(userMessage);
        const _execRole = _isStrategic ? (_EXEC_ROLE_MAP[detectDomain(userMessage)] || 'cso') : null;
        const _chatExecPromise = _execRole
            ? Promise.race([
                require('../../lib/cognitive/runtime').consultExecutive(_execRole, userMessage.slice(0, 300), { taskId: req.conversationId }).catch(() => null),
                new Promise(r => setTimeout(() => r(null), 3000)),
              ])
            : Promise.resolve(null);

        const _needsDocs = userMessage.split(/\s+/).length > 6
            || /file|note|doc|save|search|find|wrote|read|creat|upload|what.*said|remind/i.test(userMessage);
        const relevantDocs = _needsDocs
            ? await getRelevantDocuments(userMessage).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(userMessage.toLowerCase()).catch(() => []); })
            : [];
        const docsText = relevantDocs.length
            ? relevantDocs.map((doc, index) => {
                const preview = (doc.content || "").slice(0, 200);
                return `\nDOCUMENT ${index + 1}\nFilename: ${doc.filename}\nType: ${doc.classification}\nSummary: ${doc.summary || "No summary"}\nContent Preview:\n${preview}\n----------------------`.trim();
            }).join("\n\n")
            : "";

        const _isConversational = userMessage.trim().split(/\s+/).length <= 3
            || /^(ok|okay|thanks|got it|yes|no|sure|alright|fine|perfect|great|nice|cool|cheers|brilliant|hi|hey|hello|sounds good|good|yep|nope|exactly|right|correct)[\s!?.]*$/i.test(userMessage.trim());
        const selfCtx = _isConversational ? null : await fetchSelfContext();

        const _chatGatewayCtx = _isConversational ? null : await _chatGwPromise;

        const _chatCogDirective = _isConversational ? null
            : await require('../../lib/cognitive/chat-cognitive-layer').getDirective(userMessage, _chatGatewayCtx).catch(() => null);

        const _chatTopOpps = await _chatOppPromise;
        const _chatExecVerdict = await _chatExecPromise;

        const _chatDomainSlug = detectDomain(userMessage);
        let _chatDomainAgent = _chatDomainSlug ? _DOMAIN_AGENTS[_chatDomainSlug] : null;
        if (_chatDomainAgent && _chatDomainSlug) {
            const _sra = require('../../lib/cognitive/skill-routing-advisor');
            const _chatSkillConf = await _sra.getConfidence(_chatDomainSlug).catch(() => 0.5);
            if (_chatSkillConf < 0.4) _chatDomainAgent = null;
        }

        const _chatEnrichedCtx = _chatGatewayCtx ? { ..._chatGatewayCtx } : {};
        if (_chatTopOpps?.length) {
            _chatEnrichedCtx._top_opportunities = _chatTopOpps.slice(0, 3).map(o => `• ${o.title} (score ${Math.round((o.composite_score||0)*100)}/100)`).join('\n');
        }
        if (_chatExecVerdict?.decision || _chatExecVerdict?.rationale) {
            _chatEnrichedCtx._executive_verdict = `[${(_execRole||'cso').toUpperCase()}] ${_chatExecVerdict.decision || ''}: ${(_chatExecVerdict.rationale||'').slice(0,200)}`;
        }

        const prompt = buildPrompt(userMessage, memoryText, docsText, selfCtx, _chatEnrichedCtx);

        const mastraAgents = getMastraAgents();
        if (mastraAgents && mastraAgents.apexAgent) {
            const historyMessages = memory.slice(-3).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.message
            }));
            const _olderMemText = (_temporalLine || '') + memory.slice(0, -3)
                .map(m => `[${m.role.toUpperCase()}] ${m.message}`).join('\n');
            const mastraPrompt = [
                _chatDomainAgent ? `SPECIALIST CONTEXT — ${_chatDomainAgent.name.toUpperCase()}:\n${_chatDomainAgent.system_prompt}` : null,
                _chatCogDirective ? `COGNITIVE DIRECTIVE: ${_chatCogDirective}` : null,
                buildPrompt(userMessage, _olderMemText, docsText, selfCtx, _chatEnrichedCtx),
            ].filter(Boolean).join('\n\n---\n\n');

            const _needsFullTools = /email|mail|inbox|gmail|spend|expense|budget|transaction|finance|money|web|url|http|google|scrape|browser|routine|schedule|cron/i.test(userMessage);
            const _agent = (!_needsFullTools && mastraAgents.coreApexAgent)
                ? mastraAgents.coreApexAgent
                : mastraAgents.apexAgent;

            const result = await _agent.generate([
                ...historyMessages,
                { role: "user", content: mastraPrompt }
            ]);
            clearTimeout(chatTimeout);
            const _mastraRaw = result.text || "No response from AI";
            const { reply, mode: _mastraMode, intent: _mastraIntent } = _cogOrch.shape(userMessage, _mastraRaw, req.executionClass || 'EXECUTIVE', req.conversationId);
            const _mastraSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
            const _mastraPlan = _timingEng.buildStreamPlan(reply, _mastraIntent, req.executionClass || 'EXECUTIVE', _mastraSnap);
            _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _mastraIntent, userMessage, reply, mode: _mastraMode, executionClass: req.executionClass });
            _eae.recordTransition({ sessionId: req.conversationId });
            _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _mastraIntent, mode: _mastraMode });
            setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: reply }), tags: ['conversation', 'chat', 'mastra'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
            setImmediate(() => { _sessionTracker.recordMessage(req.conversationId).catch(() => {}); require('../../lib/memory/skill-memory').recordExecution('chat', 'conversation', true, { source: 'chat' }).catch(() => {}); if ((reply||'').split(/\s+/).length > 20) { require('../../lib/memory/consolidation-engine').submit('episode', req.conversationId||`chat-${Date.now()}`, { objective:`Chat: ${userMessage.slice(0,120)}`, success:true, source:'chat_mastra', reply:(reply||'').slice(0,200) }, 25).catch(()=>{}); require('../../lib/intelligence/knowledge-validator').submitLesson((reply||'').slice(0,400), { taskId:req.conversationId, sourceType:'observation' }).catch(()=>{}); } });
            setImmediate(() => {
                _wm.set(req.conversationId, 'chat_context', {
                    domain: _chatDomainSlug || null,
                    executiveFocus: _execRole || null,
                    cognitiveMode: _chatCogDirective?.match(/REASONING MODE: (\w+)/)?.[1] || null,
                    lastIntent: userMessage.slice(0, 120),
                }, { ttlSeconds: 3600, source: 'chat' }).catch(() => {});
            });
            if (!_isConversational) {
                setImmediate(() => {
                    require('../../lib/cognitive/meta-reasoning-engine').record(
                        req.conversationId, null,
                        { success: true, cost_usd: 0, duration_ms: Date.now() - _chatT0, agent_logs: [] },
                        { reasoning_mode: _chatCogDirective ? (_chatCogDirective.match(/REASONING MODE: (\w+)/)?.[1] || 'ANALYTICAL') : 'ANALYTICAL' },
                        null
                    ).catch(() => {});
                });
                _chatCountSinceEvolution++;
                if (_chatCountSinceEvolution >= 100) {
                    _chatCountSinceEvolution = 0;
                    setImmediate(() => { require('../../lib/cognitive/cognitive-evolution-engine').runEvolutionCycle().catch(() => {}); });
                }
            }
            return res.status(200).json({
                ok: true,
                reply,
                response_mode: _mastraMode,
                stream_plan: _mastraPlan,
                memoryUsed: true,
                documentsUsed: relevantDocs.length
            });
        }

        // Fallback: raw Anthropic SDK if Mastra not initialised
        const { result: streamMsg } = await runtime.execute({
            client, model: HAIKU_MODEL, caller: 'chat_fallback', maxTokens: 500,
            tools: TOOLS,
            messages: [{ role: 'user', content: prompt }],
        });

        clearTimeout(chatTimeout);

        const toolUseBlock = (streamMsg.content || []).find(part => part.type === "tool_use");

        if (toolUseBlock) {
            const command = _toolUseInputToCommand(toolUseBlock.name, toolUseBlock.input || {});

            if (command) {
                const result = await handleCommand(command, req.identity?.humanId);
                setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: result.reply }), tags: ['conversation', 'chat', 'tool'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
                setImmediate(() => { _sessionTracker.recordMessage(req.conversationId).catch(() => {}); require('../../lib/memory/skill-memory').recordExecution('chat', 'conversation', true, { source: 'chat' }).catch(() => {}); if ((result.reply||'').split(/\s+/).length > 20) { require('../../lib/memory/consolidation-engine').submit('episode', req.conversationId||`chat-${Date.now()}`, { objective:`Chat: ${userMessage.slice(0,120)}`, success:true, source:'chat_tool', reply:(result.reply||'').slice(0,200) }, 25).catch(()=>{}); require('../../lib/intelligence/knowledge-validator').submitLesson((result.reply||'').slice(0,400), { taskId:req.conversationId, sourceType:'observation' }).catch(()=>{}); } });
                return res.status(result.ok ? 200 : 404).json(result);
            }
        }

        const _rawReply = (streamMsg.content || [])
            .filter(part => part.type === "text")
            .map(part => part.text || "")
            .join("\n")
            .trim() || "No response from AI";

        const { reply, mode: _sdkMode, intent: _sdkIntent } = _cogOrch.shape(userMessage, _rawReply, req.executionClass || 'EXECUTIVE', req.conversationId);
        const _sdkSnap = { ..._sessionReg.getDerivedCognitiveSnapshot(req.conversationId), ..._ctxMeta };
        const _sdkPlan = _timingEng.buildStreamPlan(reply, _sdkIntent, req.executionClass || 'EXECUTIVE', _sdkSnap);
        _pcm.updateFromResponse({ sessionId: req.conversationId, intent: _sdkIntent, userMessage, reply, mode: _sdkMode, executionClass: req.executionClass });
        _eae.recordTransition({ sessionId: req.conversationId });
        _spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _sdkIntent, mode: _sdkMode });
        setImmediate(() => { _gateway.storeMemory({ layer: 2, source: 'chat', content: JSON.stringify({ user: userMessage, assistant: reply }), tags: ['conversation', 'chat', 'sdk'], requestingEntity: 'api_client', taskId: req.conversationId }).catch(() => {}); });
        setImmediate(() => { _sessionTracker.recordMessage(req.conversationId).catch(() => {}); require('../../lib/memory/skill-memory').recordExecution('chat', 'conversation', true, { source: 'chat' }).catch(() => {}); if ((reply||'').split(/\s+/).length > 20) { require('../../lib/memory/consolidation-engine').submit('episode', req.conversationId||`chat-${Date.now()}`, { objective:`Chat: ${userMessage.slice(0,120)}`, success:true, source:'chat_sdk', reply:(reply||'').slice(0,200) }, 25).catch(()=>{}); require('../../lib/intelligence/knowledge-validator').submitLesson((reply||'').slice(0,400), { taskId:req.conversationId, sourceType:'observation' }).catch(()=>{}); } });

        return res.status(200).json({
            ok: true,
            reply,
            response_mode: _sdkMode,
            stream_plan: _sdkPlan,
            memoryUsed: true,
            documentsUsed: relevantDocs.length
        });
    } catch (error) {
        clearTimeout(chatTimeout);
        console.error("CHAT ERROR:", error);
        return res.status(error?.status || 500).json({
            ok: false,
            reply: error?.error?.message || error?.message || "Server error"
        });
    }
});

module.exports = router;
