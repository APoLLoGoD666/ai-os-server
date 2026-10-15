'use strict';
const crypto = require('crypto');

const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, KEY_LEN = 64;

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, derived) => {
            if (err) return reject(err);
            resolve(`scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${derived.toString('hex')}`);
        });
    });
}

function verifyPassword(password, stored) {
    return new Promise((resolve, reject) => {
        const parts = stored.split(':');
        if (parts.length !== 6 || parts[0] !== 'scrypt') return resolve(false);
        const [, N, r, p, salt, hash] = parts;
        crypto.scrypt(password, salt, KEY_LEN, { N: parseInt(N), r: parseInt(r), p: parseInt(p) }, (err, derived) => {
            if (err) return reject(err);
            const expected = Buffer.from(hash, 'hex');
            if (derived.length !== expected.length) return resolve(false);
            try { resolve(crypto.timingSafeEqual(derived, expected)); }
            catch (_) { resolve(false); }
        });
    });
}

module.exports = { hashPassword, verifyPassword };
