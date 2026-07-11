'use strict';

const router = require('express').Router();
const { requireAppAccess } = require('../lib/middleware');
const { getCached, setCache, clearCache } = require('../lib/server-utils');
const { pgListEmailQueue, pgUpdateEmailQueueStatus } = require('../lib/pg_helpers');
const { checkEmails, sendEmailReply } = require('../agent-system/email_agent');

router.get('/emails', requireAppAccess, async (req, res) => {
    try {
        const cached = getCached("emails");
        if (cached) return res.json(cached);
        const emails = await pgListEmailQueue(20);
        const payload = { ok: true, emails };
        setCache("emails", payload);
        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/emails/check', requireAppAccess, async (req, res) => {
    try {
        const count = await checkEmails();
        clearCache("emails");
        return res.json({ ok: true, reply: `Checked email. Found ${count} new messages.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/emails/:id/approve', requireAppAccess, async (req, res) => {
    // Require explicit user confirmation header — prevents automated sends from agent tool use
    if (req.headers["x-user-confirmed"] !== "true") {
        return res.status(403).json({ ok: false, reply: "Email send requires explicit user confirmation. Use the draft preview modal." });
    }
    try {
        const id = parseInt(req.params.id);
        const emails = await pgListEmailQueue(100);
        const email  = emails.find(e => e.id === id);

        if (!email) return res.status(404).json({ ok: false, reply: "Email not found." });
        if (!email.suggested_reply) return res.status(400).json({ ok: false, reply: "No suggested reply to send." });

        console.log(`[EMAIL] User confirmed send to ${email.sender} — subject: ${email.subject}`);
        await sendEmailReply(email.gmail_id, email.sender, email.subject, email.suggested_reply);
        await pgUpdateEmailQueueStatus(id, "sent");
        clearCache("emails");
        return res.json({ ok: true, reply: `Reply sent to ${email.sender}.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/emails/:id/reject', requireAppAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pgUpdateEmailQueueStatus(id, "rejected");
        clearCache("emails");
        return res.json({ ok: true, reply: "Email rejected, no reply sent." });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

module.exports = router;
