'use strict';
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function _key() {
    const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) throw new Error('CREDENTIALS_ENCRYPTION_KEY must be a 64-char hex string');
    return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
    const iv  = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, _key(), iv);
    const ct  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        ciphertext: ct.toString('base64url'),
        iv:         iv.toString('base64url'),
        authTag:    tag.toString('base64url'),
    };
}

function decrypt({ ciphertext, iv, authTag }) {
    const decipher = crypto.createDecipheriv(ALGO, _key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));
    const pt = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]);
    return pt.toString('utf8');
}

module.exports = { encrypt, decrypt };
