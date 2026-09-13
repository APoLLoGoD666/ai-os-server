'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { sendEmailReply } = require('../../agent-system/email_agent');
const runtime = require('../../lib/models/runtime');

router.post('/api/send-reply', requireAppAccess, async (req, res) => {
    if (req.headers["x-user-confirmed"] !== "true") {
        return res.status(403).json({ ok: false, reply: "User confirmation required." });
    }
    try {
        const { to, subject, body, gmailId } = req.body || {};
        if (!to || !subject || !body) {
            return res.status(400).json({ ok: false, reply: "to, subject, and body are required." });
        }
        const cleanSubject = subject.replace(/[^\x00-\x7F]/g, " ").trim();
        await sendEmailReply(gmailId || "", to, cleanSubject, body);
        console.log(`SEND REPLY: Sent to ${to}, subject: ${subject}`);
        return res.json({ ok: true, reply: `Reply sent to ${to}.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/api/ai-draft-reply', requireAppAccess, async (req, res) => {
    try {
        const { emailSubject, emailBody, senderName, userPrompt } = req.body || {};
        const cleanEmailSubject = (emailSubject || "").replace(/[^\x00-\x7F]/g, " ").trim();
        const prompt = `You are drafting a short email reply on behalf of the user.\nOriginal email from: ${senderName || "Unknown"}\nSubject: ${cleanEmailSubject}\nBody: ${emailBody || ""}\n${userPrompt ? `\nUser instruction: ${userPrompt}` : ""}\n\nWrite a concise, natural 2-3 sentence reply. Output only the reply body text, no subject line, no greeting prefix beyond a natural opening.`;
        const { result: response } = await runtime.execute({
            tier: 'fast', caller: 'ai-draft-reply',
            maxTokens: 150,
            messages: [{ role: "user", content: prompt }]
        });
        const draft = response.content[0]?.text?.trim() || "";
        return res.json({ ok: true, draft });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

module.exports = router;
