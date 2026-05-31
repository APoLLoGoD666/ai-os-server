"use strict";
// RAG-Anything bridge — HTTP client to the Python sidecar (sidecar/main.py).
// Multimodal knowledge graph: ingest any file type, query via text or VLM.
// Start sidecar: uvicorn sidecar.main:app --port 8001 --host 0.0.0.0
// Env: RAG_SIDECAR_URL (default: http://localhost:8001)
const http = require('http');
const https = require('https');

const SIDECAR_URL = () => process.env.RAG_SIDECAR_URL || 'http://localhost:8001';

function _request(method, urlPath, body, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const base = new URL(SIDECAR_URL());
        const isHttps = base.protocol === 'https:';
        const lib = isHttps ? https : http;
        const bodyStr = body ? JSON.stringify(body) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = lib.request({
            hostname: base.hostname,
            port: base.port || (isHttps ? 443 : 80),
            path: urlPath, method, headers, timeout: timeoutMs,
        }, res => {
            let data = '';
            res.on('data', d => { data += d; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('RAG sidecar timeout')); });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function _uploadFile(endpoint, buffer, filename) {
    return new Promise((resolve, reject) => {
        const base = new URL(SIDECAR_URL());
        const boundary = `----ApexBoundary${Date.now()}`;
        const isHttps = base.protocol === 'https:';
        const lib = isHttps ? https : http;
        const parts = [
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
            buffer,
            `\r\n--${boundary}--\r\n`
        ];
        const totalLen = parts.reduce((a, p) => a + (Buffer.isBuffer(p) ? p.length : Buffer.byteLength(p)), 0);
        const req = lib.request({
            hostname: base.hostname,
            port: base.port || (isHttps ? 443 : 80),
            path: endpoint, method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': totalLen },
            timeout: 120000,
        }, res => {
            let data = '';
            res.on('data', d => { data += d; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('RAG upload timeout')); });
        for (const p of parts) req.write(Buffer.isBuffer(p) ? p : Buffer.from(p));
        req.end();
    });
}

// Health check
async function health() {
    try {
        const { status, body } = await _request('GET', '/health', null, 5000);
        return { ok: status === 200, ...body };
    } catch (e) {
        return { ok: false, error: e.message, hint: 'uvicorn sidecar.main:app --port 8001' };
    }
}

// Ingest a file buffer into the knowledge graph
async function ingest(buffer, filename) {
    const { status, body } = await _uploadFile('/rag/ingest', buffer, filename);
    if (status !== 200) throw new Error(body?.detail || `RAG ingest failed (${status})`);
    return body;
}

// Ingest a folder of files (by path, processed on sidecar side)
async function ingestFolder(folderPath) {
    const { status, body } = await _request('POST', '/rag/ingest/folder', { path: folderPath }, 300000);
    if (status !== 200) throw new Error(body?.detail || `RAG folder ingest failed (${status})`);
    return body;
}

// Inject pre-parsed content directly (no file upload needed)
// items: [{ content: string, metadata: object }]
async function insertContent(items) {
    const { status, body } = await _request('POST', '/rag/insert', { items }, 60000);
    if (status !== 200) throw new Error(body?.detail || `RAG insert failed (${status})`);
    return body;
}

// Ingest a URL via markitdown on the sidecar
async function ingestUrl(url) {
    const { status, body } = await _request('POST', '/rag/ingest/url', { url }, 120000);
    if (status !== 200) throw new Error(body?.detail || `RAG URL ingest failed (${status})`);
    return body;
}

// Text query — hybrid vector + graph retrieval
async function query(q, mode = 'hybrid', topK = 5) {
    const { status, body } = await _request('POST', '/rag/query', { query: q, mode, top_k: topK });
    if (status !== 200) throw new Error(body?.detail || `RAG query failed (${status})`);
    return body;
}

// Multimodal query — VLM interprets retrieved images/charts
async function queryMultimodal(q) {
    const { status, body } = await _request('POST', '/rag/query/multimodal', { query: q });
    if (status !== 200) throw new Error(body?.detail || `RAG multimodal query failed (${status})`);
    return body;
}

// Delete all data and reset the knowledge graph
async function reset() {
    const { status, body } = await _request('POST', '/rag/reset', {});
    if (status !== 200) throw new Error(body?.detail || `RAG reset failed (${status})`);
    return body;
}

module.exports = { health, ingest, ingestFolder, insertContent, ingestUrl, query, queryMultimodal, reset };
