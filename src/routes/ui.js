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
router.get('/join', (req, res) => {
    const tokenVal = String(req.query.token || '').replace(/[^a-f0-9]/gi, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apex — Join</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#080c14;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f3f7fb}.wrap{width:340px;display:flex;flex-direction:column;gap:24px}.brand-name{font-size:26px;font-weight:700;letter-spacing:6px;color:#f3f7fb;text-align:center}.brand-sub{font-size:11px;letter-spacing:3px;color:#3a4a5c;margin-top:4px;font-family:'Courier New',monospace;text-align:center}input[type=password]{width:100%;background:#0d1424;border:1px solid #1e2d42;border-radius:8px;padding:12px 14px;color:#f3f7fb;font-size:15px;outline:none;letter-spacing:2px;font-family:inherit}input[type=password]:focus{border-color:#5b9eff}.btn{width:100%;background:#5b9eff;color:#000;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;letter-spacing:1.5px;cursor:pointer}.btn:disabled{background:#1e2d42;color:#3a4a5c;cursor:default}.err{color:#ff4d6d;font-size:12px;display:none;text-align:center;font-family:'Courier New',monospace}.ok{color:#5b9eff;font-size:12px;display:none;text-align:center;font-family:'Courier New',monospace}label{font-size:11px;letter-spacing:2px;color:#3a4a5c;font-family:'Courier New',monospace}</style></head><body><div class="wrap"><div class="brand-name">APEX</div><div class="brand-sub">SET YOUR PASSWORD</div><div style="display:flex;flex-direction:column;gap:12px;margin-top:4px;"><label>NEW PASSWORD</label><input type="password" id="pw1" placeholder="••••••••" autocomplete="new-password"/><label>CONFIRM PASSWORD</label><input type="password" id="pw2" placeholder="••••••••" autocomplete="new-password"/><button class="btn" id="btn" onclick="doJoin()">ACTIVATE ACCOUNT</button><div class="err" id="err"></div><div class="ok" id="ok">Account activated — <a href="/" style="color:#5b9eff">sign in</a></div></div></div><script>async function doJoin(){var p1=document.getElementById('pw1').value,p2=document.getElementById('pw2').value,err=document.getElementById('err'),ok=document.getElementById('ok'),btn=document.getElementById('btn');err.style.display='none';if(!p1.trim()){err.textContent='Enter a password.';err.style.display='block';return;}if(p1!==p2){err.textContent='Passwords do not match.';err.style.display='block';return;}if(p1.length<8){err.textContent='Min 8 characters.';err.style.display='block';return;}btn.disabled=true;btn.textContent='ACTIVATING…';try{var r=await fetch('/users/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${tokenVal}',password:p1})});var d=await r.json();if(d.ok){ok.style.display='block';btn.style.display='none';}else{err.textContent=d.reply||'Error.';err.style.display='block';btn.disabled=false;btn.textContent='ACTIVATE ACCOUNT';}}catch(e){err.textContent='Network error.';err.style.display='block';btn.disabled=false;btn.textContent='ACTIVATE ACCOUNT';}}</script></body></html>`);
});
router.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(__dirname, '../..', 'public', 'sw.js'));
});
// Serve only specific static assets — never expose .env, server.js, package.json etc.
router.get('/apex-v2.css',     (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'apex-v2.css')));
router.get('/apex-custom.css', (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'apex-custom.css')));
router.get('/apex-zero.css',   (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'apex-zero.css')));
router.get('/manifest.json',   (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'manifest.json')));
router.get('/js/components/contextual-card.js', (req, res) => res.sendFile(path.join(__dirname, '../..', 'public', 'js', 'components', 'contextual-card.js')));
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
