"use strict";

const { app, BrowserWindow, Tray, Menu, shell, nativeImage } = require("electron");
const path = require("path");
const fs   = require("fs");

const SERVER_URL = "http://localhost:3000";
const APP_NAME   = "APEX AI OS";
const ICON_PATH  = path.join(__dirname, "build", "icon.ico");

let mainWindow = null;
let tray       = null;
let isQuitting = false;

// ── Window ─────────────────────────────────────────────────────────
function createWindow() {
    const icon = fs.existsSync(ICON_PATH) ? ICON_PATH : undefined;

    mainWindow = new BrowserWindow({
        width:           1440,
        height:          900,
        minWidth:        1024,
        minHeight:       640,
        title:           APP_NAME,
        icon,
        backgroundColor: "#000000",
        show:            false,
        webPreferences: {
            nodeIntegration:  false,
            contextIsolation: true,
            webSecurity:      true,
        },
    });

    // No menu bar — keeps the app feeling native, not like a browser
    mainWindow.setMenuBarVisibility(false);

    // Load with retry — wait up to 20s for PM2 server to be ready
    attemptLoad(1);

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Hide to tray on close instead of quitting
    mainWindow.on("close", (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

function attemptLoad(attempt) {
    if (!mainWindow) return;
    mainWindow.loadURL(SERVER_URL).catch(() => {
        if (attempt < 20) {
            setTimeout(() => attemptLoad(attempt + 1), 1000);
        } else {
            mainWindow.loadURL(
                "data:text/html," + encodeURIComponent(
                    `<!DOCTYPE html><html><body style="background:#000;color:#f87171;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px">
                    <div style="font-size:22px;font-weight:600">Cannot reach APEX server</div>
                    <div style="font-size:13px;color:#71717a">Make sure PM2 is running: <code style="background:#111;padding:4px 8px;border-radius:4px">pm2 start ecosystem.config.js</code></div>
                    <button onclick="location.reload()" style="margin-top:8px;padding:8px 20px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">Retry</button>
                    </body></html>`
                )
            );
        }
    });
}

// ── System tray ────────────────────────────────────────────────────
function createTray() {
    if (!fs.existsSync(ICON_PATH)) {
        console.log("[Tray] No icon at build/icon.ico — tray skipped.");
        return;
    }

    try {
        tray = new Tray(nativeImage.createFromPath(ICON_PATH));
        tray.setToolTip(APP_NAME);

        tray.setContextMenu(Menu.buildFromTemplate([
            {
                label: "Open APEX",
                click() { mainWindow.show(); mainWindow.focus(); },
            },
            { type: "separator" },
            {
                label: "Reload",
                click() { mainWindow.reload(); },
            },
            {
                label: "Dev Tools",
                click() { mainWindow.webContents.openDevTools({ mode: "detach" }); },
            },
            {
                label: "Open Logs Folder",
                click() { shell.openPath(path.join(__dirname, "logs")); },
            },
            { type: "separator" },
            {
                label: "Quit APEX",
                click() { isQuitting = true; app.quit(); },
            },
        ]));

        tray.on("double-click", () => {
            mainWindow.show();
            mainWindow.focus();
        });
    } catch (err) {
        console.warn("[Tray] Failed to create tray:", err.message);
    }
}

// ── App lifecycle ──────────────────────────────────────────────────
app.setName(APP_NAME);

app.whenReady().then(() => {
    createWindow();
    createTray();
});

// Keep process alive when window is hidden (lives in tray)
app.on("window-all-closed", (e) => {
    if (!isQuitting) e.preventDefault();
});

app.on("activate", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});

app.on("before-quit", () => {
    isQuitting = true;
    if (mainWindow) mainWindow.removeAllListeners("close");
});
