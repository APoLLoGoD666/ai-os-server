'use strict';
// lib/agent-task-cycle.js — task planning, execution, scheduling, validation

const runtime = require('./models/runtime');
const { AGENT_PROFILES } = require('../agents');
const _gateway = require('./memory/gateway');
const _wm      = require('./memory/working-memory');

const {
    pgGetAgentTask,
    pgUpdateAgentTask,
    pgLogAgentAction,
    pgCreateAgentTask,
    pgUpdateAgentScheduleLastRun,
    pgGetDueAgentSchedules,
    pgGetApprovedReflections,
    pgSearchDocuments,
    pgInsertToolExecution,
} = require('./pg_helpers');

const _TASK_CYCLE_AGENT_ID = '00000000-0000-4000-8000-000000000002';

const {
    createAgentNotification,
    loadMemory
} = require('./chat-context');

const {
    listWorkspaceFiles,
    getRelevantDocuments
} = require('./workspace');

const {
    buildDuplicatePlanningInsights,
    buildDuplicatePlanningGroups,
    buildActiveStandingApprovalsText,
    getAgentProfile,
    isDiscoveryAgentStepType
} = require('./agent-plan-utils');

const {
    getAutonomyLevelMessage,
    getTaskExecutionState,
    buildTaskContext,
    buildSafeDefaultDiscoverySteps,
    extractDeferredFallbackActions,
    shouldGenerateFollowUpCleanupPlan,
    collectDocumentsForCleanupProposal,
    buildCleanupProposalPlan,
    isWriteAgentAction,
    isSafeAutoAction,
    isSafeLevel3WriteAction,
    isReadOnlyAgentAction,
    shouldAutoRunTaskAction,
    shouldInferSafeAuto
} = require('./agent-step-utils');

const {
    extractJsonBlock,
    findPendingDuplicateForSteps
} = require('./agent-file-utils');

const {
    normalizeExecutableAgentStep,
    getMatchingStandingApproval,
    canAutoRunLevel3Action,
    executeApprovedAgentActions
} = require('./agent-execution-utils');

const ALLOWED_AGENT_STEP_TYPES = new Set([
    "create_document",
    "create_workspace_file",
    "summarize_document",
    "rename_document",
    "delete_document",
    "list_documents",
    "list_files",
    "search_documents"
]);

function getLatestCompletedAgentTask(tasks = []) {
    return tasks.find(item => item.status === "completed") || null;
}

