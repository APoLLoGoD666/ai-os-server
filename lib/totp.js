'use strict';
// lib/totp.js — RFC 6238 TOTP, no external dependencies

const crypto = require('crypto');

// ── Base32 ────────────────────────────────────────────────────────────────────
const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
    let bits = 0, val = 0, out = '';
    for (let i = 0; i < buf.length; i++) {
        val = (val << 8) | buf[i];
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            out += B32_CHARS[(val >> bits) & 31];
        }
    }
    if (bits > 0) out += B32_CHARS[(val << (5 - bits)) & 31];
    return out;
}

function base32Decode(str) {
    str = str.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
    let bits = 0, val = 0;
    const out = [];
    for (let i = 0; i < str.length; i++) {
        const idx = B32_CHARS.indexOf(str[i]);
        if (idx === -1) continue;
        val = (val << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            out.push((val >> bits) & 0xff);
        }
    }
    return Buffer.from(out);
}

// ── TOTP core ─────────────────────────────────────────────────────────────────
function _hotp(key, counter) {
    const msg = Buffer.alloc(8);
    // Write 64-bit big-endian counter
    const hi = Math.floor(counter / 0x100000000);
    const lo = counter >>> 0;
    msg.writeUInt32BE(hi, 0);
    msg.writeUInt32BE(lo, 4);
    const hmac = crypto.createHmac('sha1', key).update(msg).digest();
    const offset = hmac[19] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 (hmac[offset + 1] << 16) |
                 (hmac[offset + 2] << 8)  |
                  hmac[offset + 3];
    return String(code % 1000000).padStart(6, '0');
}

function _timeStep() {
    return Math.floor(Date.now() / 1000 / 30);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Generate a 20-byte random TOTP secret, base32-encoded. */
function generateSecret() {
    return base32Encode(crypto.randomBytes(20));
}

/** Generate the current TOTP code (window offset in 30-s steps, default 0). */
function generateTOTP(secret, window = 0) {
    const key = base32Decode(secret);
    return _hotp(key, _timeStep() + window);
}

/** Verify a 6-digit token against ±1 window. */
function verifyTOTP(secret, token) {
    const key = base32Decode(secret);
    const t   = _timeStep();
    for (let w = -1; w <= 1; w++) {
        if (_hotp(key, t + w) === String(token).trim()) return true;
    }
    return false;
}

/** Generate an otpauth:// URI for QR code generation. */
function generateQRUri(secret, label, issuer = 'Apex') {
    const enc = encodeURIComponent;
    return `otpauth://totp/${enc(label)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = { generateSecret, generateTOTP, verifyTOTP, generateQRUri };
