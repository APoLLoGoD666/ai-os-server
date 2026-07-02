'use strict';
// lib/agent-execution-utils.js — step execution, undo, standing-approval matching, tool-command mapper

const path = require('path');

const {
    pgGetDocument,
    pgSaveDocument,
    pgListDocuments,
    pgSearchDocuments,
    pgDeleteDocument,
    pgRenameDocument,
    pgUpdateDocumentSummary,
    pgGetEnabledStandingApprovals
} = require('./pg_helpers');

const {
    isReadOnlyAgentAction,
    isSafeAutoAction,
    hasUnsafeAutoActionLanguage,
    isSafeLevel3WriteAction,
    isStandingApprovalEligibleAction,
    shouldAutoRunTaskAction,
    stepRequiresEmptyDocuments
} = require('./agent-step-utils');

const {
    normalizeAgentFilename,
    makeAgentDatedFilename,
    makeUniqueAgentFilename,
    getDocumentSnapshotForUndo,
    findLikelyDuplicateDocument,
    findSimilarWorkspaceArtifact,
    makeUniqueWorkspaceAgentFilename
} = require('./agent-file-utils');

const {
    createWorkspaceFile,
    listWorkspaceFiles,
    deleteWorkspaceFile,
    renameDocumentStorageFile,
    summariseText
} = require('./workspace');

function stepRequiresNoMatches(step) {
    const phrases = [
        "only if no collision found",
        "only if no existing match",
        "if no matches found",
        "if no duplicate exists"
    ];
    const searchableText = Object.values(step || {})
        .filter(value => typeof value === "string")
        .join(" ")
        .toLowerCase();

    return phrases.some(phrase => searchableText.includes(phrase));
}

function requestAllowsDuplicateCreation(request = "") {
    const text = String(request || "").toLowerCase();
    const allowedPhrases = [
        "create anyway",
        "make another",
        "create a new version",
        "create variant",
        "v2",
        "v3",
        "duplicate copy"
    ];

    return allowedPhrases.some(phrase => text.includes(phrase));
}

function getStepDocumentTargets(step) {
    const targets = new Set();

    if (step?.filename && typeof step.filename === "string") {
        const normalized = normalizeAgentFilename(step.filename);
        if (normalized) {
            targets.add(normalized);
        }

        const dated = makeAgentDatedFilename(step.filename);
        if (dated) {
            targets.add(dated);
        }
    }

    if (step?.oldName && typeof step.oldName === "string") {
        const normalizedOldName = normalizeAgentFilename(step.oldName);
        if (normalizedOldName) {
            targets.add(normalizedOldName);
        }
    }

    return Array.from(targets);
}