async function generateReflectionForTask(task) {
    const { result: response } = await runtime.execute({
        tier: 'fast', caller: 'generateReflectionForTask',
        maxTokens: 400,
        messages: [
            {
                role: "user",
                content: `You are writing a safe operational reflection for an AI task.

Task:
- id: ${task.id}
- goal: ${task.goal}
- status: ${task.status}
- result: ${task.result || "No result"}
- error: ${task.error || "No error"}
- plan: ${task.plan || "No saved plan"}

Answer as strict JSON only:
{
  "lesson": "short learning note",
  "category": "operational|proposal_only",
  "confidence": 50,
  "what_worked": "short text",
  "what_failed": "short text",
  "remember_next_time": "short text",
  "requires_human_approval": true
}

Safety rules:
- Reflections are learning notes only.
- Do not propose modifying server.js, dashboard.html, pg_helpers.js, env vars, schemas, autonomy rules, or security rules as automatic action.
- If any system or code improvement is suggested, set category to "proposal_only" and requires_human_approval to true.
- Keep the lesson practical and concise.`
            }
        ]
    });

    const text = (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
    const jsonText = extractJsonBlock(text);

    if (!jsonText) {
        throw new Error("No reflection JSON returned.");
    }

    let parsed;
    try { parsed = JSON.parse(jsonText); } catch (e) { throw new Error(`Reflection JSON parse failed: ${e.message}`); }
    const whatWorked = String(parsed.what_worked || "No specific success noted.").trim();
    const whatFailed = String(parsed.what_failed || "No specific failure noted.").trim();
    const rememberNextTime = String(parsed.remember_next_time || parsed.lesson || "").trim();
    const requiresHumanApproval = Boolean(parsed.requires_human_approval) || String(parsed.category || "").trim() === "proposal_only";
    const category = requiresHumanApproval ? "proposal_only" : (String(parsed.category || "operational").trim() || "operational");
    const confidenceValue = Number.parseInt(parsed.confidence, 10);
    const confidence = Number.isFinite(confidenceValue)
        ? Math.max(0, Math.min(100, confidenceValue))
        : 50;
    const lesson = [
        `What worked: ${whatWorked}`,
        `What failed: ${whatFailed}`,
        `Remember next time: ${rememberNextTime}`,
        `Requires human approval: ${requiresHumanApproval ? "yes" : "no"}`
    ].join("\n");

    return {
        lesson,
        category,
        confidence,
        whatWorked,
        whatFailed,
        rememberNextTime,
        requiresHumanApproval
    };
}

async function buildAgentPlan(request, memory, documents, files, today, agentProfile = AGENT_PROFILES.system_agent) {
    const memoryText = memory.length
        ? memory
            .slice(-8)
            .map(item => `[${item.role.toUpperCase()}] ${item.message}`)
            .join("\n")
        : "No recent memory.";

    const docsText = documents.length
        ? documents.map((doc, index) => {
            const preview = (doc.content || "").slice(0, 1000);
            return [
                `DOCUMENT ${index + 1}`,
                `Filename: ${doc.filename}`,
                `Type: ${doc.classification || "unknown"}`,
                `Summary: ${doc.summary || "No summary"}`,
                "Content Preview:",
                preview
            ].join("\n");
        }).join("\n\n----------------------\n\n")
        : "No relevant documents found.";

    const filesText = files.length
        ? files.map(name => `- ${name}`).join("\n")
        : "No workspace files found.";
    const duplicateInsightsText = buildDuplicatePlanningInsights(documents);
    const approvedReflections = await pgGetApprovedReflections(8);
    const approvedLessonsText = approvedReflections.length
        ? approvedReflections.map(reflection => `- ${reflection.lesson}`).join("\n\n")
        : "No approved operational lessons.";
    const activeStandingApprovalsText = await buildActiveStandingApprovalsText();
    const profile = agentProfile || AGENT_PROFILES.system_agent;
    const profileText = [
        `Agent role: ${profile.title}`,
        `Purpose: ${profile.purpose}`,
        `Allowed areas: ${profile.allowedAreas.join(", ")}`,
        `Safety limits: ${profile.safetyLimits.join(" ")}`,
        ...(profile.planningInstructions ? [`Planning guidance: ${profile.planningInstructions}`] : []),
        "Use this role context to shape planning style and scope, but do not bypass any existing safety, approval, autonomy, or allowlist rules."
    ].join("\n");

    const { result: response } = await runtime.execute({ tier: 'balanced', caller: 'buildAgentPlan', maxTokens: 700, messages: [
            {
                role: "user",
                content: `You are in safe proposal mode. Do not execute any changes.

User request:
${request}

Recent memory:
${memoryText}

Relevant Postgres documents:
${docsText}

Workspace files from storage:
${filesText}

Duplicate cleanup analysis:
${duplicateInsightsText}

APPROVED OPERATIONAL LESSONS:
${approvedLessonsText}

ACTIVE STANDING APPROVALS:
${activeStandingApprovalsText}

AGENT PROFILE:
${profileText}

Today's real server date is: ${today}. Use this date for dated filenames.

You may propose a multi-step workflow, but only with safe ordered steps that map to:
- create_document
- create_workspace_file
- summarize_document
- rename_document
- delete_document
- list_documents
- list_files
- search_documents

Return a plan only using these exact sections:
- Objective
- Current Context
- Recommended Actions
- Risks
- Approval Question

When proposing cleanup of duplicate documents, justify which document to keep by comparing:
- created_at (newest vs oldest)
- content length
- summary richness
- filename clarity

Include a short scoring explanation before approval, for example:
"Keeping v1 because it has the cleanest filename and same content as others"

Use these lessons to avoid repeating past mistakes, but do not treat them as permission to bypass safety rules.

Only reference standing approvals that are explicitly listed in ACTIVE STANDING APPROVALS above.
Do not assume any other action is auto-approved.
If rename_document is not explicitly listed in ACTIVE STANDING APPROVALS, treat rename_document as approval-required.

Be practical and concise.`
            }
        ]
    });

    return (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();
}

async function generateTaskCleanupProposal(task) {
    const executionState = getTaskExecutionState(task);
    const files = Array.isArray(executionState.agentExecution?.discovery?.files)
        ? executionState.agentExecution.discovery.files
        : await listWorkspaceFiles();
    const documents = await collectDocumentsForCleanupProposal(executionState);
    const duplicateGroups = buildDuplicatePlanningGroups(documents);
    const plan = buildCleanupProposalPlan(task.goal, duplicateGroups, files);
    const parsed = await getApprovedAgentActions({
        request: task.goal,
        plan,
        today: new Date().toISOString().slice(0, 10),
        memory: [],
        documents,
        files
    });
    const validation = parsed && Array.isArray(parsed.steps)
        ? validateAgentSteps(parsed.steps, task.goal)
        : { fatalError: null, validSteps: [], skipped: [] };
    const actionsJson = {
        phase: "cleanup_proposal",
        discoverySummary: duplicateGroups.map(group => ({
            filenames: group.filenames,
            keepFilename: group.keepFilename,
            explanation: group.explanation
        })),
        steps: validation.fatalError ? [] : validation.validSteps,
        skipped: validation.skipped || []
    };
    const contextJson = {
        ...executionState.context,
        agentExecution: {
            ...executionState.agentExecution,
            discovery: {
                ...(executionState.agentExecution.discovery || {}),
                files,
                documents
            },
            cleanupProposal: {
                duplicateGroups: duplicateGroups.map(group => ({
                    filenames: group.filenames,
                    keepFilename: group.keepFilename,
                    explanation: group.explanation,
                    proposedActions: group.proposedActions
                })),
                generatedAt: new Date().toISOString()
            }
        }
    };
    const hasActions = actionsJson.steps.length > 0;
    const status = hasActions ? "waiting_approval" : "completed";
    const result = hasActions
        ? `Generated cleanup plan with ${actionsJson.steps.length} proposed action(s).`
        : "Task completed. No further action required.";

    await pgUpdateAgentTask(task.id, {
        status,
        current_step: 0,
        plan,
        actions_json: actionsJson,
        context_json: contextJson,
        result,
        error: validation.fatalError || null
    });

    await pgLogAgentAction(
        "agent_task_cleanup_plan",
        status,
        task.goal,
        plan,
        {
            taskId: task.id,
            duplicateGroups: actionsJson.discoverySummary,
            steps: actionsJson.steps,
            skipped: actionsJson.skipped
        },
        null,
        result
    );

    return {
        ok: true,
        status,
        plan,
        validSteps: actionsJson.steps,
        skipped: actionsJson.skipped,
        duplicateGroups,
        result
    };
}

function getNextTaskStatus(steps, nextIndex) {
    if (nextIndex >= steps.length) {
        return "completed";
    }

    const nextStep = steps[nextIndex];
    return nextStep && isWriteAgentAction(nextStep) ? "waiting_approval" : "running";
}

async function getNextTaskStatusForExecution(steps, nextIndex, originalRequest = "") {
    if (nextIndex >= steps.length) {
        return "completed";
    }

    const nextValidation = normalizeExecutableAgentStep(steps[nextIndex], originalRequest);

    if (!nextValidation.ok) {
        return "running";
    }

    const nextStep = nextValidation.step;

    if (shouldAutoRunTaskAction(nextStep)) {
        return "running";
    }

    const standingApproval = await getMatchingStandingApproval(nextStep);

    if (standingApproval) {
        const standingCheck = await canAutoRunLevel3Action(nextStep);

        if (standingCheck.ok) {
            return "running";
        }
    }

    return isWriteAgentAction(nextStep) ? "waiting_approval" : "running";
}

async function buildTaskActionSummary(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];

    if (!steps.length) {
        return "No stored actions.";
    }

    return steps.map((step, index) => {
        const detail = step.keyword || step.filename || step.oldName || step.goal || "";
        return `- ${index + 1}. ${step.type}${detail ? ` (${detail})` : ""}`;
    }).join("\n");
}

function getRemainingTaskSteps(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];
    const startIndex = Number.isInteger(task?.current_step) ? task.current_step : 0;

    return steps.slice(startIndex);
}

