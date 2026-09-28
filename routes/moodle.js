'use strict';
const router    = require('express').Router();
const https     = require('https');
const http      = require('http');
const { URL }   = require('url');
const _auth     = require('../lib/app-auth');
const { getSupabaseClient } = require('../lib/clients');
const fs        = require('fs');
const path      = require('path');
const pdfParse  = require('pdf-parse');
const JSZip     = require('jszip');
const Anthropic = require('@anthropic-ai/sdk');

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

        // 2. Build code → module_id map from DB
        const { data: modRows } = await sb().from('apex_university_modules').select('id,code');
        const moduleIdMap = {};
        for (const row of (modRows || [])) { if (row.code) moduleIdMap[row.code] = row.id; }

        // 3. Sync upcoming assignments → apex_university_assignments
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
                    const moduleId = moduleIdMap[code];
                    if (!moduleId) continue;
                    const dueDate = new Date(a.duedate * 1000).toISOString().split('T')[0];
                    await sb().from('apex_university_assignments').insert({
                        module_id:   moduleId,
                        title:       a.name,
                        due_date:    dueDate,
                        completed:   false,
                        description: a.intro ? a.intro.replace(/<[^>]*>/g, '').slice(0, 300) : null,
                        human_id:    '00000000-0000-4000-8000-000000000001',
                    }).select();
                    synced++;
                }
            }
        }

        res.json({ ok: true, courses_synced: courseList.length, assignments_synced: synced });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/weekly-plan — course sections with study files ─────────
