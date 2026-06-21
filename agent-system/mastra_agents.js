"use strict";

const { Agent } = require("@mastra/core/agent");
const { createTool } = require("@mastra/core/tools");
const { createWorkflow, createStep } = require("@mastra/core/workflows");
const { Mastra } = require("@mastra/core");
const { anthropic } = require("@ai-sdk/anthropic");
const { z } = require("zod");

let apexAgent, emailAgent, financeAgent, routineAgent, researchAgent, mastraInstance;
const _agentStatus = {};

function getMastraStatus() {
    return {
        apex:     !!apexAgent,
        email:    !!emailAgent,
        finance:  !!financeAgent,
        routine:  !!routineAgent,
        research: !!researchAgent,
        mastra:   !!mastraInstance,
        details:  _agentStatus
    };
}

function _tryInitAgent(name, factory) {
    try {
        const agent = factory();
        _agentStatus[name] = "ok";
        return agent;
    } catch (err) {
        _agentStatus[name] = `error: ${err.message}`;
        console.error(`MASTRA: ${name} init failed —`, err.message);
        return null;
    }
}

function initMastra(handleCommand) {

    // ── Tools ──────────────────────────────────────────────────────────────

    const saveNoteTool = createTool({
        id: "save_note",
        description: "Save a note to the workspace with a classification (uni, business, personal).",
        inputSchema: z.object({
            content: z.string().describe("The note content to save."),
            classification: z.enum(["uni", "business", "personal"]).describe("Category for the note.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "save_note", content: inputData.content, classification: inputData.classification });
            return { result: r ? r.reply : "Done." };
        }
    });

    const readFileTool = createTool({
        id: "read_file",
        description: "Read a file from the workspace by filename.",
        inputSchema: z.object({
            filename: z.string().describe("The filename to read.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "read_file", filename: inputData.filename });
            return { result: r ? r.reply : "Not found." };
        }
    });

    const createFileTool = createTool({
        id: "create_file",
        description: "Create a new file in the workspace with specific content.",
        inputSchema: z.object({
            filename: z.string().describe("The filename to create."),
            content: z.string().describe("The file content.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "create_file", filename: inputData.filename, content: inputData.content });
            return { result: r ? r.reply : "Done." };
        }
    });

    const listFilesTool = createTool({
        id: "list_files",
        description: "List all files in the workspace.",
        inputSchema: z.object({}),
        execute: async () => {
            const r = await handleCommand({ type: "list_files" });
            return { result: r ? r.reply : "No files." };
        }
    });

    const deleteFileTool = createTool({
        id: "delete_file",
        description: "Delete a file from the workspace by filename.",
        inputSchema: z.object({
            filename: z.string().describe("The filename to delete.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "delete_file", filename: inputData.filename });
            return { result: r ? r.reply : "Done." };
        }
    });

    const renameFileTool = createTool({
        id: "rename_file",
        description: "Rename a file in the workspace.",
        inputSchema: z.object({
            oldName: z.string().describe("Current filename."),
            newName: z.string().describe("New filename.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "rename_file", oldName: inputData.oldName, newName: inputData.newName });
            return { result: r ? r.reply : "Done." };
        }
    });

    const searchDocumentsTool = createTool({
        id: "search_documents",
        description: "Search saved documents by keyword.",
        inputSchema: z.object({
            keyword: z.string().describe("Keyword to search for.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "search_documents", keyword: inputData.keyword });
            return { result: r ? r.reply : "No results." };
        }
    });

    const listDocumentsTool = createTool({
        id: "list_documents",
        description: "List all saved documents in the database.",
        inputSchema: z.object({}),
        execute: async () => {
            const r = await handleCommand({ type: "list_documents" });
            return { result: r ? r.reply : "No documents." };
        }
    });

    const logExpenseTool = createTool({
        id: "log_expense",
        description: "Log a personal expense or income transaction.",
        inputSchema: z.object({
            description: z.string().describe("What the transaction is for."),
            amount: z.number().describe("Transaction amount in GBP."),
            transactionType: z.enum(["expense", "income"]).describe("Whether this is an expense or income."),
            date: z.string().optional().describe("Date in YYYY-MM-DD format. Defaults to today.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({
                type: "log_expense",
                description: inputData.description,
                amount: inputData.amount,
                transactionType: inputData.transactionType,
                date: inputData.date
            });
            return { result: r ? r.reply : "Logged." };
        }
    });

    const getFinanceSummaryTool = createTool({
        id: "get_finance_summary",
        description: "Get this month's financial summary — spending by category vs budget.",
        inputSchema: z.object({}),
        execute: async () => {
            const r = await handleCommand({ type: "get_finance_summary" });
            return { result: r ? r.reply : "No data." };
        }
    });

    const setBudgetTool = createTool({
        id: "set_budget",
        description: "Set a monthly budget for a spending category.",
        inputSchema: z.object({
            category: z.string().describe("The spending category."),
            amount: z.number().describe("Monthly budget amount in GBP.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({ type: "set_budget", category: inputData.category, amount: inputData.amount });
            return { result: r ? r.reply : "Set." };
        }
    });

    const checkEmailsTool = createTool({
        id: "check_emails",
        description: "Check Gmail for new emails that need attention.",
        inputSchema: z.object({}),
        execute: async () => {
            const r = await handleCommand({ type: "check_emails" });
            return { result: r ? r.reply : "Checked." };
        }
    });

    const listEmailsTool = createTool({
        id: "list_emails",
        description: "List processed emails awaiting reply approval.",
        inputSchema: z.object({}),
        execute: async () => {
            const r = await handleCommand({ type: "list_emails" });
            return { result: r ? r.reply : "No emails." };
        }
    });

    const listRoutinesTool = createTool({
        id: "list_routines",
        description: "List all scheduled routines.",
        inputSchema: z.object({}),
        execute: async () => {
            const r = await handleCommand({ type: "list_routines" });
            return { result: r ? r.reply : "No routines." };
        }
    });

    const createRoutineTool = createTool({
        id: "create_routine",
        description: "Create a new scheduled routine.",
        inputSchema: z.object({
            name: z.string().describe("Routine name."),
            description: z.string().describe("What the routine does."),
            schedule_cron: z.string().describe("Cron expression for when to run.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({
                type: "create_routine",
                name: inputData.name,
                description: inputData.description,
                schedule_cron: inputData.schedule_cron
            });
            return { result: r ? r.reply : "Created." };
        }
    });

    const createNotificationTool = createTool({
        id: "create_notification",
        description: "Create a system notification for the user.",
        inputSchema: z.object({
            title: z.string().describe("Notification title."),
            body: z.string().describe("Notification body text."),
            priority: z.enum(["low", "normal", "high", "urgent"]).optional().describe("Priority level.")
        }),
        execute: async ({ inputData }) => {
            const r = await handleCommand({
                type: "create_notification",
                title: inputData.title,
                body: inputData.body,
                priority: inputData.priority || "normal"
            });
            return { result: r ? r.reply : "Notification created." };
        }
    });

    // ── Browser / Web Execution Tools ───────────────────────────────────────

    const browserResearchTool = createTool({
        id: "browser_research",
        description: "Navigate the web and research a topic or URL using a real browser. Can follow links, extract content, and summarise pages. Use for any task that requires reading live web pages.",
        inputSchema: z.object({
            objective: z.string().describe("What to find or research."),
            url: z.string().optional().describe("Starting URL (optional — omit to let the browser search).")
        }),
        execute: async ({ inputData }) => {
            try {
                const ba = require('./browser-agent');
                const result = await ba.research(inputData.objective, inputData.url || null, { maxPages: 3 });
                return { summary: result.summary, pages: result.pages?.length || 0, success: result.success };
            } catch (e) { return { error: e.message, success: false }; }
        }
    });

    const browserScrapeTool = createTool({
        id: "browser_scrape",
        description: "Scrape structured content from a specific URL using a real browser. Returns page text, headings, links, and structured data.",
        inputSchema: z.object({
            url: z.string().describe("The URL to scrape.")
        }),
        execute: async ({ inputData }) => {
            try {
                const ba = require('./browser-agent');
                const browser = await ba.createBrowser();
                const page = await browser.newPage();
                await page.goto(inputData.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                const data = await ba.extractStructuredData(page);
                await browser.close();
                return { ...data, success: true };
            } catch (e) { return { error: e.message, success: false }; }
        }
    });

    const browserFillFormTool = createTool({
        id: "browser_fill_form",
        description: "Fill in and submit a web form on a page. Use for sign-ups, contact forms, product creation, or any multi-field web form.",
        inputSchema: z.object({
            url: z.string().describe("The URL containing the form."),
            fields: z.record(z.string()).describe("Object mapping CSS selector or field name to the value to enter."),
            submitSelector: z.string().optional().describe("CSS selector for the submit button (optional).")
        }),
        execute: async ({ inputData }) => {
            try {
                const ba = require('./browser-agent');
                const result = await ba.fillForm(inputData.url, inputData.fields, inputData.submitSelector || null);
                return { success: result.success, message: result.message };
            } catch (e) { return { error: e.message, success: false }; }
        }
    });

    const browserClickTool = createTool({
        id: "browser_click",
        description: "Click an element on a web page and return the resulting page content. Use for navigation buttons, CTAs, menu items.",
        inputSchema: z.object({
            url: z.string().describe("The URL of the page."),
            selector: z.string().describe("CSS selector for the element to click.")
        }),
        execute: async ({ inputData }) => {
            try {
                const ba = require('./browser-agent');
                const result = await ba.clickAndExtract(inputData.url, inputData.selector);
                return { content: result.content, success: result.success };
            } catch (e) { return { error: e.message, success: false }; }
        }
    });

    // ── Agents ─────────────────────────────────────────────────────────────

    apexAgent = _tryInitAgent("apex", () => new Agent({
        name: "apexAgent",
        instructions: `You are Apex — a personal AI OS, not just a chatbot. You are connected to your runtime and have real-time self-knowledge of your own state.

WHAT YOU ARE:
- Runtime: Node.js + Express on Render (main server) + Python FastAPI sidecar
- Memory: Supabase Postgres — episodic memory, lessons, working memory, knowledge graph
- Intelligence: 7-dimension civilization health (memory/execution/financial/infrastructure/learning/opportunity/strategic), autonomous governance cycles
- Executive structure: CSO, CTO, CFO, COO, CIO, CGO — real deliberations persisted to database
- Autonomy: Level ${process.env.AUTONOMY_LEVEL || '1'} — acts within approved scope, surfaces decisions upward
- The user's prompt will contain your live APEX SELF-STATE block with current health score, dimensions, and opportunities

NEVER say "I don't have access to my own state" — your live state is injected into every message.

TOOLS YOU HAVE ACCESS TO:

EMAIL:
- check_emails — poll Gmail for new messages right now
- list_emails — retrieve the processed email queue with subjects, senders, and suggested replies

FINANCE:
- log_expense — record an expense or income transaction in GBP
- get_finance_summary — get this month's spending by category vs budget
- set_budget — set a monthly GBP budget for a spending category

FILES:
- save_note — save a quick note (classified as uni, business, or personal)
- read_file — read a workspace file by name
- create_file — create a new file with content
- delete_file — delete a file by name
- list_files — list all workspace files
- search_documents — search saved documents by keyword
- list_documents — list all saved documents in the database

ROUTINES:
- list_routines — list all scheduled routines
- create_routine — create a new scheduled routine with a cron expression

NOTIFICATIONS:
- create_notification — post a system notification with title, body, and priority

WEB / BROWSER (you can execute on the web):
- browser_research — navigate the web and research any topic or URL using a real browser
- browser_scrape — extract structured content from a specific URL
- browser_fill_form — fill in and submit a web form (sign-ups, product creation, any form)
- browser_click — click an element on a page and return the resulting content

## Rules
- When a user asks about emails, ALWAYS call list_emails immediately. Never say you don't have email access.
- When a user asks to summarise emails, call list_emails then summarise the results in plain English.
- When asked to check for new emails, call check_emails.
- When asked for a finance summary, call get_finance_summary immediately.
- Never deny a capability that a tool exists for. Never describe what you would do — just do it.
- When a user asks to research a website, scrape a page, fill a form, or do ANYTHING on the web — use browser tools immediately.
- For multi-step web tasks (e.g. "build a store on Printify"): use browser_research first to get the page structure, then browser_fill_form / browser_click for each step.
- Be concise and practical. Use the most specific tool available.
- Be extremely concise. Maximum 3 sentences unless the user explicitly asks for more detail. Prefer bullet points for lists.`,
        model: anthropic(process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"),
        tools: {
            save_note: saveNoteTool,
            read_file: readFileTool,
            create_file: createFileTool,
            list_files: listFilesTool,
            delete_file: deleteFileTool,
            rename_file: renameFileTool,
            search_documents: searchDocumentsTool,
            list_documents: listDocumentsTool,
            log_expense: logExpenseTool,
            get_finance_summary: getFinanceSummaryTool,
            set_budget: setBudgetTool,
            check_emails: checkEmailsTool,
            list_emails: listEmailsTool,
            list_routines: listRoutinesTool,
            create_routine: createRoutineTool,
            create_notification: createNotificationTool,
            browser_research: browserResearchTool,
            browser_scrape: browserScrapeTool,
            browser_fill_form: browserFillFormTool,
            browser_click: browserClickTool,
        }
    }));

    emailAgent = _tryInitAgent("email", () => new Agent({
        name: "emailAgent",
        instructions: `You are the Email Agent for Apex AI OS. You manage the user's Gmail inbox.

Check for new emails, summarise them clearly, and surface suggested replies.
Flag urgent emails immediately. Present emails in a clear, actionable format.`,
        model: anthropic("claude-haiku-4-5-20251001"),
        tools: {
            check_emails: checkEmailsTool,
            list_emails: listEmailsTool,
            create_notification: createNotificationTool
        }
    }));

    financeAgent = _tryInitAgent("finance", () => new Agent({
        name: "financeAgent",
        instructions: `You are the Finance Agent for Apex AI OS. You track the user's personal finances.

Log expenses and income accurately. Categorise transactions. Alert on budget overruns.
Always show GBP amounts. Provide clear, precise summaries.`,
        model: anthropic("claude-haiku-4-5-20251001"),
        tools: {
            log_expense: logExpenseTool,
            get_finance_summary: getFinanceSummaryTool,
            set_budget: setBudgetTool,
            create_notification: createNotificationTool
        }
    }));

    routineAgent = _tryInitAgent("routine", () => new Agent({
        name: "routineAgent",
        instructions: `You are the Routine Agent for Apex AI OS. You manage the user's daily and weekly routines.

Create, list, and manage scheduled routines. Help the user build consistent productive habits.
When routines are due, execute and report outcomes clearly.`,
        model: anthropic("claude-haiku-4-5-20251001"),
        tools: {
            list_routines: listRoutinesTool,
            create_routine: createRoutineTool,
            create_notification: createNotificationTool
        }
    }));

    researchAgent = _tryInitAgent("research", () => new Agent({
        name: "researchAgent",
        instructions: `You are the Research Agent for Apex AI OS. You help the user research topics and synthesise information.

Search saved documents and workspace files to find relevant information.
Summarise research clearly. When saving findings, classify them appropriately (uni, business, personal).`,
        model: anthropic("claude-haiku-4-5-20251001"),
        tools: {
            search_documents: searchDocumentsTool,
            list_documents: listDocumentsTool,
            read_file: readFileTool,
            save_note: saveNoteTool,
            create_file: createFileTool
        }
    }));

    // ── Daily Briefing Workflow ────────────────────────────────────────────
    // Steps pass data forward through their output schema so every subsequent
    // step receives all accumulated data in its inputData.

    const checkUrgentEmailsStep = createStep({
        id: "check_urgent_emails",
        inputSchema: z.object({
            date: z.string()
        }),
        outputSchema: z.object({
            date: z.string(),
            urgentEmails: z.string(),
            hasUrgent: z.boolean()
        }),
        execute: async ({ inputData }) => {
            try {
                const r = await handleCommand({ type: "check_emails" });
                const urgentEmails = r ? r.reply : "No email data.";
                const hasUrgent = /urgent|important|asap/i.test(urgentEmails);
                return { date: inputData.date, urgentEmails, hasUrgent };
            } catch {
                return { date: inputData.date, urgentEmails: "Unable to check emails.", hasUrgent: false };
            }
        }
    });

    const checkBudgetAlertsStep = createStep({
        id: "check_budget_alerts",
        inputSchema: z.object({
            date: z.string(),
            urgentEmails: z.string(),
            hasUrgent: z.boolean()
        }),
        outputSchema: z.object({
            date: z.string(),
            urgentEmails: z.string(),
            hasUrgent: z.boolean(),
            budgetAlerts: z.string(),
            hasAlerts: z.boolean()
        }),
        execute: async ({ inputData }) => {
            try {
                const r = await handleCommand({ type: "get_finance_summary" });
                const budgetAlerts = r ? r.reply : "No budget data.";
                const hasAlerts = /over budget|exceeded/i.test(budgetAlerts);
                return { ...inputData, budgetAlerts, hasAlerts };
            } catch {
                return { ...inputData, budgetAlerts: "Unable to check budgets.", hasAlerts: false };
            }
        }
    });

    const generateBriefingStep = createStep({
        id: "generate_briefing",
        inputSchema: z.object({
            date: z.string(),
            urgentEmails: z.string(),
            hasUrgent: z.boolean(),
            budgetAlerts: z.string(),
            hasAlerts: z.boolean()
        }),
        outputSchema: z.object({
            date: z.string(),
            urgentEmails: z.string(),
            hasUrgent: z.boolean(),
            budgetAlerts: z.string(),
            hasAlerts: z.boolean(),
            briefing: z.string()
        }),
        execute: async ({ inputData }) => {
            try {
                const result = await apexAgent.generate([{
                    role: "user",
                    content: `Generate a concise morning briefing for ${inputData.date}.\n\nEMAIL STATUS:\n${inputData.urgentEmails}\n\nFINANCE STATUS:\n${inputData.budgetAlerts}\n\nKeep it under 150 words. Be practical and encouraging.`
                }]);
                return { ...inputData, briefing: result.text || "Good morning! Have a productive day." };
            } catch {
                return { ...inputData, briefing: "Good morning! Have a productive day." };
            }
        }
    });

    const postBriefingStep = createStep({
        id: "post_briefing",
        inputSchema: z.object({
            date: z.string(),
            urgentEmails: z.string(),
            hasUrgent: z.boolean(),
            budgetAlerts: z.string(),
            hasAlerts: z.boolean(),
            briefing: z.string()
        }),
        outputSchema: z.object({
            posted: z.boolean(),
            requiresApproval: z.boolean()
        }),
        execute: async ({ inputData }) => {
            try {
                await handleCommand({
                    type: "create_notification",
                    title: `Morning Briefing — ${inputData.date}`,
                    body: inputData.briefing,
                    priority: inputData.hasUrgent ? "urgent" : "normal"
                });
                return { posted: true, requiresApproval: inputData.hasUrgent };
            } catch {
                return { posted: false, requiresApproval: false };
            }
        }
    });

    const dailyBriefingWorkflow = createWorkflow({
        id: "daily_briefing",
        inputSchema: z.object({
            date: z.string().describe("Today's date in YYYY-MM-DD format.")
        }),
        outputSchema: z.object({
            posted: z.boolean(),
            requiresApproval: z.boolean()
        })
    });

    dailyBriefingWorkflow
        .then(checkUrgentEmailsStep)
        .then(checkBudgetAlertsStep)
        .then(generateBriefingStep)
        .then(postBriefingStep)
        .commit();

    mastraInstance = new Mastra({
        workflows: { daily_briefing: dailyBriefingWorkflow }
    });

    return { apexAgent, emailAgent, financeAgent, routineAgent, researchAgent, mastra: mastraInstance };
}

function initMastraWithRetry(handleCommand) {
    try {
        return initMastra(handleCommand);
    } catch (err) {
        console.error("MASTRA INIT FAILED, retrying in 5s:", err.message);
        setTimeout(() => {
            try {
                const result = initMastra(handleCommand);
                apexAgent     = result.apexAgent;
                emailAgent    = result.emailAgent;
                financeAgent  = result.financeAgent;
                routineAgent  = result.routineAgent;
                researchAgent = result.researchAgent;
                mastraInstance = result.mastra;
                console.log("MASTRA RETRY SUCCESS");
            } catch (e2) {
                console.error("MASTRA RETRY FAILED:", e2.message);
            }
        }, 5000);
        return { apexAgent, emailAgent, financeAgent, routineAgent, researchAgent, mastra: mastraInstance };
    }
}

module.exports = { initMastra: initMastraWithRetry, getMastraStatus };
