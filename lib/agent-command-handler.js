'use strict';
// lib/agent-command-handler.js — handleCommand dispatcher + per-user agent state

const { AGENT_PROFILES } = require('../agents');
const { checkEmails }    = require('../agent-system/email_agent');
const { categoriseTransaction, checkBudgetAlerts } = require('../agent-system/finance_agent');

const {
    pgSaveDocument,
    pgGetDocument,
    pgListDocuments,
    pgSearchDocuments,
    pgDeleteDocument,
    pgRenameDocument,
    pgUpdateDocumentSummary,
    pgGetAgentTask,
    pgUpdateAgentTask,
    pgLogAgentAction,
    pgCreateAgentTask,
    pgGetLatestWaitingAgentTask,
    pgGetLastUndoableAgentAction,
    pgGetRecentAgentActions,
    pgGetRecentAgentTasks,
    pgCreateAgentReflection,
    pgListAgentReflections,
    pgGetApprovedReflections,
    pgApproveAgentReflection,
    pgListStandingApprovals,
    pgCreateStandingApproval,
    pgDisableStandingApproval,
    pgGetAgentSchedule,
    pgCreateAgentSchedule,
    pgListAgentSchedules,
    pgDisableAgentSchedule,
    pgListNotifications,
    pgMarkNotificationRead,
    pgCreateNotification,
    pgMarkAgentActionUndone,
    pgSaveTransaction,
    pgSaveBudget,
    pgGetFinanceSummaryCurrentMonth,
    pgListBudgets,
    pgListEmailQueue,
    pgListRoutines,
    pgCreateRoutine
} = require('./pg_helpers');

const {
    createAgentNotification,
    loadMemory,
    backgroundClassifyAndSummarise
} = require('./chat-context');

const {
    createWorkspaceFile,
    readWorkspaceFile,
    deleteWorkspaceFile,
    renameWorkspaceFile,
    listWorkspaceFiles,
    getDocumentByFilename,
    ensureTxtExtension,
    makeTimestampedFilename,
    summariseText,
    getRelevantDocuments,
    searchWorkspaceFiles,
    analyseDocumentsWithAI,
    getRecentDocumentsForAnalysis,
    embedAndStoreDocument,
    moveFileToCategory
} = require('./workspace');

const {
    formatAgentProfile,
    getAgentProfile,
    getAvailableAgentsText,
    normalizeAgentProfileName
} = require('./agent-plan-utils');

const {
    getLatestActiveAgentTask,
    filterPendingApprovalSteps,
    formatAgentStepForDisplay,
    formatExecutableFallbackSteps
} = require('./agent-step-utils');

const {
    getAgentAccessError,
    fetchAgentCleanupRows,
    buildAgentCleanupPreviewData,
    buildObviousAgentCleanupPreviewData,
    formatAgentCleanupPreview,
    applyAgentCleanupPreview,
    findPendingDuplicateForSteps
} = require('./agent-file-utils');

const {
    executeApprovedAgentActions,
    undoAgentActionRecord,
    getLevel3AutoExecutablePrefix
} = require('./agent-execution-utils');

const {
    buildAgentPlan,
    validateAgentSteps,
    buildDirectSafeAgentStepsFromRequest,
    getApprovedAgentActions,
    executeApprovedAgentTask,
    runAgentPlanningCycle,
    runDueSchedules,
    runSingleScheduleOnce,
    getLatestCompletedAgentTask,
    autoRunReadOnlyTaskSteps,
    buildTaskActionSummary,
    generateReflectionForTask,
    notifyUnsafeActionBlocked
} = require('./agent-task-cycle');

const _agentState = new Map(); // keyed by userId — safe for concurrent sessions

function getAgentState(userId) {
    if (!_agentState.has(userId)) {
        _agentState.set(userId, {
            latestAgentPlan: null,
            pendingDuplicateDecision: null,
            latestAgentCleanupPreview: null,
            latestObviousAgentCleanupPreview: null
        });
    }
    return _agentState.get(userId);
}