router.get('/moodle/weekly-plan', _auth, async (req, res) => {
    try {
        const enrolled = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const courseList = enrolled.courses || [];
        const plan = [];

        for (const course of courseList) {
            const code = course.shortname?.match(/[A-Z]{2,4}\d{4}/)?.[0] || course.shortname;
            let contents;
            try { contents = await moodleCall('core_course_get_contents', { courseid: course.id }); }
            catch (e) { continue; }

            const sections = [];
            for (const section of (contents || [])) {
                const scannableFiles = [];
                for (const mod of (section.modules || [])) {
                    for (const f of (mod.contents || [])) {
                        if (!f.fileurl || !f.filename) continue;
                        if (isStudyFile(f.filename)) {
                            scannableFiles.push({ filename: f.filename, fileurl: f.fileurl, filesize: f.filesize || 0 });
                        }
                    }
                }
                if (!scannableFiles.length) continue;
                sections.push({
                    name:             section.name || '',
                    summary:          section.summary ? section.summary.replace(/<[^>]*>/g, '').slice(0, 200) : '',
                    file_count:       scannableFiles.length,
                    scannable_files:  scannableFiles,
                });
            }
            if (sections.length) plan.push({ code, fullname: course.fullname, sections });
        }

        res.json({ ok: true, plan });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/dashboard — full aggregated view for the uni page ─────────
router.get('/moodle/dashboard', _auth, async (req, res) => {
    try {
        const enrolled = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const courseList = (enrolled.courses || []).filter(c => c.shortname?.match(/[A-Z]{2,4}\d{4}/));

        // Pre-load scanned notes once
        const { data: allNotes } = await sb().from('apex_documents').select('name').eq('doc_type', 'moodle_notes');
        const scannedSet = new Set((allNotes || []).map(n => {
            const parts = n.name.split(' — ');
            return parts.slice(1).join(' — ').toLowerCase();
        }));

        const modules = [];
        const now = Date.now() / 1000;
        const _daysUntil = (iso) => iso ? Math.ceil((new Date(iso).getTime() / 1000 - now) / 86400) : null;

        // Known assessment structures not exposed via Moodle API (exams, in-class tests)
        const KNOWN_ASSESSMENTS = {
            FIN6039: [
                {
                    id: 'fin6039-exam', title: 'In-Class Closed Book Exam', weight_pct: 30,
                    due_date: null, days_until: null, grade_scale: 30, source: 'manual',
                    intro: 'Week 10 — covers weeks 1–9. 10 MCQs + 3 calculation case studies. 10 min reading + 80 min exam. 25/30 marks from exam questions; 5 marks from mid-term revision activities (weeks 5–7).',
                },
                {
                    id: 'fin6039-tca', title: 'Online Time Constrained Assessment (TCA)', weight_pct: 70,
                    due_date: '2027-01-15', days_until: _daysUntil('2027-01-15'), grade_scale: 70, source: 'manual',
                    intro: 'Open-book. 24-hour window: 12:00 noon 14 Jan 2027 → 12:00 noon 15 Jan 2027. Max 1500 words. Marking structure: 40%–20%–40%.',
                },
            ],
            FIN6041: [
                {
                    id: 'fin6041-test1', title: 'In-Class MCQ Test 1', weight_pct: 15,
                    due_date: '2026-10-23', days_until: _daysUntil('2026-10-23'), grade_scale: 15, source: 'manual',
                    intro: 'Week 5 — 23 Oct 2026. Closed-book. 15 mins + 10 mins reading. Covers learning outcomes 1 and 2.',
                },
                {
                    id: 'fin6041-test2', title: 'In-Class MCQ Test 2', weight_pct: 15,
                    due_date: '2026-11-20', days_until: _daysUntil('2026-11-20'), grade_scale: 15, source: 'manual',
                    intro: 'Week 9 — 20 Nov 2026. Closed-book. 15 mins + 10 mins reading. Covers learning outcomes 1 and 2.',
                },
                {
                    id: 'fin6041-exam', title: 'Online Invigilated Exam (DigiExam)', weight_pct: 70,
                    due_date: null, days_until: null, grade_scale: 70, source: 'manual',
                    intro: 'December or January — date TBC. Closed-book invigilated DigiExam. Discussion and calculation questions. 90 mins + 10 mins reading + 30 mins submission. Covers learning outcomes 3 and 4.',
                },
            ],
        };

        for (const course of courseList) {
            const code = course.shortname.match(/[A-Z]{2,4}\d{4}/)[0];

            // Section helpers
            const _isWeekSec    = n => /week\s*\d+/i.test(n);
            const _isSummSec    = n => /assessment\s+\d+\s*[-–]/i.test(n) || (/assessment\s+\d+/i.test(n) && /\d+%/.test(n));
            const _isAssInfoSec = n => /assessment.{0,8}information/i.test(n) || /assessments\s*information/i.test(n) || /formative.{0,25}assessment/i.test(n) || /formative.{0,25}activity/i.test(n);
            const _extractWt    = n => { const m = n.match(/(\d+)%/); return m ? parseInt(m[1]) : null; };
            const _extractWkNum = n => { const m = n.match(/week\s*(\d+)/i); return m ? parseInt(m[1]) : null; };
            const _SKIP         = new Set(['general', 'news forum', 'announcements', 'introduction', 'free access to the financial times', 'steps to get free access to the financial times']);

            let rawSections = [];
            try { rawSections = await moodleCall('core_course_get_contents', { courseid: course.id }); } catch (_) {}

            const weekSecs = [], summSecs = [], assessInfoSecs = [];
            let totalFiles = 0, scannedCount = 0;

            for (const s of rawSections) {
                const sname = (s.name || '').trim();
                if (!sname || _SKIP.has(sname.toLowerCase())) continue;

                const files = [], activities = [];
                for (const mod of (s.modules || [])) {
                    for (const f of (mod.contents || [])) {
                        if (!f.filename || !f.fileurl || !isStudyFile(f.filename)) continue;
                        if ((f.filesize || 0) > 15 * 1024 * 1024) continue;
                        const scanned = scannedSet.has(f.filename.toLowerCase());
                        files.push({ name: f.filename, size_kb: Math.round((f.filesize || 0) / 1024), scanned, url: f.fileurl });
                        totalFiles++;
                        if (scanned) scannedCount++;
                    }
                    if (['assign', 'quiz', 'turnitintool', 'turnitintooltwo'].includes(mod.modname)) {
                        activities.push({ type: mod.modname, name: mod.name, instance_id: mod.instance });
                    }
                }

                if (_isSummSec(sname)) {
                    summSecs.push({ name: sname, weight_pct: _extractWt(sname), files, activities });
                } else if (_isAssInfoSec(sname)) {
                    assessInfoSecs.push({ name: sname, files, activities });
                } else if (_isWeekSec(sname)) {
                    weekSecs.push({ num: _extractWkNum(sname), name: sname, files, activities });
                }
                // non-week, non-assessment info sections (module resources etc.) are intentionally skipped
            }

            // Build complete 12-week skeleton — fill gaps with upcoming placeholders
            const SEMESTER_WEEKS = 12;
            const postedNums = new Set(weekSecs.map(w => w.num).filter(Boolean));
            const allWeeks = [...weekSecs];
            for (let w = 1; w <= SEMESTER_WEEKS; w++) {
                if (!postedNums.has(w)) allWeeks.push({ num: w, name: 'Week ' + w, files: [], activities: [], upcoming: true });
            }
            allWeeks.sort((a, b) => (a.num || 99) - (b.num || 99));

            // Assignments — mod_assign API + weight from summative section names
            let assignments = [];
            const seenNames = new Set();
            try {
                const aData = await moodleCall('mod_assign_get_assignments', { 'courseids[0]': course.id });
                for (const c of (aData.courses || [])) {
                    for (const a of (c.assignments || [])) {
                        const daysUntil = a.duedate ? Math.ceil((a.duedate - now) / 86400) : null;
                        // Match to summative section to get weight
                        let weight_pct = null, section_title = null;
                        for (const ss of summSecs) {
                            if (ss.activities.some(act => act.name === a.name)) {
                                weight_pct = ss.weight_pct;
                                section_title = ss.name;
                                break;
                            }
                        }
                        assignments.push({
                            id: a.id, title: a.name, weight_pct, section_title,
                            due_date: a.duedate ? new Date(a.duedate * 1000).toISOString().split('T')[0] : null,
                            days_until: daysUntil,
                            grade_scale: a.grade || 100,
                            intro: a.intro ? a.intro.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500) : null,
                            source: 'moodle_assign',
                        });
                        seenNames.add(a.name.toLowerCase());
                    }
                }
            } catch (_) {}
            // Surface any unmatched assessment activities from summative + week sections
            for (const ss of [...summSecs, ...weekSecs]) {
                for (const act of (ss.activities || [])) {
                    if (seenNames.has(act.name.toLowerCase())) continue;
                    assignments.push({
                        id: act.instance_id, title: act.name,
                        weight_pct: summSecs.includes(ss) ? ss.weight_pct : null,
                        section_title: ss.name,
                        due_date: null, days_until: null,
                        grade_scale: 100, intro: null, source: act.type,
                    });
                    seenNames.add(act.name.toLowerCase());
                }
            }
            // Merge known (manual) assessments for modules where Moodle doesn't expose them
            if (KNOWN_ASSESSMENTS[code]) {
                for (const ka of KNOWN_ASSESSMENTS[code]) {
                    if (!seenNames.has(ka.title.toLowerCase())) {
                        assignments.push({ ...ka, section_title: null });
                        seenNames.add(ka.title.toLowerCase());
                    }
                }
            }
            assignments.sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999));

            // Backward-compat: sections = allWeeks
            const sections = allWeeks;

            // Announcements from news forum
            let announcements = [];
            try {
                const forums = await moodleCall('mod_forum_get_forums_by_courses', { 'courseids[0]': course.id });
                const news = (forums || []).find(f => f.type === 'news');
                if (news) {
                    const disc = await moodleCall('mod_forum_get_forum_discussions', { forumid: news.id, page: 0, perpage: 5 });
                    announcements = (disc.discussions || []).map(d => ({
                        subject: d.name,
                        message: d.message ? d.message.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300) : null,
                        date: new Date(d.timemodified * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                    }));
                }
            } catch (_) {}

            // DB record for module id/progress
            const { data: dbMod } = await sb().from('apex_university_modules').select('id,progress').eq('code', code).maybeSingle();

            const cleanName = course.fullname
                .replace(/&amp;/g, '&')
                .replace(new RegExp(code + '\\s*'), '')
                .replace(/ A S\d \d{4}\/\d+$/, '')
                .trim();

            // Weight sum for validation
            const weight_sum = assignments.filter(a => a.weight_pct).reduce((s, a) => s + a.weight_pct, 0);
            modules.push({ code, name: cleanName, moodle_id: course.id, credits: 20, progress: dbMod?.progress || 0, sections, summative_sections: summSecs, assess_info_sections: assessInfoSecs, assignments, announcements, file_count: totalFiles, scanned_count: scannedCount, weight_sum });
        }

        const deadlines = [];
        modules.forEach(m => m.assignments.forEach(a => {
            if (a.due_date && (a.days_until === null || a.days_until >= 0))
                deadlines.push({ ...a, module: m.code });
        }));
        deadlines.sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999));

        const knowledgeGaps = [];
        modules.forEach(m => m.sections.forEach(s => s.files.forEach(f => {
            if (!f.scanned) knowledgeGaps.push({ module: m.code, section: s.name, file: f.name, size_kb: f.size_kb });
        })));

        res.json({ ok: true, modules, deadlines, knowledge_gaps: knowledgeGaps, last_synced: new Date().toISOString() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── File download + text extraction helpers ───────────────────────────────────

function downloadBuffer(rawUrl) {
    return new Promise((resolve, reject) => {
        const token = process.env.MOODLE_TOKEN || '';
        const separator = rawUrl.includes('?') ? '&' : '?';
        const url = `${rawUrl}${separator}token=${token}`;

        function doGet(target, redirects) {
            if (redirects > 5) return reject(new Error('Too many redirects'));
            const parsed = new URL(target);
            const lib = parsed.protocol === 'https:' ? https : http;
            lib.get(target, { headers: { 'User-Agent': 'APEX-AI/1.0' } }, res => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return doGet(res.headers.location, redirects + 1);
                }
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
        }
        doGet(url, 0);
    });
}

async function extractText(buffer, filename) {
    const ext = path.extname(filename).toLowerCase();
    try {
        if (ext === '.pdf') {
            const data = await pdfParse(buffer);
            return data.text || '';
        }
        if (ext === '.pptx' || ext === '.ppt') {
            const zip = await JSZip.loadAsync(buffer);
            const slideFiles = Object.keys(zip.files)
                .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
                .sort();
            const texts = [];
            for (const sf of slideFiles) {
                const xml = await zip.files[sf].async('string');
                const parts = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
                const slideText = parts.map(p => p.replace(/<[^>]+>/g, '')).join(' ').trim();
                if (slideText) texts.push(slideText);
            }
            return texts.join('\n\n');
        }
        if (ext === '.docx' || ext === '.doc') {
            const zip = await JSZip.loadAsync(buffer);
            const xmlFile = zip.files['word/document.xml'];
            if (!xmlFile) return '';
            const xml = await xmlFile.async('string');
            const parts = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
            return parts.map(p => p.replace(/<[^>]+>/g, '')).join(' ').trim();
        }
    } catch (e) {
        console.warn('[moodle] extract failed for', filename, e.message);
    }
    return '';
}

const _ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateNotes(courseCode, filename, rawText) {
    const trimmed = rawText.slice(0, 12000);
    const msg = await _ai.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
            role: 'user',
            content: `You are an academic study assistant helping a Business Finance student at BCU.

Module: ${courseCode}
Source file: ${filename}

Below is the raw extracted text from the file. Produce structured study notes with these sections:
## Key Concepts
## Important Theories / Frameworks
## Key Facts & Figures
## Potential Exam / Essay Questions

Be concise and precise. Only include content relevant to the module. Ignore admin text (referencing guides, navigation, headers/footers).

---
${trimmed}`,
        }],
    });
    return msg.content[0]?.text || '';
}

