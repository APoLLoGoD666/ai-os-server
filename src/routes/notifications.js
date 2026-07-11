'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { pgListNotifications, pgMarkNotificationRead } = require('../../lib/pg_helpers');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

router.get('/notifications', requireAppAccess, async (req, res) => {
    try {
        const notifications = await pgListNotifications(50);
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

router.post('/notifications/:id/read', requireAppAccess, async (req, res) => {
    try {
        const notification = await pgMarkNotificationRead(Number(req.params.id));
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

router.get('/api/notifications', requireAppAccess, async (req, res) => {
    try {
        const { data } = await sbAdmin.from('apex_notifications')
            .select('*').eq('read', false).order('created_at', { ascending: false });
        const notifs = data || [];
        await sbAdmin.from('apex_notifications').update({ read: true }).eq('read', false).neq('type', 'permission');
        res.json({ ok: true, notifications: notifs });
    } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

module.exports = router;
