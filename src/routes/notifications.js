'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { pgListNotifications, pgMarkNotificationRead } = require('../../lib/supabase-helpers');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

// V-11-H-B1: GET /notifications (legacy 50-row list) — filter by human_id for
// Users; Master sees all rows (historical behaviour).
router.get('/notifications', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        let notifications;
        if (isMaster) {
            notifications = await pgListNotifications(50);
        } else {
            // Direct scoped query — pgListNotifications is unscoped.
            const { data } = await sbAdmin.from('apex_notifications')
                .select('*')
                .eq('human_id', identity.humanId)
                .order('created_at', { ascending: false })
                .limit(50);
            notifications = data || [];
        }
        res.status(200).json({
            ok: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error("NOTIFICATIONS ERROR:", error);
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

// V-11-H-B1: POST /notifications/:id/read — verify caller owns notification.
router.post('/notifications/:id/read', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        const notifId  = req.params.id;
        // Ownership check (Master bypass).
        if (!isMaster) {
            const { data: row } = await sbAdmin.from('apex_notifications')
                .select('id,human_id')
                .eq('id', notifId)
                .single();
            if (!row) {
                return res.status(404).json({ ok: false, reply: "Notification not found." });
            }
            if (row.human_id && row.human_id !== identity.humanId) {
                return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Not the owner of this notification' });
            }
        }
        const notification = await pgMarkNotificationRead(Number(notifId));
        if (!notification) {
            return res.status(404).json({
                ok: false,
                reply: "Notification not found."
            });
        }
        return res.status(200).json({
            ok: true,
            notification
        });
    } catch (error) {
        console.error("NOTIFICATION READ ERROR:", error);
        return res.status(500).json({
            ok: false,
            reply: error.message
        });
    }
});

// V-11-H-B1: GET /api/notifications (unread) — filter by human_id for Users;
// Master sees all.
router.get('/api/notifications', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        let query = sbAdmin.from('apex_notifications')
            .select('*').eq('read', false).order('created_at', { ascending: false });
        if (!isMaster) query = query.eq('human_id', identity.humanId);
        const { data } = await query;
        res.json({ ok: true, notifications: data || [] });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

// V-11-H-B1 CRITICAL P0-2: previously marked ALL unread notifications as read
// regardless of owner (cross-account data corruption). Now scoped to the caller's
// rows unless Master.
router.post('/api/notifications/mark-read', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const isMaster = identity.role === 'master';
        let update = sbAdmin.from('apex_notifications').update({ read: true })
            .eq('read', false).neq('type', 'permission');
        if (!isMaster) update = update.eq('human_id', identity.humanId);
        await update;
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

module.exports = router;
