"use strict";

const { Agent } = require("@mastra/core/agent");
const { createTool } = require("@mastra/core/tools");
const { createWorkflow, createStep } = require("@mastra/core/workflows");
const { Mastra } = require("@mastra/core");
const { anthropic } = require("@ai-sdk/anthropic");
const { z } = require("zod");

let apexAgent, emailAgent, financeAgent, routineAgent, researchAgent, mastraInstance;

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

    // ── Agents ─────────────────────────────────────────────────────────────

    apexAgent = new Agent({
        name: "apexAgent",
        instructions: `You are Apex, an autonomous AI assistant with access to the following tools:

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

## Rules
- When a user asks about emails, ALWAYS call list_emails immediately. Never say you don't have email access.
- When a user asks to summarise emails, call list_emails then summarise the results in plain English.
- When asked to check for new emails, call check_emails.
- When asked for a finance summary, call get_finance_summary immediately.
- Never deny a capability that a tool exists for. Never describe what you would do — just do it.
- Be concise and practical. Use the most specific tool available.`,
        model: anthropic(process.env.ANTHROPIC_MODEL || "claude-opus-4-7"),
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
            create_notification: createNotificationTool
        }
    });

    emailAgent = new Agent({
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
    });

    financeAgent = new Agent({
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
    });

    routineAgent = new Agent({
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
    });

    researchAgent = new Agent({
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
    });

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

module.exports = { initMastra };
