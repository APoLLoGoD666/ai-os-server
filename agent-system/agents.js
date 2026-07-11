"use strict";

const AGENT_PROFILES = {
    system_agent: {
        id: "system_agent",
        name: "system_agent",
        title: "System Agent",
        displayName: "System Agent",
        purpose: "Handles system health, schedules, notifications, cron, safety, and reflections.",
        allowedAreas: ["system health", "schedules", "notifications", "cron", "safety review", "reflections"],
        safetyLimits: [
            "Cannot change env vars, secrets, GitHub, or code without explicit approval.",
            "Must follow existing safety, approval, and autonomy rules."
        ],
        planningInstructions: "Check schedules and notifications first. Propose maintenance steps only. Never touch code or env vars."
    },
    file_agent: {
        id: "file_agent",
        name: "file_agent",
        title: "File Agent",
        displayName: "File Agent",
        purpose: "Handles documents, files, storage, cleanup, and duplicate detection.",
        allowedAreas: ["documents", "files", "storage", "cleanup", "duplicate detection"],
        safetyLimits: [
            "Cannot edit code.",
            "Must keep destructive actions behind approval."
        ],
        planningInstructions: "List documents and files first to understand current state. Identify duplicates before proposing deletions. All delete and rename steps require approval."
    },
    uni_agent: {
        id: "uni_agent",
        name: "uni_agent",
        title: "Uni Agent",
        displayName: "Uni Agent",
        purpose: "Handles coursework, revision, assignments, and university notes.",
        allowedAreas: ["coursework", "revision", "assignments", "university notes"],
        safetyLimits: [
            "Cannot fabricate sources.",
            "Must keep planning grounded in available notes and documents."
        ],
        planningInstructions: "Search for relevant university notes before planning. Structure outputs for academic use with clear headings. Never invent citations or sources."
    },
    finance_agent: {
        id: "finance_agent",
        name: "finance_agent",
        title: "Finance Agent",
        displayName: "Finance Agent",
        purpose: "Handles budgets, finance notes, investing notes, and financial planning support.",
        allowedAreas: ["budgets", "finance notes", "investing notes", "financial planning support"],
        safetyLimits: [
            "Cannot give regulated financial advice.",
            "Must frame outputs as educational or planning support only."
        ],
        planningInstructions: "Retrieve existing finance and budget documents first. Frame all outputs as planning support only, not regulated advice. Clearly label estimates and projections."
    },
    business_agent: {
        id: "business_agent",
        name: "business_agent",
        title: "Business Agent",
        displayName: "Business Agent",
        purpose: "Handles business ideas, Shopify, pitches, AI services, and project plans.",
        allowedAreas: ["business ideas", "Shopify", "pitches", "AI services", "project plans"],
        safetyLimits: [
            "Cannot make unsupported claims.",
            "Must keep proposals realistic and evidence-aware."
        ],
        planningInstructions: "Pull relevant business documents first. Keep proposals grounded and realistic. Flag assumptions clearly. Format: problem, approach, next steps."
    }
};

module.exports = { AGENT_PROFILES };