async function autoRunReadOnlyTaskSteps(taskId) {
    const aggregate = {
        ok: true,
        status: "running",
        executionMode: "chained",
        stepsExecuted: 0,
        maxSteps: 10,
        executed: [],
        skipped: [],
        generatedPlan: "",
        deferredActions: [],
        remainingActions: [],
        completedMessage: "",
        taskId
    };

    while (true) {
        let task = await pgGetAgentTask(taskId);

        if (!task) {
            return {
                ok: false,
                message: `Agent task not found: ${taskId}`
            };
        }

    if (task.status === "completed") {
        aggregate.status = "completed";
        aggregate.completedMessage = "Task completed. No approval required.";
        return aggregate;
    }

        if (aggregate.stepsExecuted >= aggregate.maxSteps) {
            const remaining = getRemainingTaskSteps(task);
            const pendingStep = remaining[0] || null;

            await pgUpdateAgentTask(taskId, {
                status: "waiting_approval",
                result: pendingStep
                    ? `Chained execution paused after ${aggregate.maxSteps} safe steps before ${pendingStep.type}.`
                    : `Chained execution paused after ${aggregate.maxSteps} safe steps.`
            });

            task = await pgGetAgentTask(taskId);
            aggregate.status = "waiting_approval";
            aggregate.remainingActions = getRemainingTaskSteps(task);
            aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
            return aggregate;
        }

        const remainingSteps = getRemainingTaskSteps(task);

        if (!remainingSteps.length) {
            aggregate.status = task.status === "completed" ? "completed" : "running";
            if (task.status === "completed") {
                aggregate.completedMessage = "Task completed. No approval required.";
            }
            return aggregate;
        }

        const nextStep = remainingSteps[0];
        const nextStepValidation = normalizeExecutableAgentStep(nextStep, task.goal || "");

        if (!nextStepValidation.ok) {
            const skippedItem = {
                type: nextStep?.type || "unknown_step",
                reason: nextStepValidation.reason
            };
            const nextIndex = (Number.isInteger(task.current_step) ? task.current_step : 0) + 1;
            const nextStatus = await getNextTaskStatusForExecution(
                Array.isArray(task.actions_json?.steps) ? task.actions_json.steps : [],
                nextIndex,
                task.goal || ""
            );

            await pgUpdateAgentTask(taskId, {
                status: nextStatus,
                current_step: nextIndex,
                result: skippedItem.reason,
                error: null,
                context_json: {
                    ...(task.context_json || {}),
                    agentExecution: {
                        ...((task.context_json && task.context_json.agentExecution) || {}),
                        execution_mode: "chained",
                        steps_executed: aggregate.stepsExecuted,
                        lastCycle: {
                            stepIndex: Number.isInteger(task.current_step) ? task.current_step : 0,
                            stepType: skippedItem.type,
                            executed: [],
                            skipped: [skippedItem],
                            completedAt: new Date().toISOString()
                        }
                    }
                }
            });

            aggregate.skipped.push(skippedItem);
            continue;
        }

        const executableNextStep = nextStepValidation.step;
        let standingApproval = null;

        if (!shouldAutoRunTaskAction(executableNextStep)) {
            standingApproval = await getMatchingStandingApproval(executableNextStep);

            if (standingApproval) {
                const standingCheck = await canAutoRunLevel3Action(executableNextStep);

                if (!standingCheck.ok) {
                    await pgUpdateAgentTask(taskId, {
                        status: "waiting_approval",
                        result: standingCheck.reason
                    });

                    task = await pgGetAgentTask(taskId);
                    aggregate.status = "waiting_approval";
                    aggregate.remainingActions = getRemainingTaskSteps(task);
                    aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
                    return aggregate;
                }
            }
        }

        if (!shouldAutoRunTaskAction(executableNextStep) && !standingApproval) {
            await pgUpdateAgentTask(taskId, {
                status: "waiting_approval",
                result: `Task is waiting for approval before ${executableNextStep.type}.`
            });

            task = await pgGetAgentTask(taskId);
            aggregate.status = "waiting_approval";
            aggregate.remainingActions = getRemainingTaskSteps(task);
            aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
            return aggregate;
        }

        if ((String(process.env.AUTONOMY_LEVEL || "1") === "3" && isSafeAutoAction(executableNextStep) && !isReadOnlyAgentAction(executableNextStep)) || standingApproval) {
            const level3Check = await canAutoRunLevel3Action(executableNextStep);

            if (!level3Check.ok) {
                await pgUpdateAgentTask(taskId, {
                    status: "waiting_approval",
                    result: level3Check.reason
                });

                task = await pgGetAgentTask(taskId);
                aggregate.status = "waiting_approval";
                aggregate.remainingActions = getRemainingTaskSteps(task);
                aggregate.deferredActions = Array.isArray(task.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];
                return aggregate;
            }
        }

        const execution = await executeApprovedAgentTask(taskId, {
            autoMode: true,
            chainMode: true
        });

        if (!execution.ok) {
            return execution;
        }

        aggregate.executed.push(...execution.results);
        aggregate.skipped.push(...execution.skipped);
        aggregate.stepsExecuted += 1;

        if (standingApproval && execution.results.length) {
            await pgLogAgentAction(
                "standing_approval_used",
                "applied",
                task.goal || "standing approval",
                task.plan || "",
                {
                    taskId,
                    standingApprovalId: standingApproval.id,
                    step: executableNextStep
                },
                execution.undoEntries || null,
                execution.results.join(" | ")
            );

            await createAgentNotification(
                "standing_approval_used",
                "Standing approval used",
                `Standing approval "${standingApproval.name}" auto-executed ${executableNextStep.type} for task #${taskId}.`,
                "agent_task",
                taskId
            );
        }

        if (execution.generatedProposal) {
            aggregate.generatedPlan = execution.plan || "";
        }

        task = await pgGetAgentTask(taskId);
        aggregate.status = task?.status || execution.status;
        aggregate.remainingActions = task ? getRemainingTaskSteps(task) : [];
        aggregate.deferredActions = Array.isArray(task?.actions_json?.deferredActions) ? task.actions_json.deferredActions : [];

        if (aggregate.status === "waiting_approval" || aggregate.status === "completed") {
            if (aggregate.status === "completed") {
                aggregate.completedMessage = "Task completed. No approval required.";
            }
            return aggregate;
        }
    }
}

