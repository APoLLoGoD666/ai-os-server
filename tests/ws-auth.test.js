'use strict';
const assert = require('assert');
const crypto = require('crypto');

// Mirrors the /ws auth logic at server.js:11516-11520
// and the /ws/gemini-live auth logic at routes/gemini-live.js:364-370
function _wsAuth(appKey, token) {
    if (!appKey || !token) return false;
    try {
        const a = Buffer.from(appKey);
        const b = Buffer.from(token);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
}

const KEY = 'test-key-abc123';
// Valid token
assert.strictEqual(_wsAuth(KEY, KEY), true,  'valid token: accepted');
// Missing token
assert.strictEqual(_wsAuth(KEY, ''),  false, 'empty token: rejected');
// Wrong token
assert.strictEqual(_wsAuth(KEY, 'wrong-key'), false, 'wrong token: rejected');
// Missing appKey
assert.strictEqual(_wsAuth('', KEY),  false, 'no appKey: rejected');
// Length mismatch (timing-safe)
assert.strictEqual(_wsAuth(KEY, KEY + 'x'), false, 'length mismatch: rejected');

console.log('ws-auth: all 5 checks PASS');
