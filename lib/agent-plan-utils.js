'use strict';
// lib/agent-plan-utils.js — agent profile helpers, duplicate planning, standing-approval text

const { AGENT_PROFILES } = require('../agents');
const { pgGetEnabledStandingApprovals } = require('./pg_helpers');

const DISCOVERY_AGENT_STEP_TYPES = new Set([
    "list_documents",
    "list_files",
    "search_documents"
]);

function normalizeDuplicateComparisonText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeAgentProfileName(name = "") {
    const raw = String(name || "").trim().toLowerCase().replace(/\s+/g, "_");
    const aliasMap = {
        system: "system_agent",
        system_agent: "system_agent",
        file: "file_agent",
        file_agent: "file_agent",
        uni: "uni_agent",
        uni_agent: "uni_agent",
        finance: "finance_agent",
        finance_agent: "finance_agent",
        business: "business_agent",
        business_agent: "business_agent"
    };

    return aliasMap[raw] || null;
}

function getAgentProfile(agentName = "") {
    const normalized = normalizeAgentProfileName(agentName);
    if (!normalized) return null;
    return AGENT_PROFILES[normalized] || null;
}

function getAvailableAgentNames() {
    return Object.keys(AGENT_PROFILES);
}

function getAvailableAgentsText() {
    return getAvailableAgentNames().join(", ");
}

function formatAgentProfile(profile) {
    return `${profile.title}

Purpose:
${profile.purpose}

Allowed areas:
- ${profile.allowedAreas.join("\n- ")}

Safety limits:
- ${profile.safetyLimits.join("\n- ")}`;
}

function getFilenameClarityScore(filename) {
    const clean = String(filename || "").replace(/\.txt$/i, "");
    let score = 0;

    if (!/^\d{4}-\d{2}-\d{2}_/.test(clean)) {
        score += 2;
    }

    if (!/_v\d+$/i.test(clean)) {
        score += 2;
    }

    if (clean.length <= 40) {
        score += 2;
    } else if (clean.length <= 60) {
        score += 1;
    }

    if (!/copy|duplicate|final_final/i.test(clean)) {
        score += 1;
    }

    return score;
}

function isDiscoveryAgentStepType(type) {
    return DISCOVERY_AGENT_STEP_TYPES.has(type);
}

