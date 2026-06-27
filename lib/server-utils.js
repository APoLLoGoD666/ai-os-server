'use strict';

const { deflateSync } = require('zlib');
const { parseCookies } = require('./middleware');

// ── Keyword-based domain detector (fast, zero API cost) ──────────────────────

function detectDomain(text) {
    const t = text.toLowerCase();
    if (/financ|money|spend|budget|invoice|transaction|payment|income|expense|cost|£|\$|gbp|bank|subscript/.test(t)) return 'finance';
    if (/uni|university|assignment|lecture|module|flashcard|deadline|exam|study|coursework|cs249r|textbook/.test(t)) return 'uni';
    if (/\bfile\b|folder|vault|obsidian|document|note|wiki|upload|storage|knowledge base/.test(t)) return 'file';
    if (/server|pipeline|render|health|agent.?run|uptime|deploy|system.?status|circuit.?breaker|cost.?spike|haiku|sonnet/.test(t)) return 'system';
    if (/client|proposal|crm|project|contract|business|lead|pipeline|follow.?up|deal|invoice.*(client|project)/.test(t)) return 'business';
    return null;
}

// ── Stable conversation ID resolver ──────────────────────────────────────────
// Priority: x-conversation-id header > x-session-id header > Authorization JWT sub >
//           apex_token cookie JWT sub > per-request fallback

function _resolveConversationId(req) {
    if (req.headers['x-conversation-id']) return req.headers['x-conversation-id'];
    if (req.headers['x-session-id'])      return req.headers['x-session-id'];
    try {
        const auth = req.headers['authorization'] || '';
        if (auth.startsWith('Bearer ')) {
            const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString());
            if (typeof payload.sub === 'string' && payload.sub.length > 0) return payload.sub;
        }
    } catch (_) {}
    try {
        const cookies = parseCookies(req);
        const cookieToken = cookies.apex_token;
        if (cookieToken) {
            const payload = JSON.parse(Buffer.from(cookieToken.split('.')[1], 'base64url').toString());
            if (typeof payload.sub === 'string' && payload.sub.length > 0) return payload.sub;
        }
    } catch (_) {}
    return req.requestId; // last resort — per-request only, no cross-turn continuity
}

// ── Response cache (60s TTL) ──────────────────────────────────────────────────

const apiCache  = new Map();
const CACHE_TTL = 60000;

function getCached(key) {
    const e = apiCache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL) { apiCache.delete(key); return null; }
    return e.data;
}
function setCache(key, data) { apiCache.set(key, { ts: Date.now(), data }); }
function clearCache(...keys) { keys.forEach(k => apiCache.delete(k)); }

// Prune stale entries every 60s to prevent unbounded growth
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of apiCache) if (now - v.ts > CACHE_TTL) apiCache.delete(k);
}, 60_000).unref();

// ── Minimal solid-colour PNG generator (no external deps beyond zlib) ─────────

function _makeSolidPng(size, r, g, b) {
    const sig = Buffer.from([137,80,78,71,13,10,26,10]);
    const crcTbl = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        crcTbl[n] = c;
    }
    const crc32 = buf => { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTbl[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
    const chunk = (type, data) => {
        const t = Buffer.from(type, "ascii");
        const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
        const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
        return Buffer.concat([len, t, data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) { row[1+x*3]=r; row[2+x*3]=g; row[3+x*3]=b; }
    const raw = Buffer.concat(Array.from({length: size}, () => row));
    return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

module.exports = {
    detectDomain,
    _resolveConversationId,
    getCached,
    setCache,
    clearCache,
    _makeSolidPng
};