async function notifyTaskStatus(task, status, detail = "") {
    if (!task) {
        return;
    }

    if (status === "waiting_approval") {
        await createAgentNotification(
            "task_waiting_approval",
            `Agent task #${task.id} needs approval`,
            detail || `Task "${task.goal}" is waiting for approval.`,
            "agent_task",
            task.id
        );
        return;
    }

    if (status === "completed") {
        await createAgentNotification(
            "task_completed",
            `Agent task #${task.id} completed`,
            detail || `Task "${task.goal}" completed successfully.`,
            "agent_task",
            task.id
        );
        return;
    }

    if (status === "failed") {
        await createAgentNotification(
            "task_failed",
            `Agent task #${task.id} failed`,
            detail || `Task "${task.goal}" failed.`,
            "agent_task",
            task.id
        );
    }
}

function formatScheduleRunSummary(result) {
    if (!result.ok) {
        return `- Schedule #${result.schedule.id} failed: ${result.message}`;
    }

    const parts = [`- Schedule #${result.schedule.id} created task #${result.taskId}`];

    if (result.autoRun?.executed?.length) {
        parts.push(`auto-ran ${result.autoRun.executed.length} safe step(s)`);
    }

    if (result.autoRun?.status === "waiting_approval") {
        parts.push("waiting for approval");
    }

    if (result.autoRun?.status === "completed" || result.planning?.status === "completed") {
        parts.push("completed");
    }

    return parts.join(" | ");
}

async function notifyUnsafeActionBlocked(request, message) {
    await createAgentNotification(
        "unsafe_action_blocked",
        "Unsafe agent action blocked",
        message || `A blocked action was rejected for request: ${request}`,
        "agent_request",
        null
    );
}

async function runSingleScheduleOnce(schedule) {
    const task = await pgCreateAgentTask(
        schedule.goal,
        "planned",
        "",
        {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            frequency: schedule.frequency,
            triggeredAt: new Date().toISOString()
        },
        null,
        process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001'
    );

    if (!task) {
        return {
            ok: false,
            schedule,
            message: "Could not create agent task from schedule."
        };
    }

    await pgUpdateAgentScheduleLastRun(schedule.id);
    await createAgentNotification(
        "schedule_task_created",
        `Schedule #${schedule.id} created task #${task.id}`,
        `Scheduled goal "${schedule.goal}" created agent task #${task.id}.`,
        "agent_task",
        task.id
    );

    const planning = await runAgentPlanningCycle(task.id);

    if (!planning.ok) {
        await notifyTaskStatus({ ...task, goal: schedule.goal }, "failed", planning.message);
        return {
            ok: false,
            schedule,
            taskId: task.id,
            message: planning.message
        };
    }

    if (planning.status === "waiting_approval") {
        await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "waiting_approval", `Scheduled task #${task.id} is waiting for approval.`);
    }

    if (planning.status === "completed") {
        await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "completed", `Scheduled task #${task.id} completed without further action.`);
    }

    let autoRun = null;

    if (String(process.env.AUTONOMY_LEVEL || "1") === "2" || String(process.env.AUTONOMY_LEVEL || "1") === "3") {
        try { require('./orchestration/governance_instrumentation').emitStart(String(task.id), 'scheduled_auto_run'); } catch (_) {}
        autoRun = await autoRunReadOnlyTaskSteps(task.id);
        setImmediate(() => { try { require('./orchestration/governance_instrumentation').emitEnd(String(task.id), autoRun?.status); } catch (_) {} });

        if (!autoRun.ok) {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "failed", autoRun.message);
            return {
                ok: false,
                schedule,
                taskId: task.id,
                message: autoRun.message
            };
        }

        if (autoRun.status === "waiting_approval") {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "waiting_approval", `Scheduled task #${task.id} is waiting for approval.`);
        }

        if (autoRun.status === "completed") {
            await notifyTaskStatus({ ...task, goal: schedule.goal, id: task.id }, "completed", `Scheduled task #${task.id} completed without approval.`);
        }

        // Governance pipeline — fire-and-forget, never blocks execution
        setImmediate(() => {
            try {
                const orchestrator = require('./orchestration/execution_orchestrator');
                orchestrator.process({
                    execution_id: String(task.id),
                    output:       autoRun,
                    metadata:     { task_id: task.id, success: autoRun.status === 'completed' },
                    timestamp:    new Date().toISOString(),
                }).catch(() => {});
            } catch (_) {}
        });
    }

    return {
        ok: true,
        schedule,
        taskId: task.id,
        planning,
        autoRun
    };
}

