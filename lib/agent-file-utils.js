'use strict';
// lib/agent-file-utils.js — agent filename helpers, cleanup preview, duplicate detection

const path    = require('path');
const sbAdmin = require('./clients').getSupabaseClient();
const { pgGetDocument, pgListDocuments, pgSearchDocuments, pgListApprovals, pgInsertApproval } = require('./pg_helpers');
const { getDocumentByFilename, listWorkspaceFiles, ensureTxtExtension } = require('./workspace');
const { getWorkspaceStorageDebug } = require('./storage');

const AGENT_SECRET = process.env.AGENT_SECRET || "";

function extractJsonBlock(text) {
    const raw = (text || "").trim();

    if (!raw) {
        return null;
    }

    const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch) {
        return fencedMatch[1].trim();
    }

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return raw.slice(firstBrace, lastBrace + 1);
    }

    return raw;
}

function normalizeAgentFilename(filename) {
    if (!filename || typeof filename !== "string" || !filename.trim()) {
        return null;
    }

    return ensureTxtExtension(path.basename(filename.trim()));
}

function makeAgentDatedFilename(description = "note") {
    const currentDate = new Date().toISOString().slice(0, 10);
    const safeDescription = String(description || "note")
        .trim()
        .toLowerCase()
        .replace(/\.txt$/i, "")
        .replace(/^\d{4}[-_]\d{2}[-_]\d{2}[_-]*/, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "note";

    return `${currentDate}_${safeDescription}.txt`;
}

function normalizeAgentCleanupGoal(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function isAgentCleanupTestGoal(goal) {
    const normalized = normalizeAgentCleanupGoal(goal);
    return normalized.includes("test")
        || normalized.includes("duplicate")
        || normalized.includes("cleanup test");
}

async function fetchAgentCleanupRows() {
    const [{ data: tasks }, { data: schedules }] = await Promise.all([
        sbAdmin.from('agent_tasks').select('id,goal,status,current_step,result,error,created_at,updated_at').order('id', { ascending: false }),
        sbAdmin.from('agent_schedules').select('id,name,goal,frequency,enabled,last_run_at,created_at').order('id', { ascending: false })
    ]);

    return {
        tasks: tasks || [],
        schedules: schedules || []
    };
}

function buildAgentCleanupPreviewData({ tasks, schedules }) {
    const taskDeleteMap = new Map();
    const taskKeepMap = new Map();
    const taskGroups = new Map();
    const canonicalScheduleGoal = "organise my workspace and suggest cleanup";

    for (const task of tasks) {
        const normalizedGoal = normalizeAgentCleanupGoal(task.goal);
        if (!taskGroups.has(normalizedGoal)) {
            taskGroups.set(normalizedGoal, []);
        }
        taskGroups.get(normalizedGoal).push(task);
    }

    for (const [normalizedGoal, group] of taskGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const latestTask = ordered[0] || null;
        const hasCompleted = ordered.some(task => task.status === "completed");

        for (const task of ordered) {
            const reasons = [];
            const isTest = isAgentCleanupTestGoal(task.goal);

            if (isTest) {
                reasons.push("test_or_duplicate_goal");
            }

            if (latestTask && task.id !== latestTask.id && normalizedGoal) {
                reasons.push("older_duplicate_goal");
            }

            if (task.status === "failed" && (hasCompleted || (latestTask && latestTask.id > task.id))) {
                reasons.push("older_failed_task");
            }

            if (task.status === "waiting_approval" && !isTest) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: ["waiting_approval_task"]
                });
                continue;
            }

            if (!reasons.length) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: task.id === latestTask?.id ? ["latest_task_for_goal"] : ["meaningful_task"]
                });
                continue;
            }

            if (task.id === latestTask?.id && !isTest) {
                taskKeepMap.set(task.id, {
                    ...task,
                    reasons: ["latest_task_for_goal"]
                });
                continue;
            }

            taskDeleteMap.set(task.id, {
                ...task,
                reasons
            });
        }
    }

    let taskKeeps = [...taskKeepMap.values()].sort((a, b) => b.id - a.id);
    let taskDeleteCandidates = [...taskDeleteMap.values()].sort((a, b) => b.id - a.id);

    const manyTaskDuplicates = tasks.length >= 8 && taskDeleteCandidates.length >= Math.ceil(tasks.length * 0.5);
    if (manyTaskDuplicates && taskKeeps.length > 5) {
        const protectedKeepIds = new Set(
            taskKeeps
                .filter(task => task.status === "waiting_approval" && !isAgentCleanupTestGoal(task.goal))
                .map(task => task.id)
        );

        const newestKeepIds = new Set(
            taskKeeps
                .filter(task => !protectedKeepIds.has(task.id))
                .slice(0, 5)
                .map(task => task.id)
        );

        for (const task of taskKeeps) {
            if (protectedKeepIds.has(task.id) || newestKeepIds.has(task.id)) {
                continue;
            }

            taskDeleteMap.set(task.id, {
                ...task,
                reasons: ["safe_mode_trim_older_task"]
            });
        }

        taskKeeps = taskKeeps.filter(task => !taskDeleteMap.has(task.id));
        taskDeleteCandidates = [...taskDeleteMap.values()].sort((a, b) => b.id - a.id);
    }

    const scheduleDeleteMap = new Map();
    const scheduleKeepMap = new Map();
    const scheduleGroups = new Map();

    for (const schedule of schedules) {
        const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
        const key = `${String(schedule.frequency || "").toLowerCase()}::${normalizedGoal}`;
        if (!scheduleGroups.has(key)) {
            scheduleGroups.set(key, []);
        }
        scheduleGroups.get(key).push(schedule);
    }

    for (const [, group] of scheduleGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const newest = ordered[0] || null;

        for (const schedule of ordered) {
            const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
            const reasons = [];
            const isTest = isAgentCleanupTestGoal(schedule.goal);

            if (isTest) {
                reasons.push("test_schedule");
            }

            if (newest && schedule.id !== newest.id) {
                reasons.push("duplicate_frequency_goal");
            }

            const isCanonicalDaily = normalizedGoal === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily";

            if (isCanonicalDaily && schedule.id === newest?.id) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["canonical_daily_schedule"]
                });
                continue;
            }

            if (!reasons.length) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["unique_schedule"]
                });
                continue;
            }

            if (schedule.id === newest?.id && !isTest) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["newest_duplicate_schedule"]
                });
                continue;
            }

            scheduleDeleteMap.set(schedule.id, {
                ...schedule,
                reasons
            });
        }
    }

    const canonicalKeeps = [...scheduleKeepMap.values()].filter(schedule =>
        normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
        && String(schedule.frequency || "").toLowerCase() === "daily"
    );

    if (!canonicalKeeps.length) {
        const fallbackCanonical = schedules
            .filter(schedule =>
                normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily"
            )
            .sort((a, b) => b.id - a.id)[0];

        if (fallbackCanonical) {
            scheduleKeepMap.set(fallbackCanonical.id, {
                ...fallbackCanonical,
                reasons: ["canonical_daily_schedule"]
            });
            scheduleDeleteMap.delete(fallbackCanonical.id);
        }
    }

    const scheduleDeleteCandidates = [...scheduleDeleteMap.values()].sort((a, b) => b.id - a.id);
    const scheduleKeeps = [...scheduleKeepMap.values()]
        .filter((schedule, index, array) => array.findIndex(item => item.id === schedule.id) === index)
        .sort((a, b) => b.id - a.id);

    const taskDeleteRatio = tasks.length ? taskDeleteCandidates.length / tasks.length : 0;
    const scheduleDeleteRatio = schedules.length ? scheduleDeleteCandidates.length / schedules.length : 0;
    const wouldDeleteAllTasks = tasks.length > 0 && taskDeleteCandidates.length === tasks.length;
    const wouldDeleteAllSchedules = schedules.length > 0 && scheduleDeleteCandidates.length === schedules.length;
    const blockedReasons = [];

    if (taskDeleteRatio > 0.8) {
        blockedReasons.push("Task delete candidates exceed 80% of rows.");
    }

    if (scheduleDeleteRatio > 0.8) {
        blockedReasons.push("Schedule delete candidates exceed 80% of rows.");
    }

    if (wouldDeleteAllTasks) {
        blockedReasons.push("Cleanup would delete all tasks.");
    }

    if (wouldDeleteAllSchedules) {
        blockedReasons.push("Cleanup would delete all schedules.");
    }

    return {
        createdAt: new Date().toISOString(),
        tasks: {
            total: tasks.length,
            toDelete: taskDeleteCandidates,
            toKeep: taskKeeps
        },
        schedules: {
            total: schedules.length,
            toDelete: scheduleDeleteCandidates,
            toKeep: scheduleKeeps
        },
        blockedReasons,
        safeToApply: blockedReasons.length === 0
    };
}

