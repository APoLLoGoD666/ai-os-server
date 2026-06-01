"use strict";

// When running locally the Obsidian vault is on the same machine as the server.
// obsidian-client.js reads/writes directly via the filesystem fallback —
// no Cloudflare tunnel is needed. Exit immediately so nothing starts.
if (process.env.LOCAL_MODE === "true") {
    console.log("[Tunnel] LOCAL_MODE — vault accessed via filesystem, tunnel skipped.");
    return;
}

const { spawn } = require("child_process");
const https = require("https");
const path = require("path");

try { require("dotenv").config({ path: path.join(__dirname, ".env") }); } catch {}

const RENDER_API_KEY = process.env.RENDER_API_KEY || "";
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || "srv-d7idj1gsfn5c738hpsc0";

function ts() {
    return new Date().toISOString();
}

function log(msg) {
    console.log(`[${ts()}] ${msg}`);
}

async function updateRender(url, attempt = 1) {
    if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
        log("[Tunnel] RENDER_API_KEY or RENDER_SERVICE_ID not set — skipping Render update.");
        return;
    }

    const MAX_ATTEMPTS = 6;
    const RETRY_DELAY = 8000;

    try {
        await new Promise((resolve, reject) => {
            const body = JSON.stringify([{ key: "OBSIDIAN_URL", value: url }]);
            const options = {
                hostname: "api.render.com",
                path: `/v1/services/${RENDER_SERVICE_ID}/env-vars`,
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${RENDER_API_KEY}`,
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body)
                }
            };
            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Render API error ${res.statusCode}: ${data}`));
                    }
                });
            });
            req.on("error", reject);
            req.write(body);
            req.end();
        });
    } catch (err) {
        if (attempt < MAX_ATTEMPTS) {
            log(`[Tunnel] Render update failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message} — retrying in ${RETRY_DELAY / 1000}s...`);
            setTimeout(() => updateRender(url, attempt + 1), RETRY_DELAY);
            return;
        }
        throw err;
    }

    log(`[Tunnel] OBSIDIAN_URL updated on Render: ${url}`);
}

function startTunnel() {
    log("[Tunnel] Starting cloudflared...");

    const proc = spawn(
        "cloudflared",
        ["tunnel", "--url", "https://localhost:27124", "--no-tls-verify"],
        { stdio: ["ignore", "pipe", "pipe"] }
    );

    let urlFound = false;

    function handleOutput(data) {
        const lines = data.toString().split(/\r?\n/);
        for (const line of lines) {
            if (line.trim()) log(`[cloudflared] ${line.trim()}`);

            if (!urlFound) {
                const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
                if (match) {
                    const tunnelUrl = match[0];
                    urlFound = true;
                    log(`[Tunnel] Detected URL: ${tunnelUrl}`);
                    updateRender(tunnelUrl).catch(err => log(`[Tunnel] Render update failed: ${err.message}`));
                }
            }
        }
    }

    proc.stdout.on("data", handleOutput);
    proc.stderr.on("data", handleOutput);

    proc.on("exit", (code, signal) => {
        log(`[Tunnel] cloudflared exited (code=${code}, signal=${signal}). Restarting in 5 seconds...`);
        setTimeout(startTunnel, 5000);
    });

    proc.on("error", (err) => {
        log(`[Tunnel] Failed to start cloudflared: ${err.message}`);
        log("[Tunnel] Is cloudflared installed and on PATH?");
        setTimeout(startTunnel, 5000);
    });
}

log("[Tunnel] Watcher started.");
if (!RENDER_API_KEY) log("[Tunnel] WARNING — RENDER_API_KEY not set.");
if (!RENDER_SERVICE_ID) log("[Tunnel] WARNING — RENDER_SERVICE_ID not set.");

startTunnel();
