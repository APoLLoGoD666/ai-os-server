"use strict";
/**
 * Shared embedding utility.
 * Primary:  Voyage AI voyage-3-lite (1024-dim) when VOYAGE_API_KEY is set.
 * Fallback: Gemini gemini-embedding-001 (768-dim output) via GOOGLE_API_KEY.
 *
 * Gemini uses outputDimensionality:768 to stay compatible with vault_embeddings
 * schema (vector(768)). Model was text-embedding-004 (removed by Google) →
 * now gemini-embedding-001.
 */
const https = require('https');

let _voyage429Until = 0;
let _gemini429Until = 0;

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

async function embedText(text, { dimensions = 768 } = {}) {
    const t = (text || '').slice(0, 2000);

    // Voyage AI primary (voyage-3-lite, 1024-dim — no dimension override needed)
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey && Date.now() >= _voyage429Until) {
        try {
            const resp = await _post('api.voyageai.com', '/v1/embeddings',
                JSON.stringify({ model: 'voyage-3-lite', input: [t], output_dimension: dimensions }),
                { Authorization: `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
                5000);
            if (resp?.data?.[0]?.embedding) return resp.data[0].embedding;
        } catch (err) {
            if (err._status === 429) {
                _voyage429Until = Date.now() + 60000;
                console.warn('[embed] Voyage 429 — backoff 60s, falling back to Gemini');
            } else {
                console.warn('[embed] Voyage error:', err.message, '— falling back to Gemini');
            }
        }
    }

    // Gemini gemini-embedding-001 with outputDimensionality for schema compat
    if (Date.now() < _gemini429Until) return null;
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleKey) {
        console.warn('[embed] provider=gemini (Voyage unavailable)');
        try {
            const resp = await _post('generativelanguage.googleapis.com',
                '/v1beta/models/gemini-embedding-001:embedContent',
                JSON.stringify({
                    model:                'models/gemini-embedding-001',
                    content:              { parts: [{ text: t }] },
                    outputDimensionality: dimensions,
                }),
                { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
                8000);
            if (resp?.embedding?.values) return resp.embedding.values;
        } catch (err) {
            if (err._status === 429) { _gemini429Until = Date.now() + 60000; }
            else { console.warn('[embed] Gemini error:', err.message); }
        }
    }

    return null;
}

module.exports = { embedText };