function buildObviousAgentCleanupPreviewData({ tasks, schedules }) {
    const canonicalScheduleGoal = "organise my workspace and suggest cleanup";
    const taskDeleteCandidates = [];
    const taskKeeps = [];
    const scheduleDeleteMap = new Map();
    const scheduleKeepMap = new Map();
    const scheduleGroups = new Map();

    for (const task of tasks) {
        const normalizedGoal = normalizeAgentCleanupGoal(task.goal);
        const isTest = isAgentCleanupTestGoal(task.goal);
        const shouldDelete = isTest;

        if (shouldDelete) {
            taskDeleteCandidates.push({
                ...task,
                reasons: ["test_goal"]
            });
            continue;
        }

        taskKeeps.push({
            ...task,
            reasons: task.status === "waiting_approval"
                ? ["waiting_approval_task"]
                : [normalizedGoal ? "meaningful_task" : "kept_task"]
        });
    }

    for (const schedule of schedules) {
        const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
        const key = `${String(schedule.frequency || "").toLowerCase()}::${normalizedGoal}`;

        if (!scheduleGroups.has(key)) {
            scheduleGroups.set(key, []);
        }

        scheduleGroups.get(key).push(schedule);
    }

    for (const [, group] of scheduleGroups.entries()) {
        const ordered = [...group].sort((a, b) => b.id - a.id);
        const enabledSchedules = ordered.filter(schedule => schedule.enabled);
        const newestEnabled = enabledSchedules[0] || null;
        const newestAny = ordered[0] || null;

        for (const schedule of ordered) {
            const normalizedGoal = normalizeAgentCleanupGoal(schedule.goal);
            const isCanonicalDaily = normalizedGoal === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily";
            const isTest = isAgentCleanupTestGoal(schedule.goal);
            const reasons = [];

            if (isCanonicalDaily && schedule.enabled) {
                scheduleKeepMap.set(schedule.id, {
                    ...schedule,
                    reasons: ["canonical_daily_schedule"]
                });
                continue;
            }

            if (isTest) {
                reasons.push("test_schedule");
            }

            const isDisabledDuplicate = !schedule.enabled && (
                (newestEnabled && schedule.id !== newestEnabled.id)
                || (!newestEnabled && newestAny && schedule.id !== newestAny.id)
            );

            if (isDisabledDuplicate) {
                reasons.push("disabled_duplicate_schedule");
            }

            if (reasons.length) {
                scheduleDeleteMap.set(schedule.id, {
                    ...schedule,
                    reasons
                });
                continue;
            }

            scheduleKeepMap.set(schedule.id, {
                ...schedule,
                reasons: [schedule.enabled ? "enabled_schedule" : "kept_schedule"]
            });
        }
    }

    const canonicalKept = [...scheduleKeepMap.values()].some(schedule =>
        normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
        && String(schedule.frequency || "").toLowerCase() === "daily"
        && schedule.enabled
    );

    if (!canonicalKept) {
        const fallbackCanonical = schedules
            .filter(schedule =>
                normalizeAgentCleanupGoal(schedule.goal) === canonicalScheduleGoal
                && String(schedule.frequency || "").toLowerCase() === "daily"
                && schedule.enabled
            )
            .sort((a, b) => b.id - a.id)[0];

        if (fallbackCanonical) {
            scheduleKeepMap.set(fallbackCanonical.id, {
                ...fallbackCanonical,
                reasons: ["canonical_daily_schedule"]
            });
            scheduleDeleteMap.delete(fallbackCanonical.id);
        }
    }

    const scheduleDeleteCandidates = [...scheduleDeleteMap.values()].sort((a, b) => b.id - a.id);
    const scheduleKeeps = [...scheduleKeepMap.values()]
        .filter((schedule, index, array) => array.findIndex(item => item.id === schedule.id) === index)
        .sort((a, b) => b.id - a.id);

    const taskDeleteRatio = tasks.length ? taskDeleteCandidates.length / tasks.length : 0;
    const scheduleDeleteRatio = schedules.length ? scheduleDeleteCandidates.length / schedules.length : 0;
    const wouldDeleteAllTasks = tasks.length > 0 && taskDeleteCandidates.length === tasks.length;
    const wouldDeleteAllSchedules = schedules.length > 0 && scheduleDeleteCandidates.length === schedules.length;
    const blockedReasons = [];

    if (taskDeleteRatio > 0.8) {
        blockedReasons.push("Obvious cleanup task delete candidates exceed 80% of rows.");
    }

    if (scheduleDeleteRatio > 0.8) {
        blockedReasons.push("Obvious cleanup schedule delete candidates exceed 80% of rows.");
    }

    if (wouldDeleteAllTasks) {
        blockedReasons.push("Obvious cleanup would delete all tasks.");
    }

    if (wouldDeleteAllSchedules) {
        blockedReasons.push("Obvious cleanup would delete all schedules.");
    }

    return {
        mode: "obvious",
        createdAt: new Date().toISOString(),
        tasks: {
            total: tasks.length,
            toDelete: taskDeleteCandidates.sort((a, b) => b.id - a.id),
            toKeep: taskKeeps.sort((a, b) => b.id - a.id)
        },
        schedules: {
            total: schedules.length,
            toDelete: scheduleDeleteCandidates,
            toKeep: scheduleKeeps
        },
        blockedReasons,
        safeToApply: blockedReasons.length === 0
    };
}

