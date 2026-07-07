'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { getMastraAgents } = require('../../lib/server-state');

router.post('/api/mastra/run', requireAppAccess, async (req, res) => {
    try {
        const mastraAgents = getMastraAgents();
        const { agent: agentName, message, workflow: workflowName, input } = req.body || {};

        if (workflowName) {
            if (!mastraAgents || !mastraAgents.mastra) {
                return res.status(503).json({ ok: false, reply: "Mastra not initialised." });
            }
            const wf = mastraAgents.mastra.getWorkflow(workflowName);
            if (!wf) return res.status(404).json({ ok: false, reply: `Workflow not found: ${workflowName}` });
            const run = await wf.createRun();
            const result = await run.start({ inputData: input || {} });
            return res.json({ ok: true, status: result.status, steps: result.steps });
        }

        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ ok: false, reply: "message is required." });
        }

        const agentMap = {
            apex: mastraAgents && mastraAgents.apexAgent,
            email: mastraAgents && mastraAgents.emailAgent,
            finance: mastraAgents && mastraAgents.financeAgent,
            routine: mastraAgents && mastraAgents.routineAgent,
            research: mastraAgents && mastraAgents.researchAgent
        };

        const target = agentMap[agentName] || (mastraAgents && mastraAgents.apexAgent);

        if (!target) {
            return res.status(503).json({ ok: false, reply: "Mastra agents not initialised." });
        }

        const result = await target.generate([{ role: "user", content: message.trim() }]);
        return res.json({ ok: true, reply: result.text, toolResults: result.toolResults });
    } catch (error) {
        console.error("MASTRA RUN ERROR:", error);
        return res.status(500).json({ ok: false, reply: error.message || "Mastra run failed." });
    }
});

router.get('/api/config', requireAppAccess, (req, res) => {
    res.json({
        ok: true,
        supabaseUrl: process.env.SUPABASE_URL || ""
    });
});

module.exports = router;