async function handleCommand(command, userId) {
    const _s = getAgentState(userId || 'default');
    const accessError = getAgentAccessError(command);

    if (accessError) {
        await notifyUnsafeActionBlocked(command.type, accessError);
        return {
            ok: false,
            reply: accessError
        };
    }

    switch (command.type) {
        case "create_file": {
            const filename = ensureTxtExtension(command.filename);
            const created = await createWorkspaceFile(filename, command.content);

            await pgSaveDocument(
                created.filename,
                created.content,
                "personal",
                `Saved file: ${created.filename}`
            );

            return { ok: true, reply: `File created: ${created.filename}` };
        }

        case "read_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = await readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            return { ok: true, reply: `File content of ${file.filename}:\n\n${file.content}` };
        }

        case "delete_file": {
            const filename = ensureTxtExtension(command.filename);
            const deleted = await deleteWorkspaceFile(filename);

            if (!deleted) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            try {
                await pgDeleteDocument(filename);
            } catch (error) {
                console.error("POSTGRES DOCUMENT DELETE ERROR:", error.message);
            }

            return { ok: true, reply: `File deleted: ${filename}` };
        }

        case "delete_document": {
            const filename = ensureTxtExtension(command.filename);

            await pgDeleteDocument(filename);
            await deleteWorkspaceFile(filename);

            return { ok: true, reply: `Document deleted: ${filename}` };
        }

        case "rename_file": {
            const oldName = ensureTxtExtension(command.oldName);
            const newName = ensureTxtExtension(command.newName);
            const result = await renameWorkspaceFile(oldName, newName);

            if (!result.ok) {
                if (result.reason === "old_missing") {
                    return { ok: false, reply: `Could not find file: ${oldName}` };
                }
                if (result.reason === "new_exists") {
                    return { ok: false, reply: `A file already exists called: ${newName}` };
                }
            }

            try {
                await pgRenameDocument(oldName, newName);
            } catch (error) {
                console.error("POSTGRES DOCUMENT RENAME ERROR:", error.message);
            }

            return { ok: true, reply: `File renamed from ${oldName} to ${newName}` };
        }

        case "show_document": {
            const filename = ensureTxtExtension(command.filename);
            let doc = null;

            try {
                doc = await pgGetDocument(filename);
            } catch (error) {
                console.error("POSTGRES DOCUMENT GET ERROR:", error.message);
            }

            if (!doc) {
                doc = getDocumentByFilename(filename);
            }

            if (!doc) {
                return { ok: false, reply: `Could not find document: ${filename}` };
            }

            return {
                ok: true,
                reply: `Document: ${doc.filename}\nType: ${doc.classification}\nSummary: ${doc.summary || "No summary"}\n\nContent:\n${doc.content || ""}`
            };
        }

        case "summarise_file": {
            const filename = ensureTxtExtension(command.filename);
            const file = await readWorkspaceFile(filename);

            if (!file) {
                return { ok: false, reply: `Could not find file: ${filename}` };
            }

            const summary = await summariseText(file.content);
            try {
                await pgUpdateDocumentSummary(filename, summary);
            } catch (error) {
                console.error("POSTGRES DOCUMENT SUMMARY ERROR:", error.message);
            }

            await pgSaveDocument(
                filename,
                file.content,
                "summary",
                summary
            );

            return {
                ok: true,
                reply: `Summary of ${filename}:\n\n${summary}`
            };
        }

        case "move_file": {
            const result = await moveFileToCategory(command.filename, command.category);

            if (!result.ok) {
                return { ok: false, reply: `Could not find file: ${ensureTxtExtension(command.filename)}` };
            }

            return {
                ok: true,
                reply: `File moved from ${result.oldName} to ${result.newName} as ${result.category}.`
            };
        }

        case "save_note": {
            const content  = String(command.content || "");
            const prefix   = command.classification || "personal";
            const filename = makeTimestampedFilename(prefix);

            await createWorkspaceFile(filename, content);

            await pgSaveDocument(
                filename,
                content,
                command.classification,
                `Saved ${command.classification} note`
            );

            setImmediate(() => backgroundClassifyAndSummarise(filename, content));
            setImmediate(() => embedAndStoreDocument(filename, content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in Postgres.`
            };
        }

        case "save_named_note": {
            const content  = String(command.content || "");
            const filename = ensureTxtExtension(command.filename);

            await createWorkspaceFile(filename, content);

            await pgSaveDocument(
                filename,
                content,
                command.classification || "personal",
                `Saved named note: ${filename}`
            );

            setImmediate(() => backgroundClassifyAndSummarise(filename, content));
            setImmediate(() => embedAndStoreDocument(filename, content));

            return {
                ok: true,
                reply: `Note saved as ${filename} and stored in Postgres.`
            };
        }

        case "list_files": {
            let files = [];

            try {
                files = await listWorkspaceFiles();
            } catch (error) {
                return {
                    ok: false,
                    reply: error.message || "Workspace storage listing failed."
                };
            }

            if (!files.length) {
                return { ok: true, reply: "No files in workspace." };
            }

            return { ok: true, reply: `Workspace files:\n\n- ${files.join("\n- ")}` };
        }

        case "list_documents": {
            const docs = await pgListDocuments();

            if (!docs.length) {
                return { ok: true, reply: "No documents saved in Postgres." };
            }

            const lines = docs.map(doc => `- ${doc.filename} (${doc.classification})`);
            return { ok: true, reply: `Saved documents:\n\n${lines.join("\n")}` };
        }

        case "agent_history": {
            const actions = await pgGetRecentAgentActions(10);

            if (!actions.length) {
                return { ok: true, reply: "No recent agent actions logged." };
            }

            const lines = actions.map(action => {
                const requestPreview = (action.request || "No request").slice(0, 80);
                return `- #${action.id} ${action.action_type} [${action.status}] ${requestPreview}`;
            });

            return {
                ok: true,
                reply: `Recent agent actions:\n\n${lines.join("\n")}`
            };
        }

        case "agents": {
            const lines = Object.values(AGENT_PROFILES).map(profile =>
                `- ${profile.displayName || profile.title} (${profile.name}): ${profile.purpose}`
            );
            return {
                ok: true,
                reply: `Available agents:\n\n${lines.join("\n")}`
            };
        }

        case "agent_profile": {
            const resolvedProfileName = normalizeAgentProfileName(command.agentName || "");
            if (!resolvedProfileName) {
                return { ok: false, reply: `Unknown agent. Available agents: ${getAvailableAgentsText()}` };
            }
            const profile = getAgentProfile(command.agentName || "system_agent");
            return {
                ok: true,
                reply: formatAgentProfile(profile)
            };
        }

        case "reflect_last_task": {
            const recentTasks = await pgGetRecentAgentTasks(20);
            const task = getLatestCompletedAgentTask(recentTasks);

            if (!task) {
                return { ok: false, reply: "No completed agent task found to reflect on." };
            }

            try {
                const reflection = await generateReflectionForTask(task);
                const saved = await pgCreateAgentReflection(
                    "agent_task",
                    task.id,
                    reflection.lesson,
                    reflection.category,
                    reflection.confidence
                );

                return {
                    ok: true,
                    reply: `Reflection saved for task #${task.id}.

Category: ${saved.category}
Confidence: ${saved.confidence}
Approved: no

${saved.lesson}`,
                    reflection: saved
                };
            } catch (error) {
                return {
                    ok: false,
                    reply: `Could not create reflection: ${error.message || "Unknown error"}`
                };
            }
        }

        case "list_reflections": {
            const reflections = await pgListAgentReflections(10);

            if (!reflections.length) {
                return { ok: true, reply: "No reflections saved yet." };
            }

            const lines = reflections.map(reflection =>
                `- #${reflection.id} [${reflection.approved ? "approved" : "pending"}] ${reflection.category} (confidence ${reflection.confidence}) from ${reflection.source_type} #${reflection.source_id}`
            );

            return {
                ok: true,
                reply: `Recent reflections:\n\n${lines.join("\n")}`
            };
        }

        case "approved_reflections": {
            const reflections = await pgGetApprovedReflections(10);

            if (!reflections.length) {
                return { ok: true, reply: "No approved reflections saved yet." };
            }

            const lines = reflections.map(reflection =>
                `- #${reflection.id} ${reflection.category} (confidence ${reflection.confidence}) from ${reflection.source_type} #${reflection.source_id}\n${reflection.lesson}`
            );

            return {
                ok: true,
                reply: `Approved reflections:\n\n${lines.join("\n\n")}`
            };
        }

        case "standing_approvals": {
            const approvals = await pgListStandingApprovals(20);

            if (!approvals.length) {
                return { ok: true, reply: "No standing approvals saved." };
            }

            const lines = approvals.map(rule =>
                `- #${rule.id} [${rule.enabled ? "enabled" : "disabled"}] ${rule.name} -> ${rule.action_type} (${rule.pattern})`
            );

            return {
                ok: true,
                reply: `Standing approvals:\n\n${lines.join("\n")}`
            };
        }

        case "approve_standing_workspace_index": {
            const existingRules = await pgListStandingApprovals(20);
            const existing = existingRules.find(rule =>
                rule.action_type === "create_workspace_file"
                && String(rule.pattern || "").toLowerCase() === "workspace_index"
                && rule.enabled
            );

            if (existing) {
                return {
                    ok: true,
                    reply: `Standing approval already enabled: #${existing.id} ${existing.name}`
                };
            }

            const rule = await pgCreateStandingApproval(
                "Workspace Index Creation",
                "create_workspace_file",
                "workspace_index"
            );

            return {
                ok: true,
                reply: `Standing approval saved: #${rule.id} ${rule.name}`
            };
        }

        case "disable_standing_approval": {
            const rule = await pgDisableStandingApproval(command.id);

            if (!rule) {
                return { ok: false, reply: `Could not find standing approval: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Disabled standing approval #${rule.id}.`
            };
        }

        case "approve_reflection": {
            const reflection = await pgApproveAgentReflection(command.id);

            if (!reflection) {
                return { ok: false, reply: `Could not find reflection: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Approved reflection #${reflection.id}.`
            };
        }

        case "agent_tasks": {
            const tasks = await pgGetRecentAgentTasks(10);

            if (!tasks.length) {
                return { ok: true, reply: "No recent agent tasks found." };
            }

            const lines = tasks.map(task => `- #${task.id} [${task.status}] ${task.goal}`);
            return {
                ok: true,
                reply: `Recent agent tasks:\n\n${lines.join("\n")}`
            };
        }

        case "agent_task": {
            const task = await pgGetAgentTask(command.id);

            if (!task) {
                return { ok: false, reply: `Could not find agent task: ${command.id}` };
            }

            const actionSummary = await buildTaskActionSummary(task);

            return {
                ok: true,
                reply: `Agent task #${task.id}
Status: ${task.status}
Goal: ${task.goal}
Current Step: ${task.current_step}
Result: ${task.result || "No result yet"}
Error: ${task.error || "No error"}

Stored actions:
${actionSummary}

Plan:
${task.plan || "No plan saved."}`
            };
        }

        case "search_documents": {
            const dbDocs = await pgSearchDocuments(command.keyword);
            const workspaceMatches = await searchWorkspaceFiles(command.keyword);

            const dbLines = dbDocs.map(doc => `- ${doc.filename} (${doc.classification})`);
            const workspaceOnly = workspaceMatches.filter(name => !dbDocs.some(doc => doc.filename === name));

            if (!dbLines.length && !workspaceOnly.length) {
                return { ok: true, reply: `No documents found for: ${command.keyword}` };
            }

            let reply = `Search results for "${command.keyword}":\n\n`;

            if (dbLines.length) {
                reply += `Database:\n${dbLines.join("\n")}`;
            }

            if (workspaceOnly.length) {
                if (dbLines.length) reply += `\n\n`;
                reply += `Workspace only:\n- ${workspaceOnly.join("\n- ")}`;
            }

            return { ok: true, reply };
        }

        case "analyse_documents": {
            const docs = await getRecentDocumentsForAnalysis(10);

            if (!docs.length) {
                return { ok: true, reply: "No documents found to analyse." };
            }

            try {
                const analysis = await analyseDocumentsWithAI(docs);

                return {
                    ok: true,
                    reply: `Document analysis:\n\n${analysis}`,
                    documentsAnalysed: docs.length
                };
            } catch (error) {
                return {
                    ok: false,
                    reply: `Document analysis failed: ${error.message || "Unknown error"}`
                };
            }
        }

        case "agent_plan": {
            const autonomyLevel = Number(process.env.AUTONOMY_LEVEL || "1");
            console.log("AUTONOMY_LEVEL active:", autonomyLevel);
            if (command.agentName && !normalizeAgentProfileName(command.agentName)) {
                return { ok: false, reply: `Unknown agent "${command.agentName}". Available agents: ${getAvailableAgentsText()}` };
            }
            const agentProfile = getAgentProfile(command.agentName || "system_agent");

            if (autonomyLevel >= 3) {
                const directSafeSteps = buildDirectSafeAgentStepsFromRequest(command.request);

                if (directSafeSteps.length) {
                    const directValidation = validateAgentSteps(directSafeSteps, command.request);

                    if (!directValidation.fatalError && directValidation.validSteps.length) {
                        const directAutoPlan = await getLevel3AutoExecutablePrefix(directValidation.validSteps);
                        const directSafeResult = {
                            mode: "direct_request",
                            validSteps: directValidation.validSteps.map(step => ({
                                type: step.type,
                                safe_auto: step.safe_auto === true
                            })),
                            executableCount: directAutoPlan.executable.length,
                            remainingCount: directAutoPlan.remaining.length,
                            blockedReasons: directAutoPlan.blocked.map(item => item.reason)
                        };

                        console.log("Agent Level 3 safe auto result:", directSafeResult);

                        if (directAutoPlan.executable.length && !directAutoPlan.remaining.length) {
                            const execution = await executeApprovedAgentActions(directAutoPlan.executable, {
                                skipped: directValidation.skipped,
                                originalRequest: command.request,
                                autoMode: true
                            });

                            if (execution.ok) {
                                await pgLogAgentAction(
                                    "agent_apply",
                                    "applied",
                                    command.request,
                                    "Auto-executed directly from normal agent command path.",
                                    {
                                        agentProfile: agentProfile.name,
                                        steps: directAutoPlan.executable
                                    },
                                    execution.undoEntries,
                                    `Executed automatically: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
                                );

                                await createAgentNotification(
                                    "autonomy_level_3_auto_action",
                                    "Autonomy Level 3 executed task",
                                    `Goal "${command.request}" auto-executed: ${execution.results.join(" | ")}`,
                                    "agent_request",
                                    null
                                );

                                _s.latestAgentPlan = null;

                                return {
                                    ok: true,
                                    reply: `Auto-executed safely (Autonomy Level 3)\n\n${execution.results.join("\n")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                                    proposalOnly: false,
                                    autoExecuted: true
                                };
                            }
                        }
                    }
                }
            }

            const memory = await loadMemory();
            const documents = await getRelevantDocuments(command.request).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(command.request.toLowerCase()).catch(() => []); });
            const files = await listWorkspaceFiles();
            const today = new Date().toISOString().slice(0, 10);
            const plan = await buildAgentPlan(command.request, memory, documents, files, today, agentProfile);

            _s.latestAgentPlan = {
                agentProfile,
                request: command.request,
                memory,
                documents,
                files,
                today,
                plan,
                createdAt: new Date().toISOString()
            };

            await pgLogAgentAction(
                "agent_plan",
                "planned",
                command.request,
                plan,
                { documents: documents.map(doc => doc.filename), files },
                null,
                "Proposal generated"
            );

            if (autonomyLevel >= 3) {
                let parsed = await getApprovedAgentActions(_s.latestAgentPlan);
                let usedDirectFallback = false;

                if (!parsed || parsed.needs_clarification || !Array.isArray(parsed.steps) || !parsed.steps.length) {
                    const directSteps = buildDirectSafeAgentStepsFromRequest(command.request);

                    if (directSteps.length) {
                        parsed = { steps: directSteps };
                        usedDirectFallback = true;
                    }
                }

                if (parsed && !parsed.needs_clarification) {
                    const validation = validateAgentSteps(parsed.steps, command.request);

                    if (!validation.fatalError && validation.validSteps.length) {
                        const autoPlan = await getLevel3AutoExecutablePrefix(validation.validSteps);
                        const safeCheckResult = {
                            usedDirectFallback,
                            validSteps: validation.validSteps.map(step => ({
                                type: step.type,
                                safe_auto: step.safe_auto === true
                            })),
                            executableCount: autoPlan.executable.length,
                            remainingCount: autoPlan.remaining.length,
                            blockedReasons: autoPlan.blocked.map(item => item.reason)
                        };

                        console.log("Agent Level 3 safe auto result:", safeCheckResult);

                        if (autoPlan.executable.length) {
                            const execution = await executeApprovedAgentActions(autoPlan.executable, {
                                skipped: validation.skipped,
                                originalRequest: command.request,
                                autoMode: true
                            });

                            if (execution.ok) {
                                await pgLogAgentAction(
                                    "agent_apply",
                                    autoPlan.remaining.length ? "partially_applied" : "applied",
                                    command.request,
                                    plan,
                                    {
                                        agentProfile: agentProfile.name,
                                        steps: autoPlan.executable
                                    },
                                    execution.undoEntries,
                                    `Executed automatically: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
                                );

                                await createAgentNotification(
                                    "autonomy_level_3_auto_action",
                                    "Autonomy Level 3 executed task",
                                    `Goal "${command.request}" auto-executed: ${execution.results.join(" | ")}`,
                                    "agent_request",
                                    null
                                );

                                if (!autoPlan.remaining.length) {
                                    _s.latestAgentPlan = null;

                                    return {
                                        ok: true,
                                        reply: `Auto-executed safely (Autonomy Level 3)\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                                        proposalOnly: false,
                                        autoExecuted: true
                                    };
                                }

                                _s.latestAgentPlan.pendingSteps = autoPlan.remaining;
                                _s.latestAgentPlan.pendingSkipped = validation.skipped;
                                _s.latestAgentPlan.autoExecutedResults = execution.results;

                                return {
                                    ok: true,
                                reply: `Auto-executed safely (Autonomy Level 3)\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nAwaiting approval:\n- ${filterPendingApprovalSteps(autoPlan.remaining).map(step => `${step.type}${step.filename ? ` (${step.filename})` : step.keyword ? ` (${step.keyword})` : ""}`).join("\n- ")}\n\nUse: approve agent`,
                                    proposalOnly: false,
                                    autoExecuted: true
                                };
                            }
                        }

                        _s.latestAgentPlan.pendingSteps = validation.validSteps;
                        _s.latestAgentPlan.pendingSkipped = validation.skipped;

                        return {
                            ok: true,
                            reply: `Safe actions could not be auto-executed.\n\nAwaiting approval:\n- ${filterPendingApprovalSteps(validation.validSteps).map(step => `${step.type}${step.filename ? ` (${step.filename})` : step.keyword ? ` (${step.keyword})` : ""}`).join("\n- ")}\n\nUse: approve agent\n\n${plan}`,
                            proposalOnly: true
                        };
                    }
                }

                console.log("Agent Level 3 safe auto result:", {
                    usedDirectFallback,
                    parsed: Boolean(parsed),
                    reason: parsed?.needs_clarification || "No safe executable steps were produced."
                });
            }

            return {
                ok: true,
                reply: plan,
                proposalOnly: true
            };
        }

        case "run_agent": {
            const agentProfile = getAgentProfile(command.agentName || "system_agent");
            const task = await pgCreateAgentTask(
                command.goal,
                "planned",
                "",
                {
                    agentProfile: {
                        name: agentProfile.name,
                        id: agentProfile.id,
                        title: agentProfile.title,
                        displayName: agentProfile.displayName,
                        purpose: agentProfile.purpose
                    }
                },
                null,
                userId || null
            );

            if (!task) {
                return { ok: false, reply: "Could not create agent task." };
            }

            const planning = await runAgentPlanningCycle(task.id);

            if (!planning.ok) {
                return {
                    ok: false,
                    reply: planning.message
                };
            }

            const AUTONOMY_LEVEL = String(process.env.AUTONOMY_LEVEL || "1");

            if (AUTONOMY_LEVEL === "2" || AUTONOMY_LEVEL === "3") {
                try { require('./orchestration/governance_instrumentation').emitStart(String(task.id), 'chat_auto_run'); } catch (_) {}
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);
                setImmediate(() => { try { require('./orchestration/governance_instrumentation').emitEnd(String(task.id), autoRun?.status); } catch (_) {} });
                setImmediate(() => { try { const o = require('./orchestration/execution_orchestrator'); o.process({ execution_id: String(task.id), output: autoRun, metadata: { task_id: task.id, success: autoRun?.status === 'completed' }, timestamp: new Date().toISOString() }).catch(() => {}); } catch (_) {} });

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const executedText = autoRun.executed.length
                    ? autoRun.executed.map(item => `- ${item}`).join("\n")
                    : "- None";
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";
                const deferredText = autoRun.deferredActions.length
                    ? autoRun.deferredActions.map(item => `- ${item}`).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nDeferred actions:\n${deferredText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            return {
                ok: true,
                reply: planning.fallbackMessage
                    ? `Agent task #${task.id} planned.\n\nStatus: ${planning.status}\n${planning.fallbackMessage}\n\nExecutable steps (read-only):\n${formatExecutableFallbackSteps(planning.validSteps)}\n\nDeferred actions (requires follow-up plan):\n${planning.deferredActions?.length ? planning.deferredActions.map(item => `- ${item}`).join("\n") : "- None"}${planning.validSteps.length ? `\n\nNext approval needed: approve task ${task.id}` : ""}`
                    : `Agent task #${task.id} planned.\n\nStatus: ${planning.status}\n${planning.plan}${planning.validSteps.length ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                taskId: task.id,
                status: planning.status
            };
        }

        case "continue_agent": {
            const recentTasks = await pgGetRecentAgentTasks(10);
            const task = getLatestActiveAgentTask(recentTasks);

            if (!task) {
                const latestTask = recentTasks[0];

                if (latestTask && latestTask.status === "completed") {
                    return { ok: false, reply: "Task already completed" };
                }

                return { ok: false, reply: "No active agent task is available to continue." };
            }

            if (task.status === "waiting_approval") {
                return {
                    ok: false,
                    reply: "Task requires approval"
                };
            }

            const AUTONOMY_LEVEL_CONT = String(process.env.AUTONOMY_LEVEL || "1");

            if (AUTONOMY_LEVEL_CONT === "2" || AUTONOMY_LEVEL_CONT === "3") {
                try { require('./orchestration/governance_instrumentation').emitStart(String(task.id), 'continue_auto_run'); } catch (_) {}
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);
                setImmediate(() => { try { require('./orchestration/governance_instrumentation').emitEnd(String(task.id), autoRun?.status); } catch (_) {} });
                setImmediate(() => { try { const o = require('./orchestration/execution_orchestrator'); o.process({ execution_id: String(task.id), output: autoRun, metadata: { task_id: task.id, success: autoRun?.status === 'completed' }, timestamp: new Date().toISOString() }).catch(() => {}); } catch (_) {} });

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const executedText = autoRun.executed.length
                    ? autoRun.executed.map(item => `- ${item}`).join("\n")
                    : "- None";
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n${executedText}${autoRun.skipped.length ? `\n\nSkipped steps:\n- ${autoRun.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            const execution = await executeApprovedAgentTask(task.id);

            return execution.ok
                ? {
                    ok: true,
                    reply: `Agent task #${task.id} continued.\n\nStatus: ${execution.status}\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${execution.generatedProposal && execution.status === "waiting_approval" ? `${execution.planSkipped.length ? `\n\nPreviously skipped during planning:\n- ${execution.planSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nGenerated cleanup plan:\n\n${execution.plan}\n\nNext approval needed: approve task ${task.id}` : execution.status === "completed" ? `\n\nTask completed. No further action required.` : execution.status === "running" ? `\n\nContinue with: continue agent` : execution.status === "waiting_approval" ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                    taskId: task.id,
                    status: execution.status
                }
                : {
                    ok: false,
                    reply: execution.message
                };
        }

        case "agent_apply": {
            // TODO: Move latestAgentPlan into agent_tasks.context_json before concurrent multi-agent execution.
            if (!_s.latestAgentPlan) {
                return { ok: false, reply: "No agent plan to approve." };
            }

            const planAgeMs = Date.now() - new Date(_s.latestAgentPlan.createdAt || 0).getTime();
            if (planAgeMs > 10 * 60 * 1000) {
                _s.latestAgentPlan = null;
                return { ok: false, reply: "Agent plan expired. Please create a new plan." };
            }

            const hasPendingSteps = Array.isArray(_s.latestAgentPlan.pendingSteps);
            const parsed = hasPendingSteps
                ? { steps: _s.latestAgentPlan.pendingSteps }
                : await getApprovedAgentActions(_s.latestAgentPlan);

            if (!parsed) {
                return {
                    ok: false,
                    reply: "The saved agent plan could not be converted into a safe action list. Please create a clearer agent plan."
                };
            }

            if (parsed.needs_clarification || !Array.isArray(parsed.steps) || !parsed.steps.length) {
                return {
                    ok: false,
                    reply: parsed.needs_clarification
                        ? `The saved agent plan is too ambiguous or unsafe to apply: ${parsed.needs_clarification}`
                        : "The saved agent plan did not contain any safe actions to apply. Please create a clearer agent plan."
                };
            }

            const validation = hasPendingSteps
                ? {
                    fatalError: null,
                    validSteps: _s.latestAgentPlan.pendingSteps,
                    skipped: Array.isArray(_s.latestAgentPlan.pendingSkipped) ? _s.latestAgentPlan.pendingSkipped : []
                }
                : validateAgentSteps(parsed.steps, _s.latestAgentPlan.request);

            if (validation.fatalError) {
                await pgLogAgentAction(
                    "agent_apply",
                    "blocked",
                    _s.latestAgentPlan.request,
                    _s.latestAgentPlan.plan,
                    parsed.steps,
                    null,
                    validation.fatalError
                );

                await notifyUnsafeActionBlocked(_s.latestAgentPlan.request, validation.fatalError);

                return {
                    ok: false,
                    reply: validation.fatalError
                };
            }

            if (!validation.validSteps.length) {
                await pgLogAgentAction(
                    "agent_apply",
                    "skipped",
                    _s.latestAgentPlan.request,
                    _s.latestAgentPlan.plan,
                    parsed.steps,
                    null,
                    validation.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")
                );

                return {
                    ok: false,
                    reply: `No valid safe steps were available to execute.\n\nSkipped steps:\n- ${validation.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}`
                };
            }

            const duplicateMatch = await findPendingDuplicateForSteps(validation.validSteps);

            if (duplicateMatch) {
                _s.pendingDuplicateDecision = {
                    request: _s.latestAgentPlan.request,
                    plan: _s.latestAgentPlan.plan,
                    steps: validation.validSteps,
                    skipped: validation.skipped,
                    duplicateIndex: duplicateMatch.index,
                    duplicate: duplicateMatch.duplicate
                };

                await pgLogAgentAction(
                    "agent_apply",
                    "duplicate_pending",
                    _s.latestAgentPlan.request,
                    _s.latestAgentPlan.plan,
                    validation.validSteps,
                    null,
                    `Duplicate detected for ${duplicateMatch.duplicate.filename}`
                );

                return {
                    ok: false,
                    reply: `A likely duplicate was found: ${duplicateMatch.duplicate.filename}.

Choose one:
- create anyway: \`approve duplicate create\`
- replace existing: \`approve duplicate replace\`
- rename new note: create a clearer new agent plan
- cancel: \`cancel duplicate\``
                };
            }

            const execution = await executeApprovedAgentActions(validation.validSteps, {
                skipped: validation.skipped,
                originalRequest: _s.latestAgentPlan.request
            });

            if (!execution.ok) {
                await pgLogAgentAction(
                    "agent_apply",
                    "failed",
                    _s.latestAgentPlan.request,
                    _s.latestAgentPlan.plan,
                    parsed.steps,
                    execution.undoEntries || null,
                    execution.message
                );

                return {
                    ok: false,
                    reply: execution.message
                };
            }

            await pgLogAgentAction(
                "agent_apply",
                "applied",
                _s.latestAgentPlan.request,
                _s.latestAgentPlan.plan,
                validation.validSteps,
                execution.undoEntries,
                `Executed: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
            );

            _s.latestAgentPlan = null;
            _s.pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: `Approved agent actions applied:\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                appliedActions: execution.results.length,
                skipped: execution.skipped
            };
        }

        case "approve_task": {
            const task = command.id
                ? await pgGetAgentTask(command.id)
                : await pgGetLatestWaitingAgentTask();

            if (!task) {
                return { ok: false, reply: "No waiting agent task found." };
            }

            if (!["waiting_approval", "approved", "planned", "running"].includes(task.status)) {
                return { ok: false, reply: `Agent task #${task.id} is not awaiting approval.` };
            }

            const execution = await executeApprovedAgentTask(task.id);
            const AUTONOMY_LEVEL_APPROVE = String(process.env.AUTONOMY_LEVEL || "1");

            if (execution.ok && (AUTONOMY_LEVEL_APPROVE === "2" || AUTONOMY_LEVEL_APPROVE === "3") && execution.status === "running") {
                try { require('./orchestration/governance_instrumentation').emitStart(String(task.id), 'approve_auto_run'); } catch (_) {}
                const autoRun = await autoRunReadOnlyTaskSteps(task.id);
                setImmediate(() => { try { require('./orchestration/governance_instrumentation').emitEnd(String(task.id), autoRun?.status); } catch (_) {} });
                setImmediate(() => { try { const o = require('./orchestration/execution_orchestrator'); o.process({ execution_id: String(task.id), output: autoRun, metadata: { task_id: task.id, success: autoRun?.status === 'completed' }, timestamp: new Date().toISOString() }).catch(() => {}); } catch (_) {} });

                if (!autoRun.ok) {
                    return {
                        ok: false,
                        reply: autoRun.message
                    };
                }

                const combinedExecuted = [...execution.results, ...autoRun.executed];
                const combinedSkipped = [...execution.skipped, ...autoRun.skipped];
                const awaitingText = filterPendingApprovalSteps(autoRun.remainingActions).length
                    ? filterPendingApprovalSteps(autoRun.remainingActions).map(step => formatAgentStepForDisplay(step)).join("\n")
                    : "- None";

                if (autoRun.status === "completed") {
                    return {
                        ok: true,
                        reply: `Auto-executed safely (chained execution)\n\nExecuted steps:\n- ${combinedExecuted.join("\n- ")}${combinedSkipped.length ? `\n\nSkipped steps:\n- ${combinedSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}`,
                        taskId: task.id,
                        status: autoRun.status
                    };
                }

                return {
                    ok: true,
                    reply: `Chained execution paused for approval\n\nExecuted steps:\n- ${combinedExecuted.join("\n- ")}${combinedSkipped.length ? `\n\nSkipped steps:\n- ${combinedSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${autoRun.generatedPlan ? `\n\nFindings:\n${autoRun.generatedPlan}` : ""}\n\nPending step:\n${awaitingText}\n\nNext approval needed: approve task ${task.id}`,
                    taskId: task.id,
                    status: autoRun.status
                };
            }

            return execution.ok
                ? {
                    ok: true,
                    reply: `Agent task #${task.id} executed.\n\nStatus: ${execution.status}\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}${execution.generatedProposal && execution.status === "waiting_approval" ? `${execution.planSkipped.length ? `\n\nPreviously skipped during planning:\n- ${execution.planSkipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}\n\nGenerated cleanup plan:\n\n${execution.plan}\n\nNext approval needed: approve task ${task.id}` : execution.status === "completed" ? `\n\nTask completed. No further action required.` : execution.status === "running" ? `\n\nContinue with: continue agent` : execution.status === "waiting_approval" ? `\n\nNext approval needed: approve task ${task.id}` : ""}`,
                    taskId: task.id,
                    status: execution.status
                }
                : {
                    ok: false,
                    reply: execution.message
                };
        }

        case "duplicate_create_approval":
        case "duplicate_replace_approval": {
            if (!_s.pendingDuplicateDecision) {
                return { ok: false, reply: "No duplicate decision is waiting for approval." };
            }

            const execution = await executeApprovedAgentActions(
                _s.pendingDuplicateDecision.steps,
                {
                    skipped: _s.pendingDuplicateDecision.skipped,
                    originalRequest: _s.pendingDuplicateDecision.request,
                    duplicateDecision: {
                        index: _s.pendingDuplicateDecision.duplicateIndex,
                        duplicate: _s.pendingDuplicateDecision.duplicate,
                        mode: command.type === "duplicate_replace_approval" ? "replace" : "create"
                    }
                }
            );

            if (!execution.ok) {
                await pgLogAgentAction(
                    "agent_apply",
                    "failed",
                    _s.pendingDuplicateDecision.request,
                    _s.pendingDuplicateDecision.plan,
                    _s.pendingDuplicateDecision.steps,
                    execution.undoEntries || null,
                    execution.message
                );

                return {
                    ok: false,
                    reply: execution.message
                };
            }

            await pgLogAgentAction(
                "agent_apply",
                "applied",
                _s.pendingDuplicateDecision.request,
                _s.pendingDuplicateDecision.plan,
                _s.pendingDuplicateDecision.steps,
                execution.undoEntries,
                `Executed: ${execution.results.join(" | ")}${execution.skipped.length ? ` | Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}` : ""}`
            );

            _s.latestAgentPlan = null;
            _s.pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: `Approved duplicate decision applied:\n\nExecuted steps:\n- ${execution.results.join("\n- ")}${execution.skipped.length ? `\n\nSkipped steps:\n- ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join("\n- ")}` : ""}`,
                appliedActions: execution.results.length,
                skipped: execution.skipped
            };
        }

        case "duplicate_cancel": {
            if (!_s.pendingDuplicateDecision) {
                return { ok: false, reply: "No duplicate decision is waiting." };
            }

            await pgLogAgentAction(
                "agent_apply",
                "cancelled",
                _s.pendingDuplicateDecision.request,
                _s.pendingDuplicateDecision.plan,
                _s.pendingDuplicateDecision.steps,
                null,
                "Duplicate creation cancelled"
            );

            _s.pendingDuplicateDecision = null;

            return {
                ok: true,
                reply: "Duplicate approval cancelled."
            };
        }

        case "agent_undo": {
            const lastAction = await pgGetLastUndoableAgentAction();

            if (!lastAction) {
                return { ok: false, reply: "No undoable agent action found." };
            }

            const undoResult = await undoAgentActionRecord(lastAction);

            if (!undoResult.ok) {
                return {
                    ok: false,
                    reply: undoResult.message
                };
            }

            await pgMarkAgentActionUndone(lastAction.id);

            return {
                ok: true,
                reply: `Undid last agent action:\n\n- ${undoResult.results.join("\n- ")}`
            };
        }

        case "cancel_agent": {
            const task = await pgGetLatestWaitingAgentTask();

            if (!task || task.status !== "waiting_approval") {
                return { ok: false, reply: "No waiting agent task found to cancel." };
            }

            await pgUpdateAgentTask(task.id, {
                status: "cancelled",
                result: "Task cancelled by user."
            });

            await pgLogAgentAction(
                "agent_task_cancel",
                "cancelled",
                task.goal,
                task.plan || "",
                task.actions_json || null,
                null,
                "Task cancelled by user."
            );

            return {
                ok: true,
                reply: `Cancelled agent task #${task.id}.`
            };
        }

        case "run_schedules_now": {
            const scheduleRun = await runDueSchedules();

            if (!scheduleRun.dueSchedules.length) {
                return {
                    ok: true,
                    reply: "No enabled schedules are due right now."
                };
            }

            const lines = scheduleRun.results.map(result => result.ok
                ? `- Schedule #${result.schedule.id} created task #${result.taskId}`
                : `- Schedule #${result.schedule.id} failed: ${result.message}`);

            return {
                ok: true,
                reply: `Schedule run summary:\n\n${lines.join("\n")}`
            };
        }

        case "preview_cleanup_agent_data": {
            const rows = await fetchAgentCleanupRows();
            const preview = buildAgentCleanupPreviewData(rows);
            _s.latestAgentCleanupPreview = preview;

            return {
                ok: true,
                reply: formatAgentCleanupPreview(preview),
                preview
            };
        }

        case "preview_cleanup_obvious_agent_data": {
            const rows = await fetchAgentCleanupRows();
            const preview = buildObviousAgentCleanupPreviewData(rows);
            _s.latestObviousAgentCleanupPreview = preview;

            return {
                ok: true,
                reply: formatAgentCleanupPreview(preview),
                preview
            };
        }

        case "apply_cleanup_agent_data": {
            if (!_s.latestAgentCleanupPreview) {
                return {
                    ok: false,
                    reply: "Run preview cleanup agent data first."
                };
            }

            const applyResult = await applyAgentCleanupPreview(_s.latestAgentCleanupPreview);

            if (!applyResult.ok) {
                return {
                    ok: false,
                    reply: applyResult.reply
                };
            }

            const refreshedRows = await fetchAgentCleanupRows();
            const refreshedPreview = buildAgentCleanupPreviewData(refreshedRows);
            _s.latestAgentCleanupPreview = null;

            return {
                ok: true,
                reply: `${applyResult.reply}

Final clean state summary:
- Remaining tasks: ${refreshedRows.tasks.length}
- Remaining schedules: ${refreshedRows.schedules.length}
- Preview delete candidates now: ${refreshedPreview.tasks.toDelete.length} tasks, ${refreshedPreview.schedules.toDelete.length} schedules`,
                deletedTaskIds: applyResult.deletedTaskIds,
                deletedScheduleIds: applyResult.deletedScheduleIds
            };
        }

        case "apply_cleanup_obvious_agent_data": {
            if (!_s.latestObviousAgentCleanupPreview) {
                return {
                    ok: false,
                    reply: "Run preview cleanup obvious agent data first."
                };
            }

            const applyResult = await applyAgentCleanupPreview(_s.latestObviousAgentCleanupPreview);

            if (!applyResult.ok) {
                return {
                    ok: false,
                    reply: applyResult.reply
                };
            }

            const refreshedRows = await fetchAgentCleanupRows();
            const refreshedPreview = buildObviousAgentCleanupPreviewData(refreshedRows);
            _s.latestObviousAgentCleanupPreview = null;

            return {
                ok: true,
                reply: `${applyResult.reply}

Final obvious clean state summary:
- Remaining tasks: ${refreshedRows.tasks.length}
- Remaining schedules: ${refreshedRows.schedules.length}
- Obvious preview delete candidates now: ${refreshedPreview.tasks.toDelete.length} tasks, ${refreshedPreview.schedules.toDelete.length} schedules`,
                deletedTaskIds: applyResult.deletedTaskIds,
                deletedScheduleIds: applyResult.deletedScheduleIds
            };
        }

        case "run_schedule": {
            const schedule = await pgGetAgentSchedule(command.id);

            if (!schedule) {
                return { ok: false, reply: `Could not find schedule: ${command.id}` };
            }

            const result = await runSingleScheduleOnce(schedule);

            if (!result.ok) {
                return { ok: false, reply: result.message };
            }

            return {
                ok: true,
                reply: `Schedule #${schedule.id} ran once and created task #${result.taskId}.`
            };
        }

        case "schedule_agent": {
            const safeName = command.goal
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .slice(0, 40) || `schedule_${Date.now()}`;
            const schedule = await pgCreateAgentSchedule(
                safeName,
                command.goal,
                command.frequency
            );

            return {
                ok: true,
                reply: `Schedule saved. Automatic execution will be added with background worker.\n\nSchedule #${schedule.id} [${schedule.frequency}] ${schedule.goal}`,
                scheduleId: schedule.id
            };
        }

        case "agent_schedules": {
            const schedules = await pgListAgentSchedules(20);

            if (!schedules.length) {
                return { ok: true, reply: "No agent schedules saved." };
            }

            const lines = schedules.map(schedule => `- #${schedule.id} [${schedule.enabled ? "enabled" : "disabled"}] ${schedule.frequency}: ${schedule.goal}`);
            return {
                ok: true,
                reply: `Agent schedules:\n\n${lines.join("\n")}`
            };
        }

        case "notifications": {
            const notifications = await pgListNotifications(20);

            if (!notifications.length) {
                return { ok: true, reply: "No notifications found." };
            }

            const lines = notifications.map(item => `- #${item.id} [${item.read ? "read" : "unread"}] ${item.title}: ${item.message}`);
            return {
                ok: true,
                reply: `Notifications:\n\n${lines.join("\n")}`
            };
        }

        case "mark_notification_read": {
            const notification = await pgMarkNotificationRead(command.id);

            if (!notification) {
                return { ok: false, reply: `Could not find notification: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Marked notification #${notification.id} as read.`
            };
        }

        case "disable_schedule": {
            const schedule = await pgDisableAgentSchedule(command.id);

            if (!schedule) {
                return { ok: false, reply: `Could not find schedule: ${command.id}` };
            }

            return {
                ok: true,
                reply: `Disabled schedule #${schedule.id}.`
            };
        }

        case "log_expense": {
            const now = new Date();
            const category = await categoriseTransaction(
                command.description, command.amount, command.transactionType || "expense"
            );
            const tx = await pgSaveTransaction(
                now.toISOString().split("T")[0],
                command.description,
                command.amount,
                command.transactionType || "expense",
                category
            );
            await checkBudgetAlerts();
            return { ok: true, reply: `Logged ${command.transactionType || "expense"}: £${command.amount} for "${command.description}" (${category}).` };
        }

        case "get_finance_summary": {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year  = now.getFullYear();
            const [summary, budgets] = await Promise.all([
                pgGetFinanceSummaryCurrentMonth(),
                pgListBudgets(month, year)
            ]);

            if (!summary.length) {
                return { ok: true, reply: "No transactions recorded this month yet." };
            }

            const budgetMap = {};
            for (const b of budgets) budgetMap[b.category] = b.monthly_limit;

            const lines = summary.map(row => {
                const limit = budgetMap[row.category];
                const limitStr = limit ? ` / £${limit} budget` : "";
                return `- ${row.category} (${row.type}): £${parseFloat(row.total).toFixed(2)}${limitStr}`;
            });

            return { ok: true, reply: `Finance summary for ${now.toLocaleString("default", { month: "long" })}:\n\n${lines.join("\n")}` };
        }

        case "set_budget": {
            const now = new Date();
            const b = await pgSaveBudget(command.category, command.amount, now.getMonth() + 1, now.getFullYear());
            return { ok: true, reply: `Budget set: £${command.amount}/month for ${command.category}.` };
        }

        case "check_emails": {
            try {
                const count = await checkEmails();
                return { ok: true, reply: `Checked email. Found ${count} new message${count !== 1 ? "s" : ""}.` };
            } catch (err) {
                return { ok: false, reply: `Email check failed: ${err.message}` };
            }
        }

        case "list_emails": {
            try {
                const emails = await pgListEmailQueue(20);
                if (!emails.length) return { ok: true, reply: "No emails pending." };
                const lines = emails.map(e => `- #${e.id} [${e.status}] From: ${e.sender} | Subject: ${e.subject}`);
                return { ok: true, reply: `Emails:\n\n${lines.join("\n")}` };
            } catch (err) {
                return { ok: false, reply: `Could not list emails: ${err.message}` };
            }
        }

        case "list_routines": {
            try {
                const routines = await pgListRoutines();
                if (!routines.length) return { ok: true, reply: "No routines set up." };
                const lines = routines.map(r => `- #${r.id} [${r.active ? "active" : "inactive"}] ${r.name} (${r.schedule_cron}): ${r.description}`);
                return { ok: true, reply: `Routines:\n\n${lines.join("\n")}` };
            } catch (err) {
                return { ok: false, reply: `Could not list routines: ${err.message}` };
            }
        }

        case "create_routine": {
            try {
                const routine = await pgCreateRoutine(command.name, command.description || "", command.schedule_cron);
                return { ok: true, reply: `Routine created: "${command.name}" (${command.schedule_cron}).` };
            } catch (err) {
                return { ok: false, reply: `Could not create routine: ${err.message}` };
            }
        }

        case "create_notification": {
            try {
                const title = command.title || "Reminder";
                const body  = command.body  || "";
                await pgCreateNotification(
                    command.priority || "normal",
                    title,
                    body,
                    null,
                    null
                );
                return { ok: true, reply: `Notification created: "${title}".` };
            } catch (err) {
                return { ok: false, reply: `Could not create notification: ${err.message}` };
            }
        }

        default:
            return null;
    }
}

module.exports = { handleCommand, getAgentState };
