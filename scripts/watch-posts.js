const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const postsDirectory = path.join(root, 'posts');
let timer = null;

function synchronize() {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'sync-posts.js')], {
        cwd: root,
        stdio: 'inherit'
    });
    if (result.status !== 0) process.exitCode = result.status;
}

synchronize();
console.log('Watching posts/*.html for changes. Press Ctrl+C to stop.');

fs.watch(postsDirectory, { persistent: true }, (eventType, filename) => {
    if (!filename || !filename.toLowerCase().endsWith('.html')) return;
    clearTimeout(timer);
    timer = setTimeout(synchronize, 180);
});