async function runDueSchedules() {
    const dueSchedules = await pgGetDueAgentSchedules();
    const results = [];

    for (const schedule of dueSchedules) {
        try {
            const _schedResult = await runSingleScheduleOnce(schedule);
            results.push(_schedResult);

            // Phase 1 — Agent Completion Memory: persist successful task outcomes
            if (_schedResult?.ok && (_schedResult.autoRun?.status === 'completed' || _schedResult.planning?.status === 'completed')) {
                const _tid = String(_schedResult.taskId || '');
                setImmediate(async () => {
                    try {
                        const content = `Agent task completed: "${schedule.goal}". Task ID: ${_tid}.`;
                        await _gateway.storeMemory({ layer: 2, source: 'agent_completion', content, tags: ['agent', 'task', 'completion'], requestingEntity: 'system', taskId: _tid });
                    } catch {}

                    // Phase 5 — Influence Confirmation: task succeeded → lessons used were influential
                    try {
                        const lessonRec = await _wm.get(_tid, 'execution_context');
                        if (lessonRec?.content?.length) {
                            const _rfx = require('./memory/reflexion-tracker');
                            for (const l of lessonRec.content) {
                                if (l.content) _rfx.recordInfluence(l.content, _tid, 'operational').catch(() => {});
                            }
                        }
                    } catch {}
                });
            }
        } catch (e) {
            console.error(`[runDueSchedules] schedule #${schedule.id} failed:`, e.message);
            results.push({ ok: false, schedule, message: e.message });
        }
    }

    return {
        ok: true,
        dueSchedules,
        results
    };
}

async function runAgentPlanningCycle(taskId) {
    const task = await pgGetAgentTask(taskId);

    if (!task) {
        return {
            ok: false,
            message: `Agent task not found: ${taskId}`
        };
    }

    const autonomyMessage = getAutonomyLevelMessage();

    if (autonomyMessage) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            error: autonomyMessage
        });

        return {
            ok: false,
            message: autonomyMessage
        };
    }

    const memory = await loadMemory();
    const documents = await getRelevantDocuments(task.goal).catch(e => { console.log("Voyage unavailable - using keyword search"); return pgSearchDocuments(task.goal.toLowerCase()).catch(() => []); });
    const files = await listWorkspaceFiles();
    const today = new Date().toISOString().slice(0, 10);
    const agentProfile = getAgentProfile(task.context_json?.agentProfile?.name || "system_agent");
    let plan;
    try {
        plan = await buildAgentPlan(task.goal, memory, documents, files, today, agentProfile);
    } catch (e) {
        console.error('[runAgentPlanningCycle] buildAgentPlan failed:', e.message);
        await pgUpdateAgentTask(taskId, { status: 'failed', error: `Plan generation failed: ${e.message}` });
        return { ok: false, message: `Plan generation failed: ${e.message}` };
    }
    const parsed = await getApprovedAgentActions({
        request: task.goal,
        plan,
        today,
        memory,
        documents,
        files
    });

    if (!parsed) {
        const fallbackSteps = buildSafeDefaultDiscoverySteps();
        const validation = validateAgentSteps(fallbackSteps, task.goal);
        const fallbackMessage = "Using safe default discovery steps because the plan could not be converted.";
        const deferredActions = extractDeferredFallbackActions(plan);

        await pgUpdateAgentTask(taskId, {
            status: "waiting_approval",
            current_step: 0,
            plan,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: {
                phase: "discovery",
                steps: validation.validSteps,
                skipped: validation.skipped,
                fallback: true,
                deferredActions
            },
            result: fallbackMessage,
            error: null
        });

        await pgLogAgentAction(
            "agent_task_plan",
            "planned",
            task.goal,
            plan,
            {
                taskId,
                steps: validation.validSteps,
                skipped: validation.skipped,
                fallback: true,
                deferredActions
            },
            null,
            fallbackMessage
        );

        return {
            ok: true,
            status: "waiting_approval",
            plan,
            validSteps: validation.validSteps,
            skipped: validation.skipped,
            result: fallbackMessage,
            fallbackMessage,
            deferredActions
        };
    }

    if (parsed.needs_clarification) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            plan,
            error: parsed.needs_clarification,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: parsed
        });

        return {
            ok: false,
            message: parsed.needs_clarification
        };
    }

    const validation = validateAgentSteps(parsed.steps, task.goal);

    if (validation.fatalError) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            plan,
            context_json: buildTaskContext(memory, documents, files, today, agentProfile),
            actions_json: {
                steps: [],
                skipped: validation.skipped
            },
            result: validation.fatalError,
            error: validation.fatalError
        });

        await pgLogAgentAction(
            "agent_task_plan",
            "failed",
            task.goal,
            plan,
            {
                taskId,
                skipped: validation.skipped
            },
            null,
            validation.fatalError
        );

        await notifyUnsafeActionBlocked(task.goal, validation.fatalError);
        await notifyTaskStatus(task, "failed", validation.fatalError);

        return {
            ok: false,
            message: validation.fatalError
        };
    }

    const status = validation.validSteps.length ? "waiting_approval" : "completed";
    const result = validation.validSteps.length
        ? `Task planned with ${validation.validSteps.length} safe step(s).`
        : "Task planning completed with no executable safe steps.";

    await pgUpdateAgentTask(taskId, {
        status,
        current_step: 0,
        plan,
        context_json: buildTaskContext(memory, documents, files, today, agentProfile),
        actions_json: {
            phase: validation.validSteps.every(step => isDiscoveryAgentStepType(step.type)) ? "discovery" : "planned_actions",
            steps: validation.validSteps,
            skipped: validation.skipped
        },
        result,
        error: validation.fatalError
    });

    await pgLogAgentAction(
        "agent_task_plan",
        status === "waiting_approval" ? "planned" : "completed",
        task.goal,
        plan,
        {
            taskId,
            steps: validation.validSteps,
            skipped: validation.skipped
        },
        null,
        result
    );

    if (status === "waiting_approval") {
        await notifyTaskStatus(task, "waiting_approval", result);
    } else if (status === "completed") {
        await notifyTaskStatus(task, "completed", result);
    }

    return {
        ok: true,
        status,
        plan,
        validSteps: validation.validSteps,
        skipped: validation.skipped,
        result
    };
}

