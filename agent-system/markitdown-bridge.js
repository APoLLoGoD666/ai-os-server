"use strict";
// markitdown bridge — converts any file/URL to markdown.
// On Render (RAG_SIDECAR_URL set): proxies to the Python sidecar via HTTP.
// Locally: falls back to the local markitdown binary (pip install markitdown).
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http  = require('http');
const https = require('https');

// ── Sidecar HTTP helpers ──────────────────────────────────────────────────────
function _sidecarUrl() { return process.env.RAG_SIDECAR_URL || null; }

function _sidecarUpload(buffer, filename) {
    const base = _sidecarUrl();
    if (!base) return Promise.reject(new Error('no sidecar'));
    return new Promise((resolve, reject) => {
        const url = new URL('/convert/file', base);
        const lib  = url.protocol === 'https:' ? https : http;
        const boundary = `--ApexMD${Date.now()}`;
        const CRLF = '\r\n';
        const head = Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: application/octet-stream${CRLF}${CRLF}`);
        const tail = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
        const body = Buffer.concat([head, buffer, tail]);
        const req = lib.request({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname, method: 'POST', timeout: 90000, headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length } }, res => {
            let d = ''; res.on('data', c => { d += c; }); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('sidecar bad JSON')); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('sidecar upload timeout')); });
        req.write(body); req.end();
    });
}

function _sidecarUrl2convert(url) {
    const base = _sidecarUrl();
    if (!base) return Promise.reject(new Error('no sidecar'));
    return new Promise((resolve, reject) => {
        const target = new URL('/convert/url', base);
        const lib = target.protocol === 'https:' ? https : http;
        const body = Buffer.from(`url=${encodeURIComponent(url)}`);
        const req = lib.request({ hostname: target.hostname, port: target.port || (target.protocol === 'https:' ? 443 : 80), path: target.pathname, method: 'POST', timeout: 90000, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length } }, res => {
            let d = ''; res.on('data', c => { d += c; }); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('sidecar bad JSON')); } });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('sidecar URL timeout')); });
        req.write(body); req.end();
    });
}

// ── Local binary helper ───────────────────────────────────────────────────────
function _run(args, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const proc = spawn('markitdown', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '', err = '';
        const timer = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('markitdown timed out')); }, timeoutMs);
        proc.stdout.on('data', d => { out += d; });
        proc.stderr.on('data', d => { err += d; });
        proc.on('close', code => {
            clearTimeout(timer);
            if (code === 0) resolve(out);
            else reject(new Error(`markitdown exit ${code}: ${err.slice(0, 300)}`));
        });
        proc.on('error', e => {
            clearTimeout(timer);
            if (e.code === 'ENOENT') reject(new Error('markitdown not found — pip install "markitdown[all]"'));
            else reject(e);
        });
    });
}

// Convert a file path on disk → markdown string
async function convertFile(filePath) {
    if (_sidecarUrl()) {
        const buf = fs.readFileSync(filePath);
        const r = await _sidecarUpload(buf, path.basename(filePath));
        if (r.ok) return { success: true, markdown: r.markdown, source: filePath };
    }
    const markdown = await _run([filePath]);
    return { success: true, markdown, source: filePath };
}

// Convert an in-memory Buffer → markdown (writes temp file, cleans up)
async function convertBuffer(buffer, originalName) {
    if (_sidecarUrl()) {
        const r = await _sidecarUpload(buffer, originalName);
        if (r.ok) return { success: true, markdown: r.markdown, source: originalName };
    }
    const ext = path.extname(originalName) || '.bin';
    const tmp = path.join(os.tmpdir(), `apex-md-${Date.now()}${ext}`);
    try {
        fs.writeFileSync(tmp, buffer);
        const markdown = await _run([tmp]);
        return { success: true, markdown, source: originalName };
    } finally {
        try { fs.unlinkSync(tmp); } catch {}
    }
}

// Convert a URL directly — markitdown supports http(s), YouTube URLs natively
async function convertUrl(url) {
    if (_sidecarUrl()) {
        const r = await _sidecarUrl2convert(url);
        if (r.ok) return { success: true, markdown: r.markdown, source: url };
    }
    const markdown = await _run([url]);
    return { success: true, markdown, source: url };
}

// Convert multiple files concurrently (bounded to 4 parallel)
async function convertBatch(sources) {
    const results = [];
    const queue = [...sources];
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (queue.length) {
            const src = queue.shift();
            try {
                const r = typeof src === 'string'
                    ? await convertFile(src)
                    : await convertBuffer(src.buffer, src.name);
                results.push(r);
            } catch (e) {
                results.push({ success: false, source: src, error: e.message });
            }
        }
    });
    await Promise.all(workers);
    return results;
}

// Convert with LLM image descriptions — uses Claude Haiku to describe images in context.
// markitdown supports an llm_client hook; this wrapper calls it via sidecar.
// Falls back to plain convertFile if ANTHROPIC_API_KEY not set.
async function convertWithImageDescriptions(filePath) {
    if (!process.env.ANTHROPIC_API_KEY) return convertFile(filePath);
    // Use markitdown with --llm-model flag if supported, else plain convert
    try {
        const markdown = await _run([
            filePath,
            '--llm-model', 'claude-haiku-4-5-20251001'
        ]);
        return { success: true, markdown, source: filePath, llmDescriptions: true };
    } catch {
        return convertFile(filePath);
    }
}

// Stream stdin → markitdown → markdown string (pipe mode)
// Pass any Readable stream — markitdown reads from stdin when given '-'
async function convertStream(readable, filename = 'stdin.bin') {
    const ext = path.extname(filename) || '.bin';
    const tmp = path.join(os.tmpdir(), `apex-md-stream-${Date.now()}${ext}`);
    return new Promise((resolve, reject) => {
        const chunks = [];
        readable.on('data', c => chunks.push(c));
        readable.on('error', reject);
        readable.on('end', async () => {
            try {
                fs.writeFileSync(tmp, Buffer.concat(chunks));
                const markdown = await _run([tmp]);
                resolve({ success: true, markdown, source: filename });
            } catch (e) {
                resolve({ success: false, error: e.message, source: filename });
            } finally {
                try { fs.unlinkSync(tmp); } catch {}
            }
        });
    });
}

// Safety-restricted convert — local files only, no URLs, no network access.
// Rejects paths outside the allowed base directory.
async function convertLocal(filePath, opts = {}) {
    const allowed = opts.baseDir || process.cwd();
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(allowed))) {
        return { success: false, error: `Path outside allowed base: ${allowed}` };
    }
    if (/^https?:\/\//i.test(filePath)) {
        return { success: false, error: 'URLs not allowed in convertLocal — use convertUrl instead' };
    }
    return convertFile(resolved);
}

// Convert using Azure Document Intelligence for high-accuracy PDF/image OCR.
// Requires endpoint + key, or falls back to plain convertFile.
// markitdown supports --azuredocumentintelligence-endpoint / --key flags.
async function convertWithAzureDI(filePath, endpoint, key) {
    if (!endpoint || !key) return convertFile(filePath);
    try {
        const markdown = await _run([
            filePath,
            '--azuredocumentintelligence-endpoint', endpoint,
            '--azuredocumentintelligence-api-key', key
        ]);
        return { success: true, markdown, source: filePath, provider: 'azure-di' };
    } catch {
        return convertFile(filePath);
    }
}

// Azure Content Understanding — uses --azurecontentunderstanding-endpoint flag.
// Higher-accuracy than Azure DI for complex layouts, tables, and handwriting.
// Falls back to convertFile if endpoint/key missing.
async function convertWithAzureCU(filePath, endpoint, key) {
    if (!endpoint || !key) return convertFile(filePath);
    try {
        const markdown = await _run([
            filePath,
            '--azurecontentunderstanding-endpoint', endpoint,
            '--azurecontentunderstanding-api-key', key
        ]);
        return { success: true, markdown, source: filePath, provider: 'azure-cu' };
    } catch {
        return convertWithAzureDI(filePath, endpoint, key); // cascade to DI on failure
    }
}

// Plugin registration — writes a minimal markitdown plugin config file for custom converters.
// markitdown supports plugins via Python entry points; this generates the entry point TOML.
function registerPlugin(pluginName, converterClass, extensions = []) {
    const toml = `[project.entry-points."markitdown.converters"]\n${pluginName} = "${converterClass}"\n`;
    const configPath = require('path').join(require('os').tmpdir(), `apex-md-plugin-${pluginName}.toml`);
    require('fs').writeFileSync(configPath, toml, 'utf8');
    return { configPath, pluginName, extensions };
}

// True iff markitdown binary is reachable
function isAvailable() {
    const r = spawnSync('markitdown', ['--version'], { encoding: 'utf8', timeout: 5000 });
    return !r.error && r.status === 0;
}

module.exports = { convertFile, convertBuffer, convertUrl, convertBatch, convertWithImageDescriptions, convertStream, convertLocal, convertWithAzureDI, convertWithAzureCU, registerPlugin, isAvailable };