function buildDuplicatePlanningGroups(documents) {
    const groups = [];
    const seen = new Set();

    for (let index = 0; index < documents.length; index += 1) {
        if (seen.has(index)) {
            continue;
        }

        const baseDoc = documents[index];
        const baseFilename = normalizeDuplicateComparisonText(baseDoc.filename).replace(/_v\d+\.txt$/i, ".txt");
        const baseSummary = normalizeDuplicateComparisonText(baseDoc.summary);
        const baseContent = normalizeDuplicateComparisonText(baseDoc.content).slice(0, 400);
        const group = [baseDoc];

        for (let compareIndex = index + 1; compareIndex < documents.length; compareIndex += 1) {
            if (seen.has(compareIndex)) {
                continue;
            }

            const compareDoc = documents[compareIndex];
            const compareFilename = normalizeDuplicateComparisonText(compareDoc.filename).replace(/_v\d+\.txt$/i, ".txt");
            const compareSummary = normalizeDuplicateComparisonText(compareDoc.summary);
            const compareContent = normalizeDuplicateComparisonText(compareDoc.content).slice(0, 400);

            const sameFilenameStem = baseFilename && compareFilename && (
                baseFilename === compareFilename ||
                baseFilename.includes(compareFilename) ||
                compareFilename.includes(baseFilename)
            );
            const sameSummary = baseSummary && compareSummary && (
                baseSummary === compareSummary ||
                baseSummary.includes(compareSummary) ||
                compareSummary.includes(baseSummary)
            );
            const sameContent = baseContent && compareContent && (
                baseContent === compareContent ||
                baseContent.includes(compareContent) ||
                compareContent.includes(baseContent)
            );

            if (sameFilenameStem || sameSummary || sameContent) {
                group.push(compareDoc);
                seen.add(compareIndex);
            }
        }

        if (group.length > 1) {
            const ranked = group
                .map(doc => {
                    const contentLength = (doc.content || "").length;
                    const summaryRichness = normalizeDuplicateComparisonText(doc.summary).length;
                    const filenameClarity = getFilenameClarityScore(doc.filename);
                    const createdAt = doc.created_at ? new Date(doc.created_at).getTime() : 0;
                    const contentFingerprint = normalizeDuplicateComparisonText(doc.content).slice(0, 400);
                    const uniqueContentBonus = group.filter(item => {
                        const otherFingerprint = normalizeDuplicateComparisonText(item.content).slice(0, 400);
                        return otherFingerprint === contentFingerprint;
                    }).length <= 1 ? 1 : 0;
                    const canonicalFilenameBonus = /^[a-z0-9_-]+\.txt$/i.test(doc.filename || "") &&
                        !/copy|duplicate|final_final/i.test(doc.filename || "") ? 1 : 0;
                    const newestBonus = createdAt ? Math.min(createdAt / 1e12, 10) : 0;
                    const score = newestBonus +
                        Math.min(contentLength / 500, 6) +
                        Math.min(summaryRichness / 60, 4) +
                        filenameClarity +
                        uniqueContentBonus +
                        canonicalFilenameBonus;

                    return {
                        doc,
                        score,
                        contentLength,
                        summaryRichness,
                        filenameClarity,
                        createdAt,
                        uniqueContentBonus,
                        canonicalFilenameBonus
                    };
                })
                .sort((a, b) => b.score - a.score);

            const keep = ranked[0];
            const explanationParts = [];

            if (keep.filenameClarity >= 4) {
                explanationParts.push("it has the clearest filename");
            }
            if (keep.contentLength >= (ranked[1]?.contentLength || 0)) {
                explanationParts.push("it has the strongest content length");
            }
            if (keep.summaryRichness >= (ranked[1]?.summaryRichness || 0)) {
                explanationParts.push("it has the richest summary");
            }
            if (keep.createdAt >= (ranked[1]?.createdAt || 0)) {
                explanationParts.push("it is the newest copy");
            }
            if (keep.canonicalFilenameBonus > 0) {
                explanationParts.push("its filename already looks canonical");
            }

            groups.push({
                filenames: ranked.map(item => item.doc.filename),
                keepFilename: keep.doc.filename,
                ranked,
                explanation: `Keeping ${keep.doc.filename} because ${explanationParts[0] || "it scores best overall"}${explanationParts[1] ? ` and ${explanationParts[1]}` : ""}.`,
                proposedActions: ranked.slice(1).map(item => ({
                    type: "delete_document",
                    filename: item.doc.filename,
                    reason: `${item.doc.filename} scored lower than ${keep.doc.filename} for created_at, content length, summary richness, or filename clarity.`
                }))
            });
        }

        seen.add(index);
    }

    return groups;
}

function buildDuplicatePlanningInsights(documents) {
    const groups = buildDuplicatePlanningGroups(documents);

    if (!groups.length) {
        return "No clear duplicate groups detected in the current planning documents.";
    }

    return groups.map((group, index) => [
        `DUPLICATE GROUP ${index + 1}`,
        `Files: ${group.filenames.join(", ")}`,
        `Recommended keep: ${group.keepFilename}`,
        `Reasoning: ${group.explanation}`
    ].join("\n")).join("\n\n");
}

async function buildActiveStandingApprovalsText() {
    const approvals = await pgGetEnabledStandingApprovals();

    if (!approvals.length) {
        return "None.";
    }

    return approvals.map(rule => {
        const pattern = String(rule.pattern || "").trim();
        return `- ${rule.action_type}${pattern ? ` (${pattern})` : ""}`;
    }).join("\n");
}

module.exports = {
    normalizeDuplicateComparisonText,
    normalizeAgentProfileName,
    getAgentProfile,
    getAvailableAgentNames,
    getAvailableAgentsText,
    formatAgentProfile,
    getFilenameClarityScore,
    isDiscoveryAgentStepType,
    buildDuplicatePlanningGroups,
    buildDuplicatePlanningInsights,
    buildActiveStandingApprovalsText
};
