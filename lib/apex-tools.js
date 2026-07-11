'use strict';
// lib/apex-tools.js — APEX tool implementations and schema for Claude tool_use
// Exports: APEX_TOOLS (schema array), executeApexTool (dispatcher)

const sbAdmin = require('./clients').getSupabaseClient();
const {
    pgListEmailQueue,
    pgListNotifications,
    pgMarkNotificationRead,
    pgSearchDocuments,
    pgListDocuments,
    pgCreateVoiceTask,
    pgListVoiceTasks
} = require('./pg_helpers');
const { checkEmails }                    = require('../agent-system/email_agent');
const { listWorkspaceFiles, readWorkspaceFile } = require('./workspace');
const _gateway                           = require('./memory/gateway');

// ── Tool implementations ──────────────────────────────────────────────────────

async function toolWebSearch(query) {
    try {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY || '' }
        });
        if (!res.ok) {
            // Fallback: use DuckDuckGo instant answer API (no key required)
            const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
            const data = await ddg.json();
            const answer = data.AbstractText || data.Answer || data.RelatedTopics?.[0]?.Text || 'No results found.';
            return { results: [{ title: 'Search result', snippet: answer }] };
        }
        const data = await res.json();
        const results = (data.web?.results || []).slice(0, 3).map(r => ({ title: r.title, snippet: r.description, url: r.url }));
        return { results };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolWeather(location) {
    try {
        const locationKey = location.toLowerCase().trim().replace(/\s+/g, ' ');
        const UK_LOCATIONS = {
            'leamington': { latitude: 52.2920, longitude: -1.5367, name: 'Royal Leamington Spa', country: 'GB' },
            'leamington spa': { latitude: 52.2920, longitude: -1.5367, name: 'Royal Leamington Spa', country: 'GB' },
            'royal leamington spa': { latitude: 52.2920, longitude: -1.5367, name: 'Royal Leamington Spa', country: 'GB' },
            'warwick': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'warwick uk': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'warwickshire': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'warwick warwickshire': { latitude: 52.2853, longitude: -1.5849, name: 'Warwick', country: 'GB' },
            'coventry': { latitude: 52.4081, longitude: -1.5106, name: 'Coventry', country: 'GB' },
            'birmingham': { latitude: 52.4862, longitude: -1.8904, name: 'Birmingham', country: 'GB' },
            'stratford': { latitude: 52.1928, longitude: -1.7077, name: 'Stratford-upon-Avon', country: 'GB' },
            'stratford upon avon': { latitude: 52.1928, longitude: -1.7077, name: 'Stratford-upon-Avon', country: 'GB' },
        };
        let latitude, longitude, name, country;
        if (UK_LOCATIONS[locationKey]) {
            ({ latitude, longitude, name, country } = UK_LOCATIONS[locationKey]);
        } else {
            // Open-Meteo geocoding fallback — no API key required
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (!geoData.results?.length) return { error: 'Location not found' };
            ({ latitude, longitude, name, country } = geoData.results[0]);
        }
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&temperature_unit=celsius&windspeed_unit=mph&timezone=auto`);
        const weatherData = await weatherRes.json();
        const c = weatherData.current;
        const d = weatherData.daily;
        const codes = { 0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast', 45:'Foggy', 48:'Icy fog', 51:'Light drizzle', 61:'Light rain', 63:'Moderate rain', 65:'Heavy rain', 71:'Light snow', 80:'Rain showers', 95:'Thunderstorm' };
        const description = codes[c.weathercode] || `Weather code ${c.weathercode}`;
        const forecast = d ? d.time.slice(0, 3).map((date, i) => ({
            date,
            max_c: d.temperature_2m_max[i],
            min_c: d.temperature_2m_min[i],
            description: codes[d.weathercode[i]] || `Code ${d.weathercode[i]}`,
            rain_chance_pct: d.precipitation_probability_max[i]
        })) : [];
        return {
            location: `${name}, ${country}`,
            temperature_c: c.temperature_2m,
            description,
            wind_mph: c.windspeed_10m,
            humidity_percent: c.relative_humidity_2m,
            forecast_3day: forecast
        };
    } catch (err) {
        return { error: err.message };
    }
}

function toolDateTime() {
    const now = new Date();
    return {
        date: now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        iso: now.toISOString()
    };
}

async function toolListEmails() {
    try {
        const emails = await pgListEmailQueue(10);
        if (!emails || emails.length === 0) return { emails: [], summary: 'No emails in queue.' };
        const summary = emails.map(e =>
            `[${e.priority?.toUpperCase() || 'NORMAL'}] From: ${e.sender} | Subject: ${e.subject} | ${e.summary || ''}`
        ).join('\n');
        return { emails: emails.slice(0, 10), summary };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolCheckEmails() {
    try {
        const count = await checkEmails();
        return { checked: true, new_emails: count, message: `Checked inbox. Found ${count} new message${count !== 1 ? 's' : ''}.` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolGetNotifications(unreadOnly = true) {
    try {
        const all = await pgListNotifications(20);
        const items = unreadOnly ? all.filter(n => !n.read) : all;
        if (!items.length) return { notifications: [], summary: unreadOnly ? 'No unread notifications.' : 'No notifications found.' };
        const summary = items.map(n =>
            `[${n.type.toUpperCase()}] ${n.title}: ${n.message}`
        ).join('\n');
        // Mark all surfaced notifications as read asynchronously
        items.forEach(n => pgMarkNotificationRead(n.id).catch(() => {}));
        return { notifications: items, summary, count: items.length };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolListFiles() {
    try {
        const files = await listWorkspaceFiles();
        const docs = await pgListDocuments().catch(() => []);
        const docNames = docs.map(d => d.filename);
        const allNames = [...new Set([...files, ...docNames])].sort();
        if (!allNames.length) return { files: [], summary: 'No files in workspace.' };
        return { files: allNames, summary: `Workspace contains ${allNames.length} file${allNames.length !== 1 ? 's' : ''}: ${allNames.join(', ')}` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolReadFile(filename) {
    try {
        const file = await readWorkspaceFile(filename);
        if (!file) return { error: `File not found: ${filename}` };
        return { filename: file.filename, content: file.content, summary: `Contents of ${file.filename}: ${file.content.slice(0, 500)}` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolSearchDocuments(keyword) {
    try {
        const docs = await pgSearchDocuments(keyword.toLowerCase()).catch(() => []);
        if (!docs.length) return { results: [], summary: `No documents found matching "${keyword}".` };
        const summary = docs.map(d => `${d.filename}: ${d.summary || d.content?.slice(0, 100) || 'No preview'}`).join('\n');
        return { results: docs, summary };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolCreateTask(description) {
    try {
        const task = await pgCreateVoiceTask(description);
        return { ok: true, task_id: task.id, message: `Task saved: "${description}"` };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolListTasks() {
    try {
        const tasks = await pgListVoiceTasks();
        if (!tasks.length) return { tasks: [], summary: 'No pending tasks or reminders.' };
        const summary = tasks.map((t, i) => `${i + 1}. ${t.goal}`).join('\n');
        return { tasks, summary, count: tasks.length };
    } catch (err) {
        return { error: err.message };
    }
}

async function toolGetNews(category) {
    try {
        let query = sbAdmin.from('apex_news_cache')
            .select('title,source,category,url,summary,published_at')
            .order('published_at', { ascending: false })
            .limit(8);
        if (category) query = query.eq('category', category);
        const { data, error } = await query;
        if (error || !data || !data.length) {
            return { articles: [], summary: 'No news articles available. News feed may not have run yet.' };
        }
        const summary = data.map(a =>
            `[${a.category?.toUpperCase() || 'NEWS'}] ${a.title} (${a.source})`
        ).join('\n');
        return { articles: data, summary, count: data.length };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetCalendarEvents(days = 7) {
    try {
        const today   = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + Math.min(days, 30) * 86400000).toISOString().split('T')[0];
        const { data, error } = await sbAdmin
            .from('apex_calendar_events')
            .select('title,event_date,start_time,end_time,all_day,location')
            .gte('event_date', today)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true })
            .limit(20);
        if (error || !data || !data.length) {
            return { events: [], summary: 'No upcoming calendar events found.' };
        }
        const summary = data.map(ev => {
            const time = ev.all_day ? 'All day' : (ev.start_time ? new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
            return `${ev.event_date} ${time}: ${ev.title}${ev.location ? ' @ ' + ev.location : ''}`;
        }).join('\n');
        return { events: data, summary, count: data.length };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetFinanceSummary() {
    try {
        const [invoices, expenses, subscriptions] = await Promise.all([
            sbAdmin.from('apex_invoices').select('client_name,amount,status,due_date').order('created_at', { ascending: false }).limit(5),
            sbAdmin.from('apex_transactions').select('description,amount,category,date').eq('type', 'expense').order('date', { ascending: false }).limit(10),
            sbAdmin.from('apex_subscriptions').select('name,amount,billing_cycle').eq('active', true).limit(10),
        ]);
        const parts = [];
        if (invoices.data?.length) {
            const outstanding = invoices.data.filter(i => i.status !== 'paid');
            parts.push(`Outstanding invoices: ${outstanding.length} totalling £${outstanding.reduce((s, i) => s + (Number(i.amount) || 0), 0).toFixed(2)}`);
        }
        if (expenses.data?.length) {
            const total = expenses.data.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            parts.push(`Recent expenses: ${expenses.data.length} transactions, £${total.toFixed(2)} total`);
            const top = expenses.data.slice(0, 3).map(e => `${e.description} £${Number(e.amount).toFixed(2)}`).join(', ');
            parts.push(`Latest: ${top}`);
        }
        if (subscriptions.data?.length) {
            const monthly = subscriptions.data.filter(s => s.billing_cycle === 'monthly').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            parts.push(`Monthly subscriptions: £${monthly.toFixed(2)}/mo across ${subscriptions.data.length} services`);
        }
        const summary = parts.length ? parts.join('. ') : 'No financial data available yet.';
        return { summary, invoices: invoices.data || [], expenses: expenses.data || [], subscriptions: subscriptions.data || [] };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetHealthSummary() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const week  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const [workouts, nutrition, sleep, mood] = await Promise.all([
            sbAdmin.from('apex_workouts').select('type,duration_min,calories_burned,date').gte('date', week).order('date', { ascending: false }).limit(5),
            sbAdmin.from('apex_nutrition_log').select('food_name,calories,protein_g,carbs_g,fat_g').eq('date', today).limit(100),
            sbAdmin.from('apex_sleep_log').select('date,duration_h,quality_score').order('date', { ascending: false }).limit(3),
            sbAdmin.from('apex_mood_log').select('date,score,notes').order('date', { ascending: false }).limit(1),
        ]);
        const parts = [];
        if (workouts.data?.length) {
            parts.push(`${workouts.data.length} workouts this week — latest: ${workouts.data[0].type} (${workouts.data[0].duration_min}min)`);
        } else {
            parts.push('No workouts logged this week');
        }
        if (nutrition.data?.length) {
            const cals = nutrition.data.reduce((s, n) => s + (Number(n.calories) || 0), 0);
            const prot = nutrition.data.reduce((s, n) => s + (Number(n.protein_g) || 0), 0);
            parts.push(`Today: ${Math.round(cals)} kcal, ${Math.round(prot)}g protein`);
        } else {
            parts.push('No nutrition logged today');
        }
        if (sleep.data?.length) {
            const s = sleep.data[0];
            parts.push(`Last sleep: ${s.duration_h}h${s.quality_score ? ', quality ' + s.quality_score + '/10' : ''}`);
        }
        if (mood.data?.length) {
            parts.push(`Current mood: ${mood.data[0].score}/10${mood.data[0].notes ? ' — ' + mood.data[0].notes : ''}`);
        }
        const summary = parts.join('. ');
        return { summary, workouts: workouts.data || [], nutrition: nutrition.data || [], sleep: sleep.data || [], mood: mood.data || [] };
    } catch (e) {
        return { error: e.message };
    }
}

async function toolGetRelationshipSummary() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const week  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const [people, overdue, recent] = await Promise.all([
            sbAdmin.from('apex_people').select('id', { count: 'exact', head: true }),
            sbAdmin.from('apex_follow_ups').select('note,due_date').eq('completed', false).lt('due_date', today).order('due_date', { ascending: true }).limit(5),
            sbAdmin.from('apex_interactions').select('id', { count: 'exact', head: true }).gte('interaction_date', week),
        ]);
        const parts = [];
        if (people.count) parts.push(`${people.count} people tracked`);
        if (overdue.data?.length) parts.push(`${overdue.data.length} overdue follow-up${overdue.data.length !== 1 ? 's' : ''} — next: ${overdue.data[0].note}`);
        else parts.push('No overdue follow-ups');
        if (recent.count) parts.push(`${recent.count} interaction${recent.count !== 1 ? 's' : ''} this week`);
        return { summary: parts.join('. ') || 'No relationship data yet.', overdue: overdue.data || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolGetTravelSummary() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: trips } = await sbAdmin.from('apex_trips').select('name,destination,start_date,end_date,status,budget_gbp')
            .in('status', ['planned', 'booked', 'active']).gte('end_date', today).order('start_date', { ascending: true }).limit(5);
        const parts = [];
        if (trips?.length) {
            const next = trips[0];
            parts.push(`Next trip: ${next.name}${next.destination ? ' to ' + next.destination : ''} (${next.start_date})`);
            if (trips.length > 1) parts.push(`${trips.length} upcoming trips total`);
        } else {
            parts.push('No upcoming trips');
        }
        return { summary: parts.join('. '), trips: trips || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolGetPropertySummary() {
    try {
        const [props, maintenance] = await Promise.all([
            sbAdmin.from('apex_properties').select('name,type,monthly_cost_gbp,lease_end_date').limit(10),
            sbAdmin.from('apex_maintenance_items').select('description,status,scheduled_date').in('status', ['pending', 'scheduled']).limit(5),
        ]);
        const parts = [];
        if (props.data?.length) {
            const monthly = props.data.reduce((s, p) => s + (Number(p.monthly_cost_gbp) || 0), 0);
            parts.push(`${props.data.length} propert${props.data.length !== 1 ? 'ies' : 'y'}, \xA3${monthly.toFixed(2)}/mo total`);
        }
        if (maintenance.data?.length) parts.push(`${maintenance.data.length} pending maintenance item${maintenance.data.length !== 1 ? 's' : ''}`);
        else parts.push('No pending maintenance');
        return { summary: parts.join('. ') || 'No property data yet.', properties: props.data || [], maintenance: maintenance.data || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolGetLegalSummary() {
    try {
        const soon = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
        const [contracts, deadlines] = await Promise.all([
            sbAdmin.from('apex_contracts').select('title,counterparty,type,end_date,status').eq('status', 'active').order('end_date', { ascending: true }).limit(10),
            sbAdmin.from('apex_legal_deadlines').select('description,due_date').eq('completed', false).lte('due_date', soon).order('due_date', { ascending: true }).limit(5),
        ]);
        const parts = [];
        if (contracts.data?.length) parts.push(`${contracts.data.length} active contract${contracts.data.length !== 1 ? 's' : ''}`);
        if (deadlines.data?.length) parts.push(`${deadlines.data.length} deadline${deadlines.data.length !== 1 ? 's' : ''} in next 30 days — next: ${deadlines.data[0].description} (${deadlines.data[0].due_date})`);
        else parts.push('No upcoming deadlines');
        return { summary: parts.join('. ') || 'No legal data yet.', contracts: contracts.data || [], deadlines: deadlines.data || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolGetCareerSummary() {
    try {
        const now = new Date().toISOString();
        const [apps, interviews, skills] = await Promise.all([
            sbAdmin.from('apex_job_applications').select('company,role,status').not('status', 'in', '("rejected","accepted","withdrawn")').order('applied_date', { ascending: false }).limit(10),
            sbAdmin.from('apex_interviews').select('type,interview_date').gte('interview_date', now).order('interview_date', { ascending: true }).limit(5),
            sbAdmin.from('apex_skills').select('id', { count: 'exact', head: true }),
        ]);
        const parts = [];
        if (apps.data?.length) {
            const statusMap = apps.data.reduce((m, a) => { m[a.status] = (m[a.status] || 0) + 1; return m; }, {});
            parts.push(`${apps.data.length} active application${apps.data.length !== 1 ? 's' : ''}: ${Object.entries(statusMap).map(([s, n]) => `${n} ${s}`).join(', ')}`);
        } else {
            parts.push('No active applications');
        }
        if (interviews.data?.length) parts.push(`${interviews.data.length} upcoming interview${interviews.data.length !== 1 ? 's' : ''}`);
        if (skills.count) parts.push(`${skills.count} skill${skills.count !== 1 ? 's' : ''} in inventory`);
        return { summary: parts.join('. ') || 'No career data yet.', applications: apps.data || [], interviews: interviews.data || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolGetShoppingSummary() {
    try {
        const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const [wishlist, purchases] = await Promise.all([
            sbAdmin.from('apex_wishlist').select('name,price_target_gbp,priority').eq('purchased', false).order('priority', { ascending: false }).limit(10),
            sbAdmin.from('apex_purchases').select('name,amount_gbp').gte('purchase_date', since).limit(20),
        ]);
        const parts = [];
        if (wishlist.data?.length) {
            const total = wishlist.data.reduce((s, w) => s + (Number(w.price_target_gbp) || 0), 0);
            parts.push(`${wishlist.data.length} wishlist item${wishlist.data.length !== 1 ? 's' : ''}${total ? ', \xA3' + total.toFixed(2) + ' total target' : ''}`);
        } else {
            parts.push('Wishlist empty');
        }
        if (purchases.data?.length) {
            const spent = purchases.data.reduce((s, p) => s + (Number(p.amount_gbp) || 0), 0);
            parts.push(`\xA3${spent.toFixed(2)} spent in last 30 days`);
        }
        return { summary: parts.join('. ') || 'No shopping data yet.', wishlist: wishlist.data || [], purchases: purchases.data || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolGetSocialSummary() {
    try {
        const [accounts, scheduled] = await Promise.all([
            sbAdmin.from('apex_social_accounts').select('platform,username,status').eq('status', 'active').limit(20),
            sbAdmin.from('apex_social_posts').select('platform,content,scheduled_at').eq('status', 'scheduled').order('scheduled_at', { ascending: true }).limit(5),
        ]);
        const parts = [];
        if (accounts.data?.length) parts.push(`${accounts.data.length} active account${accounts.data.length !== 1 ? 's' : ''}: ${accounts.data.map(a => a.platform).join(', ')}`);
        else parts.push('No social accounts connected');
        if (scheduled.data?.length) parts.push(`${scheduled.data.length} post${scheduled.data.length !== 1 ? 's' : ''} scheduled`);
        return { summary: parts.join('. ') || 'No social data yet.', accounts: accounts.data || [], scheduled: scheduled.data || [] };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserResearch(objective, url) {
    try {
        const ba = require('../agent-system/browser-agent');
        const result = await ba.research(objective, url || null, { maxPages: 3 });
        return { summary: result.summary, pages: result.pages?.length || 0, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserScreenshot(url) {
    try {
        const ba = require('../agent-system/browser-agent');
        const outPath = `/tmp/screenshot-${Date.now()}.png`;
        const result = await ba.screenshot(url, outPath);
        return { path: result.path || outPath, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserPdf(url) {
    try {
        const ba = require('../agent-system/browser-agent');
        const result = await ba.generatePDF(url, { outputPath: `/tmp/page-${Date.now()}.pdf` });
        return { path: result.path, success: result.success };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserScrape(url) {
    try {
        const ba = require('../agent-system/browser-agent');
        const browser = await ba.createBrowser();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const data = await ba.extractStructuredData(page);
        await browser.close();
        return { ...data, success: true };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserFillForm(url, fields, submitSelector) {
    try {
        const ba = require('../agent-system/browser-agent');
        const result = await ba.fillForm(url, fields, submitSelector || null);
        return { success: result.success, message: result.message };
    } catch (e) { return { error: e.message }; }
}

async function toolBrowserClick(url, selector) {
    try {
        const ba = require('../agent-system/browser-agent');
        const result = await ba.clickAndExtract(url, selector);
        return { content: result.content, success: result.success };
    } catch (e) { return { error: e.message }; }
}

// ── Tool schema ───────────────────────────────────────────────────────────────

const APEX_TOOLS = [
    {
        name: 'web_search',
        description: 'Search the web for current information, news, facts, or anything that requires up-to-date knowledge. Use this when asked about recent events, specific facts, or anything you are uncertain about.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'The search query' }
            },
            required: ['query']
        }
    },
    {
        name: 'get_weather',
        description: 'Get the current weather for any location. Use when asked about weather, temperature, or conditions anywhere.',
        input_schema: {
            type: 'object',
            properties: {
                location: { type: 'string', description: 'City name or location, e.g. "Leamington Spa" or "London"' }
            },
            required: ['location']
        }
    },
    {
        name: 'get_datetime',
        description: 'Get the current date and time. Use when asked what time or date it is.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'list_emails',
        description: 'List the current email queue — subjects, senders, summaries, and priorities. Use when asked about emails, inbox, messages, or what emails are waiting.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'check_emails',
        description: 'Fetch new emails from Gmail right now and process them. Use when asked to check email, refresh inbox, or get latest messages.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'get_notifications',
        description: 'Get recent alerts, notifications, and proactive messages from Apex — including routine briefings, email alerts, and system notifications. Use when asked about alerts, notifications, updates, briefings, or what Apex has flagged.',
        input_schema: {
            type: 'object',
            properties: {
                unread_only: {
                    type: 'boolean',
                    description: 'If true, return only unread notifications. Defaults to true.'
                }
            },
            required: []
        }
    },
    {
        name: 'list_files',
        description: 'List all files and documents in the workspace. Use when asked what files exist, what documents are saved, or what is in the workspace.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'read_file',
        description: 'Read the contents of a specific file from the workspace by filename. Use when asked to read, open, or show the contents of a file or document.',
        input_schema: {
            type: 'object',
            properties: {
                filename: { type: 'string', description: 'The filename to read.' }
            },
            required: ['filename']
        }
    },
    {
        name: 'search_documents',
        description: 'Search saved documents and workspace files by keyword. Use when asked to find, search, or look for documents containing specific content.',
        input_schema: {
            type: 'object',
            properties: {
                keyword: { type: 'string', description: 'Keyword to search for.' }
            },
            required: ['keyword']
        }
    },
    {
        name: 'create_task',
        description: 'Save a task or reminder when Alex asks you to remember something, follow up on something, or do something later. Use for any "remind me", "remember to", "follow up on", or "make a note" requests.',
        input_schema: {
            type: 'object',
            properties: {
                description: { type: 'string', description: 'What to remember or follow up on.' }
            },
            required: ['description']
        }
    },
    {
        name: 'list_tasks',
        description: 'Read back all pending tasks and reminders Alex has asked Apex to track. Use when asked what tasks are pending, what to follow up on, or what reminders exist.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_news',
        description: 'Get the latest news headlines. Use when asked about news, current events, what is happening in the world, or headlines.',
        input_schema: {
            type: 'object',
            properties: {
                category: { type: 'string', description: 'Filter by category: uk, world, business, technology, science. Omit for all.' }
            },
            required: []
        }
    },
    {
        name: 'get_calendar_events',
        description: 'Get upcoming calendar events. Use when asked about schedule, meetings, appointments, what is on today or this week.',
        input_schema: {
            type: 'object',
            properties: {
                days: { type: 'number', description: 'How many days ahead to look. Defaults to 7.' }
            },
            required: []
        }
    },
    {
        name: 'get_finance_summary',
        description: 'Get a finance summary: recent transactions, invoices, subscriptions, and current month spending. Use when asked about money, spending, finances, budget, or cash flow.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_health_summary',
        description: 'Get a health summary: recent workouts, nutrition today, sleep data, and mood. Use when asked about health, fitness, workouts, calories, sleep, or wellbeing.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_relationship_summary',
        description: 'Get a relationships summary: people tracked, overdue follow-ups, and recent interactions. Use when asked about relationships, contacts, who to follow up with, or social life.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_travel_summary',
        description: 'Get a travel summary: upcoming and active trips, itinerary, and spend vs budget. Use when asked about travel, trips, holidays, flights, or travel plans.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_property_summary',
        description: 'Get a property summary: properties, monthly housing costs, and pending maintenance items. Use when asked about property, housing, rent, mortgage, maintenance, or home.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_legal_summary',
        description: 'Get a legal summary: active contracts and upcoming legal deadlines. Use when asked about contracts, legal documents, agreements, or legal deadlines.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_career_summary',
        description: 'Get a career summary: job applications by status, upcoming interviews, and skills inventory. Use when asked about career, job search, applications, interviews, or skills.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_shopping_summary',
        description: 'Get a shopping summary: wishlist items and recent purchases. Use when asked about shopping, wishlist, what to buy, spending, or recent purchases.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_social_summary',
        description: 'Get a social media summary: connected accounts and scheduled or recent posts. Use when asked about social media, posts, content, schedule, or social accounts.',
        input_schema: { type: 'object', properties: {}, required: [] }
    }
];

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function executeApexTool(name, input) {
    if (name === 'web_search') {
        const _wsResult = await toolWebSearch(input.query);
        if (_wsResult?.results?.length) {
            setImmediate(() => {
                const _imp = require('./memory/importance-engine');
                const content = `Web search: ${input.query}. Results: ${_wsResult.results.map(r => r.title + ': ' + r.snippet).join(' | ').slice(0, 500)}`;
                const { classification } = _imp.score(content, { source: 'browser_research' }); // reuse browser_research base score
                if (classification !== 'IGNORE' && classification !== 'SHORT_TERM') {
                    _gateway.storeMemory({ layer: 9, source: 'web_search', content, tags: ['search', 'research'], requestingEntity: 'tool', taskId: null }).catch(() => {});
                }
            });
        }
        return _wsResult;
    }
    if (name === 'get_weather') return await toolWeather(input.location);
    if (name === 'get_datetime') return toolDateTime();
    if (name === 'list_emails') {
        const _leResult = await toolListEmails();
        if (_leResult?.emails?.length) {
            setImmediate(() => {
                const _imp = require('./memory/importance-engine');
                for (const em of _leResult.emails.slice(0, 5)) {
                    if (!em.sender && !em.subject) continue;
                    const content = `Email — From: ${em.sender || 'unknown'} | Subject: ${em.subject || '(no subject)'} | ${(em.summary || '').slice(0, 200)}`;
                    const { classification } = _imp.score(content, { source: 'email' });
                    if (classification !== 'IGNORE' && classification !== 'SHORT_TERM') {
                        _gateway.storeMemory({ layer: 9, source: 'email', content, tags: ['email', 'communication', em.priority?.toLowerCase() || 'normal'], requestingEntity: 'tool', taskId: null }).catch(() => {});
                    }
                }
            });
        }
        return _leResult;
    }
    if (name === 'check_emails') return await toolCheckEmails();
    if (name === 'get_notifications') return await toolGetNotifications(input.unread_only !== false);
    if (name === 'list_files') return await toolListFiles();
    if (name === 'read_file') return await toolReadFile(input.filename);
    if (name === 'search_documents') return await toolSearchDocuments(input.keyword);
    if (name === 'create_task') return await toolCreateTask(input.description);
    if (name === 'list_tasks') return await toolListTasks();
    if (name === 'get_news') return await toolGetNews(input.category);
    if (name === 'get_calendar_events') return await toolGetCalendarEvents(input.days || 7);
    if (name === 'get_finance_summary') {
        const _fsResult = await toolGetFinanceSummary();
        if (_fsResult?.summary && !_fsResult.error) {
            setImmediate(() => _gateway.storeMemory({ layer: 9, source: 'finance_summary', content: `Finance status: ${_fsResult.summary}`, tags: ['finance'], requestingEntity: 'tool', taskId: null }).catch(() => {}));
        }
        return _fsResult;
    }
    if (name === 'get_health_summary') {
        const _hsResult = await toolGetHealthSummary();
        if (_hsResult?.summary && !_hsResult.error) {
            setImmediate(() => _gateway.storeMemory({ layer: 9, source: 'health_summary', content: `Health status: ${_hsResult.summary}`, tags: ['health'], requestingEntity: 'tool', taskId: null }).catch(() => {}));
        }
        return _hsResult;
    }
    if (name === 'get_relationship_summary') return await toolGetRelationshipSummary();
    if (name === 'get_travel_summary') return await toolGetTravelSummary();
    if (name === 'get_property_summary') return await toolGetPropertySummary();
    if (name === 'get_legal_summary') return await toolGetLegalSummary();
    if (name === 'get_career_summary') return await toolGetCareerSummary();
    if (name === 'get_shopping_summary') return await toolGetShoppingSummary();
    if (name === 'get_social_summary') return await toolGetSocialSummary();
    if (name === 'browser_research') {
        const _brResult = await toolBrowserResearch(input.objective, input.url);
        if (_brResult && !_brResult.error) {
            setImmediate(() => {
                const _imp = require('./memory/importance-engine');
                const content = `Research: ${input.objective || ''}. ${JSON.stringify(_brResult).slice(0, 600)}`;
                const { classification } = _imp.score(content, { source: 'browser_research' });
                if (classification === 'IGNORE') return;
                const layer = _imp.recommendLayer('browser_research', classification);
                if (layer) _gateway.storeMemory({ layer, source: 'browser_research', content, tags: ['research', 'browser'], requestingEntity: 'tool', taskId: null }).catch(() => {});
            });
        }
        return _brResult;
    }
    if (name === 'browser_screenshot') return await toolBrowserScreenshot(input.url);
    if (name === 'browser_pdf') return await toolBrowserPdf(input.url);
    if (name === 'browser_scrape') return await toolBrowserScrape(input.url);
    if (name === 'browser_fill_form') return await toolBrowserFillForm(input.url, input.fields, input.submit_selector);
    if (name === 'browser_click') return await toolBrowserClick(input.url, input.selector);
    return { error: 'Unknown tool' };
}

module.exports = { APEX_TOOLS, executeApexTool };