function formatAgentCleanupPreview(preview) {
    const modePrefix = preview.mode === "obvious" ? "Obvious agent cleanup preview" : "Agent cleanup preview";
    const formatTask = task => `- #${task.id} [${task.status}] ${task.goal} (${task.reasons.join(", ")})`;
    const formatSchedule = schedule => `- #${schedule.id} [${schedule.enabled ? "enabled" : "disabled"}] ${schedule.frequency}: ${schedule.goal} (${schedule.reasons.join(", ")})`;

    return `${modePrefix}

Tasks to delete:
${preview.tasks.toDelete.length ? preview.tasks.toDelete.map(formatTask).join("\n") : "- None"}

Tasks to keep:
${preview.tasks.toKeep.length ? preview.tasks.toKeep.map(formatTask).join("\n") : "- None"}

Schedules to delete:
${preview.schedules.toDelete.length ? preview.schedules.toDelete.map(formatSchedule).join("\n") : "- None"}

Schedules to keep:
${preview.schedules.toKeep.length ? preview.schedules.toKeep.map(formatSchedule).join("\n") : "- None"}

Safety:
${preview.safeToApply ? "- Safe to apply." : preview.blockedReasons.map(reason => `- ${reason}`).join("\n")}`;
}

async function applyAgentCleanupPreview(preview) {
    const taskIds = preview.tasks.toDelete.map(task => task.id);
    const scheduleIds = preview.schedules.toDelete.map(schedule => schedule.id);

    if (preview.blockedReasons.length) {
        return {
            ok: false,
            reply: `Cleanup is blocked:\n- ${preview.blockedReasons.join("\n- ")}`
        };
    }

    if (!taskIds.length && !scheduleIds.length) {
        return {
            ok: true,
            deletedTaskIds: [],
            deletedScheduleIds: [],
            reply: "No cleanup changes were needed."
        };
    }

    try {
        if (taskIds.length) {
            const { error: tErr } = await sbAdmin.from('agent_tasks').delete().in('id', taskIds);
            if (tErr) throw new Error(tErr.message);
        }

        if (scheduleIds.length) {
            const { error: sErr } = await sbAdmin.from('agent_schedules').delete().in('id', scheduleIds);
            if (sErr) throw new Error(sErr.message);
        }

        return {
            ok: true,
            deletedTaskIds: taskIds,
            deletedScheduleIds: scheduleIds,
            reply: `Cleanup applied.

Deleted task IDs: ${taskIds.length ? taskIds.join(", ") : "None"}
Deleted schedule IDs: ${scheduleIds.length ? scheduleIds.join(", ") : "None"}`
        };
    } catch (e) {
        return { ok: false, reply: `Cleanup failed: ${e.message}` };
    }
}

