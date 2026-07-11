'use strict';
// lib/pwa/notification-scheduler.js — scheduled push notifications for reminders
// Registered in services/init.js alongside other crons.

const logger = require('../logger');

// Import sendPush lazily to avoid circular deps
function _push(title, body, url) {
    try {
        return require('../../routes/pwa').sendPush({ title, body, icon: '/icon-192.png', url: url || '/dashboard.html' });
    } catch { return Promise.resolve({ sent: 0 }); }
}

// ── Reminder definitions ─────────────────────────────────────────────────────
// hour and minute are UTC. Adjust for user timezone offset if needed via env.

const TZ_OFFSET_HOURS = parseInt(process.env.USER_TZ_OFFSET_HOURS || '1'); // BST default

function _utcHour(localHour) {
    return ((localHour - TZ_OFFSET_HOURS) + 24) % 24;
}

const REMINDERS = [
    // Spiritual
    { name: 'meditation_morning', hour: _utcHour(7),  minute: 0,  title: 'Morning Meditation', body: 'Begin your day with stillness. 10 minutes.', url: '/dashboard.html#spiritual' },
    { name: 'sigil_reminder',     hour: _utcHour(9),  minute: 0,  title: 'Sigil Practice', body: 'Charge your intention for today.', url: '/dashboard.html#spiritual' },
    { name: 'reading_reminder',   hour: _utcHour(21), minute: 0,  title: 'Reading Time', body: 'Open your book. 30 minutes of focused reading.', url: '/dashboard.html#spiritual' },
    { name: 'meditation_evening', hour: _utcHour(22), minute: 0,  title: 'Evening Meditation', body: 'Wind down. Reflect on the day.', url: '/dashboard.html#spiritual' },
    { name: 'reflection_prompt',  hour: _utcHour(20), minute: 30, title: 'Daily Reflection', body: 'What moved you today? Log your journal entry.', url: '/dashboard.html#journal' },

    // Health
    { name: 'water_morning',      hour: _utcHour(8),  minute: 30, title: 'Hydration Check', body: 'Have you had water this morning?', url: '/dashboard.html#health' },
    { name: 'water_afternoon',    hour: _utcHour(14), minute: 0,  title: 'Drink Water', body: 'Mid-afternoon hydration reminder.', url: '/dashboard.html#health' },
    { name: 'supplements',        hour: _utcHour(8),  minute: 0,  title: 'Supplements', body: 'Time to take your morning supplements.', url: '/dashboard.html#health' },

    // Evening wind-down (FEAT-D011)
    { name: 'wind_down',          hour: _utcHour(22), minute: 30, title: 'APEX Wind-Down', body: 'Review your day. Prep for tomorrow.', url: '/dashboard.html#briefing' },
];

let _started = false;

function start() {
    if (_started) return;
    _started = true;

    // Tick every minute, check which reminders are due
    setInterval(_tick, 60 * 1000);
    logger.info('notification-scheduler', `registered ${REMINDERS.length} reminders`);
}

async function _tick() {
    const now = new Date();
    const h   = now.getUTCHours();
    const m   = now.getUTCMinutes();

    for (const r of REMINDERS) {
        if (r.hour === h && r.minute === m) {
            try {
                const result = await _push(r.title, r.body, r.url);
                logger.info('notification-scheduler', `sent: ${r.name}`, { sent: result.sent });
            } catch (e) {
                logger.warn('notification-scheduler', `failed: ${r.name}`, { error: e.message });
            }
        }
    }
}

module.exports = { start, REMINDERS };