async function executeApprovedAgentTask(taskId, options = {}) {
    const task = await pgGetAgentTask(taskId);

    if (!task) {
        return {
            ok: false,
            message: `Agent task not found: ${taskId}`
        };
    }

    const autonomyMessage = getAutonomyLevelMessage();

    if (autonomyMessage) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            error: autonomyMessage
        });

        return {
            ok: false,
            message: autonomyMessage
        };
    }

    const actions = task.actions_json || {};
    const steps = Array.isArray(actions.steps) ? actions.steps : [];
    const plannedSkipped = Array.isArray(actions.skipped) ? actions.skipped : [];
    const startIndex = Number.isInteger(task.current_step) ? task.current_step : 0;
    const executionState = getTaskExecutionState(task);
    const nextStepsExecuted = executionState.stepsExecuted + 1;

    if (!steps.length) {
        return {
            ok: false,
            message: "No safe task actions are available to execute."
        };
    }

    if (startIndex >= steps.length) {
        if (shouldGenerateFollowUpCleanupPlan(task)) {
            return generateTaskCleanupProposal(task);
        }

        await pgUpdateAgentTask(taskId, {
            status: "completed",
            result: task.result || "Task already completed.",
            error: null
        });

        return {
            ok: false,
            message: "Task already completed."
        };
    }

    const AUTONOMY_LEVEL = String(process.env.AUTONOMY_LEVEL || "1");

    if (AUTONOMY_LEVEL === "1" || AUTONOMY_LEVEL === "2") {
        console.log(`[autonomy] task ${taskId} queued for human approval at level ${AUTONOMY_LEVEL}`);
        return {
            status: 'pending_approval',
            taskId,
            autonomyLevel: AUTONOMY_LEVEL,
            message: 'Task requires human approval at this autonomy level. Approve via /api/tasks/:id/approve.'
        };
    }

    const currentStep = steps[startIndex];
    const currentValidation = normalizeExecutableAgentStep(currentStep, task.goal || "");

    if (!currentValidation.ok) {
        const skippedItem = {
            type: currentStep?.type || "unknown_step",
            reason: currentValidation.reason
        };
        const nextIndex = startIndex + 1;
        const nextStatus = await getNextTaskStatusForExecution(steps, nextIndex, task.goal || "");
        const historyEntry = {
            stepIndex: startIndex,
            stepType: skippedItem.type,
            executed: [],
            skipped: [skippedItem],
            autoExecuted: false,
            completedAt: new Date().toISOString()
        };
        const updatedContextJson = {
            ...executionState.context,
            agentExecution: {
                ...executionState.agentExecution,
                history: [...executionState.history, historyEntry],
                execution_mode: options.chainMode === true ? "chained" : executionState.executionMode,
                steps_executed: options.chainMode === true ? nextStepsExecuted : executionState.stepsExecuted,
                lastCycle: historyEntry,
                planSkipped: plannedSkipped
            }
        };

        await pgUpdateAgentTask(taskId, {
            status: nextStatus,
            current_step: nextIndex,
            context_json: updatedContextJson,
            result: skippedItem.reason,
            error: null
        });

        return {
            ok: true,
            status: nextStatus,
            results: [],
            skipped: [skippedItem],
            plan: "",
            generatedProposal: false,
            planSkipped: plannedSkipped,
            message: skippedItem.reason
        };
    }

    const executableCurrentStep = currentValidation.step;
    const duplicateMatch = await findPendingDuplicateForSteps([executableCurrentStep]);

    if (duplicateMatch) {
        await pgUpdateAgentTask(taskId, {
            status: "waiting_approval",
            result: `Duplicate detected for ${duplicateMatch.duplicate.filename}. Create a clearer task goal or variant request.`
        });

        await notifyTaskStatus(task, "waiting_approval", `Duplicate detected for ${duplicateMatch.duplicate.filename}.`);

        return {
            ok: false,
            message: `Duplicate detected for ${duplicateMatch.duplicate.filename}. Create a clearer task goal or variant request.`
        };
    }

    await pgUpdateAgentTask(taskId, {
        status: "approved",
        result: "Task approved for one execution cycle."
    });

    await pgUpdateAgentTask(taskId, {
        status: "running"
    });

    const _teStart = Date.now();
    const execution = await executeApprovedAgentActions([executableCurrentStep], {
        skipped: [],
        originalRequest: task.goal,
        latestSearchResult: executionState.latestSearchResult,
        duplicateFoundInThisRun: executionState.duplicateFoundInThisRun,
        lastListDocumentsCount: executionState.lastListDocumentsCount,
        unavailableDocuments: executionState.unavailableDocuments,
        autoMode: options.autoMode === true
    });
    setImmediate(() => {
        pgInsertToolExecution({
            task_id:     taskId,
            agent_id:    _TASK_CYCLE_AGENT_ID,
            tool_name:   executableCurrentStep.type,
            input:       { step: executableCurrentStep },
            output:      { ok: execution.ok, results: execution.results, skipped: execution.skipped },
            cost_usd:    0,
            duration_ms: Date.now() - _teStart,
        }).catch(err => console.warn('[Kernel/Gate5] tool_execution record failed:', err.message));
    });

    if (!execution.ok) {
        await pgUpdateAgentTask(taskId, {
            status: "failed",
            result: execution.message,
            error: execution.message
        });

        await pgLogAgentAction(
            "agent_task_execute",
            "failed",
            task.goal,
            task.plan || "",
            {
                taskId,
                stepIndex: startIndex,
                steps: [executableCurrentStep],
                skipped: execution.skipped || []
            },
            execution.undoEntries || null,
            execution.message
        );

        await notifyTaskStatus(task, "failed", execution.message);

        return {
            ok: false,
            message: execution.message
        };
    }

    const nextIndex = startIndex + 1;
    const nextStatus = await getNextTaskStatusForExecution(steps, nextIndex, task.goal || "");
    const cycleResult = execution.results.length
        ? `Executed: ${execution.results.join(" | ")}`
        : "No executable result was produced in this cycle.";
    const skipResult = execution.skipped.length
        ? `Skipped: ${execution.skipped.map(item => `${item.type}: ${item.reason}`).join(" | ")}`
        : "";
    const nextStepMessage = nextIndex < steps.length
        ? `Next step: ${steps[nextIndex].type}`
        : "No further steps remain.";
    const result = [cycleResult, skipResult, nextStepMessage].filter(Boolean).join(" | ");
    const historyEntry = {
        stepIndex: startIndex,
        stepType: executableCurrentStep.type,
        executed: execution.results,
        skipped: execution.skipped,
        lastSearchResult: execution.latestSearchResult,
        autoExecuted: AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableCurrentStep) && execution.results.length > 0,
        completedAt: new Date().toISOString()
    };
    const discoveryOutputs = execution.stepOutputs || [];
    const priorDiscovery = executionState.agentExecution.discovery || {};
    const discoveredDocuments = new Map();

    for (const doc of [...(priorDiscovery.documents || []), ...(priorDiscovery.searchMatches || [])]) {
        if (doc && doc.filename) {
            discoveredDocuments.set(doc.filename, doc);
        }
    }

    let discoveredFiles = Array.isArray(priorDiscovery.files) ? [...priorDiscovery.files] : [];
    const searchHistory = Array.isArray(priorDiscovery.searchHistory) ? [...priorDiscovery.searchHistory] : [];

    for (const output of discoveryOutputs) {
        if (Array.isArray(output.documents)) {
            for (const doc of output.documents) {
                if (doc && doc.filename) {
                    discoveredDocuments.set(doc.filename, doc);
                }
            }
        }

        if (Array.isArray(output.files)) {
            discoveredFiles = output.files;
        }

        if (output.type === "search_documents") {
            searchHistory.push({
                keyword: output.keyword,
                count: Array.isArray(output.documents) ? output.documents.length : 0
            });
        }
    }

    const updatedContextJson = {
        ...executionState.context,
        agentExecution: {
            ...executionState.agentExecution,
            history: [...executionState.history, historyEntry],
            latestSearchResult: execution.latestSearchResult,
            duplicateFoundInThisRun: execution.duplicateFoundInThisRun,
            lastListDocumentsCount: execution.lastListDocumentsCount,
            unavailableDocuments: execution.unavailableDocuments,
            execution_mode: options.chainMode === true ? "chained" : executionState.executionMode,
            steps_executed: options.chainMode === true ? nextStepsExecuted : executionState.stepsExecuted,
            autoExecuted: Boolean(executionState.agentExecution.autoExecuted)
                || (AUTONOMY_LEVEL === "3" && isSafeAutoAction(executableCurrentStep) && execution.results.length > 0),
            lastCycle: historyEntry,
            planSkipped: plannedSkipped,
            discovery: {
                ...priorDiscovery,
                documents: Array.from(discoveredDocuments.values()),
                searchMatches: Array.from(discoveredDocuments.values()),
                files: discoveredFiles,
                searchHistory
            }
        }
    };
    let finalStatus = nextStatus;
    let finalResult = result;
    let finalPlan = "";
    let finalSteps = [executableCurrentStep];
    let finalSkipped = execution.skipped;
    let generatedProposal = false;

    await pgUpdateAgentTask(taskId, {
        status: nextStatus,
        current_step: nextIndex,
        context_json: updatedContextJson,
        result,
        error: null
    });

    if (nextIndex >= steps.length && shouldGenerateFollowUpCleanupPlan(task)) {
        const refreshedTask = await pgGetAgentTask(taskId);
        const followUp = await generateTaskCleanupProposal(refreshedTask);

        if (!followUp.ok) {
            return {
                ok: false,
                message: followUp.message || "Could not generate cleanup plan."
            };
        }

        finalStatus = followUp.status;
        finalResult = followUp.status === "completed"
            ? "Task completed. No further action required."
            : `Generated cleanup plan.\n\n${followUp.plan}`;
        finalPlan = followUp.status === "waiting_approval" ? followUp.plan : "";
        finalSteps = followUp.validSteps;
        finalSkipped = followUp.skipped;
        generatedProposal = true;
    }

    await pgLogAgentAction(
        "agent_task_execute",
        finalStatus,
        task.goal,
        finalPlan,
        {
            taskId,
            stepIndex: startIndex,
            steps: finalSteps,
            skipped: finalSkipped,
            nextStatus: finalStatus,
            nextIndex
        },
        execution.undoEntries,
        finalResult
    );

    if (AUTONOMY_LEVEL === "3" && isSafeLevel3WriteAction(currentStep) && execution.results.length) {
        await createAgentNotification(
            "autonomy_level_3_auto_action",
            "Autonomy Level 3 executed task",
            `Task #${task.id} for "${task.goal}" auto-executed: ${execution.results.join(" | ")}`,
            "agent_task",
            task.id
        );
    }

    if (finalStatus === "waiting_approval") {
        await notifyTaskStatus(task, "waiting_approval", finalResult);
    } else if (finalStatus === "completed") {
        await notifyTaskStatus(task, "completed", finalResult);
    }

    return {
        ok: true,
        status: finalStatus,
        currentStep: startIndex,
        nextStep: nextIndex < steps.length ? steps[nextIndex].type : null,
        results: execution.results,
        skipped: finalSkipped,
        planSkipped: plannedSkipped,
        result: finalResult,
        plan: finalPlan,
        generatedProposal
    };
}

