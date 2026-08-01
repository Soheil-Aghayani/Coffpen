#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
};

http.createServer(function (request, response) {
    const pathname = decodeURIComponent(request.url.split('?')[0]);
    let filename = path.join(root, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
    if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
    fs.readFile(filename, function (error, data) {
        if (error) {
            response.statusCode = 404;
            response.end('Not found');
            return;
        }
        response.setHeader('Content-Type', contentTypes[path.extname(filename)] || 'application/octet-stream');
        response.end(data);
    });
}).listen(Number(process.env.PORT || 8765), '127.0.0.1', function () {
    console.log('Coffpen local server is ready.');
});