// Skip files unlikely to contain study content
const SKIP_KEYWORDS = ['referencing', 'harvard', 'template', 'guidance', 'timetable', 'calendar', 'attendance', 'welcome', 'introduction to moodle'];
function isStudyFile(filename) {
    const lower = filename.toLowerCase();
    if (SKIP_KEYWORDS.some(k => lower.includes(k))) return false;
    return /\.(pdf|pptx?|docx?)$/i.test(filename);
}

// ── GET /api/moodle/notes — list stored study notes ──────────────────────────
router.get('/moodle/notes', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_documents')
            .select('id,name,doc_type,content,created_at,updated_at')
            .eq('doc_type', 'moodle_notes')
            .order('updated_at', { ascending: false })
            .limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, notes: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/moodle/files — list available files without scanning ─────────────
router.get('/moodle/files', _auth, async (req, res) => {
    try {
        const courses = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const courseList = courses.courses || [];
        const allFiles = [];
        for (const course of courseList) {
            const code = course.shortname?.match(/[A-Z]{2,4}\d{4}/)?.[0] || course.shortname;
            const sections = await moodleCall('core_course_get_contents', { courseid: course.id });
            for (const section of (sections || [])) {
                for (const mod of (section.modules || [])) {
                    for (const f of (mod.contents || [])) {
                        if (!f.fileurl || !f.filename) continue;
                        allFiles.push({
                            course: code,
                            section: section.name,
                            module: mod.name,
                            filename: f.filename,
                            mimetype: f.mimetype,
                            size_kb: Math.round((f.filesize || 0) / 1024),
                            scannable: isStudyFile(f.filename) && (f.filesize || 0) < 15 * 1024 * 1024,
                            url: f.fileurl,
                        });
                    }
                }
            }
        }
        res.json({ ok: true, files: allFiles });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── POST /api/moodle/scan-content — scan + AI-process module files ────────────
// Body: { courseId? (number), module? (e.g. "FIN6034"), force? (re-scan existing) }
router.post('/moodle/scan-content', _auth, async (req, res) => {
    const { courseId, module: moduleFilter, force = false } = req.body || {};

    try {
        // 1. Get target courses
        const enrolled = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        let courseList = enrolled.courses || [];
        if (courseId) courseList = courseList.filter(c => c.id === parseInt(courseId));
        if (moduleFilter) courseList = courseList.filter(c => c.shortname?.includes(moduleFilter));
        if (!courseList.length) return res.json({ ok: true, message: 'No matching courses', processed: [] });

        // 2. Check which notes already exist (skip unless force=true)
        const { data: existing } = await sb().from('apex_documents')
            .select('name').eq('doc_type', 'moodle_notes');
        const existingNames = new Set((existing || []).map(e => e.name));

        // 3. Respond immediately — scan runs in background, SSE-style progress via DB
        const jobId = `moodle-scan-${Date.now()}`;
        res.json({ ok: true, message: 'Scan started', job_id: jobId, courses: courseList.map(c => c.shortname) });

        // 4. Background scan
        setImmediate(async () => {
            const results = [];
            for (const course of courseList) {
                const code = course.shortname?.match(/[A-Z]{2,4}\d{4}/)?.[0] || course.shortname;
                let sections;
                try { sections = await moodleCall('core_course_get_contents', { courseid: course.id }); }
                catch (e) { console.warn('[moodle scan] contents failed for', code, e.message); continue; }

                for (const section of (sections || [])) {
                    for (const mod of (section.modules || [])) {
                        for (const f of (mod.contents || [])) {
                            if (!f.fileurl || !f.filename) continue;
                            if (!isStudyFile(f.filename)) continue;
                            if ((f.filesize || 0) > 15 * 1024 * 1024) continue;

                            const docName = `${code} — ${f.filename}`;
                            if (!force && existingNames.has(docName)) continue;

                            try {
                                console.log('[moodle scan] downloading', f.filename);
                                const buf = await downloadBuffer(f.fileurl);
                                const text = await extractText(buf, f.filename);
                                if (!text || text.trim().length < 100) continue;

                                console.log('[moodle scan] generating notes for', f.filename);
                                const notes = await generateNotes(code, f.filename, text);
                                if (!notes) continue;

                                await sb().from('apex_documents').upsert({
                                    name:     docName,
                                    doc_type: 'moodle_notes',
                                    content:  notes,
                                    status:   'active',
                                }, { onConflict: 'name' });

                                results.push({ file: f.filename, course: code, status: 'done' });
                                existingNames.add(docName);
                            } catch (e) {
                                console.warn('[moodle scan] failed for', f.filename, e.message);
                                results.push({ file: f.filename, course: code, status: 'error', error: e.message });
                            }
                        }
                    }
                }
            }
            console.log('[moodle scan] complete —', results.length, 'files processed');
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── POST /api/moodle/week-revision — AI revision report for a single week ────
// Body: { moduleCode: "FIN6034", weekNum: 3 }
router.post('/moodle/week-revision', _auth, async (req, res) => {
    const { moduleCode, weekNum } = req.body || {};
    if (!moduleCode || !weekNum) return res.status(400).json({ ok: false, error: 'moduleCode and weekNum required' });

    try {
        // 1. Find course
        const enrolled = await moodleCall('core_course_get_enrolled_courses_by_timeline_classification', {
            classification: 'inprogress', limit: 20, offset: 0
        });
        const course = (enrolled.courses || []).find(c => c.shortname?.includes(moduleCode));
        if (!course) return res.status(404).json({ ok: false, error: `Course ${moduleCode} not found` });

        // 2. Find the week section in course contents
        const rawSections = await moodleCall('core_course_get_contents', { courseid: course.id });
        const weekSec = rawSections.find(s => {
            const m = (s.name || '').match(/week\s*(\d+)/i);
            return m && parseInt(m[1]) === parseInt(weekNum);
        });
        if (!weekSec) return res.json({ ok: false, error: `Week ${weekNum} not yet posted on Moodle` });

        // 3. Collect study files from this section
        const studyFiles = [];
        for (const mod of (weekSec.modules || [])) {
            for (const f of (mod.contents || [])) {
                if (!f.filename || !f.fileurl || !isStudyFile(f.filename)) continue;
                if ((f.filesize || 0) > 15 * 1024 * 1024) continue;
                studyFiles.push(f);
            }
        }
        if (!studyFiles.length) return res.json({ ok: false, error: 'No study files for this week' });

        // 4. Load saved notes or fresh text for each file in parallel
        const noteKeys = studyFiles.map(f => `${moduleCode} — ${f.filename}`);
        const { data: savedNotes } = await sb().from('apex_documents')
            .select('name,content').eq('doc_type', 'moodle_notes').in('name', noteKeys);
        const notesMap = new Map((savedNotes || []).map(n => [n.name, n.content]));

        const parts = await Promise.all(studyFiles.map(async (f) => {
            const key = `${moduleCode} — ${f.filename}`;
            if (notesMap.has(key)) return { filename: f.filename, text: notesMap.get(key), cached: true };
            try {
                const buf = await downloadBuffer(f.fileurl);
                const text = await extractText(buf, f.filename);
                if (text && text.trim().length >= 100) return { filename: f.filename, text: text.slice(0, 8000), cached: false };
            } catch (e) { console.warn('[week-revision] fetch failed:', f.filename, e.message); }
            return null;
        }));
        const validParts = parts.filter(Boolean);
        if (!validParts.length) return res.json({ ok: false, error: 'Could not extract content from files' });

        // 5. Generate revision report
        const combinedText = validParts.map(p => `### ${p.filename}\n${p.text}`).join('\n\n---\n\n');
        const weekName = weekSec.name;

        const msg = await _ai.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2000,
            messages: [{
                role: 'user',
                content: `You are a revision assistant for a Business Finance student at BCU (Birmingham City University).

Module: ${moduleCode}
Week ${weekNum}: ${weekName}
Source files: ${validParts.map(p => p.filename).join(', ')}

Produce a structured REVISION REPORT using exactly these section headings (## heading):

## Overview
2–3 sentences: what this week covers and why it matters in the module context.

## Key Concepts
Bullet list (- item) of the 5–8 most important concepts from this week.

## Frameworks & Theories
Bullet list of any named models/theories/frameworks with a 1-line explanation each. Write "None" if not applicable.

## Key Numbers & Definitions
Bullet list of specific formulas, ratios, figures, or definitions worth memorising. Write "None" if not applicable.

## Exam Questions
3 numbered exam-style questions (1. Question) each followed by a hint line starting with →

Be precise and exam-focused. Omit admin text, navigation, and referencing guides.

---
${combinedText.slice(0, 16000)}`,
            }],
        });

        const report = msg.content[0]?.text || '';
        res.json({
            ok: true,
            report,
            weekName,
            files: validParts.map(p => ({ filename: p.filename, cached: p.cached })),
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
