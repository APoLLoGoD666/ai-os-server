'use strict';
// Telemetry write layer for APEX agents.
// Agents call writeRecord() to log data to any personal-data table.
// human_id is always stamped from the caller context — agents cannot spoof it.
const { getSupabaseClient } = require('./clients');

// Whitelist of tables agents are allowed to write to.
const WRITABLE_TABLES = new Set([
    'apex_workouts',
    'apex_nutrition_log',
    'apex_sleep_log',
    'apex_mood_log',
    'apex_body_measurements',
    'apex_supplement_log',
    'apex_finance_entries',
    'apex_social_accounts',
    'apex_social_posts',
    'apex_wishlist',
    'apex_purchases',
    'apex_people',
    'apex_interactions',
    'apex_follow_ups',
    'apex_contracts',
    'apex_legal_deadlines',
    'apex_job_applications',
    'apex_interviews',
    'apex_skills',
    'apex_properties',
    'apex_property_expenses',
    'apex_maintenance_items',
    'apex_spiritual_sessions',
    'apex_trips',
    'apex_trip_expenses',
    'apex_itinerary_items',
    'apex_net_worth_snapshot',
    'apex_journal_entries',
    'apex_study_sessions',
    'apex_flashcards',
    'apex_notifications',
]);

// Write a single record to a whitelisted table, stamping human_id.
// Returns the inserted row or throws.
async function writeRecord(table, data, humanId) {
    if (!WRITABLE_TABLES.has(table)) {
        throw new Error(`Table "${table}" is not in the agent telemetry whitelist.`);
    }
    const sb = getSupabaseClient();
    const row = { ...data, human_id: humanId || null };
    const { data: result, error } = await sb.from(table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return result;
}

// Read the most recent N rows from a whitelisted table for a given humanId.
async function readRecent(table, humanId, { limit = 10, orderBy = 'created_at' } = {}) {
    if (!WRITABLE_TABLES.has(table)) {
        throw new Error(`Table "${table}" is not in the agent telemetry whitelist.`);
    }
    const sb = getSupabaseClient();
    let q = sb.from(table).select('*').order(orderBy, { ascending: false }).limit(limit);
    if (humanId) q = q.or(`human_id.eq.${humanId},human_id.is.null`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
}

// Claude tool definition — pass this in tools[] when calling the Anthropic API.
const TELEMETRY_TOOL = {
    name: 'write_telemetry',
    description: [
        'Write a record to a personal data table in the APEX database.',
        'human_id is stamped automatically from the active user context — do not include it in data.',
        `Writable tables: ${[...WRITABLE_TABLES].join(', ')}.`,
        'Use read_telemetry first if you need to check existing data before writing.',
    ].join(' '),
    input_schema: {
        type: 'object',
        properties: {
            table: {
                type: 'string',
                description: 'Name of the table to insert into (must be in the whitelist).',
            },
            data: {
                type: 'object',
                description: 'Fields for the new row. Do not include human_id — it is added automatically.',
            },
        },
        required: ['table', 'data'],
    },
};

const READ_TELEMETRY_TOOL = {
    name: 'read_telemetry',
    description: 'Read recent rows from a personal data table scoped to the active user.',
    input_schema: {
        type: 'object',
        properties: {
            table:   { type: 'string',  description: 'Table name (must be in the whitelist).' },
            limit:   { type: 'integer', description: 'Max rows to return (default 10).', default: 10 },
            orderBy: { type: 'string',  description: 'Column to order by descending (default created_at).', default: 'created_at' },
        },
        required: ['table'],
    },
};

module.exports = { writeRecord, readRecent, WRITABLE_TABLES, TELEMETRY_TOOL, READ_TELEMETRY_TOOL };
