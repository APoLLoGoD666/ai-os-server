"use strict";
/**
 * Shared embedding utility.
 * Primary: Voyage AI voyage-3-lite (1024-dim) when VOYAGE_API_KEY is set.
 * Fallback: Gemini text-embedding-004 (768-dim) via GOOGLE_API_KEY.
 * Returns null if both fail or neither key is configured.
 */
const https = require('https');

let _voyage429Until = 0;

function _post(hostname, path, body, headers, timeoutMs) {
    return new Promise((resolve, reject) => {
        const buf = Buffer.from(body);
        const req = https.request({
            hostname, path, method: 'POST',
            headers: { ...headers, 'Content-Length': buf.length },
            timeout: timeoutMs,
        }, res => {
            let data = '';
            res.on('data', d => { data += d; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    const err = new Error(`HTTP ${res.statusCode}`);
                    err._status = res.statusCode;
                    return reject(err);
                }
                try { resolve(JSON.parse(data)); } catch { reject(new Error('JSON parse failed')); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('embed timeout')); });
        req.write(buf);
        req.end();
    });
}

async function embedText(text) {
    const t = (text || '').slice(0, 2000);

    // Voyage AI primary (voyage-3-lite, 1024-dim)
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey && Date.now() >= _voyage429Until) {
        try {
            const resp = await _post('api.voyageai.com', '/v1/embeddings',
                JSON.stringify({ model: 'voyage-3-lite', input: [t] }),
                { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
                5000);
            if (resp?.data?.[0]?.embedding) return resp.data[0].embedding;
        } catch (err) {
            if (err._status === 429) { _voyage429Until = Date.now() + 60000; }
            else { console.warn('[embed] Voyage error:', err.message); }
        }
    }

    // Gemini fallback (text-embedding-004, 768-dim)
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleKey) {
        try {
            const resp = await _post('generativelanguage.googleapis.com',
                '/v1beta/models/text-embedding-004:embedContent',
                JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: t }] } }),
                { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
                8000);
            if (resp?.embedding?.values) return resp.embedding.values;
        } catch (err) {
            console.warn('[embed] Gemini error:', err.message);
        }
    }

    return null;
}

module.exports = { embedText };
