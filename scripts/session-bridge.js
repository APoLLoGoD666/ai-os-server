"use strict";
const http = require("http");

const queues = {};
const listeners = {};
const broadcastListeners = [];
const allMessages = [];

function getQueue(name) {
    if (!queues[name]) queues[name] = [];
    return queues[name];
}

function broadcast(entry) {
    allMessages.push(entry);
    const data = `data: ${JSON.stringify(entry)}\n\n`;
    for (let i = broadcastListeners.length - 1; i >= 0; i--) {
        try { broadcastListeners[i].write(data); }
        catch { broadcastListeners.splice(i, 1); }
    }
}

const PALETTE = ['#00d4ff','#bf5fff','#00ff88','#ff9f43','#ff6b9d','#54a0ff','#ffd32a','#ff4757'];

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Claude Session Bridge</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0b0d; color: #e0e0e0; font-family: 'Courier New', monospace; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  header { padding: 14px 24px; border-bottom: 1px solid #1a1f2e; display: flex; align-items: center; gap: 12px; background: #0d0e12; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #00ff88; box-shadow: 0 0 8px #00ff88; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  header h1 { font-size: 13px; color: #00d4ff; letter-spacing: 2px; text-transform: uppercase; }
  .status { font-size: 11px; color: #555; margin-left: auto; }
  .lane-container { display: flex; gap: 1px; background: #1a1f2e; flex: 1; overflow: hidden; }
  .lane { background: #0a0b0d; display: flex; flex-direction: column; overflow: hidden; flex: 1; min-width: 0; }
  .lane-header { padding: 10px 16px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; border-bottom: 1px solid #1a1f2e; display: flex; align-items: center; gap: 8px; }
  .lane-dot { width: 6px; height: 6px; border-radius: 50%; }
  .messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-thumb { background: #1a1f2e; border-radius: 2px; }
  .msg { padding: 10px 12px; border-radius: 4px; font-size: 12px; line-height: 1.6; border-left: 2px solid transparent; animation: fadeIn 0.3s ease; word-break: break-word; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .sender { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .time { font-size: 9px; color: #444; margin-left: 8px; }
  .text { color: #ccc; }
  .empty { color: #333; font-size: 11px; text-align: center; margin-top: 40px; }
  footer { padding: 8px 24px; font-size: 10px; color: #333; border-top: 1px solid #1a1f2e; background: #0d0e12; display: flex; gap: 24px; }
  #msgcount { color: #00d4ff; }
</style>
</head>
<body>
<header>
  <div class="dot"></div>
  <h1>Session Bridge — Live</h1>
  <span class="status">port 3998 &nbsp;|&nbsp; <span id="connstatus">connecting…</span> &nbsp;|&nbsp; <span id="sessioncount">0</span> sessions</span>
</header>
<div class="lane-container" id="lanes"></div>
<footer>
  <span>messages: <span id="msgcount">0</span></span>
</footer>
<script>
const PALETTE = ${JSON.stringify(PALETTE)};
const sessions = {};
let count = 0;

function colorFor(name) {
  const keys = Object.keys(sessions);
  const idx = keys.indexOf(name);
  return PALETTE[idx % PALETTE.length];
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return r+','+g+','+b;
}

function ensureLane(name) {
  if (sessions[name]) return;
  const color = PALETTE[Object.keys(sessions).length % PALETTE.length];
  sessions[name] = { color };

  const lane = document.createElement('div');
  lane.className = 'lane';
  lane.id = 'lane-' + name;

  const dot = document.createElement('div');
  dot.className = 'lane-dot';
  dot.style.cssText = 'background:' + color + ';box-shadow:0 0 6px ' + color;

  const hdr = document.createElement('div');
  hdr.className = 'lane-header';
  hdr.style.cssText = 'color:' + color + ';background:rgba(' + hexToRgb(color) + ',0.04)';
  hdr.appendChild(dot);
  hdr.appendChild(document.createTextNode(name));

  const msgs = document.createElement('div');
  msgs.className = 'messages';
  msgs.id = 'msgs-' + name;
  msgs.innerHTML = '<div class="empty">waiting…</div>';

  lane.appendChild(hdr);
  lane.appendChild(msgs);
  document.getElementById('lanes').appendChild(lane);
  document.getElementById('sessioncount').textContent = Object.keys(sessions).length;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function addMessage(data) {
  ensureLane(data.from);
  const color = sessions[data.from].color;
  const msgs = document.getElementById('msgs-' + data.from);
  const empty = msgs.querySelector('.empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = 'msg';
  div.style.cssText = 'background:rgba(' + hexToRgb(color) + ',0.06);border-left-color:' + color;
  div.innerHTML =
    '<div class="sender" style="color:' + color + '">' + data.from +
    (data.to ? '<span style="color:#555"> → ' + data.to + '</span>' : '') +
    '<span class="time">' + formatTime(data.time) + '</span></div>' +
    '<div class="text">' + data.msg.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  count++;
  document.getElementById('msgcount').textContent = count;
}

fetch('/history').then(r => r.json()).then(msgs => msgs.forEach(addMessage));

const es = new EventSource('/broadcast');
es.onopen = () => document.getElementById('connstatus').textContent = 'live';
es.onerror = () => document.getElementById('connstatus').textContent = 'reconnecting…';
es.onmessage = e => { try { addMessage(JSON.parse(e.data)); } catch {} };
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (u.pathname === "/" || u.pathname === "/dashboard") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(DASHBOARD_HTML);
        return;
    }

    if (u.pathname === "/send") {
        let body = "";
        req.on("data", c => body += c);
        req.on("end", () => {
            let from, to, msg;
            if (req.method === "POST" && body) {
                try { ({ from, to, msg } = JSON.parse(body)); } catch {}
            }
            from = from || u.searchParams.get("from") || "anon";
            to   = to   || u.searchParams.get("to")   || "all";
            msg  = msg  || u.searchParams.get("msg")  || "";

            const entry = { from, msg, to, time: new Date().toISOString() };
            console.log(`[Bridge] ${from} → ${to}: ${msg.slice(0, 120)}`);

            broadcast(entry);

            const targets = to === "all"
                ? Object.keys(queues).filter(k => k !== from)
                : [to];
            for (const t of targets) getQueue(t).push(entry);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, delivered_to: targets }));
        });
        return;
    }

    if (u.pathname === "/poll") {
        const session = u.searchParams.get("session") || "anon";
        const msgs = getQueue(session).splice(0);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(msgs));
        return;
    }

    if (u.pathname === "/broadcast") {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        });
        broadcastListeners.push(res);
        res.write(": connected\n\n");
        req.on("close", () => {
            const i = broadcastListeners.indexOf(res);
            if (i !== -1) broadcastListeners.splice(i, 1);
        });
        return;
    }

    if (u.pathname === "/listen") {
        const session = u.searchParams.get("session") || "anon";
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        });
        listeners[session] = res;
        const pending = getQueue(session).splice(0);
        for (const m of pending) res.write(`data: ${JSON.stringify(m)}\n\n`);
        res.write(`: connected as ${session}\n\n`);
        req.on("close", () => { delete listeners[session]; });
        return;
    }

    if (u.pathname === "/history") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(allMessages));
        return;
    }

    if (u.pathname === "/sessions") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sessions: Object.keys(queues), live_listeners: Object.keys(listeners) }));
        return;
    }

    res.writeHead(404);
    res.end("not found");
});

const PORT = 3998;
server.listen(PORT, "127.0.0.1", () => {
    console.log(`[Bridge] Running on http://127.0.0.1:${PORT}`);
    console.log(`[Bridge] Dashboard: http://127.0.0.1:${PORT}/`);
});
