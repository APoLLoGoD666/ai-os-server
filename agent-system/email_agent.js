"use strict";

if (process.env.GMAIL_ENABLED !== 'true') {
    module.exports = {
        checkEmails:    async () => ({ count: 0, disabled: true, message: 'Gmail disabled — refresh OAuth tokens then set GMAIL_ENABLED=true' }),
        sendEmailReply: async () => { throw new Error('Gmail disabled — set GMAIL_ENABLED=true after running node get_gmail_token.js'); },
        initEmailAgent: async () => {},
        isDisabled:     true,
    };
} else {

const { google } = require("googleapis");
const {
    pgSaveEmailQueueItem,
    pgGetEmailQueueItemByGmailId,
    pgUpdateEmailQueueStatus,
    pgCreateAgentTask,
    pgCreateNotification,
    pgGetGmailToken,
    pgSaveGmailToken,
    pgClearGmailToken
} = require("../lib/pg_helpers");
const runtime = require("../lib/models/runtime");

async function getGmailClient() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) return null;

    // Prefer DB-stored token (written by re-auth flow), fall back to env var
    const dbToken = await pgGetGmailToken().catch(() => null);
    const refreshToken = dbToken || process.env.GMAIL_REFRESH_TOKEN;
    if (!refreshToken) return null;

    const oauth2 = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return google.gmail({ version: "v1", auth: oauth2 });
}

async function parseEmailMessage(gmail, messageId) {
    const msg = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full"
    });

    const headers = msg.data.payload?.headers || [];
    const getHeader = name => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    const sender  = getHeader("From");
    const subject = getHeader("Subject");

    let body = msg.data.snippet || "";
    const parts = msg.data.payload?.parts || [];
    for (const part of parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
            break;
        }
    }

    return { sender, subject, body: body.slice(0, 500), gmailId: messageId };
}

async function triageEmail(email) {
    const prompt = `You are an email triage agent. Analyse this email and respond in JSON only:
{
  "priority": "urgent" or "normal" or "low",
  "category": "business" or "personal" or "spam" or "finance" or "uni",
  "summary": "one sentence summary",
  "suggested_reply": "a natural 2-3 sentence reply if needed, or null if no reply needed",
  "needs_approval": true or false
}
Email from: ${email.sender}
Subject: ${email.subject}
Body: ${email.body}`;

    try {
        const { result: response } = await runtime.execute({
            tier:      'fast',
            caller:    'email-agent',
            maxTokens: 200,
            messages:  [{ role: "user", content: prompt }],
        });

        const text = response.content[0]?.text || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
        return {
            priority: "normal",
            category: "personal",
            summary: email.subject,
            suggested_reply: null,
            needs_approval: false
        };
    }
}

async function checkEmails() {
    const gmail = await getGmailClient();
    if (!gmail) {
        console.log("EMAIL AGENT: Gmail not configured, skipping.");
        return 0;
    }

    try {
        const listRes = await gmail.users.messages.list({
            userId: "me",
            q: "is:unread -category:promotions -category:social",
            maxResults: 10
        });

        const messages = listRes.data.messages || [];
        let processed = 0;

        for (const msg of messages) {
            const existing = await pgGetEmailQueueItemByGmailId(msg.id);
            if (existing) continue;

            const email  = await parseEmailMessage(gmail, msg.id);
            const triage = await triageEmail(email);

            // Force urgent for failed payment emails regardless of Claude triage
            const subjectLc = (email.subject || "").toLowerCase();
            if (/payment/.test(subjectLc) && /unsuccessful|failed/.test(subjectLc)) {
                triage.priority      = "urgent";
                triage.needs_approval = true;
            }

            const saved = await pgSaveEmailQueueItem(
                email.gmailId,
                email.sender,
                email.subject,
                triage.summary || email.subject,
                triage.priority || "normal",
                triage.category || "personal",
                triage.suggested_reply || null
            );

            if (!saved) continue;

            if (triage.needs_approval || triage.priority === "urgent") {
                await pgCreateAgentTask(
                    `Email from ${email.sender}: ${triage.summary || email.subject}`,
                    "waiting_approval",
                    "",
                    {
                        type: "email_reply",
                        email_queue_id: saved.id,
                        suggested_reply: triage.suggested_reply,
                        sender: email.sender,
                        subject: email.subject,
                        gmail_id: email.gmailId
                    },
                    null,
                    process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001'
                );
            }

            await pgCreateNotification(
                "email",
                `${triage.priority === "urgent" ? "⚡ " : ""}Email: ${email.subject}`,
                `From ${email.sender}: ${triage.summary || email.subject}`,
                "email_queue",
                saved.id
            );

            processed++;
        }

        console.log(`EMAIL AGENT: Processed ${processed} new emails.`);
        return processed;
    } catch (error) {
        console.error("EMAIL CHECK ERROR:", error.message);
        if (/invalid_grant/i.test(error.message)) {
            console.error("[Gmail] OAuth refresh failed — re-authorisation required");
            await pgClearGmailToken().catch(() => {});
            await pgCreateNotification(
                "email",
                "Gmail auth expired",
                "Gmail OAuth refresh token is invalid. Visit /auth/gmail/reauthorise to re-connect.",
                null, null, 86400000 // 24h dedup — one notification per day max
            ).catch(() => {});
        }
        return 0;
    }
}

async function sendEmailReply(gmailId, to, subject, replyText) {
    const gmail = await getGmailClient();
    if (!gmail) throw new Error("Gmail not configured.");

    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const raw = [
        `To: ${to}`,
        `Subject: ${replySubject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `In-Reply-To: ${gmailId}`,
        "",
        replyText
    ].join("\r\n");

    const encoded = Buffer.from(raw)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    try {
        await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw: encoded }
        });
    } catch (error) {
        if (/invalid_grant/i.test(error.message)) {
            console.error("[Gmail] OAuth refresh failed — re-authorisation required");
            await pgClearGmailToken().catch(() => {});
        }
        throw error;
    }
}

async function initEmailAgent() {
    if (!process.env.GMAIL_CLIENT_ID) {
        console.log("EMAIL AGENT: Skipped — no GMAIL_CLIENT_ID in env.");
        return;
    }
    console.log("EMAIL AGENT: Starting, polling every 5 minutes.");
    setTimeout(() => checkEmails(), 10000);
    setInterval(() => checkEmails(), 5 * 60 * 1000);
}

module.exports = { checkEmails, sendEmailReply, initEmailAgent };
}
