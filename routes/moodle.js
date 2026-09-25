'use strict';
const router  = require('express').Router();
const https   = require('https');
const http    = require('http');
const { URL } = require('url');
const _auth   = require('../lib/app-auth');
const { getSupabaseClient } = require('../lib/clients');
const fs      = require('fs');
const path    = require('path');

const sb = getSupabaseClient;

// ── Moodle REST helper ────────────────────────────────────────────────────────
function moodleCall(wsfunction, params = {}) {
    return new Promise((resolve, reject) => {
        const base  = (process.env.MOODLE_URL || '').replace(/\/$/, '');
        const token = process.env.MOODLE_TOKEN || '';
        if (!base || !token) return reject(new Error('MOODLE_URL and MOODLE_TOKEN env vars required'));

        const qs = new URLSearchParams({ wstoken: token, moodlewsrestformat: 'json', wsfunction, ...params });
        const rawUrl = `${base}/webservice/rest/server.php?${qs}`;
        const parsed = new URL(rawUrl);
        const lib = parsed.protocol === 'https:' ? https : http;

        lib.get(rawUrl, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json && json.exception) return reject(new Error(json.message || json.exception));
                    resolve(json);
                } catch (e) { reject(new Error('Moodle response parse error')); }
            });
        }).on('error', reject);
    });
}

// ── POST /api/moodle/set-token — directly set a known token ─────────────────
router.post('/moodle/set-token', _auth, async (req, res) => {
    const { token } = req.body || {};
    if (!token || typeof token !== 'string' || token.length < 10)
        return res.status(400).json({ ok: false, error: 'token required' });

    process.env.MOODLE_TOKEN = token.trim();

    const envPath = path.join(__dirname, '..', '.env');
    try {
        let envText = fs.readFileSync(envPath, 'utf8');
        if (/^MOODLE_TOKEN=/m.test(envText)) {
            envText = envText.replace(/^MOODLE_TOKEN=.*/m, `MOODLE_TOKEN=${token.trim()}`);
        } else {
            envText += `\nMOODLE_TOKEN=${token.trim()}\n`;
        }
        fs.writeFileSync(envPath, envText, 'utf8');
    } catch (_) {}

    res.json({ ok: true, message: 'Moodle token saved. Integration is active.' });
});

