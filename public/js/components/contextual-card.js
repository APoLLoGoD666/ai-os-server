/* contextual-card.js — Phase C presentation layer (UX-08) */
(function() {
    'use strict';

    var cardZone  = document.getElementById('cx-card-zone');
    var topChrome = document.getElementById('cx-top-chrome');
    if (!cardZone || !topChrome) return;

    // Inject component styles
    var style = document.createElement('style');
    style.textContent = [
        '.cx-card{background:rgba(10,18,35,0.92);border:1px solid rgba(0,212,255,0.22);border-radius:10px;padding:12px 14px;width:320px;max-width:100%;box-shadow:0 4px 24px rgba(0,0,0,0.4);backdrop-filter:blur(12px);pointer-events:auto;transition:opacity .25s,transform .25s;}',
        '.cx-card--appearing{opacity:0;transform:translateY(10px);}',
        '.cx-card--active{opacity:1;transform:translateY(0);}',
        '.cx-card--dismissed{opacity:0;transform:translateY(10px);pointer-events:none;}',
        '.cx-card__header{display:flex;align-items:center;gap:6px;margin-bottom:6px;}',
        '.cx-card__level{font-size:9px;font-weight:700;letter-spacing:.1em;padding:2px 5px;border-radius:3px;background:rgba(0,212,255,.15);color:#00d4ff;}',
        '.cx-card__category{font-size:10px;color:rgba(170,190,220,.6);flex:1;}',
        '.cx-card__expand,.cx-card__dismiss{background:none;border:none;color:rgba(170,190,220,.5);cursor:pointer;font-size:14px;line-height:1;padding:0 3px;}',
        '.cx-card__expand:hover,.cx-card__dismiss:hover{color:#e8f4ff;}',
        '.cx-card__summary{font-size:12px;color:#c8d8f0;margin:0;line-height:1.5;}',
        '.cx-card__body p{font-size:12px;color:#c8d8f0;margin:0;line-height:1.5;}',
        '.cx-card__raw{font-size:10px;color:rgba(170,190,220,.7);font-family:"JetBrains Mono",monospace;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow-y:auto;margin:4px 0 0;background:rgba(0,0,0,.2);border-radius:4px;padding:6px;}',
        '.cx-chrome__bar{display:flex;align-items:center;gap:10px;background:rgba(200,30,30,.9);padding:10px 16px;font-size:13px;color:#fff;font-weight:600;}',
        '.cx-chrome__bar--urgent{background:rgba(220,40,40,.92);}',
        '.cx-chrome__icon{font-size:16px;}',
        '.cx-chrome__msg{flex:1;}',
        '.cx-chrome__dismiss{background:none;border:none;color:#fff;cursor:pointer;font-size:18px;line-height:1;opacity:.7;}',
        '.cx-chrome__dismiss:hover{opacity:1;}',
    ].join('');
    document.head.appendChild(style);

    // WebSocket — separate connection to viz broadcaster
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var _ws = null;
    var _cards = {}; // id → { el, timer }

    var DISMISS_MS = { INFORMATION: 90000, CONFIRMATION: 90000, ACTION: 180000, INSIGHT: 180000 };

    function connect() {
        _ws = new WebSocket(proto + '//' + location.host + '/ws/viz');
        _ws.addEventListener('message', function(ev) {
            try {
                var msg = JSON.parse(ev.data);
                if (msg.type === 'presentation:inject') handle(msg);
            } catch (_) {}
        });
        _ws.addEventListener('close', function() { setTimeout(connect, 5000); });
        _ws.addEventListener('error', function() { _ws.close(); });
    }

    function handle(msg) {
        if (msg.action === 'dismiss') { dismissCard(msg.id); return; }
        if (msg.action !== 'show') return;
        var item = msg.item;
        if (!item || !item.id || !item.level) return;
        if (item.level === 'L5') { renderChrome(item); return; }
        if (item.level === 'L4') { renderModal(item); return; }
        if (item.level === 'L2' || item.level === 'L3') renderCard(item);
        // L0/L1: no UI surface
    }

    function renderCard(item) {
        if (_cards[item.id]) return;
        var el = document.createElement('div');
        el.className = 'cx-card cx-card--appearing';
        el.setAttribute('data-cx-id', item.id);
        el.setAttribute('data-cx-depth', '0');
        el.innerHTML = cardHTML(item, 0);
        cardZone.appendChild(el);
        requestAnimationFrame(function() {
            el.classList.remove('cx-card--appearing');
            el.classList.add('cx-card--active');
        });

        var timer = null;
        if (item.level === 'L2') {
            var ms = DISMISS_MS[item.category] || 90000;
            timer = setTimeout(function() { dismissCard(item.id); }, ms);
        }
        _cards[item.id] = { el: el, timer: timer };

        el.querySelector('.cx-card__dismiss').addEventListener('click', function() { dismissCard(item.id); });
        var expandBtn = el.querySelector('.cx-card__expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', function() {
                var depth = parseInt(el.getAttribute('data-cx-depth') || '0', 10);
                var next = Math.min(depth + 1, 4);
                el.setAttribute('data-cx-depth', String(next));
                // Cancel auto-dismiss at L2 Detail or deeper (UX-08 §14)
                if (next >= 2 && _cards[item.id] && _cards[item.id].timer) {
                    clearTimeout(_cards[item.id].timer);
                    _cards[item.id].timer = null;
                }
                el.querySelector('.cx-card__body').innerHTML = cardBody(item, next);
            });
        }
    }

    function cardHTML(item, depth) {
        return '<div class="cx-card__header">' +
            '<span class="cx-card__level">' + esc(item.level) + '</span>' +
            '<span class="cx-card__category">' + esc(item.category || '') + '</span>' +
            '<button class="cx-card__expand" aria-label="Expand">+</button>' +
            '<button class="cx-card__dismiss" aria-label="Dismiss">&times;</button>' +
            '</div><div class="cx-card__body">' + cardBody(item, depth) + '</div>';
    }

    function cardBody(item, depth) {
        if (depth === 0) return '<p class="cx-card__summary">' + esc(item.summary || item.title || '') + '</p>';
        if (depth === 1) return '<p>' + esc(item.detail || item.summary || '') + '</p>';
        if (depth === 2) return '<p>' + esc(item.detail || '') + '</p><pre class="cx-card__raw">' + esc(JSON.stringify(item.data || {}, null, 2)) + '</pre>';
        return '<pre class="cx-card__raw">' + esc(JSON.stringify(item, null, 2)) + '</pre>';
    }

    function renderModal(item) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div style="background:rgba(10,18,35,.96);border:1px solid rgba(0,212,255,.3);border-radius:12px;padding:28px 24px;max-width:460px;width:90vw;box-shadow:0 8px 40px rgba(0,0,0,.6);">' +
            '<div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#00d4ff;margin-bottom:8px;">' + esc(item.level) + ' &nbsp;' + esc(item.category || '') + '</div>' +
            '<div style="font-size:15px;font-weight:600;color:#e8f4ff;margin-bottom:10px;">' + esc(item.title || item.summary || '') + '</div>' +
            '<div style="font-size:13px;color:#c8d8f0;line-height:1.6;">' + esc(item.detail || item.summary || '') + '</div>' +
            '<div style="margin-top:18px;text-align:right;"><button style="background:rgba(0,212,255,.15);border:1px solid rgba(0,212,255,.3);color:#00d4ff;border-radius:6px;padding:7px 18px;font-size:13px;cursor:pointer;">Dismiss</button></div>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('button').addEventListener('click', function() { document.body.removeChild(overlay); });
    }

    function renderChrome(item) {
        topChrome.innerHTML = '<div class="cx-chrome__bar cx-chrome__bar--urgent" role="alert" aria-live="assertive">' +
            '<span class="cx-chrome__icon">&#9888;</span>' +
            '<span class="cx-chrome__msg">' + esc(item.summary || item.title || '') + '</span>' +
            '<button class="cx-chrome__dismiss" aria-label="Dismiss urgent alert">&times;</button>' +
            '</div>';
        topChrome.style.display = 'block';
        topChrome.querySelector('.cx-chrome__dismiss').addEventListener('click', function() {
            topChrome.style.display = 'none';
        });
    }

    function dismissCard(id) {
        var entry = _cards[id];
        if (!entry) return;
        if (entry.timer) clearTimeout(entry.timer);
        entry.el.classList.add('cx-card--dismissed');
        setTimeout(function() { if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el); }, 300);
        delete _cards[id];
    }

    function esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    connect();

})();