async function canAutoRunLevel3Action(step) {
    if (isReadOnlyAgentAction(step)) {
        return { ok: true };
    }

    if (!isSafeAutoAction(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (hasUnsafeAutoActionLanguage(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (step.type === "summarize_document") {
        if (step.readOnly !== true) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        const filename = normalizeAgentFilename(step.filename);
        const doc = filename ? await getDocumentSnapshotForUndo(filename) : null;

        if (!doc || !doc.content) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        return { ok: true };
    }

    if (!isSafeLevel3WriteAction(step)) {
        return {
            ok: false,
            reason: `Task is waiting for approval before ${step?.type || "unknown action"}.`
        };
    }

    if (step.type === "create_document") {
        const filename = step.filename ? makeAgentDatedFilename(step.filename) : await makeUniqueAgentFilename(step.classification || "note", "note");
        const existing = await pgGetDocument(filename);

        if (existing) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }

        const duplicate = await findLikelyDuplicateDocument(step);
        if (duplicate) {
            return {
                ok: false,
                reason: `Task is waiting for approval before ${step.type}.`
            };
        }
    }

    return { ok: true };
}

function normalizeExecutableAgentStep(step, originalRequest = "") {
    if (!step || typeof step !== "object" || !step.type) {
        return {
            ok: false,
            reason: "Skipped invalid step (missing type)."
        };
    }

    const normalizedStep = { ...step };

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword && typeof normalizedStep.query === "string") {
        normalizedStep.keyword = normalizedStep.query.trim();
    }

    if (normalizedStep.type === "summarize_document" && !normalizedStep.filename && typeof normalizedStep.target === "string") {
        normalizedStep.filename = normalizeAgentFilename(normalizedStep.target);
    }

    if (normalizedStep.type === "create_workspace_file") {
        if (!normalizedStep.filename && typeof normalizedStep.target === "string") {
            normalizedStep.filename = path.basename(String(normalizedStep.target).trim());
        }

        if (typeof normalizedStep.filename === "string" && normalizedStep.filename.trim()) {
            normalizedStep.filename = path.basename(normalizedStep.filename.trim());
        }
    }

    if (normalizedStep.type === "rename_document") {
        if (typeof normalizedStep.oldName === "string" && normalizedStep.oldName.trim()) {
            normalizedStep.oldName = normalizeAgentFilename(normalizedStep.oldName);
        }

        if (typeof normalizedStep.newName === "string" && normalizedStep.newName.trim()) {
            normalizedStep.newName = normalizeAgentFilename(normalizedStep.newName);
        }
    }

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword && originalRequest.trim()) {
        normalizedStep.keyword = originalRequest.trim();
    }

    if (normalizedStep.type === "rename_document" && (!normalizedStep.oldName || !normalizedStep.newName)) {
        return {
            ok: false,
            reason: "Incomplete rename proposal; exact oldName and newName required."
        };
    }

    if (normalizedStep.type === "create_workspace_file" &&
        (!normalizedStep.filename || typeof normalizedStep.content !== "string" || !normalizedStep.content.trim())) {
        return {
            ok: false,
            reason: "Skipped invalid create_workspace_file step (missing filename or content)."
        };
    }

    if (normalizedStep.type === "summarize_document" && !normalizedStep.filename) {
        return {
            ok: false,
            reason: "Skipped invalid summarize_document step (missing target)."
        };
    }

    if (normalizedStep.type === "search_documents" && !normalizedStep.keyword) {
        return {
            ok: false,
            reason: "Skipped invalid search_documents step (missing query)."
        };
    }

    return {
        ok: true,
        step: normalizedStep
    };
}

function stepMatchesStandingApproval(step, rule) {
    if (!step || !rule || !rule.enabled) {
        return false;
    }

    if (rule.action_type !== step.type) {
        return false;
    }

    const pattern = String(rule.pattern || "").toLowerCase().trim();
    if (!pattern) {
        return false;
    }

    const filename = String(step.filename || "").toLowerCase();
    const content = String(step.content || "").toLowerCase();
    const targetText = [filename, content].filter(Boolean).join(" ");

    return targetText.includes(pattern);
}

async function getMatchingStandingApproval(step) {
    if (!isStandingApprovalEligibleAction(step)) {
        return null;
    }

    if (step.type === "summarize_document" && step.readOnly !== true) {
        return null;
    }

    const rules = await pgGetEnabledStandingApprovals(step.type);
    return rules.find(rule => stepMatchesStandingApproval(step, rule)) || null;
}

async function getLevel3AutoExecutablePrefix(steps = []) {
    const executable = [];
    const blocked = [];

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];

        if (!shouldAutoRunTaskAction(step)) {
            blocked.push({
                step,
                reason: `Approval is required before ${step.type}.`
            });
            break;
        }

        const check = await canAutoRunLevel3Action(step);
        if (!check.ok) {
            blocked.push({
                step,
                reason: check.reason
            });
            break;
        }

        executable.push(step);
    }

    return {
        executable,
        blocked,
        remaining: steps.slice(executable.length)
    };
}

