#!/usr/bin/env node
'use strict';

// Read-only validation for the static Coffpen publication pipeline.
// It intentionally checks generated output instead of rewriting it.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const postsDirectory = path.join(root, 'posts');
const siteUrl = 'https://soheil-aghayani.github.io/Coffpen';
const errors = [];
const warnings = [];

function fail(message) {
    errors.push(message);
}

function warn(message) {
    warnings.push(message);
}

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function decodeHtml(value) {
    return String(value || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
}

function stripHtml(value) {
    return decodeHtml(String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function collectMeta(html, name, attribute = 'name') {
    const pattern = new RegExp(
        '<meta[^>]*' + attribute + '=["\\\']' + name + '["\\\'][^>]*content=["\\\']([^"\\\']*)["\\\']',
        'gi'
    );
    return Array.from(html.matchAll(pattern), match => decodeHtml(match[1]));
}

function splitTags(values) {
    return values
        .flatMap(value => String(value || '').split(/[,،|\n]/))
        .map(value => value.replace(/^#+/, '').replace(/[\u200c\u200d]/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

function parseRegistry(file) {
    const source = fs.readFileSync(file, 'utf8');
    const match = source.match(/Object\.freeze\((\[[\s\S]*?\])\);/);
    if (!match) throw new Error(path.relative(root, file) + ' has no generated registry payload.');
    return JSON.parse(match[1]);
}

function localTarget(fromFile, reference) {
    let value = String(reference || '').trim();
    if (!value || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(value)) return null;
    value = value.split('#')[0].split('?')[0];
    if (!value || value.includes('{{')) return null;
    try {
        value = decodeURIComponent(value);
    } catch (error) {
        // Keep the original path when a malformed escape is present.
    }
    return path.resolve(path.dirname(fromFile), value);
}

function checkLocalReferences(file, html) {
    const references = [];
    const referencePattern = /(?:href|src|data-fallback-src)\s*=\s*["']([^"']+)["']/gi;
    for (const match of html.matchAll(referencePattern)) references.push(match[1]);
    references.forEach(reference => {
        const target = localTarget(file, reference);
        if (target && !fs.existsSync(target)) {
            fail(`${path.relative(root, file)} references missing local file: ${reference}`);
        }
    });
}

function collectHtmlFiles(directory) {
    const files = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...collectHtmlFiles(fullPath));
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(fullPath);
    }
    return files;
}

function checkPosts() {
    if (!fs.existsSync(postsDirectory)) {
        fail('posts/ directory is missing.');
        return { files: [], registry: [] };
    }

    const files = fs.readdirSync(postsDirectory, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
        .map(entry => entry.name);
    if (!files.length) fail('No posts/*.html files were found.');

    const registryFile = path.join(postsDirectory, 'posts-data.js');
    const minRegistryFile = path.join(postsDirectory, 'posts-data.min.js');
    let registry = [];
    let minRegistry = [];
    try {
        registry = parseRegistry(registryFile);
    } catch (error) {
        fail(error.message);
    }
    try {
        minRegistry = parseRegistry(minRegistryFile);
    } catch (error) {
        fail(error.message);
    }

    const fileSet = new Set(files);
    const registryFiles = new Set(registry.map(post => post.filename));
    const minRegistryFiles = new Set(minRegistry.map(post => post.filename));
    files.forEach(filename => {
        const fullPath = path.join(postsDirectory, filename);
        const html = fs.readFileSync(fullPath, 'utf8');
        const relative = path.relative(root, fullPath);
        if (!html.trim()) fail(`${relative} is empty.`);
        if (!/<html\b/i.test(html) || !/<\/html>/i.test(html)) fail(`${relative} is not a complete HTML document.`);
        if (!/<div[^>]+class=["'][^"']*story-body[^"']*["'][^>]*>/i.test(html)) fail(`${relative} has no .story-body container.`);
        const bodyMatch = html.match(/<div[^>]+class=["'][^"']*story-body[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/article>/i);
        if (!bodyMatch || !stripHtml(bodyMatch[1])) fail(`${relative} has no readable story content.`);
        if (/\bid=["'](?:null|undefined)["']/i.test(html)) fail(`${relative} contains an invalid generated id attribute.`);
        const ids = Array.from(html.matchAll(/\bid=["']([^"']+)["']/gi), match => match[1]);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length) fail(`${relative} contains duplicate id attributes: ${[...new Set(duplicateIds)].join(', ')}`);
        if (!/<h1\b/i.test(html) && !/<title\b/i.test(html)) fail(`${relative} has no title.`);
        if (!registryFiles.has(filename)) fail(`${relative} is missing from posts/posts-data.js.`);
        if (!minRegistryFiles.has(filename)) fail(`${relative} is missing from posts/posts-data.min.js.`);
        if (!/^[^\\/:*?"<>|]+\.html$/i.test(filename)) fail(`${relative} has an unsafe filename.`);
        checkLocalReferences(fullPath, html);

        const explicitTags = splitTags([
            ...collectMeta(html, 'coffpen:tags'),
            ...collectMeta(html, 'keywords')
        ]);
        const registryEntry = registry.find(post => post.filename === filename);
        if (registryEntry && explicitTags.length) {
            const expected = [...new Set(explicitTags.map(tag => tag.toLocaleLowerCase('fa-IR')))];
            const actual = [...new Set((registryEntry.tags || []).map(tag => String(tag).toLocaleLowerCase('fa-IR')))];
            if (expected.some(tag => !actual.includes(tag))) {
                fail(`${relative} has tags that are not present in posts-data.js.`);
            }
        }
    });

    registry.forEach(post => {
        if (!fileSet.has(post.filename)) fail(`Registry references missing file: ${post.filename}`);
        if (!post.url || !post.url.startsWith('posts/')) fail(`Registry entry has an invalid URL: ${post.filename}`);
        if (post.empty) fail(`Registry marks a published post as empty: ${post.filename}`);
    });
    if (registry.length !== files.length) {
        fail(`Registry count (${registry.length}) does not match post file count (${files.length}).`);
    }
    if (registry.length !== minRegistry.length) fail('Minified and readable registries have different entry counts.');
    if (registryFiles.size !== minRegistryFiles.size || [...registryFiles].some(filename => !minRegistryFiles.has(filename))) {
        fail('Minified and readable registries contain different post filenames.');
    }

    const duplicateEpisodes = new Map();
    registry.forEach(post => {
        if (!post.series || !post.episode) return;
        const key = post.series + '#' + post.episode;
        if (!duplicateEpisodes.has(key)) duplicateEpisodes.set(key, []);
        duplicateEpisodes.get(key).push(post.filename);
    });
    duplicateEpisodes.forEach((names, key) => {
        if (names.length > 1) fail(`Duplicate playlist episode ${key}: ${names.join(', ')}`);
    });

    return { files, registry };
}

function checkGeneratedPages(registry) {
    const archive = read('archive.html');
    const series = read('series.html');
    const sitemap = read('sitemap.xml');
    registry.forEach(post => {
        if (!archive.includes(post.url)) fail(`archive.html does not link to ${post.filename}.`);
        if (!sitemap.includes(siteUrl + '/' + post.url)) fail(`sitemap.xml does not contain ${post.filename}.`);
        if (post.series && !series.includes(post.url)) fail(`series.html does not link to ${post.filename}.`);
    });
    if (!sitemap.includes('<urlset') || !sitemap.includes('</urlset>')) fail('sitemap.xml has an invalid envelope.');
    try {
        JSON.parse(read('manifest.webmanifest'));
    } catch (error) {
        fail('manifest.webmanifest is not valid JSON.');
    }
    ['favicon.ico', 'assets/images/favicon-48.png', 'assets/images/favicon.webp'].forEach(file => {
        if (!fs.existsSync(path.join(root, file))) fail(`Required favicon is missing: ${file}`);
    });
}

function checkStaticReferences() {
    const htmlFiles = collectHtmlFiles(root).filter(file => {
        const html = fs.readFileSync(file, 'utf8');
        return !html.includes('{{') && !['_includes', '_layouts'].some(directory =>
            path.relative(root, file).split(path.sep).includes(directory)
        );
    });
    htmlFiles.forEach(file => checkLocalReferences(file, fs.readFileSync(file, 'utf8')));
    return htmlFiles.length;
}

function checkNotificationConfiguration() {
    const config = read('assets/js/firebase-config.js');
    const enabled = /enabled:\s*true/.test(config);
    if (enabled && /apiKey:\s*['"]['"]|projectId:\s*['"]['"]|vapidKey:\s*['"]['"]/.test(config)) {
        fail('Firebase notifications are enabled but the public configuration is incomplete.');
    }
    if (!enabled) warn('Firebase notifications remain disabled until the project and VAPID key are configured.');
}

function main() {
    const result = checkPosts();
    checkGeneratedPages(result.registry);
    const htmlCount = checkStaticReferences();
    checkNotificationConfiguration();

    warnings.forEach(message => console.warn('WARN: ' + message));
    if (errors.length) {
        errors.forEach(message => console.error('ERROR: ' + message));
        console.error(`Site check failed with ${errors.length} error(s).`);
        process.exitCode = 1;
        return;
    }
    console.log(`Site check passed: ${result.files.length} posts, ${result.registry.filter(post => post.series).length} playlist episodes, ${htmlCount} static HTML files.`);
}

main();