function getProtectedAgentCommandLabel(type) {
    if (type === "agent_apply")                      return "approve agent";
    if (type === "agent_undo")                       return "undo agent";
    if (type === "duplicate_create_approval")        return "approve duplicate create";
    if (type === "duplicate_replace_approval")       return "approve duplicate replace";
    if (type === "approve_task")                     return "approve task";
    if (type === "cancel_agent")                     return "cancel agent";
    if (type === "run_schedules_now")                return "run schedules now";
    if (type === "run_schedule")                     return "run schedule <id>";
    if (type === "disable_schedule")                 return "disable schedule <id>";
    if (type === "apply_cleanup_agent_data")         return "apply cleanup agent data";
    if (type === "apply_cleanup_obvious_agent_data") return "apply cleanup obvious agent data";
    if (type === "approve_reflection")               return "approve reflection <id>";
    return type;
}

const _PROTECTED_TYPES = new Set([
    "agent_apply",
    "agent_undo",
    "duplicate_create_approval",
    "duplicate_replace_approval",
    "approve_task",
    "cancel_agent",
    "run_schedules_now",
    "run_schedule",
    "disable_schedule",
    "apply_cleanup_agent_data",
    "apply_cleanup_obvious_agent_data",
    "approve_reflection"
]);

// Maps action types to minimum required autonomy level
const _AUTONOMY_REQUIREMENTS = {
    agent_plan:     3,
    auto_execute:   3,
    agent_continue: 2,
    agent_task:     2,
};

