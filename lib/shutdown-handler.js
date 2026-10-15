'use strict';
/**
 * lib/shutdown-handler.js
 * Graceful shutdown — stop accepting connections, drain in-flight requests, then exit.
 * Render sends SIGTERM before SIGKILL (30s window); we use 15s to be safe.
 */
const path = require('path');
const fs = require('fs');

function register(server, wsHandler) {
    function _gracefulShutdown(sig) {
        console.log(`[Shutdown] ${sig} received — closing server`);
        // Kill Ruflo daemon first (non-blocking)
        try {
            const _pidFile = path.join(__dirname, '..', '.claude-flow', 'daemon.pid');
            if (fs.existsSync(_pidFile)) {
                const _pid = parseInt(fs.readFileSync(_pidFile, 'utf8').trim(), 10);
                if (_pid > 0) { process.kill(_pid, 'SIGTERM'); fs.unlinkSync(_pidFile); }
            }
        } catch {}
        // Stop the WebSocket keepalive immediately
        wsHandler.stop();
        // Stop accepting new connections; exit when drain completes or after 15s
        server.close(() => { console.log('[Shutdown] all connections drained — exiting'); process.exit(0); });
        setTimeout(() => { console.warn('[Shutdown] drain timeout — forcing exit'); process.exit(1); }, 15000);
    }
    process.once('SIGTERM', () => _gracefulShutdown('SIGTERM'));
    process.once('SIGINT',  () => _gracefulShutdown('SIGINT'));
}

module.exports = { register };
