'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { requireAppAccess } = require('../../lib/middleware');

const LAYOUT_FILE = path.join(__dirname, '../../..', 'layout.json');

router.get('/load-layout', requireAppAccess, (req, res) => {
    try {
        if (!fs.existsSync(LAYOUT_FILE)) {
            return res.json({ html: "", css: "" });
        }
        const raw = fs.readFileSync(LAYOUT_FILE, "utf8");
        const data = JSON.parse(raw);
        return res.json({
            html: data.html || "",
            css: data.css || ""
        });
    } catch (error) {
        console.error("LOAD LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not load layout."
        });
    }
});

router.post('/save-layout', requireAppAccess, (req, res) => {
    try {
        const html = req.body?.html || "";
        const css = req.body?.css || "";
        fs.writeFileSync(
            LAYOUT_FILE,
            JSON.stringify({ html, css }, null, 2),
            "utf8"
        );
        return res.json({ ok: true, reply: "Layout saved." });
    } catch (error) {
        console.error("SAVE LAYOUT ERROR:", error.message);
        return res.status(500).json({
            ok: false,
            reply: "Could not save layout."
        });
    }
});

module.exports = router;