function getAgentAccessError(command, options = {}) {
    const { requiredAutonomyLevel } = options;

    // Autonomy level gate — absorbed from agent-command-handler inline checks
    if (requiredAutonomyLevel !== undefined) {
        const current = Number(process.env.AUTONOMY_LEVEL || '1');
        if (current < requiredAutonomyLevel) {
            return `Action requires autonomy level ${requiredAutonomyLevel}; current is ${current}.`;
        }
    }

    if (!_PROTECTED_TYPES.has(command.type)) {
        return null;
    }
    if (!AGENT_SECRET) {
        return `Agent approval is disabled (AGENT_SECRET not set).`;
    }
    if (command.secret !== AGENT_SECRET) {
        return `Agent approval is protected. Use: secret YOUR_SECRET ${getProtectedAgentCommandLabel(command.type)}`;
    }

    return null;
}

// ── Kernel Gate 3 — Authority ─────────────────────────────────────────────────

function checkAuthority(req, res, next) {
    const type = req.body?.type || req.body?.action || null;
    if (!type) return next();

    const requiredAutonomyLevel = _AUTONOMY_REQUIREMENTS[type];
    const err = getAgentAccessError(
        { type, secret: req.body?.secret },
        requiredAutonomyLevel !== undefined ? { requiredAutonomyLevel } : {}
    );
    if (err) return res.status(403).json({ ok: false, reply: err });
    return next();
}

// ── Kernel Gate 4 — Governance ────────────────────────────────────────────────

async function checkGovernance(req, res, next) {
    const type = req.body?.type || req.body?.action || null;
    req.governance = { hasStandingApproval: false, standingApprovalId: null };
    if (!type) return next();

    try {
        const approvals = await pgListApprovals({ is_standing: true, action_type: type });
        const active = approvals.find(a =>
            !a.revoked_at &&
            (!a.expires_at || new Date(a.expires_at) > new Date())
        );
        req.governance.hasStandingApproval = !!active;
        req.governance.standingApprovalId  = active?.id || null;
    } catch (_) {
        // Governance check failure is non-blocking — logs but does not reject request
        console.warn('[Kernel/Gov] Standing approval check failed:', _.message);
    }

    return next();
}

async function getDocumentSnapshotForUndo(filename) {
    let doc = await pgGetDocument(filename);

    if (!doc) {
        doc = getDocumentByFilename(filename);
    }

    return doc || null;
}

async function makeUniqueAgentFilename(description, fallback = "note") {
    const baseFilename = makeAgentDatedFilename(description || fallback);
    let candidate = baseFilename;
    let counter = 2;

    while (await pgGetDocument(candidate)) {
        candidate = baseFilename.replace(/\.txt$/i, `_${counter}.txt`);
        counter += 1;
    }

    return candidate;
}