function validateAgentSteps(steps, originalRequest = "") {
    if (!Array.isArray(steps) || !steps.length) {
        return {
            fatalError: "The saved agent plan did not contain any safe actions to apply. Please create a clearer agent plan.",
            validSteps: [],
            skipped: []
        };
    }

    const validSteps = [];
    const skipped = [];

    for (const step of steps) {
        if (!step || typeof step !== "object" || !ALLOWED_AGENT_STEP_TYPES.has(step.type)) {
            return {
                fatalError: "The saved agent plan included an unsafe or unsupported step type.",
                validSteps: [],
                skipped
            };
        }

        const executionReady = normalizeExecutableAgentStep(step, originalRequest);
        const normalizedStep = executionReady.ok ? executionReady.step : { ...step };

        if (shouldInferSafeAuto(normalizedStep, originalRequest)) {
            normalizedStep.safe_auto = true;
        }

        if ((normalizedStep.type === "create_document" || normalizedStep.type === "create_workspace_file") &&
            typeof normalizedStep.content !== "string"
        ) {
            skipped.push({
                type: normalizedStep.type,
                reason: `Missing content for ${normalizedStep.type}.`
            });
            continue;
        }

        if (normalizedStep.type === "create_workspace_file" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for create_workspace_file."
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Incomplete rename proposal; exact oldName and newName required."
            });
            continue;
        }

        if (normalizedStep.type === "rename_document" && normalizedStep.oldName === normalizedStep.newName) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Invalid rename_document step (oldName and newName are identical)."
            });
            continue;
        }

        if (normalizedStep.type === "delete_document" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for delete_document."
            });
            continue;
        }

        if (normalizedStep.type === "summarize_document" && !normalizedStep.filename) {
            skipped.push({
                type: normalizedStep.type,
                reason: "Missing filename for summarize_document."
            });
            continue;
        }

        if (normalizedStep.type === "search_documents" && !normalizedStep.keyword) {
            if (typeof normalizedStep.query === "string" && normalizedStep.query.trim()) {
                normalizedStep.keyword = normalizedStep.query.trim();
            } else if (originalRequest && originalRequest.trim()) {
                normalizedStep.keyword = originalRequest.trim();
            } else {
                skipped.push({
                    type: normalizedStep.type,
                    reason: "Missing keyword for search_documents."
                });
                continue;
            }
        }

        validSteps.push(normalizedStep);
    }

    return {
        fatalError: null,
        validSteps,
        skipped
    };
}

