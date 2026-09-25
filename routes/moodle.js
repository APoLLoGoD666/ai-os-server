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

        for (const course of courseList) {
            const code = course.shortname.match(/[A-Z]{2,4}\d{4}/)[0];

            // Sections + files
            let rawSections = [];
            try { rawSections = await moodleCall('core_course_get_contents', { courseid: course.id }); } catch (_) {}
            const sections = [];
            let totalFiles = 0, scannedCount = 0;
            for (const s of rawSections) {
                const files = [];
                for (const mod of (s.modules || [])) {
                    for (const f of (mod.contents || [])) {
                        if (!f.filename || !f.fileurl || !isStudyFile(f.filename)) continue;
                        if ((f.filesize || 0) > 15 * 1024 * 1024) continue;
                        const scanned = scannedSet.has(f.filename.toLowerCase());
                        files.push({ name: f.filename, size_kb: Math.round((f.filesize || 0) / 1024), scanned, url: f.fileurl });
                        totalFiles++;
                        if (scanned) scannedCount++;
                    }
                }
                if (files.length) sections.push({ name: s.name, files });
            }

            // Assignments
            let assignments = [];
            try {
                const aData = await moodleCall('mod_assign_get_assignments', { 'courseids[0]': course.id });
                for (const c of (aData.courses || [])) {
                    for (const a of (c.assignments || [])) {
                        const daysUntil = a.duedate ? Math.ceil((a.duedate - now) / 86400) : null;
                        assignments.push({
                            id: a.id, title: a.name,
                            due_date: a.duedate ? new Date(a.duedate * 1000).toISOString().split('T')[0] : null,
                            days_until: daysUntil,
                            grade_scale: a.grade || 100,
                            intro: a.intro ? a.intro.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400) : null,
                        });
                    }
                }
                assignments.sort((a, b) => (a.days_until ?? 999) - (b.days_until ?? 999));
            } catch (_) {}

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

            modules.push({ code, name: cleanName, moodle_id: course.id, credits: 20, progress: dbMod?.progress || 0, sections, assignments, announcements, file_count: totalFiles, scanned_count: scannedCount });
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

module.exports = router;
