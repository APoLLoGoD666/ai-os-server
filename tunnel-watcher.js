"use strict";

const { spawn } = require("child_process");
const https = require("https");

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;

function ts() {
    return new Date().toISOString();
}

function log(msg) {
    console.log(`[${ts()}] ${msg}`);
}

async function updateRenderEnvVar(url) {
    if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
        log("[Tunnel] RENDER_API_KEY or RENDER_SERVICE_ID not set — skipping Render update.");
        return;
    }

    const body = JSON.stringify([{ key: "OBSIDIAN_URL", value: url }]);
    const options = {
        hostname: "api.render.com",
        path: `/v1/services/${RENDER_SERVICE_ID}/env-vars`,
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${RENDER_API_KEY}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    log(`[Tunnel] OBSIDIAN_URL updated on Render: ${url}`);
                    resolve();
                } else {
                    log(`[Tunnel] Render API error ${res.statusCode}: ${data}`);
                    reject(new Error(`Render API returned ${res.statusCode}`));
                }
            });
        });
        req.on("error", (err) => {
            log(`[Tunnel] Render API request failed: ${err.message}`);
            reject(err);
        });
        req.write(body);
        req.end();
    });
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
                    updateRenderEnvVar(tunnelUrl).catch(() => {});
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
