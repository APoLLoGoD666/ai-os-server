'use strict';
// Patch all unscoped personal-data routes with human_id filtering.
const fs   = require('fs');
const path = require('path');

const R = path.join(__dirname, '..', 'routes');

const HELPER = `
function _scope(q, req) {
    const hid = req.identity?.humanId || null;
    return hid ? q.or(\`human_id.eq.\${hid},human_id.is.null\`) : q;
}
`;

// After this anchor we inject the helper
const ANCHOR = 'const sb = getSupabaseClient;';

// For each file: list of [oldStr, newStr] pairs (exact string replacements)
const PATCHES = {

'health.js': [
    // GET workouts — add scope + human_id on insert
    [
        `const { data, error } = await sb().from('apex_workouts').select('workout_date,type,duration_minutes,notes').gte('workout_date', since).order('workout_date', { ascending: true }).limit(200);`,
        `const { data, error } = await _scope(sb().from('apex_workouts').select('workout_date,type,duration_minutes,notes').gte('workout_date', since).order('workout_date', { ascending: true }).limit(200), req);`
    ],
    [   // POST workouts insert — stamp human_id
        `workout_date: workout_date || new Date().toISOString().split('T')[0]`,
        `workout_date: workout_date || new Date().toISOString().split('T')[0],\n            human_id: req.identity?.humanId || null`
    ],
    // GET nutrition
    [
        `const { data, error } = await sb().from('apex_nutrition_log').select('*').eq('log_date', today).order('created_at', { ascending: true });`,
        `const { data, error } = await _scope(sb().from('apex_nutrition_log').select('*').eq('log_date', today).order('created_at', { ascending: true }), req);`
    ],
    // GET sleep
    [
        `const { data, error } = await sb().from('apex_sleep_log').select('sleep_date,bedtime,wake_time,quality,duration_hours,notes').order('sleep_date', { ascending: false }).limit(30);`,
        `const { data, error } = await _scope(sb().from('apex_sleep_log').select('sleep_date,bedtime,wake_time,quality,duration_hours,notes').order('sleep_date', { ascending: false }).limit(30), req);`
    ],
],

'nutrition.js': [
    // GET nutrition log
    [
        `let q = sb().from('apex_nutrition_log').select('*')`,
        `let q = _scope(sb().from('apex_nutrition_log').select('*'), req)`
    ],
    // GET body measurements
    [
        `sb().from('apex_body_measurements')`,
        `_scope(sb().from('apex_body_measurements'), req)`
    ],
],

'social.js': [
    [
        `sb().from('apex_social_accounts').select(`,
        `_scope(sb().from('apex_social_accounts').select(`
    ],
    [
        `sb().from('apex_social_posts').select(`,
        `_scope(sb().from('apex_social_posts').select(`
    ],
],

'shopping.js': [
    [
        `sb().from('apex_wishlist').select(`,
        `_scope(sb().from('apex_wishlist').select(`
    ],
    [
        `sb().from('apex_purchases').select(`,
        `_scope(sb().from('apex_purchases').select(`
    ],
],

'wealth.js': [
    [
        `sb().from('apex_finance_entries').select(`,
        `_scope(sb().from('apex_finance_entries').select(`
    ],
    [
        `sb().from('apex_net_worth_snapshot').select(`,
        `_scope(sb().from('apex_net_worth_snapshot').select(`
    ],
],

'relationships.js': [
    [
        `sb().from('apex_people').select(`,
        `_scope(sb().from('apex_people').select(`
    ],
    [
        `sb().from('apex_interactions').select(`,
        `_scope(sb().from('apex_interactions').select(`
    ],
    [
        `sb().from('apex_follow_ups').select(`,
        `_scope(sb().from('apex_follow_ups').select(`
    ],
],

'legal.js': [
    [
        `sb().from('apex_contracts').select(`,
        `_scope(sb().from('apex_contracts').select(`
    ],
    [
        `sb().from('apex_legal_deadlines').select(`,
        `_scope(sb().from('apex_legal_deadlines').select(`
    ],
],

'career.js': [
    [
        `sb().from('apex_job_applications').select(`,
        `_scope(sb().from('apex_job_applications').select(`
    ],
    [
        `sb().from('apex_interviews').select(`,
        `_scope(sb().from('apex_interviews').select(`
    ],
    [
        `sb().from('apex_skills').select(`,
        `_scope(sb().from('apex_skills').select(`
    ],
],

'property.js': [
    [
        `sb().from('apex_properties').select(`,
        `_scope(sb().from('apex_properties').select(`
    ],
    [
        `sb().from('apex_property_expenses').select(`,
        `_scope(sb().from('apex_property_expenses').select(`
    ],
    [
        `sb().from('apex_maintenance_items').select(`,
        `_scope(sb().from('apex_maintenance_items').select(`
    ],
],

'spiritual.js': [
    [
        `sb().from('apex_spiritual_sessions').select(`,
        `_scope(sb().from('apex_spiritual_sessions').select(`
    ],
],

'travel.js': [
    [
        `sb().from('apex_trips').select(`,
        `_scope(sb().from('apex_trips').select(`
    ],
    [
        `sb().from('apex_trip_expenses').select(`,
        `_scope(sb().from('apex_trip_expenses').select(`
    ],
    [
        `sb().from('apex_itinerary_items').select(`,
        `_scope(sb().from('apex_itinerary_items').select(`
    ],
],

};

let totalFiles = 0;
for (const [fname, patches] of Object.entries(PATCHES)) {
    const fpath = path.join(R, fname);
    if (!fs.existsSync(fpath)) { console.log(`SKIP (missing): ${fname}`); continue; }
    let src = fs.readFileSync(fpath, 'utf8');

    // Inject helper if not already present
    if (!src.includes('function _scope(')) {
        if (src.includes(ANCHOR)) {
            src = src.replace(ANCHOR, ANCHOR + HELPER);
        } else {
            src = HELPER + src;
        }
    }

    let changed = 0;
    for (const [oldStr, newStr] of patches) {
        if (src.includes(oldStr)) {
            src = src.replace(oldStr, newStr);
            changed++;
        } else {
            console.log(`  WARN ${fname}: pattern not found — "${oldStr.slice(0, 60)}"`);
        }
    }

    fs.writeFileSync(fpath, src, 'utf8');
    console.log(`PATCHED ${fname} (${changed}/${patches.length} replacements)`);
    totalFiles++;
}

console.log(`\nDone. ${totalFiles} files patched.`);