// ── POST /api/moodle/authenticate — fetch token via username+password ────────
router.post('/moodle/authenticate', _auth, async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password)
        return res.status(400).json({ ok: false, error: 'username and password required' });

    const base = (process.env.MOODLE_URL || 'https://moodle.bcu.ac.uk').replace(/\/$/, '');
    const qs = new URLSearchParams({ username, password, service: 'moodle_mobile_app' });
    const tokenUrl = `${base}/login/token.php?${qs}`;

    try {
        const data = await new Promise((resolve, reject) => {
            const parsed = new URL(tokenUrl);
            const lib = parsed.protocol === 'https:' ? https : http;
            lib.get(tokenUrl, r => {
                let body = '';
                r.on('data', c => body += c);
                r.on('end', () => {
                    try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Parse error')); }
                });
            }).on('error', reject);
        });

        if (data.error) return res.status(401).json({ ok: false, error: data.error });
        if (!data.token) return res.status(500).json({ ok: false, error: 'No token returned' });

        // Hot-patch running process
        process.env.MOODLE_TOKEN = data.token;

        // Persist to .env file so it survives local restarts
        const envPath = path.join(__dirname, '..', '.env');
        try {
            let envText = fs.readFileSync(envPath, 'utf8');
            if (/^MOODLE_TOKEN=/m.test(envText)) {
                envText = envText.replace(/^MOODLE_TOKEN=.*/m, `MOODLE_TOKEN=${data.token}`);
            } else {
                envText += `\nMOODLE_TOKEN=${data.token}\n`;
            }
            fs.writeFileSync(envPath, envText, 'utf8');
        } catch (_) {}

        res.json({ ok: true, message: 'Moodle token saved. Integration is active.', token_preview: data.token.slice(0, 8) + '...' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/status — check connection ─────────────────────────────────
router.get('/moodle/status', _auth, async (req, res) => {
    try {
        const info = await moodleCall('core_webservice_get_site_info');
        res.json({ ok: true, site: info.sitename, user: info.fullname, moodle_version: info.release });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/courses — enrolled courses ────────────────────────────────
router.get('/moodle/courses', _auth, async (req, res) => {
    try {
        const data = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const courses = (data.courses || []).map(c => ({
            id:       c.id,
            shortname: c.shortname,
            fullname:  c.fullname,
            progress:  c.progress ?? null,
            url:       c.viewurl || null,
        }));
        res.json({ ok: true, courses });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/assignments — upcoming assignments ────────────────────────
router.get('/moodle/assignments', _auth, async (req, res) => {
    try {
        // Get course IDs from DB first
        const { data: modules } = await sb().from('apex_university_modules').select('code,name').eq('current', true);
        const courses = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const courseIds = (courses.courses || []).map(c => c.id);
        if (!courseIds.length) return res.json({ ok: true, assignments: [] });

        const params = {};
        courseIds.forEach((id, i) => { params[`courseids[${i}]`] = id; });
        const data = await moodleCall('mod_assign_get_assignments', params);

        const now = Date.now() / 1000;
        const assignments = [];
        (data.courses || []).forEach(course => {
            (course.assignments || []).forEach(a => {
                if (a.duedate && a.duedate > now) {
                    assignments.push({
                        id:        a.id,
                        course:    course.shortname || course.fullname,
                        title:     a.name,
                        due_date:  new Date(a.duedate * 1000).toISOString().split('T')[0],
                        due_ts:    a.duedate,
                        intro:     a.intro ? a.intro.replace(/<[^>]*>/g, '').slice(0, 200) : null,
                        submitted: a.submissionstatus === 'submitted',
                    });
                }
            });
        });
        assignments.sort((a, b) => a.due_ts - b.due_ts);
        res.json({ ok: true, assignments });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/deadlines — next 30 days ─────────────────────────────────
router.get('/moodle/deadlines', _auth, async (req, res) => {
    try {
        const data = await moodleCall('core_calendar_get_calendar_upcoming_view');
        const events = (data.events || []).map(e => ({
            id:       e.id,
            name:     e.name,
            course:   e.course?.shortname || null,
            due_date: e.timestart ? new Date(e.timestart * 1000).toISOString().split('T')[0] : null,
            type:     e.eventtype,
            url:      e.url || null,
        })).filter(e => e.due_date);
        res.json({ ok: true, events });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── POST /api/moodle/sync — pull courses + assignments into apex tables ───────
router.post('/moodle/sync', _auth, async (req, res) => {
    try {
        // 1. Sync in-progress courses → update progress on apex_university_modules
        const courses = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const courseList = courses.courses || [];

        for (const c of courseList) {
            const code = c.shortname?.match(/[A-Z]{2,4}\d{4}/)?.[0];
            if (!code) continue;
            await sb().from('apex_university_modules')
                .update({ progress: Math.round(c.progress || 0) })
                .eq('code', code).eq('current', true);
        }

        // 2. Sync upcoming assignments → apex_university_assignments
        const courseIds = courseList.map(c => c.id);
        let synced = 0;
        if (courseIds.length) {
            const params = {};
            courseIds.forEach((id, i) => { params[`courseids[${i}]`] = id; });
            const aData = await moodleCall('mod_assign_get_assignments', params);
            const now = Date.now() / 1000;

            for (const course of (aData.courses || [])) {
                for (const a of (course.assignments || [])) {
                    if (!a.duedate || a.duedate < now) continue;
                    const code = course.shortname?.match(/[A-Z]{2,4}\d{4}/)?.[0] || course.shortname;
                    const dueDate = new Date(a.duedate * 1000).toISOString().split('T')[0];
                    // Upsert by moodle_id to avoid duplicates
                    await sb().from('apex_university_assignments').upsert({
                        module:   code,
                        title:    a.name,
                        due_date: dueDate,
                        completed: false,
                        description: a.intro ? a.intro.replace(/<[^>]*>/g, '').slice(0, 300) : null,
                    }, { onConflict: 'module,title' }).select();
                    synced++;
                }
            }
        }

        res.json({ ok: true, courses_synced: courseList.length, assignments_synced: synced });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
