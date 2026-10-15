'use strict';
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:3099',
        headless: true,
        viewport: { width: 1280, height: 800 },
    },
    webServer: {
        command: 'node tests/e2e/test-server.js',
        url: 'http://localhost:3099',
        stdout: 'pipe',
        reuseExistingServer: false,
        readyPattern: /TEST_SERVER_READY/,
        timeout: 10000,
    },
    reporter: [['list'], ['json', { outputFile: 'tests/e2e/results.json' }]],
});