async function executeApprovedAgentActions(steps, options = {}) {
    const results = [];
    const undoEntries = [];
    const duplicateDecision = options.duplicateDecision || null;
    const skipped = Array.isArray(options.skipped) ? [...options.skipped] : [];
    const stepOutputs = [];
    const unavailableDocuments = new Set(Array.isArray(options.unavailableDocuments) ? options.unavailableDocuments : []);
    let latestSearchResult = options.latestSearchResult || null;
    let duplicateFoundInThisRun = Boolean(options.duplicateFoundInThisRun);
    let lastListDocumentsCount = Number.isInteger(options.lastListDocumentsCount) ? options.lastListDocumentsCount : null;
    const allowDuplicateCreation = requestAllowsDuplicateCreation(options.originalRequest || "");

    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];

        if (step.type === "create_document") {
            const content = typeof step.content === "string" ? step.content.trim() : "";
            let filename = step.filename
                ? makeAgentDatedFilename(step.filename)
                : await makeUniqueAgentFilename(step.classification || "note", "note");

            if (!content) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer content before a document can be created.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (duplicateFoundInThisRun && !allowDuplicateCreation) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped create_document because duplicates were found and no explicit create-anyway instruction was given."
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (stepRequiresNoMatches(step) && latestSearchResult && latestSearchResult.count > 0) {
                skipped.push({
                    type: step.type,
                    reason: `Skipped because search_documents for "${latestSearchResult.keyword}" found ${latestSearchResult.count} matches.`
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (stepRequiresEmptyDocuments(step) && lastListDocumentsCount !== null && lastListDocumentsCount > 0) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped create_document because workspace/documents are not empty."
                });
                for (const target of getStepDocumentTargets(step)) {
                    unavailableDocuments.add(target);
                }
                continue;
            }

            if (duplicateDecision && duplicateDecision.index === index) {
                if (duplicateDecision.mode === "replace") {
                    const existingDoc = await getDocumentSnapshotForUndo(duplicateDecision.duplicate.filename);
                    filename = duplicateDecision.duplicate.filename;
                    undoEntries.push({
                        type: "restore_document",
                        document: existingDoc
                    });
                } else {
                    filename = await makeUniqueAgentFilename(step.filename || step.classification || "note", "note");
                }
            }

            await pgSaveDocument(
                filename,
                content,
                step.classification || "personal",
                step.summary || `Saved note: ${filename}`
            );

            undoEntries.push({
                type: "delete_document",
                filename
            });
            results.push(`Created Postgres document: ${filename}`);
            continue;
        }

        if (step.type === "create_workspace_file") {
            const filename = await makeUniqueWorkspaceAgentFilename(step.filename || "workspace_file", "workspace_file");
            const content = typeof step.content === "string" ? step.content.trim() : "";

            if (!content) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer content before a workspace file can be created.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (options.autoMode === true) {
                const similarFile = await findSimilarWorkspaceArtifact(filename);

                if (similarFile) {
                    skipped.push({
                        type: step.type,
                        reason: `Skipped create_workspace_file because a workspace overview/index already exists: ${similarFile.name}`
                    });
                    continue;
                }
            }

            await createWorkspaceFile(filename, content);
            undoEntries.push({
                type: "delete_workspace_file",
                filename
            });
            results.push(`Created workspace file: ${filename}`);
            continue;
        }

        if (step.type === "summarize_document") {
            const filename = normalizeAgentFilename(step.filename);

            if (!filename) {
                return {
                    ok: false,
                    message: "Agent plan needs a clearer document name before it can be summarised.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            if (unavailableDocuments.has(filename)) {
                skipped.push({
                    type: step.type,
                    reason: "Skipped summarize_document because source document was not created or does not exist."
                });
                continue;
            }

            const doc = await getDocumentSnapshotForUndo(filename);

            if (!doc || !doc.content) {
                unavailableDocuments.add(filename);
                skipped.push({
                    type: step.type,
                    reason: "Skipped summarize_document because source document was not created or does not exist."
                });
                continue;
            }

            const summary = await summariseText(doc.content);

            if (step.readOnly === true) {
                stepOutputs.push({
                    type: "summarize_document",
                    filename,
                    summary,
                    readOnly: true
                });
                results.push(`Generated read-only summary for document: ${filename}`);
                continue;
            }

            undoEntries.push({
                type: "restore_document_summary",
                filename,
                summary: doc.summary || ""
            });
            await pgUpdateDocumentSummary(filename, summary);
            await pgSaveDocument(
                filename,
                doc.content,
                doc.classification || "personal",
                summary
            );

            results.push(`Updated summary for document: ${filename}`);
            continue;
        }

        if (step.type === "rename_document") {
            const oldName = normalizeAgentFilename(step.oldName);
            const newName = normalizeAgentFilename(step.newName);

            if (!oldName || !newName) {
                return {
                    ok: false,
                    message: "Agent plan needs clearer document names before a rename can be applied.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            const storageRename = await renameDocumentStorageFile(oldName, newName);

            if (!storageRename.ok) {
                if (storageRename.reason === "new_exists") {
                    return {
                        ok: false,
                        message: `Storage rename failed; Postgres not updated. Target filename already exists: ${newName}.`,
                        results,
                        undoEntries,
                        skipped
                    };
                }

                return {
                    ok: false,
                    message: `Storage rename failed; Postgres not updated. ${storageRename.error || storageRename.reason}`,
                    results,
                    undoEntries,
                    skipped
                };
            }

            await pgRenameDocument(oldName, newName);
            undoEntries.push({
                type: "rename_document",
                oldName: newName,
                newName: oldName
            });

            if (storageRename.applied) {
                results.push(`Renamed:\n- Storage file: ${oldName} -> ${newName}\n- Postgres document: ${oldName} -> ${newName}`);
            } else {
                console.log("No storage file found; Postgres-only rename applied");
                results.push(`Renamed:\n- Postgres document: ${oldName} -> ${newName}\n- No storage file found; Postgres-only rename applied`);
            }
            continue;
        }

        if (step.type === "delete_document") {
            const filename = normalizeAgentFilename(step.filename);

            if (!filename) {
                return {
                    ok: false,
                    message: "Agent plan needs a clearer document name before deletion can be applied.",
                    results,
                    undoEntries,
                    skipped
                };
            }

            const existingDoc = await getDocumentSnapshotForUndo(filename);

            if (!existingDoc) {
                return {
                    ok: false,
                    message: `The document could not be found for safe deletion: ${filename}.`,
                    results,
                    undoEntries,
                    skipped
                };
            }

            await pgDeleteDocument(filename);
            undoEntries.push({
                type: "restore_document",
                document: existingDoc
            });
            results.push(`Deleted Postgres document: ${filename}`);
            continue;
        }

        if (step.type === "list_documents") {
            const docs = await pgListDocuments();
            lastListDocumentsCount = docs.length;
            const fullDocs = [];

            for (const doc of docs) {
                const fullDoc = await getDocumentSnapshotForUndo(doc.filename);
                if (fullDoc) {
                    fullDocs.push(fullDoc);
                }
            }

            stepOutputs.push({
                type: step.type,
                count: docs.length,
                documents: fullDocs
            });
            results.push(`Listed ${docs.length} documents.`);
            continue;
        }

        if (step.type === "list_files") {
            const files = await listWorkspaceFiles();
            stepOutputs.push({
                type: step.type,
                files
            });
            results.push(`Listed ${files.length} workspace files.`);
            continue;
        }

        if (step.type === "search_documents") {
            const docs = await pgSearchDocuments(step.keyword);
            latestSearchResult = {
                keyword: step.keyword,
                count: docs.length
            };
            if (docs.length > 0) {
                duplicateFoundInThisRun = true;
            }
            stepOutputs.push({
                type: step.type,
                keyword: step.keyword,
                documents: docs
            });
            results.push(`Searched documents for "${step.keyword}" and found ${docs.length} matches.`);
        }
    }

    return {
        ok: true,
        results,
        undoEntries,
        skipped,
        stepOutputs,
        latestSearchResult,
        duplicateFoundInThisRun,
        lastListDocumentsCount,
        unavailableDocuments: Array.from(unavailableDocuments)
    };
}

async function undoAgentActionRecord(record) {
    const undoEntries = Array.isArray(record?.undo_json) ? [...record.undo_json].reverse() : [];
    const results = [];

    if (!undoEntries.length) {
        return {
            ok: false,
            message: "The last agent action does not have undo information."
        };
    }

    for (const entry of undoEntries) {
        if (entry.type === "delete_document") {
            await pgDeleteDocument(entry.filename);
            results.push(`Removed created document: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_document" && entry.document) {
            await pgSaveDocument(
                entry.document.filename,
                entry.document.content || "",
                entry.document.classification || "personal",
                entry.document.summary || ""
            );
            results.push(`Restored deleted document: ${entry.document.filename}`);
            continue;
        }

        if (entry.type === "rename_document") {
            const storageRename = await renameDocumentStorageFile(entry.oldName, entry.newName);

            if (!storageRename.ok) {
                return {
                    ok: false,
                    results,
                    message: storageRename.reason === "new_exists"
                        ? `Could not revert storage rename because the target already exists: ${entry.newName}`
                        : `Could not revert storage rename: ${storageRename.error || storageRename.reason}`
                };
            }

            await pgRenameDocument(entry.oldName, entry.newName);

            if (storageRename.applied) {
                results.push(`Reverted rename:\n- Postgres document: ${entry.oldName} -> ${entry.newName}\n- Storage file: ${entry.oldName} -> ${entry.newName}`);
            } else {
                console.log("No storage file found; Postgres-only rename revert applied");
                results.push(`Reverted rename:\n- Postgres document: ${entry.oldName} -> ${entry.newName}\n- No storage file found; Postgres-only rename revert applied`);
            }
            continue;
        }

        if (entry.type === "delete_workspace_file") {
            await deleteWorkspaceFile(entry.filename);
            results.push(`Removed created workspace file: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_workspace_file") {
            await createWorkspaceFile(entry.filename, entry.content || "");
            results.push(`Restored workspace file: ${entry.filename}`);
            continue;
        }

        if (entry.type === "restore_document_summary") {
            await pgUpdateDocumentSummary(entry.filename, entry.summary || "");
            results.push(`Restored document summary: ${entry.filename}`);
        }
    }

    return {
        ok: true,
        results
    };
}

function toolUseInputToCommand(toolName, input) {
    switch (toolName) {
        case "save_note":
            return { type: "save_note", content: input.content || "", classification: input.classification };
        case "read_file":
            return { type: "read_file", filename: input.filename };
        case "delete_file":
            return { type: "delete_file", filename: input.filename };
        case "rename_file":
            return { type: "rename_file", oldName: input.oldName, newName: input.newName };
        case "list_files":
            return { type: "list_files" };
        case "list_documents":
            return { type: "list_documents" };
        case "search_documents":
            return { type: "search_documents", keyword: input.keyword };
        case "create_file":
            return { type: "create_file", filename: input.filename, content: input.content };
        case "summarise_file":
            return { type: "summarise_file", filename: input.filename };
        case "delete_document":
            return { type: "delete_document", filename: input.filename };
        case "log_expense":
            return { type: "log_expense", description: input.description, amount: input.amount, transactionType: input.type || "expense" };
        case "get_finance_summary":
            return { type: "get_finance_summary" };
        case "set_budget":
            return { type: "set_budget", category: input.category, amount: input.amount };
        case "check_emails":
            return { type: "check_emails" };
        case "list_emails":
            return { type: "list_emails" };
        case "list_routines":
            return { type: "list_routines" };
        case "create_routine":
            return { type: "create_routine", name: input.name, description: input.description, schedule_cron: input.schedule_cron };
        case "create_notification":
            return { type: "create_notification", title: input.title || "Reminder", body: input.body || "", priority: input.priority || "normal" };
        default:
            return null;
    }
}

module.exports = {
    stepRequiresNoMatches,
    requestAllowsDuplicateCreation,
    getStepDocumentTargets,
    canAutoRunLevel3Action,
    normalizeExecutableAgentStep,
    stepMatchesStandingApproval,
    getMatchingStandingApproval,
    getLevel3AutoExecutablePrefix,
    executeApprovedAgentActions,
    undoAgentActionRecord,
    toolUseInputToCommand
};
