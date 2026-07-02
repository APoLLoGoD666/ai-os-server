'use strict';
// lib/agent-step-utils.js — step-type predicates, task context helpers, cleanup proposal builders

const { AGENT_PROFILES }          = require('../agents');
const { isDiscoveryAgentStepType } = require('./agent-plan-utils');
const { getDocumentSnapshotForUndo } = require('./agent-file-utils');
const { pgListDocuments }          = require('./pg_helpers');

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

function getAutonomyLevelMessage() {
    if ((process.env.AUTONOMY_LEVEL || "1") === "4") {
        return "Autonomy Level 4 is disabled.";
    }

    return null;
}

function isDestructiveAgentStepType(type) {
    return type === "rename_document" || type === "delete_document";
}

function buildTaskContext(memory, documents, files, today, agentProfile = AGENT_PROFILES.system_agent) {
    return {
        today,
        agentProfile: {
            name: agentProfile.name,
            id: agentProfile.id,
            title: agentProfile.title,
            displayName: agentProfile.displayName,
            purpose: agentProfile.purpose
        },
        memoryCount: memory.length,
        documents: documents.map(doc => ({
            filename: doc.filename,
            classification: doc.classification,
            summary: doc.summary,
            created_at: doc.created_at
        })),
        files
    };
}

function getTaskExecutionState(task) {
    const context = task && task.context_json && typeof task.context_json === "object"
        ? task.context_json
        : {};
    const agentExecution = context.agentExecution && typeof context.agentExecution === "object"
        ? context.agentExecution
        : {};

    return {
        context,
        agentExecution,
        executionMode: typeof agentExecution.execution_mode === "string"
            ? agentExecution.execution_mode
            : "",
        stepsExecuted: Number.isInteger(agentExecution.steps_executed)
            ? agentExecution.steps_executed
            : 0,
        history: Array.isArray(agentExecution.history) ? [...agentExecution.history] : [],
        latestSearchResult: agentExecution.latestSearchResult || null,
        duplicateFoundInThisRun: Boolean(agentExecution.duplicateFoundInThisRun),
        lastListDocumentsCount: Number.isInteger(agentExecution.lastListDocumentsCount)
            ? agentExecution.lastListDocumentsCount
            : null,
        unavailableDocuments: Array.isArray(agentExecution.unavailableDocuments)
            ? [...agentExecution.unavailableDocuments]
            : []
    };
}

function getLatestActiveAgentTask(tasks = []) {
    return tasks.find(item => item.status === "running" || item.status === "waiting_approval") || null;
}

function buildSafeDefaultDiscoverySteps() {
    return [
        { type: "list_documents" },
        { type: "list_files" },
        { type: "search_documents", keyword: "test" },
        { type: "search_documents", keyword: "duplicate detection" },
        { type: "search_documents", keyword: "draft" }
    ];
}

function isSafeAutoAction(step) {
    if (!step || typeof step !== "object" || !step.type) {
        return false;
    }

    const SAFE_TYPES = [
        "create_document",
        "create_workspace_file",
        "summarize_document",
        "search_documents",
        "list_documents",
        "list_files"
    ];

    return SAFE_TYPES.includes(step.type);
}

function isStandingApprovalEligibleAction(step) {
    return step && ["create_document", "create_workspace_file", "summarize_document"].includes(step.type);
}

function isReadOnlyAgentAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    if (action.type === "list_documents" || action.type === "list_files" || action.type === "search_documents") {
        return true;
    }

    if (action.type === "summarize_document" && action.readOnly === true) {
        return true;
    }

    return false;
}

function getAgentStepTextBlob(action) {
    if (!action || typeof action !== "object") {
        return "";
    }

    return Object.values(action)
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();
}

function hasUnsafeAutoActionLanguage(action) {
    return /\b(delete|remove|overwrite|update)\b/i.test(getAgentStepTextBlob(action));
}

function isSafeLevel3WriteAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    const safeAuto = action.safe_auto === true || action.low_risk === true || /low[-_\s]?risk/i.test(JSON.stringify(action));
    const content = typeof action.content === "string" ? action.content.trim() : "";
    const contentLength = content.length;
    const classification = String(action.classification || "").toLowerCase();
    const sensitiveContent = /(password|secret|api[_-\s]?key|private key|token)/i.test(content);

    if (action.type === "create_document") {
        return safeAuto && contentLength > 0 && contentLength < 2000 && classification !== "sensitive" && !sensitiveContent;
    }

    if (action.type === "create_workspace_file") {
        return safeAuto && contentLength > 0 && contentLength < 2000 && !sensitiveContent;
    }

    return false;
}

