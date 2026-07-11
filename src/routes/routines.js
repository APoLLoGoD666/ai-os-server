'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { pgCreateRoutine, pgListRoutines, pgUpdateRoutine, pgDeleteRoutine } = require('../../lib/pg_helpers');
const { getCached, setCache, clearCache } = require('../../lib/server-utils');

router.get('/api/routines', requireAppAccess, async (req, res) => {
    try {
        const cached = getCached("routines");
        if (cached) return res.json(cached);
        const routines = await pgListRoutines();
        const payload = { ok: true, routines };
        setCache("routines", payload);
        return res.json(payload);
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.post('/api/routines', requireAppAccess, async (req, res) => {
    try {
        const { name, description, schedule_cron } = req.body || {};
        if (!name || !schedule_cron) return res.status(400).json({ ok: false, reply: "name and schedule_cron required." });
        const routine = await pgCreateRoutine(name, description || "", schedule_cron);
        clearCache("routines");
        return res.json({ ok: true, routine });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.patch('/api/routines/:id', requireAppAccess, async (req, res) => {
    try {
        const id      = parseInt(req.params.id);
        const updates = req.body || {};
        const allowed = ["name", "description", "schedule_cron", "active"];
        const filtered = {};
        for (const k of allowed) {
            if (updates[k] !== undefined) filtered[k] = updates[k];
        }
        const routine = await pgUpdateRoutine(id, filtered);
        if (!routine) return res.status(404).json({ ok: false, reply: "Routine not found." });
        clearCache("routines");
        return res.json({ ok: true, routine });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

router.delete('/api/routines/:id', requireAppAccess, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pgDeleteRoutine(id);
        clearCache("routines");
        return res.json({ ok: true, reply: `Routine ${id} deleted.` });
    } catch (error) {
        return res.status(500).json({ ok: false, reply: error.message });
    }
});

module.exports = router;
