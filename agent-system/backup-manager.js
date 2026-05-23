"use strict";
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BACKUP_ROOT = path.join(ROOT, 'backups');
const FILES_TO_BACKUP = ['server.js', 'dashboard.html', 'package.json', 'TASKS.md'];

function createBackup(taskId) {
    const dir = path.join(BACKUP_ROOT, taskId);
    fs.mkdirSync(dir, { recursive: true });
    for (const file of FILES_TO_BACKUP) {
        const src = path.join(ROOT, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(dir, file));
        }
    }
    // Backup all agent-created route files
    const routesDir = path.join(ROOT, 'routes');
    if (fs.existsSync(routesDir)) {
        const backupRoutes = path.join(dir, 'routes');
        fs.mkdirSync(backupRoutes, { recursive: true });
        fs.readdirSync(routesDir).filter(f => f.endsWith('.js')).forEach(f => {
            fs.copyFileSync(path.join(routesDir, f), path.join(backupRoutes, f));
        });
    }
    console.log(`[Backup] Created backup for ${taskId} at ${dir}`);
    return dir;
}

function restoreBackup(taskId) {
    const dir = path.join(BACKUP_ROOT, taskId);
    if (!fs.existsSync(dir)) {
        console.warn(`[Backup] No backup found for ${taskId}`);
        return;
    }
    for (const file of FILES_TO_BACKUP) {
        const src = path.join(dir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(ROOT, file));
            console.log(`[Backup] Restored ${file} from ${taskId}`);
        }
    }
    // Restore route files
    const backupRoutes = path.join(dir, 'routes');
    if (fs.existsSync(backupRoutes)) {
        const routesDir = path.join(ROOT, 'routes');
        fs.mkdirSync(routesDir, { recursive: true });
        fs.readdirSync(backupRoutes).forEach(f => {
            fs.copyFileSync(path.join(backupRoutes, f), path.join(routesDir, f));
            console.log(`[Backup] Restored routes/${f} from ${taskId}`);
        });
    }
}

function cleanOldBackups() {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    const entries = fs.readdirSync(BACKUP_ROOT)
        .map(name => ({ name, time: fs.statSync(path.join(BACKUP_ROOT, name)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    entries.forEach((entry, i) => {
        if (i >= 10 && Date.now() - entry.time > sevenDaysMs) {
            try {
                fs.rmSync(path.join(BACKUP_ROOT, entry.name), { recursive: true, force: true });
                console.log(`[Backup] Cleaned old backup: ${entry.name}`);
            } catch {}
        }
    });
}

module.exports = { createBackup, restoreBackup, cleanOldBackups };
