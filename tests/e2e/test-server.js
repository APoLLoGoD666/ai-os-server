'use strict';
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '../../public/dashboard.html'), 'utf8');

const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];

    if (url === '/' || url === '/dashboard' || url === '/dashboard.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML);
        return;
    }
    // Stub API endpoints with empty-but-valid JSON so the page doesn't error
    if (url.startsWith('/api/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (url.includes('/activity')) res.end(JSON.stringify({ runs: [] }));
        else if (url.includes('/tasks'))   res.end(JSON.stringify({ tasks: [] }));
        else if (url.includes('/council')) res.end(JSON.stringify({ deliberations: [] }));
        else                               res.end('{}');
        return;
    }
    // Static assets
    const safePath = path.join(__dirname, '../../public', url);
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
        res.writeHead(200);
        fs.createReadStream(safePath).pipe(res);
        return;
    }
    res.writeHead(404); res.end('not found');
});

const PORT = 3099;
server.listen(PORT, () => process.stdout.write('TEST_SERVER_READY:' + PORT + '\n'));