function isWriteAgentAction(action) {
    if (!action || typeof action !== "object") {
        return false;
    }

    if (action.type === "delete_file" || action.type === "update_document" || action.type === "overwrite_document") {
        return true;
    }

    return ALLOWED_AGENT_STEP_TYPES.has(action.type) && !isReadOnlyAgentAction(action);
}

function shouldAutoRunTaskAction(action) {
    const level = process.env.AUTONOMY_LEVEL || "1";

    if (level === "2") {
        return isReadOnlyAgentAction(action);
    }

    if (level === "3") {
        return isReadOnlyAgentAction(action) || isSafeAutoAction(action);
    }

    return false;
}

function shouldInferSafeAuto(step, originalRequest = "") {
    if (!step || typeof step !== "object") {
        return false;
    }

    if (!["create_document", "create_workspace_file"].includes(step.type)) {
        return false;
    }

    if (step.safe_auto === true) {
        return false;
    }

    const content = typeof step.content === "string" ? step.content.trim() : "";
    const classification = String(step.classification || "").toLowerCase();
    const requestText = String(originalRequest || "").toLowerCase();
    const lowRiskRequest = /(create|make|write|save)\b/.test(requestText)
        && /(note|document|file|txt|summary)/.test(requestText);

    if (!lowRiskRequest || !content || content.length >= 500) {
        return false;
    }

    if (classification === "sensitive" || hasUnsafeAutoActionLanguage(step)) {
        return false;
    }

    if (/(password|secret|api[_-\s]?key|private key|token)/i.test(content)) {
        return false;
    }

    return true;
}