async function makeUniqueWorkspaceAgentFilename(description, fallback = "workspace_file") {
    const baseFilename = makeAgentDatedFilename(description || fallback);
    const existingFiles = new Set(await listWorkspaceFiles());
    let candidate = baseFilename;
    let counter = 2;

    while (existingFiles.has(candidate)) {
        candidate = baseFilename.replace(/\.txt$/i, `_${counter}.txt`);
        counter += 1;
    }

    return candidate;
}

function normalizeWorkspaceFileMeaning(filename) {
    return String(filename || "")
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/^\d{4}-\d{2}-\d{2}_/, "")
        .replace(/[-.\s]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/(?:_md|_markdown|_txt)$/i, "")
        .replace(/^_+|_+$/g, "");
}

function getWorkspaceOverviewFamilyKey(filename) {
    const normalized = normalizeWorkspaceFileMeaning(filename);
    const familyMap = new Map([
        ["workspace_index",          "workspace_overview_family"],
        ["workspace_overview",       "workspace_overview_family"],
        ["workspace_report",         "workspace_overview_family"],
        ["workspace_cleanup_report", "workspace_overview_family"],
        ["workspace_baseline",       "workspace_overview_family"]
    ]);

    return familyMap.get(normalized) || normalized;
}

function getWorkspaceOverviewSearchTerms(filename = "") {
    const familyKey = getWorkspaceOverviewFamilyKey(filename);
    const familyTerms = {
        workspace_overview_family: [
            "workspace index",
            "workspace overview",
            "workspace report",
            "workspace cleanup",
            "workspace baseline"
        ]
    };

    return familyTerms[familyKey] || [String(filename || "").replace(/[_-]+/g, " ").trim()].filter(Boolean);
}

async function findSimilarWorkspaceArtifact(filename) {
    const storageDebug = await getWorkspaceStorageDebug();
    if (!storageDebug.ok) {
        console.error("WORKSPACE STORAGE FILE COUNT:", 0);
        console.error("WORKSPACE MATCHING POSTGRES DOC COUNT:", 0);
        throw new Error(`Workspace storage listing failed: ${storageDebug.error}`);
    }

    const files = storageDebug.files;
    const normalizedTarget = normalizeWorkspaceFileMeaning(filename);
    const targetFamily = getWorkspaceOverviewFamilyKey(filename);
    const docs = await pgListDocuments();
    const matchingDocs = new Map();
    const searchTerms = getWorkspaceOverviewSearchTerms(filename);

    for (const existingFile of files) {
        if (String(existingFile).toLowerCase() === String(filename).toLowerCase()) {
            console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
            console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);
            return {
                name: existingFile,
                source: "storage",
                storageCount: files.length,
                matchingDocCount: matchingDocs.size
            };
        }

        const existingNormalized = normalizeWorkspaceFileMeaning(existingFile);
        const existingFamily = getWorkspaceOverviewFamilyKey(existingFile);

        if (
            (normalizedTarget && existingNormalized === normalizedTarget) ||
            (targetFamily && existingFamily === targetFamily)
        ) {
            console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
            console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);
            return {
                name: existingFile,
                source: "storage",
                storageCount: files.length,
                matchingDocCount: matchingDocs.size
            };
        }
    }

    for (const doc of docs) {
        const docNormalized = normalizeWorkspaceFileMeaning(doc.filename);
        const docFamily = getWorkspaceOverviewFamilyKey(doc.filename);

        if (
            (normalizedTarget && docNormalized === normalizedTarget) ||
            (targetFamily && docFamily === targetFamily)
        ) {
            matchingDocs.set(doc.filename, doc.filename);
        }
    }

    for (const term of searchTerms) {
        const results = await pgSearchDocuments(term);

        for (const doc of results) {
            const haystack = [
                doc.filename,
                doc.summary,
                typeof doc.content === "string" ? doc.content.slice(0, 500) : ""
            ].join(" ").toLowerCase();

            if (haystack.includes(term.toLowerCase())) {
                matchingDocs.set(doc.filename, doc.filename);
            }
        }
    }

    console.log("WORKSPACE STORAGE FILE COUNT:", files.length);
    console.log("WORKSPACE MATCHING POSTGRES DOC COUNT:", matchingDocs.size);

    if (matchingDocs.size) {
        const firstMatch = Array.from(matchingDocs.keys())[0];
        return {
            name: firstMatch,
            source: "postgres",
            storageCount: files.length,
            matchingDocCount: matchingDocs.size
        };
    }

    return null;
}

