'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { previewCloudAutopilot, applyLatestCloudProposal } = require('../../agent-system/cloud_autopilot');

router.post('/cloud-autopilot/preview', requireAppAccess, async (req, res) => {
    try {
        const requirements = req.body?.requirements;
        if (!requirements || typeof requirements !== "string" || !requirements.trim()) {
            return res.status(400).json({
                ok: false,
                reply: "Please enter automation requirements."
            });
        }
        const result = await previewCloudAutopilot(requirements);
        return res.status(200).json({
            ok: true,
            reply: "Preview created.",
            summary: result.summary,
            changedFiles: result.changedFiles
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT PREVIEW ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot preview failed."
        });
    }
});

router.post('/cloud-autopilot/apply', requireAppAccess, async (req, res) => {
    try {
        const result = await applyLatestCloudProposal();
        return res.status(200).json({
            ok: true,
            reply: result.skipped
                ? result.reason || "No changes detected."
                : "Cloud autopilot applied and pushed to GitHub.",
            summary: result.summary,
            changedFiles: result.changedFiles,
            backupFolder: result.backupFolder,
            pushed: result.pushed,
            skipped: result.skipped,
            reason: result.reason
        });
    } catch (error) {
        console.error("CLOUD AUTOPILOT APPLY ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message || "Cloud autopilot apply failed."
        });
    }
});

module.exports = router;
