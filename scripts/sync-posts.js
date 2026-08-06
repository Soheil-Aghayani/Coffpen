const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const postsDirectory = path.join(root, 'posts');
const outputFile = path.join(postsDirectory, 'posts-data.js');

function loadExistingDates() {
    if (!fs.existsSync(outputFile)) return new Map();
    try {
        const source = fs.readFileSync(outputFile, 'utf8');
        const match = source.match(/Object\.freeze\(([\s\S]*?)\);\s*$/);
        const posts = match ? JSON.parse(match[1]) : [];
        return new Map(posts.map(post => [post.filename, post.date]));
    } catch (error) {
        return new Map();
    }
}

const existingDates = loadExistingDates();

function stripHtml(value) {
    return String(value || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function firstMatch(html, patterns) {
    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) return stripHtml(match[1]);
    }
    return '';
}

function englishDigits(value) {
    return String(value || '')
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function normalizePostImage(value) {
    const source = String(value || '')
        .replace(/&amp;/gi, '&')
        .replace(/&#39;/gi, "'")
        .trim();
    if (!source) return '';
    if (/^(?:https?:|data:|blob:)/i.test(source)) return source;
    return source
        .replace(/^\/+Coffpen\//i, '')
        .replace(/^(?:\.\.\/)+/, '')
        .replace(/^\.\//, '');
}

function metadataFromFilename(filename) {
    const base = path.basename(filename, '.html');
    const readable = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const episodeMatch = readable.match(/(?:قسمت|part)\s*([۰-۹٠-٩0-9]+)$/i);
    const episode = episodeMatch ? englishDigits(episodeMatch[1]) : '';
    const series = episodeMatch ? readable.slice(0, episodeMatch.index).trim() : '';

    return {
        title: series || readable || 'نوشته بدون عنوان',
        series,
        episode
    };
}

function getPostDate(filename, fallbackDate) {
    if (existingDates.has(filename)) return existingDates.get(filename);
    try {
        const relativePath = path.posix.join('posts', filename);
        const committedDate = execFileSync(
            'git',
            ['log', '-1', '--format=%cI', '--', relativePath],
            { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
        ).trim();
        if (committedDate) return new Date(committedDate).toISOString();
    } catch (error) {
        // New and uncommitted files use their filesystem modification time.
    }
    return fallbackDate.toISOString();
}

function parsePost(filename) {
    const fullPath = path.join(postsDirectory, filename);
    const stat = fs.statSync(fullPath);
    const html = fs.readFileSync(fullPath, 'utf8');
    const fallback = metadataFromFilename(filename);

    const title = firstMatch(html, [
        /<h1[^>]*class=["'][^"']*blackthemePostBoxTitle[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
        /<h1[^>]*>([\s\S]*?)<\/h1>/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i
    ]).split(/\s*[|–—]\s*/)[0] || fallback.title;

    let description = firstMatch(html, [
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
        /<div[^>]*class=["'][^"']*story-body[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
        /<p[^>]*>([\s\S]*?)<\/p>/i
    ]);

    const author = firstMatch(html, [
        /<meta[^>]+name=["']author["'][^>]+content=["']([^"']*)["']/i,
        /<span[^>]*class=["'][^"']*blackthemeDate[^"']*["'][^>]*>[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i
    ]) || 'سهیل آقایانی';
    const tagsText = firstMatch(html, [
        /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i,
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']keywords["']/i
    ]);
    const tags = tagsText
        ? tagsText.split(/[,،\n]/).map(tag => tag.trim().replace(/^#+/, '')).filter(Boolean)
            .filter((tag, index, list) => list.indexOf(tag) === index).slice(0, 8)
        : [];
    const contentTypeText = firstMatch(html, [
        /<meta[^>]+name=["'](?:coffpen:content-type|content-type)["'][^>]+content=["']([^"']*)["']/i
    ]).toLowerCase();
    const contentType = contentTypeText === 'note' ? 'note' : 'story';

    const seriesLink = html.match(/[?&]series=([^"'&#]+)/i);
    let series = fallback.series;
    if (seriesLink && seriesLink[1]) {
        try {
            series = decodeURIComponent(seriesLink[1]);
        } catch (error) {
            series = seriesLink[1];
        }
    }

    const episodeText = firstMatch(html, [
        /class=["'][^"']*(?:post-episode-link|preview-episode-link)[^"']*["'][^>]*>\s*قسمت\s*([۰-۹٠-٩0-9]+)/i
    ]);
    const episode = englishDigits(episodeText || fallback.episode);
    const storyBodyMatch = html.match(
        /<div[^>]*class=["'][^"']*story-body[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/article>/i
    );
    const storyBodyHtml = storyBodyMatch ? storyBodyMatch[1] : '';
    const bodyText = stripHtml(storyBodyHtml);
    const storyImageMatch = storyBodyHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    const image = storyImageMatch ? normalizePostImage(storyImageMatch[1]) : '';
    const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
    if (!description && bodyText) {
        description = bodyText.length > 190
            ? bodyText.slice(0, 187).replace(/\s+\S*$/, '') + '…'
            : bodyText;
    }

    return {
        title,
        url: 'posts/' + encodeURIComponent(filename),
        filename,
        description: description || (html.trim() ? 'برای خواندن داستان، صفحهٔ نوشته را باز کنید.' : 'فایل نوشته ایجاد شده اما هنوز محتوایی داخل آن نیست.'),
        author,
        tags,
        contentType,
        series,
        episode,
        image,
        wordCount,
        date: getPostDate(filename, stat.mtime),
        empty: !html.trim()
    };
}

fs.mkdirSync(postsDirectory, { recursive: true });

const posts = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map(entry => parsePost(entry.name))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

const output = [
    '/* Auto-generated by scripts/sync-posts.js. Do not edit manually. */',
    'window.COFFPEN_POSTS = Object.freeze(' + JSON.stringify(posts, null, 2) + ');',
    ''
].join('\n');

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`Synchronized ${posts.length} post(s) into ${path.relative(root, outputFile)}.`);
