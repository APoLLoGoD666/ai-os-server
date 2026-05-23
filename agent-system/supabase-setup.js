"use strict";
const https = require('https');

const PROJECT_ID = 'devmtexqjstappalqbeg';
const SUPABASE_URL = process.env.SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// ── Run SQL via Supabase Management API ──────────────────────────
async function runSQL(sql) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query: sql });
        const options = {
            hostname: 'api.supabase.com',
            path: `/v1/projects/${PROJECT_ID}/database/query`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(d);
                    if (res.statusCode >= 400) {
                        reject(new Error(`Supabase API error ${res.statusCode}: ${JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${d}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Create all tables for all 109 roadmap features ───────────────
async function createAllTables() {
    const tables = [
        // Communications
        `CREATE TABLE IF NOT EXISTS email_threads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, subject TEXT, sender TEXT, recipient TEXT,
            body TEXT, summary TEXT, action_required BOOLEAN DEFAULT FALSE,
            thread_id TEXT, labels TEXT[], created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, name TEXT, email TEXT, phone TEXT,
            company TEXT, last_contacted TIMESTAMPTZ, follow_up_date TIMESTAMPTZ,
            notes TEXT, tags TEXT[], created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS calendar_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, description TEXT,
            start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
            location TEXT, attendees TEXT[], google_event_id TEXT,
            prep_brief TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS meeting_summaries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, meeting_title TEXT, date TIMESTAMPTZ,
            attendees TEXT[], summary TEXT, action_points JSONB DEFAULT '[]',
            follow_ups JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS reminders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, body TEXT, due_at TIMESTAMPTZ,
            type TEXT, recurring TEXT, completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // Finance & Wealth
        `CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, amount DECIMAL, currency TEXT DEFAULT 'GBP',
            description TEXT, category TEXT, merchant TEXT,
            date TIMESTAMPTZ, account TEXT, type TEXT,
            receipt_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, client_name TEXT, client_email TEXT,
            amount DECIMAL, currency TEXT DEFAULT 'GBP', status TEXT DEFAULT 'draft',
            due_date TIMESTAMPTZ, items JSONB DEFAULT '[]', notes TEXT,
            invoice_number TEXT, paid_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS expense_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, period_start TIMESTAMPTZ,
            period_end TIMESTAMPTZ, total DECIMAL, currency TEXT DEFAULT 'GBP',
            expenses JSONB DEFAULT '[]', status TEXT DEFAULT 'draft',
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, name TEXT, amount DECIMAL, currency TEXT DEFAULT 'GBP',
            billing_cycle TEXT, next_billing_date TIMESTAMPTZ,
            category TEXT, active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS deals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, client TEXT, value DECIMAL,
            currency TEXT DEFAULT 'GBP', stage TEXT DEFAULT 'prospect',
            probability INTEGER, expected_close TIMESTAMPTZ,
            notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // Health & Diet
        `CREATE TABLE IF NOT EXISTS meal_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, meal_type TEXT, description TEXT,
            calories INTEGER, protein DECIMAL, carbs DECIMAL, fat DECIMAL,
            photo_url TEXT, logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS workout_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, exercise_type TEXT, duration_minutes INTEGER,
            sets JSONB DEFAULT '[]', calories_burned INTEGER,
            notes TEXT, logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS body_measurements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, weight_kg DECIMAL, height_cm DECIMAL,
            body_fat_percent DECIMAL, waist_cm DECIMAL, chest_cm DECIMAL,
            notes TEXT, measured_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS sleep_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, sleep_start TIMESTAMPTZ, sleep_end TIMESTAMPTZ,
            duration_hours DECIMAL, quality_score INTEGER,
            notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS supplement_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, supplement_name TEXT, dosage TEXT,
            taken_at TIMESTAMPTZ DEFAULT NOW(), notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS fasting_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
            target_hours INTEGER, actual_hours DECIMAL, notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // Business Operations
        `CREATE TABLE IF NOT EXISTS clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, name TEXT, email TEXT, phone TEXT,
            company TEXT, status TEXT DEFAULT 'active', value DECIMAL,
            notes TEXT, last_contact TIMESTAMPTZ, tags TEXT[],
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, client_id UUID, status TEXT DEFAULT 'active',
            deadline TIMESTAMPTZ, budget DECIMAL, description TEXT,
            tasks JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, type TEXT, content TEXT,
            file_url TEXT, client_id UUID, project_id UUID,
            status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // Daily Briefing
        `CREATE TABLE IF NOT EXISTS briefing_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, type TEXT DEFAULT 'morning', content TEXT,
            weather TEXT, headlines TEXT[], tasks_due JSONB DEFAULT '[]',
            financial_snapshot JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // Spiritual Progression
        `CREATE TABLE IF NOT EXISTS spiritual_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, type TEXT, duration_minutes INTEGER,
            notes TEXT, mood_before INTEGER, mood_after INTEGER,
            logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS mindfulness_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, session_type TEXT, duration_minutes INTEGER,
            notes TEXT, logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // University
        `CREATE TABLE IF NOT EXISTS assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, module TEXT, description TEXT,
            due_date TIMESTAMPTZ, status TEXT DEFAULT 'pending',
            grade TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS university_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, module TEXT, session_type TEXT,
            duration_minutes INTEGER, notes TEXT, topics TEXT[],
            logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS reading_list (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, title TEXT, author TEXT, type TEXT,
            url TEXT, status TEXT DEFAULT 'pending', notes TEXT,
            module TEXT, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS flashcards (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, module TEXT, question TEXT, answer TEXT,
            difficulty INTEGER DEFAULT 1, last_reviewed TIMESTAMPTZ,
            next_review TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        // Journaling & Psychology
        `CREATE TABLE IF NOT EXISTS journal_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, content TEXT, mood_score INTEGER,
            sentiment TEXT, tags TEXT[], distortions TEXT[],
            gratitude TEXT[], wins TEXT[], logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS mood_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, mood_score INTEGER, energy_score INTEGER,
            stress_score INTEGER, notes TEXT, logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS habit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, habit_name TEXT, completed BOOLEAN DEFAULT FALSE,
            notes TEXT, logged_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS routine_suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT, suggestion TEXT, category TEXT,
            based_on TEXT, accepted BOOLEAN, created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`
    ];

    const results = [];
    for (const sql of tables) {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
        try {
            await runSQL(sql);
            console.log(`[SupabaseSetup] ✓ ${tableName}`);
            results.push({ table: tableName, success: true });
        } catch (e) {
            console.error(`[SupabaseSetup] ✗ ${tableName}:`, e.message);
            results.push({ table: tableName, success: false, error: e.message });
        }
    }
    return results;
}

// ── Add Render environment variable ──────────────────────────────
async function addRenderEnvVar(key, value) {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;
    const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;

    return new Promise((resolve, reject) => {
        const body = JSON.stringify([{ key, value }]);
        const options = {
            hostname: 'api.render.com',
            path: `/v1/services/${RENDER_SERVICE_ID}/env-vars`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${RENDER_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: d });
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

module.exports = { createAllTables, runSQL, addRenderEnvVar };
