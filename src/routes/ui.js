'use strict';
const router = require('express').Router();
const path = require('path');
const express = require('express');
const { requireAppAccess, requireAuth } = require('../../lib/middleware');
const { _makeSolidPng } = require('../../lib/server-utils');

function _serveDashboard(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '../..', 'public', 'dashboard.html'));
}
router.get('/', requireAuth, _serveDashboard);
router.get('/dashboard.html', requireAuth, _serveDashboard);
router.get('/login', (req, res) => {
    const { LOGIN_HTML } = require('../../lib/middleware');
    res.send(LOGIN_HTML);
});
router.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, '../..', 'public', 'sw.js'));
});
// Serve only specific static assets — never expose .env, server.js, package.json etc.
router.get('/apex-v2.css',     (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'apex-v2.css')));
router.get('/apex-custom.css', (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'apex-custom.css')));
router.get('/manifest.json',   (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'manifest.json')));
router.use('/src/components',  express.static(path.join(__dirname, '../..', 'src', 'components')));

router.get('/editor', requireAppAccess, (req, res) => {
    res.sendFile(path.join(__dirname, '../..', 'public', 'editor.html'));
});

// PWA icons — generated in-memory, no files needed
let _icon192 = null, _icon512 = null;
router.get('/icon-192.png', (req, res) => {
    if (!_icon192) _icon192 = _makeSolidPng(192, 0, 212, 255);
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=604800").send(_icon192);
});
router.get('/icon-512.png', (req, res) => {
    if (!_icon512) _icon512 = _makeSolidPng(512, 0, 212, 255);
    res.set("Content-Type", "image/png").set("Cache-Control", "public, max-age=604800").send(_icon512);
});

module.exports = router;