function buildDirectSafeAgentStepsFromRequest(request = "") {
    const text = String(request || "").trim();
    const blockedTerms = /\b(delete|remove|rename|overwrite|update|code|github|env|secret)\b/i;

    if (blockedTerms.test(text)) {
        return [];
    }

    const noteMatch = text.match(/^create\s+(?:a\s+)?(?:note|document)\s+(?:saying|that says|with content)\s+(.+)$/i);

    if (noteMatch) {
        const content = noteMatch[1].trim();
        const filenameSeed = content
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 48) || "note";

        return [{
            type: "create_document",
            filename: filenameSeed,
            content,
            classification: "personal",
            summary: `Auto-created note: ${content.slice(0, 80)}`,
            safe_auto: true
        }];
    }

    const fileMatch = text.match(/^create\s+(?:a\s+)?(?:workspace\s+)?file\s+(?:named\s+)?([a-z0-9._-]+)(?:\s+with content\s+(.+))?$/i);

    if (fileMatch) {
        const filename = fileMatch[1].trim();
        const content = String(fileMatch[2] || "").trim();

        if (content) {
            return [{
                type: "create_workspace_file",
                filename,
                content,
                safe_auto: true
            }];
        }
    }

    return [];
}

async function getApprovedAgentActions(latestPlan) {
    let response;
    try {
        ({ result: response } = await runtime.execute({
            tier: 'balanced', caller: 'getApprovedAgentActions',
            maxTokens: 700,
            messages: [
            {
                role: "user",
                content: `You are converting an approved agent plan into a strict JSON workflow.

Only include safe steps from this allowlist:
- create_document
- create_workspace_file
- summarize_document
- rename_document
- delete_document
- list_documents
- list_files
- search_documents

For search_documents:
- Always include a "keyword" field.
- Use the shortest meaningful keyword phrase from the plan.
- Do not use the full original request unless no better keyword exists.
- If the plan already shows an explicit keyword, preserve that exact keyword in the JSON.

For rename_document:
- Only create rename_document if both "oldName" and "newName" are explicitly known.
- Never infer rename targets from vague wording.
- Never create rename_document from a recommendation, guess, or cleanup suggestion alone.
- If uncertain, leave it as recommendation text in the plan and do not emit an executable step.

Forbidden actions:
- editing server.js
- editing dashboard.html
- changing code
- pushing to GitHub
- deleting all files
- deleting memory
- changing environment variables

If the plan is ambiguous, unsafe, or cannot be executed safely, return:
{"steps":[],"needs_clarification":"short reason"}

Otherwise return strict JSON only in this format:
{
  "steps": [
    {
      "type": "create_document",
      "filename": "short description",
      "content": "text content",
      "classification": "personal",
      "summary": "optional summary",
      "safe_auto": false
    }
  ]
}

Only set "safe_auto": true for very low-risk new create_document or create_workspace_file actions when:
- the filename should be unique
- the content is short and low-risk
- the action does not overwrite existing data
- the action is not sensitive

For a simple request to create a short note/document/file, prefer "safe_auto": true when all of those constraints are satisfied.

Plan request:
${latestPlan.request}

Plan text:
${latestPlan.plan}

Plan context:
${JSON.stringify({
    today: latestPlan.today,
    memoryCount: latestPlan.memory.length,
    documentNames: latestPlan.documents.map(doc => doc.filename),
    files: latestPlan.files
}, null, 2)}`
            }
        ]
        }));
    } catch (e) {
        console.error('[getApprovedAgentActions] runtime.execute failed:', e.message);
        return null;
    }

    const text = (response.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();

    const jsonText = extractJsonBlock(text);

    if (!jsonText) {
        return null;
    }

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("AGENT ACTION JSON ERROR:", error.message);
        return null;
    }
}

module.exports = {
    getLatestCompletedAgentTask,
    generateReflectionForTask,
    buildAgentPlan,
    generateTaskCleanupProposal,
    getNextTaskStatus,
    getNextTaskStatusForExecution,
    buildTaskActionSummary,
    getRemainingTaskSteps,
    autoRunReadOnlyTaskSteps,
    notifyTaskStatus,
    formatScheduleRunSummary,
    notifyUnsafeActionBlocked,
    runSingleScheduleOnce,
    runDueSchedules,
    runAgentPlanningCycle,
    executeApprovedAgentTask,
    validateAgentSteps,
    buildDirectSafeAgentStepsFromRequest,
    getApprovedAgentActions
};
