"use strict";

/**
 * PM2 Ecosystem — APEX AI OS Local
 * Start:   pm2 start ecosystem.config.js
 * Stop:    pm2 stop apex
 * Restart: pm2 restart apex
 * Logs:    pm2 logs apex
 * Monitor: pm2 monit
 * Status:  pm2 list
 */

const path = require("path");

module.exports = {
    apps: [
        {
            name:    "apex",
            script:  "server.js",
            cwd:     path.resolve(__dirname),

            // Process management
            instances:        1,
            exec_mode:        "fork",
            autorestart:      true,
            watch:            false,
            max_restarts:     15,
            min_uptime:       "10s",
            restart_delay:    3000,
            kill_timeout:     15000,
            max_memory_restart: "1G",

            // Logs
            error_file:      "logs/apex-error.log",
            out_file:        "logs/apex-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs:      true,

            // Environment — overrides values from .env
            env: {
                NODE_ENV:     "production",
                LOCAL_MODE:   "true",
                OBSIDIAN_URL: "",       // empty = use filesystem fallback in obsidian-client.js
                PORT:         "3000"
            }
        }
        ,{
            name:    "apex-watcher",
            script:  "watcher.js",
            cwd:     path.resolve(__dirname),
            instances:        1,
            exec_mode:        "fork",
            autorestart:      true,
            watch:            false,
            max_restarts:     5,
            min_uptime:       "5s",
            restart_delay:    5000,
            error_file:      "logs/watcher-error.log",
            out_file:        "logs/watcher-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            merge_logs:      true,
            env: {
                NODE_ENV:   "production",
                LOCAL_MODE: "true",
                PORT:       "3000"
            }
        }
    ]
};