function buildDuplicateSearchTerms(step) {
    return [
        step.filename,
        step.summary,
        typeof step.content === "string" ? step.content.slice(0, 120) : ""
    ].filter(Boolean);
}

function normalizeDuplicateText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function scoreDuplicateCandidate(candidate, proposedFilename, step) {
    let score = 0;
    const candidateFilename = normalizeDuplicateText(candidate.filename);
    const normalizedProposedFilename = normalizeDuplicateText(proposedFilename);
    const candidateSummary = normalizeDuplicateText(candidate.summary);
    const stepSummary = normalizeDuplicateText(step.summary);
    const candidateContent = normalizeDuplicateText(candidate.content);
    const stepContent = normalizeDuplicateText(step.content);

    if (candidateFilename && candidateFilename === normalizedProposedFilename) {
        score += 5;
    }

    if (candidateFilename && normalizedProposedFilename && (
        candidateFilename.includes(normalizedProposedFilename) ||
        normalizedProposedFilename.includes(candidateFilename)
    )) {
        score += 2;
    }

    if (stepSummary && candidateSummary && (
        candidateSummary.includes(stepSummary) ||
        stepSummary.includes(candidateSummary)
    )) {
        score += 2;
    }

    if (stepContent && candidateContent && (
        candidateContent === stepContent ||
        candidateContent.includes(stepContent.slice(0, 120)) ||
        stepContent.includes(candidateContent.slice(0, 120))
    )) {
        score += 4;
    }

    return score;
}

async function findLikelyDuplicateDocument(step) {
    if (step.type !== "create_document") {
        return null;
    }

    const proposedFilename = step.filename
        ? makeAgentDatedFilename(step.filename)
        : makeAgentDatedFilename(step.classification || "note");
    const terms = buildDuplicateSearchTerms(step);
    const candidates = new Map();

    for (const term of terms) {
        const matches = await pgSearchDocuments(term);

        for (const candidate of matches) {
            candidates.set(candidate.filename, candidate);
        }
    }

    const recentDocs = await pgListDocuments();

    for (const recentDoc of recentDocs) {
        const fullDoc = await getDocumentSnapshotForUndo(recentDoc.filename);

        if (fullDoc) {
            candidates.set(fullDoc.filename, fullDoc);
        }
    }

    let bestMatch = null;

    for (const candidate of candidates.values()) {
        const score = scoreDuplicateCandidate(candidate, proposedFilename, step);

        if (score >= 5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = {
                score,
                filename: candidate.filename,
                classification: candidate.classification,
                summary: candidate.summary,
                content: candidate.content
            };
        }
    }

    return bestMatch;
}

async function findPendingDuplicateForSteps(steps) {
    for (let index = 0; index < steps.length; index += 1) {
        const step = steps[index];
        const duplicate = await findLikelyDuplicateDocument(step);

        if (duplicate) {
            return {
                index,
                step,
                duplicate
            };
        }
    }

    return null;
}

module.exports = {
    extractJsonBlock,
    normalizeAgentFilename,
    makeAgentDatedFilename,
    normalizeAgentCleanupGoal,
    isAgentCleanupTestGoal,
    fetchAgentCleanupRows,
    buildAgentCleanupPreviewData,
    buildObviousAgentCleanupPreviewData,
    formatAgentCleanupPreview,
    applyAgentCleanupPreview,
    getProtectedAgentCommandLabel,
    getAgentAccessError,
    getDocumentSnapshotForUndo,
    makeUniqueAgentFilename,
    makeUniqueWorkspaceAgentFilename,
    normalizeWorkspaceFileMeaning,
    getWorkspaceOverviewFamilyKey,
    getWorkspaceOverviewSearchTerms,
    findSimilarWorkspaceArtifact,
    buildDuplicateSearchTerms,
    normalizeDuplicateText,
    scoreDuplicateCandidate,
    findLikelyDuplicateDocument,
    findPendingDuplicateForSteps,
    checkAuthority,
    checkGovernance,
    pgInsertApproval
};