function extractDeferredFallbackActions(plan = "") {
    const readOnlyPrefixes = ["list ", "search ", "summar", "review ", "inspect ", "analyse ", "analyze "];
    const writeHints = ["create ", "rename ", "delete ", "remove ", "overwrite ", "edit ", "push ", "update "];
    const planLines = String(plan || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const deferred = [];

    for (const line of planLines) {
        const normalized = line.replace(/^[-*]\s*/, "").toLowerCase();

        if (readOnlyPrefixes.some(prefix => normalized.startsWith(prefix))) {
            continue;
        }

        if (writeHints.some(prefix => normalized.startsWith(prefix)) || /(create|rename|delete|remove|overwrite|edit|push|update)\b/i.test(normalized)) {
            deferred.push(line.replace(/^[-*]\s*/, ""));
        }
    }

    return [...new Set(deferred)];
}

function formatExecutableFallbackSteps(steps = []) {
    if (!steps.length) {
        return "- None";
    }

    return steps.map(step => {
        if (step.type === "search_documents") {
            return `- ${step.type} (${step.keyword})`;
        }

        if (step.type === "summarize_document") {
            return `- ${step.type} (${step.filename})`;
        }

        return `- ${step.type}`;
    }).join("\n");
}

function formatAgentStepForDisplay(step) {
    if (!step || typeof step !== "object") {
        return "- unknown_step";
    }

    if (step.type === "search_documents") {
        return `- ${step.type} (${step.keyword || "no keyword"})`;
    }

    if (step.type === "summarize_document") {
        return `- ${step.type} (${step.filename || "no filename"})`;
    }

    if (step.type === "rename_document") {
        return `- ${step.type} (${step.oldName || "unknown"} -> ${step.newName || "unknown"})`;
    }

    if (step.filename) {
        return `- ${step.type} (${step.filename})`;
    }

    return `- ${step.type}`;
}

function isIncompleteRenameDocumentStep(step) {
    return step
        && step.type === "rename_document"
        && (!step.oldName || !step.newName);
}

function filterPendingApprovalSteps(steps = []) {
    return (Array.isArray(steps) ? steps : []).filter(step => !isIncompleteRenameDocumentStep(step));
}

function shouldGenerateFollowUpCleanupPlan(task) {
    const steps = Array.isArray(task?.actions_json?.steps) ? task.actions_json.steps : [];
    const phase = task?.actions_json?.phase || "";

    return Boolean(steps.length) &&
        phase !== "cleanup_proposal" &&
        steps.every(step => isDiscoveryAgentStepType(step.type));
}

function stepRequiresEmptyDocuments(step) {
    const phrases = [
        "if empty",
        "only if empty",
        "confirm empty",
        "workspace empty",
        "documents empty",
        "only if the workspace is empty",
        "only if no documents exist",
        "if no documents exist"
    ];
    const searchableText = Object.values(step || {})
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

    return phrases.some(phrase => searchableText.includes(phrase));
}

async function collectDocumentsForCleanupProposal(discoveryState) {
    const collected = new Map();
    const discovery = discoveryState?.agentExecution?.discovery || {};
    const listedDocuments = Array.isArray(discovery.documents) ? discovery.documents : [];
    const searchedDocuments = Array.isArray(discovery.searchMatches) ? discovery.searchMatches : [];

    for (const doc of [...listedDocuments, ...searchedDocuments]) {
        if (!doc || !doc.filename) {
            continue;
        }

        if (doc.content) {
            collected.set(doc.filename, doc);
            continue;
        }

        const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
        if (fullDoc) {
            collected.set(fullDoc.filename, fullDoc);
        }
    }

    if (!collected.size) {
        const docs = await pgListDocuments();
        const snaps = await Promise.all(docs.map(d => getDocumentSnapshotForUndo(d.filename)));
        snaps.filter(Boolean).forEach(s => collected.set(s.filename, s));
    }

    return Array.from(collected.values());
}

function buildCleanupProposalPlan(goal, duplicateGroups, files = []) {
    const currentContextLines = [
        `Workspace files reviewed: ${files.length}`,
        `Duplicate groups detected: ${duplicateGroups.length}`
    ];

    if (!duplicateGroups.length) {
        return [
            "Objective",
            `Review cleanup options for: ${goal}`,
            "",
            "Current Context",
            ...currentContextLines,
            "- No duplicate groups were found in the current discovery data.",
            "",
            "Recommended Actions",
            "- Keep the current documents as they are. No delete or rename action is recommended yet.",
            "",
            "Risks",
            "- A broader document scan may still reveal duplicates outside the recent discovery set.",
            "",
            "Approval Question",
            "Task completed. No further action required."
        ].join("\n");
    }

    const groupLines = duplicateGroups.map((group, index) => {
        const rankedLines = group.ranked.map(item => {
            const createdAt = item.doc.created_at
                ? new Date(item.doc.created_at).toISOString().slice(0, 10)
                : "unknown";
            return `- ${item.doc.filename}: score ${item.score.toFixed(2)} | created_at ${createdAt} | content length ${item.contentLength} | summary richness ${item.summaryRichness} | filename clarity ${item.filenameClarity}`;
        }).join("\n");
        const actionLines = [
            `- Keep ${group.keepFilename} because ${group.explanation.replace(/^Keeping\s+[^ ]+\s+because\s+/i, "").replace(/\.$/, "")}.`,
            ...group.proposedActions.map(action => `- Delete ${action.filename} because ${action.reason}`)
        ].join("\n");

        return [
            `Group ${index + 1}: ${group.filenames.join(", ")}`,
            rankedLines,
            `Reasoning: ${group.explanation}`,
            "Recommended actions:",
            actionLines
        ].join("\n");
    }).join("\n\n");

    const proposedActionLines = duplicateGroups.flatMap(group => [
        `- Keep ${group.keepFilename}`,
        ...group.proposedActions.map(action => `- Delete ${action.filename}`)
    ]).join("\n");

    return [
        "Objective",
        `Generate a safe duplicate cleanup proposal for: ${goal}`,
        "",
        "Current Context",
        ...currentContextLines,
        groupLines,
        "",
        "Recommended Actions",
        proposedActionLines,
        "",
        "Risks",
        "- Cleanup actions are proposals only until approved.",
        "- Documents with similar themes but different intent should be reviewed before deletion.",
        "",
        "Approval Question",
        "Generated cleanup plan. Do you want to approve these proposed cleanup actions?"
    ].join("\n");
}

module.exports = {
    getAutonomyLevelMessage,
    isDestructiveAgentStepType,
    buildTaskContext,
    getTaskExecutionState,
    getLatestActiveAgentTask,
    buildSafeDefaultDiscoverySteps,
    isSafeAutoAction,
    isStandingApprovalEligibleAction,
    isReadOnlyAgentAction,
    getAgentStepTextBlob,
    hasUnsafeAutoActionLanguage,
    isSafeLevel3WriteAction,
    isWriteAgentAction,
    shouldAutoRunTaskAction,
    shouldInferSafeAuto,
    extractDeferredFallbackActions,
    formatExecutableFallbackSteps,
    formatAgentStepForDisplay,
    isIncompleteRenameDocumentStep,
    filterPendingApprovalSteps,
    shouldGenerateFollowUpCleanupPlan,
    stepRequiresEmptyDocuments,
    collectDocumentsForCleanupProposal,
    buildCleanupProposalPlan
};
