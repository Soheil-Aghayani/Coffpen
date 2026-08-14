const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const postsDirectory = path.join(root, 'posts');
const outputFile = path.join(postsDirectory, 'posts-data.js');
const minOutputFile = path.join(postsDirectory, 'posts-data.min.js');
const siteUrl = 'https://soheil-aghayani.github.io/Coffpen';
const sitemapFile = path.join(root, 'sitemap.xml');
const archiveFile = path.join(root, 'archive.html');
const seriesFile = path.join(root, 'series.html');
const feedFile = path.join(root, 'feed.xml');
const brandFile = path.join(root, 'coffpen.html');

function faviconLinks(prefix = '') {
    return [
        `    <link rel="icon" href="${prefix}favicon.ico" sizes="any">`,
        `    <link rel="icon" type="image/png" sizes="48x48" href="${prefix}assets/images/favicon-48.png">`,
        `    <link rel="icon" type="image/webp" sizes="64x64" href="${prefix}assets/images/favicon.webp">`,
        `    <link rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/images/apple-touch-icon.png">`,
        `    <link rel="manifest" href="${prefix}manifest.webmanifest">`
    ].join('\n');
}

function ensureFaviconLinks(html, prefix = '') {
    const withoutOldLinks = html.replace(/[ \t]*<link\s+rel=["'](?:icon|apple-touch-icon|manifest)["'][^>]*>\r?\n?/gi, '');
    const head = withoutOldLinks.match(/<head\b[^>]*>/i);
    if (!head || head.index === undefined) return html;
    const headEnd = head.index + head[0].length;
    const rest = withoutOldLinks.slice(headEnd).replace(/^(?:[ \t]*\r?\n)+/, '');
    return withoutOldLinks.slice(0, headEnd) + '\n' + faviconLinks(prefix) + '\n' + rest;
}

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

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function seriesUpdatesFromPosts(list) {
    const groups = new Map();
    list.forEach(post => {
        if (!post.series) return;
        if (!groups.has(post.series)) groups.set(post.series, []);
        groups.get(post.series).push(post);
    });
    return Array.from(groups, ([name, seriesPosts]) => {
        const ordered = seriesPosts.slice().sort((a, b) =>
            Number(b.episode || 0) - Number(a.episode || 0) || new Date(b.date) - new Date(a.date)
        );
        return {
            name,
            latest: ordered[0],
            cover: ordered.find(post => post.image)
        };
    }).sort((a, b) => new Date(b.latest.date) - new Date(a.latest.date));
}

function seriesCoverThumb(image) {
    return image && image.indexOf('assets/images/') === 0
        ? 'assets/images/thumbs/' + image.slice('assets/images/'.length)
        : image;
}

function renderStaticSeriesHub(updates) {
    return updates.map((update, index) => {
        const latest = update.latest;
        const episode = Number(latest.episode || 0).toLocaleString('fa-IR');
        const fullImage = update.cover && update.cover.image;
        const image = seriesCoverThumb(fullImage);
        const imageMarkup = image
            ? '<img src="' + escapeHtml(image) + '" data-fallback-src="' + escapeHtml(fullImage) +
                '" alt="" width="360" height="450" loading="' + (index < 2 ? 'eager' : 'lazy') +
                '" decoding="' + (index < 2 ? 'sync' : 'async') + '" fetchpriority="' + (index < 2 ? 'high' : 'low') +
                '" onerror="this.onerror=null;this.src=this.dataset.fallbackSrc">'
            : '<span class="series-update-cover-fallback" aria-hidden="true"></span>';
        return '<a class="series-hub-card" href="index.html?series=' + encodeURIComponent(update.name) + '#latest-posts-heading">' +
            '<span class="series-update-cover">' + imageMarkup + '</span>' +
            '<span class="series-hub-copy"><strong>' + escapeHtml(update.name) + '</strong></span>' +
            '<span class="series-hub-latest"><span class="series-update-badge">قسمت جدید ' + episode + '</span></span>' +
            '</a>';
    }).join('');
}

function jsonForHtml(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

function absolutePostUrl(post) {
    return siteUrl + '/' + post.url;
}

function postSection(post) {
    return post.contentType === 'note' ? 'دل‌نوشته' : (post.series || 'داستان کوتاه');
}

function renderPostSeo(post) {
    const canonical = absolutePostUrl(post);
    const image = post.image
        ? (/^(?:https?:|data:)/i.test(post.image) ? post.image : siteUrl + '/' + post.image)
        : siteUrl + '/assets/images/social-preview.jpg';
    const section = postSection(post);
    const keywords = [...new Set([
        ...(post.tags.length ? post.tags : [section]),
        'کافپن',
        'کاف‌پن',
        'Coffpen',
        'سیاه و قلم'
    ])];
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Article',
                '@id': canonical + '#article',
                'headline': post.title,
                'description': post.description,
                'url': canonical,
                'inLanguage': 'fa-IR',
                'isPartOf': { '@id': siteUrl + '/#website' },
                'mainEntityOfPage': { '@type': 'WebPage', '@id': canonical },
                'author': {
                    '@type': 'Person',
                    '@id': siteUrl + '/about.html#author',
                    'name': 'سهیل آقایانی'
                },
                'publisher': {
                    '@type': 'Person',
                    '@id': siteUrl + '/about.html#author',
                    'name': 'سهیل آقایانی'
                },
                'datePublished': post.date,
                'dateModified': post.date,
                'image': [image],
                'articleSection': section,
                'keywords': keywords.join(', '),
                'isAccessibleForFree': true,
                ...(post.wordCount ? { wordCount: post.wordCount } : {})
            },
            {
                '@type': 'BreadcrumbList',
                '@id': canonical + '#breadcrumb',
                'itemListElement': [
                    { '@type': 'ListItem', position: 1, name: 'کافپن', item: siteUrl + '/' },
                    { '@type': 'ListItem', position: 2, name: post.title, item: canonical }
                ]
            }
        ]
    };
    const tagMeta = keywords.map(tag =>
        '    <meta property="article:tag" content="' + escapeHtml(tag) + '">'
    ).join('\n');
    return [
        '<!-- Coffpen:post-seo:start -->',
        '    <meta name="robots" content="index,follow,max-image-preview:large">',
        '    <meta name="googlebot" content="index,follow,max-image-preview:large">',
        '    <meta name="application-name" content="کافپن (کاف‌پن / Coffpen)">',
        '    <meta name="author" content="سهیل آقایانی">',
        '    <meta property="article:published_time" content="' + escapeHtml(post.date) + '">',
        '    <meta property="article:modified_time" content="' + escapeHtml(post.date) + '">',
        '    <meta property="article:section" content="' + escapeHtml(section) + '">',
        '    <link rel="alternate" type="application/rss+xml" title="کافپن (Coffpen)" href="../feed.xml">',
        tagMeta,
        '    <script type="application/ld+json">' + jsonForHtml(graph) + '</script>',
        '<!-- Coffpen:post-seo:end -->'
    ].filter(Boolean).join('\n');
}

function syncGeneratedPostSeo(list) {
    list.forEach(post => {
        const file = path.join(postsDirectory, post.filename);
        const source = ensureFaviconLinks(fs.readFileSync(file, 'utf8'), '../');
        const block = renderPostSeo(post);
        const marker = /<!-- Coffpen:post-seo:start -->[\s\S]*?<!-- Coffpen:post-seo:end -->/;
        const original = fs.readFileSync(file, 'utf8');
        const updated = marker.test(source)
            ? source.replace(marker, block)
            : source.replace(/<\/head>/i, block + '\n</head>');
        if (updated !== original) fs.writeFileSync(file, updated, 'utf8');
    });
}

function renderIndexStructuredData(list) {
    const visiblePosts = list.filter(post => !post.empty).slice(0, 12);
    const personId = siteUrl + '/about.html#author';
    const graph = [
        {
            '@type': 'WebSite',
            '@id': siteUrl + '/#website',
            'url': siteUrl + '/',
            'name': 'کافپن (کاف‌پن / Coffpen) | سیاه و قلم',
            'alternateName': ['کافپن', 'کاف‌پن', 'کاف پن', 'Coffpen', 'سیاه و قلم'],
            'description': 'وبلاگ مستقل کافپن (کاف‌پن / Coffpen) متعلق به سهیل آقایانی برای داستان‌های کوتاه فارسی، مجموعه‌های داستانی و دل‌نوشته‌ها.',
            'inLanguage': 'fa-IR',
            'potentialAction': {
                '@type': 'SearchAction',
                'target': {
                    '@type': 'EntryPoint',
                    'urlTemplate': siteUrl + '/?q={search_term_string}'
                },
                'query-input': 'required name=search_term_string'
            },
            'publisher': { '@id': personId }
        },
        {
            '@type': 'Person',
            '@id': personId,
            'name': 'سهیل آقایانی',
            'alternateName': ['کافپن', 'کاف‌پن', 'کاف پن', 'Coffpen', 'سیاه و قلم'],
            'url': siteUrl + '/about.html',
            'image': siteUrl + '/assets/images/author-avatar.webp',
            'jobTitle': 'نویسنده و توسعه‌دهنده وب',
            'sameAs': [
                'https://github.com/soheil-aghayani',
                'https://github.com/Soheil-Aghayani/Coffpen',
                'https://soheil-aghayani.github.io/Portfolio/'
            ]
        },
        {
            '@type': 'CollectionPage',
            '@id': siteUrl + '/#home',
            'url': siteUrl + '/',
            'name': 'کافپن؛ داستان و دل‌نوشته فارسی',
            'description': 'آرشیو داستان‌های کوتاه، مجموعه‌های دنباله‌دار و دل‌نوشته‌های سهیل آقایانی در کافپن.',
            'inLanguage': 'fa-IR',
            'isPartOf': { '@id': siteUrl + '/#website' },
            'about': { '@id': personId },
            'mainEntity': {
                '@type': 'ItemList',
                'name': 'آخرین نوشته‌های کافپن',
                'numberOfItems': visiblePosts.length,
                'itemListElement': visiblePosts.map((post, index) => ({
                    '@type': 'ListItem',
                    'position': index + 1,
                    'item': {
                        '@type': 'Article',
                        'name': post.title,
                        'url': absolutePostUrl(post),
                        'headline': post.title
                    }
                }))
            }
        }
    ];
    return '<!-- Coffpen:structured-data:start -->\n    <script type="application/ld+json">' +
        jsonForHtml({ '@context': 'https://schema.org', '@graph': graph }) +
        '</script>\n    <!-- Coffpen:structured-data:end -->';
}

function renderFeaturedPosts(list) {
    const selected = [];
    const add = post => {
        if (post && !post.empty && !selected.some(item => item.filename === post.filename)) selected.push(post);
    };
    add(list.find(post => post.contentType === 'note'));
    add(list.find(post => post.contentType === 'story' && !post.series));
    seriesUpdatesFromPosts(list).forEach(update => add(update.latest));
    list.forEach(add);
    return selected.slice(0, 6).map(post =>
        '<a href="' + escapeHtml(post.url) + '">' +
            '<strong>' + escapeHtml(post.title) + '</strong>' +
            '<span>' + escapeHtml(postSection(post)) + '</span>' +
        '</a>'
    ).join('');
}

function renderArchivePage(list) {
    const visiblePosts = list.filter(post => !post.empty);
    const archiveCanonical = siteUrl + '/archive.html';
    const archiveItems = visiblePosts.map(post => {
        const section = postSection(post);
        const episode = post.episode
            ? '<span class="archive-item-episode">قسمت ' + escapeHtml(Number(post.episode).toLocaleString('fa-IR')) + '</span>'
            : '';
        const tags = post.tags.length
            ? '<div class="archive-item-tags">' + post.tags.slice(0, 4).map(tag => '<span>' + escapeHtml(tag) + '</span>').join('') + '</div>'
            : '';
        return [
            '<article class="archive-item" data-content-type="' + escapeHtml(post.contentType) + '"' +
                (post.series ? ' data-series="' + escapeHtml(post.series) + '"' : '') + '>',
            '  <div class="archive-item-copy">',
            '    <p class="archive-item-meta"><span>' + escapeHtml(section) + '</span>' + episode + '</p>',
            '    <h2><a href="' + escapeHtml(post.url) + '">' + escapeHtml(post.title) + '</a></h2>',
            '    <p class="archive-item-description">' + escapeHtml(post.description) + '</p>',
            tags,
            '  </div>',
            '  <a class="archive-item-read" href="' + escapeHtml(post.url) + '">خواندن <span aria-hidden="true">←</span></a>',
            '</article>'
        ].filter(Boolean).join('\n');
    }).join('\n');
    const itemList = visiblePosts.map((post, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
            '@type': 'Article',
            'name': post.title,
            'headline': post.title,
            'url': absolutePostUrl(post),
            'articleSection': postSection(post),
            'inLanguage': 'fa-IR'
        }
    }));
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': archiveCanonical + '#archive',
                'url': archiveCanonical,
                'name': 'آرشیو داستان‌ها و دل‌نوشته‌های کافپن',
                'description': 'فهرست کامل داستان‌های کوتاه، مجموعه‌های داستانی و دل‌نوشته‌های سهیل آقایانی در کافپن.',
                'inLanguage': 'fa-IR',
                'isPartOf': { '@id': siteUrl + '/#website' },
                'about': { '@id': siteUrl + '/about.html#author' },
                'mainEntity': {
                    '@type': 'ItemList',
                    'name': 'همهٔ نوشته‌های کافپن',
                    'numberOfItems': itemList.length,
                    'itemListElement': itemList
                }
            },
            {
                '@type': 'BreadcrumbList',
                '@id': archiveCanonical + '#breadcrumb',
                'itemListElement': [
                    { '@type': 'ListItem', position: 1, name: 'کافپن', item: siteUrl + '/' },
                    { '@type': 'ListItem', position: 2, name: 'آرشیو نوشته‌ها', item: archiveCanonical }
                ]
            }
        ]
    };
    return '<!doctype html>\n' +
        '<html lang="fa" dir="rtl" data-theme="sepia">\n' +
        '<head>\n' +
        '  <meta charset="utf-8">\n' +
        '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '  <title>آرشیو داستان‌ها و دل‌نوشته‌ها | کافپن (کاف‌پن / Coffpen)</title>\n' +
        '  <meta name="description" content="فهرست کامل داستان‌های کوتاه، مجموعه‌های داستانی و دل‌نوشته‌های سهیل آقایانی در کافپن.">\n' +
        '  <meta name="author" content="سهیل آقایانی">\n' +
        '  <meta name="robots" content="index,follow,max-image-preview:large">\n' +
        '  <link rel="canonical" href="' + archiveCanonical + '">\n' +
        '  <link rel="alternate" type="application/rss+xml" title="کافپن (Coffpen)" href="feed.xml">\n' +
        faviconLinks() + '\n' +
        '  <link rel="stylesheet" href="assets/css/style.min.css">\n' +
        '  <script type="application/ld+json">' + jsonForHtml(graph) + '</script>\n' +
        '  <style>\n' +
        '    body{min-height:100vh;padding:28px 16px;background:var(--bg-body);}\n' +
        '    .archive-shell{width:min(100%,920px);margin:0 auto;padding:clamp(22px,4vw,46px);border:1px solid var(--border-color);border-radius:22px;background:var(--bg-box);box-shadow:var(--shadow-box);}\n' +
        '    .archive-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--border-subtle);}\n' +
        '    .archive-kicker{margin:0 0 6px;color:var(--text-accent);font-size:.82rem;font-weight:700;}\n' +
        '    .archive-header h1{margin:0;color:var(--text-main);font-size:clamp(1.55rem,4vw,2.25rem);line-height:1.5;}\n' +
        '    .archive-header p{max-width:620px;margin:8px 0 0;color:var(--text-muted);font-size:.9rem;}\n' +
        '    .archive-nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-start;}\n' +
        '    .archive-nav a{padding:8px 12px;border:1px solid var(--border-color);border-radius:10px;color:var(--text-muted);font-size:.8rem;}\n' +
        '    .archive-nav a:hover{color:var(--text-accent);border-color:var(--text-accent);}\n' +
        '    .archive-count{margin:24px 0 12px;color:var(--text-muted);font-size:.82rem;}\n' +
        '    .archive-list{display:grid;gap:12px;}\n' +
        '    .archive-item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:17px 18px;border:1px solid var(--border-color);border-radius:15px;background:var(--bg-card);}\n' +
        '    .archive-item-copy{min-width:0;}\n' +
        '    .archive-item-meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 4px;color:var(--text-muted);font-size:.74rem;}\n' +
        '    .archive-item-episode{color:var(--text-accent);font-weight:700;}\n' +
        '    .archive-item h2{margin:0;font-size:1.08rem;line-height:1.7;}\n' +
        '    .archive-item h2 a{color:var(--text-main);}\n' +
        '    .archive-item h2 a:hover{color:var(--text-accent);}\n' +
        '    .archive-item-description{display:-webkit-box;overflow:hidden;margin:4px 0 0;color:var(--text-muted);font-size:.82rem;line-height:1.8;-webkit-box-orient:vertical;-webkit-line-clamp:2;}\n' +
        '    .archive-item-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}\n' +
        '    .archive-item-tags span{padding:2px 7px;border-radius:999px;background:var(--bg-tag);color:var(--text-muted);font-size:.68rem;}\n' +
        '    .archive-item-read{white-space:nowrap;color:var(--text-accent);font-size:.8rem;font-weight:700;}\n' +
        '    .archive-footer{margin-top:28px;padding-top:18px;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:.78rem;}\n' +
        '    @media(max-width:600px){body{padding:0}.archive-shell{border:0;border-radius:0;box-shadow:none}.archive-header{display:block}.archive-nav{margin-top:16px}.archive-item{grid-template-columns:1fr;gap:8px}.archive-item-read{justify-self:start;}}\n' +
        '  </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '  <div class="archive-shell">\n' +
        '    <header class="archive-header">\n' +
        '      <div><p class="archive-kicker">کتابخانهٔ کاف‌پن</p><h1>آرشیو داستان‌ها و دل‌نوشته‌ها</h1><p>همهٔ نوشته‌های منتشرشدهٔ سهیل آقایانی، از داستان‌های مستقل تا قسمت‌های مجموعه‌های دنباله‌دار.</p></div>\n' +
        '      <nav class="archive-nav" aria-label="پیوندهای کاف‌پن"><a href="./">صفحهٔ اصلی</a><a href="about.html">دربارهٔ نویسنده</a></nav>\n' +
        '    </header>\n' +
        '    <p class="archive-count">' + escapeHtml(visiblePosts.length.toLocaleString('fa-IR')) + ' نوشته در این آرشیو</p>\n' +
        '    <main id="archive-main"><section class="archive-list" aria-label="فهرست نوشته‌ها">\n' +
        archiveItems + '\n' +
        '    </section></main>\n' +
        '    <footer class="archive-footer">کاف‌پن (Coffpen) — داستان کوتاه فارسی، مجموعه‌های داستانی و دل‌نوشته‌های سهیل آقایانی.</footer>\n' +
        '  </div>\n' +
        '</body>\n' +
        '</html>\n';
}

function renderSeriesPage(list) {
    const groups = new Map();
    list.filter(post => !post.empty && post.series).forEach(post => {
        if (!groups.has(post.series)) groups.set(post.series, []);
        groups.get(post.series).push(post);
    });
    const seriesGroups = Array.from(groups, ([name, seriesPosts]) => ({
        name,
        posts: seriesPosts.slice().sort((a, b) => Number(b.episode || 0) - Number(a.episode || 0) || new Date(b.date) - new Date(a.date))
    })).sort((a, b) => new Date(b.posts[0].date) - new Date(a.posts[0].date));
    const seriesCanonical = siteUrl + '/series.html';
    const cards = seriesGroups.map((group, index) => {
        const id = 'series-' + (index + 1);
        const latest = group.posts[0];
        const episodes = group.posts.map(post => {
            const episode = post.episode
                ? '<span>قسمت ' + escapeHtml(Number(post.episode).toLocaleString('fa-IR')) + '</span>'
                : '<span>نوشته</span>';
            return '<li><a href="' + escapeHtml(post.url) + '"><strong>' + escapeHtml(post.title) + '</strong>' + episode + '</a></li>';
        }).join('');
        return '<section class="series-archive-card" id="' + id + '">' +
            '<div class="series-archive-card-head"><div><p class="series-archive-kicker">مجموعهٔ داستانی</p>' +
            '<h2>' + escapeHtml(group.name) + '</h2><p>' + escapeHtml(group.posts.length.toLocaleString('fa-IR')) + ' قسمت منتشرشده؛ تازه‌ترین قسمت: ' + escapeHtml(latest.title) + '</p></div>' +
            '<a href="' + escapeHtml(latest.url) + '" class="series-archive-latest">آخرین قسمت <span aria-hidden="true">←</span></a></div>' +
            '<ol class="series-archive-episodes" aria-label="قسمت‌های ' + escapeHtml(group.name) + '">' + episodes + '</ol></section>';
    }).join('\n');
    const seriesItems = seriesGroups.map((group, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
            '@type': 'CreativeWorkSeries',
            '@id': seriesCanonical + '#series-' + (index + 1),
            'name': group.name,
            'url': seriesCanonical + '#series-' + (index + 1),
            'numberOfItems': group.posts.length
        }
    }));
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [{
            '@type': 'CollectionPage',
            '@id': seriesCanonical + '#collections',
            'url': seriesCanonical,
            'name': 'مجموعه‌های داستانی کافپن',
            'description': 'فهرست مجموعه‌های داستانی دنباله‌دار کافپن و قسمت‌های منتشرشدهٔ هر مجموعه.',
            'inLanguage': 'fa-IR',
            'isPartOf': { '@id': siteUrl + '/#website' },
            'about': { '@id': siteUrl + '/about.html#author' },
            'mainEntity': { '@type': 'ItemList', 'name': 'مجموعه‌های داستانی', 'numberOfItems': seriesItems.length, 'itemListElement': seriesItems }
        }, {
            '@type': 'BreadcrumbList',
            '@id': seriesCanonical + '#breadcrumb',
            'itemListElement': [
                { '@type': 'ListItem', position: 1, name: 'کافپن', item: siteUrl + '/' },
                { '@type': 'ListItem', position: 2, name: 'مجموعه‌های داستانی', item: seriesCanonical }
            ]
        }]
    };
    return '<!doctype html>\n' +
        '<html lang="fa" dir="rtl" data-theme="sepia">\n<head>\n' +
        '  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '  <title>مجموعه‌های داستانی دنباله‌دار | کافپن (کاف‌پن / Coffpen)</title>\n' +
        '  <meta name="description" content="فهرست مجموعه‌های داستانی دنباله‌دار کافپن و قسمت‌های منتشرشدهٔ هر مجموعه.">\n' +
        '  <meta name="author" content="سهیل آقایانی"><meta name="robots" content="index,follow,max-image-preview:large">\n' +
        '  <link rel="canonical" href="' + seriesCanonical + '"><link rel="alternate" type="application/rss+xml" title="کافپن (Coffpen)" href="feed.xml">\n' +
        faviconLinks() + '\n' +
        '  <link rel="stylesheet" href="assets/css/style.min.css"><script type="application/ld+json">' + jsonForHtml(graph) + '</script>\n' +
        '  <style>\n' +
        '    body{min-height:100vh;padding:28px 16px;background:var(--bg-body)}.series-shell{width:min(100%,920px);margin:0 auto;padding:clamp(22px,4vw,46px);border:1px solid var(--border-color);border-radius:22px;background:var(--bg-box);box-shadow:var(--shadow-box)}\n' +
        '    .series-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--border-subtle)}.series-header h1{margin:0;color:var(--text-main);font-size:clamp(1.55rem,4vw,2.25rem);line-height:1.5}.series-header p{max-width:650px;margin:8px 0 0;color:var(--text-muted);font-size:.9rem}.series-kicker,.series-archive-kicker{margin:0 0 6px;color:var(--text-accent);font-size:.82rem;font-weight:700}.series-nav{display:flex;flex-wrap:wrap;gap:8px}.series-nav a,.series-archive-latest{padding:8px 12px;border:1px solid var(--border-color);border-radius:10px;color:var(--text-muted);font-size:.8rem}.series-nav a:hover,.series-archive-latest:hover{color:var(--text-accent);border-color:var(--text-accent)}\n' +
        '    .series-archive-list{display:grid;gap:16px;margin-top:24px}.series-archive-card{padding:19px;border:1px solid var(--border-color);border-radius:16px;background:var(--bg-card)}.series-archive-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.series-archive-card h2{margin:0;color:var(--text-main);font-size:1.25rem}.series-archive-card-head p:last-child{margin:5px 0 0;color:var(--text-muted);font-size:.78rem}.series-archive-episodes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 10px;margin:18px 0 0;padding:16px 0 0;border-top:1px solid var(--border-subtle);list-style:none}.series-archive-episodes li a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--border-subtle);border-radius:9px;color:var(--text-main);font-size:.82rem}.series-archive-episodes li a:hover{color:var(--text-accent);border-color:var(--text-accent)}.series-archive-episodes span{white-space:nowrap;color:var(--text-muted);font-size:.72rem}.series-footer{margin-top:28px;padding-top:18px;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:.78rem}@media(max-width:620px){body{padding:0}.series-shell{border:0;border-radius:0;box-shadow:none}.series-header{display:block}.series-nav{margin-top:16px}.series-archive-card-head{display:block}.series-archive-latest{display:inline-flex;margin-top:12px}.series-archive-episodes{grid-template-columns:1fr}}\n' +
        '  </style>\n</head>\n<body>\n' +
        '  <div class="series-shell"><header class="series-header"><div><p class="series-kicker">کتابخانهٔ کاف‌پن</p><h1>مجموعه‌های داستانی دنباله‌دار</h1><p>هر مجموعه را یک‌جا و به‌ترتیب ببینید؛ از تازه‌ترین قسمت شروع کنید یا به قسمت دلخواه بروید.</p></div><nav class="series-nav" aria-label="پیوندهای کاف‌پن"><a href="./">صفحهٔ اصلی</a><a href="archive.html">آرشیو کامل</a></nav></header>\n' +
        '    <main id="series-main" class="series-archive-list" aria-label="مجموعه‌های داستانی">' + cards + '</main>\n' +
        '    <footer class="series-footer">کاف‌پن (Coffpen) — مجموعه‌های داستانی فارسیِ سهیل آقایانی.</footer></div>\n</body>\n</html>\n';
}

function renderBrandPage(list) {
    const visiblePosts = list.filter(post => !post.empty);
    const seriesCount = new Set(list.filter(post => !post.empty && post.series).map(post => post.series)).size;
    const brandCanonical = siteUrl + '/coffpen.html';
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'AboutPage',
                '@id': brandCanonical + '#about',
                'url': brandCanonical,
                'name': 'کافپن (کاف‌پن / Coffpen) | سیاه و قلم',
                'description': 'کافپن یا کاف‌پن، وبلاگ مستقل سهیل آقایانی برای داستان‌های کوتاه فارسی، مجموعه‌های داستانی و دل‌نوشته‌هاست.',
                'inLanguage': 'fa-IR',
                'isPartOf': { '@id': siteUrl + '/#website' },
                'mainEntity': { '@id': siteUrl + '/about.html#author' }
            },
            {
                '@type': 'DefinedTerm',
                '@id': brandCanonical + '#term',
                'name': 'کافپن (کاف‌پن / Coffpen)',
                'alternateName': ['کافپن', 'کاف‌پن', 'کاف پن', 'Coffpen', 'سیاه و قلم'],
                'description': 'نام وبلاگ مستقل سهیل آقایانی برای انتشار داستان کوتاه فارسی، مجموعه‌های دنباله‌دار و دل‌نوشته‌های شخصی.',
                'inDefinedTermSet': { '@id': siteUrl + '/#website' }
            },
            {
                '@type': 'Brand',
                '@id': brandCanonical + '#brand',
                'name': 'کافپن',
                'alternateName': ['کاف‌پن', 'کاف پن', 'Coffpen'],
                'url': brandCanonical,
                'logo': siteUrl + '/assets/images/favicon-48.png',
                'sameAs': [siteUrl + '/', siteUrl + '/about.html']
            },
            {
                '@type': 'BreadcrumbList',
                '@id': brandCanonical + '#breadcrumb',
                'itemListElement': [
                    { '@type': 'ListItem', position: 1, name: 'کافپن', item: siteUrl + '/' },
                    { '@type': 'ListItem', position: 2, name: 'دربارهٔ کافپن', item: brandCanonical }
                ]
            }
        ]
    };
    return '<!doctype html>\n' +
        '<html lang="fa" dir="rtl" data-theme="sepia">\n<head>\n' +
        '  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '  <title>کافپن (کاف‌پن / Coffpen) | سیاه و قلم</title>\n' +
        '  <meta name="description" content="کافپن یا کاف‌پن (Coffpen)، وبلاگ مستقل سهیل آقایانی برای داستان‌های کوتاه فارسی، مجموعه‌های داستانی و دل‌نوشته‌هاست.">\n' +
        '  <meta name="author" content="سهیل آقایانی"><meta name="application-name" content="کافپن (کاف‌پن / Coffpen)">\n' +
        '  <meta name="robots" content="index,follow,max-image-preview:large"><meta name="googlebot" content="index,follow,max-image-preview:large">\n' +
        '  <link rel="canonical" href="' + brandCanonical + '"><link rel="alternate" type="application/rss+xml" title="کافپن (Coffpen)" href="feed.xml">\n' +
        faviconLinks() + '\n' +
        '  <link rel="stylesheet" href="assets/css/style.min.css"><script type="application/ld+json">' + jsonForHtml(graph) + '</script>\n' +
        '  <style>body{min-height:100vh;padding:28px 16px;background:var(--bg-body)}.brand-shell{width:min(100%,860px);margin:0 auto;padding:clamp(24px,5vw,56px);border:1px solid var(--border-color);border-radius:24px;background:var(--bg-box);box-shadow:var(--shadow-box)}.brand-kicker{margin:0 0 8px;color:var(--text-accent);font-size:.84rem;font-weight:700}.brand-shell h1{margin:0;color:var(--text-main);font-size:clamp(1.7rem,5vw,2.8rem);line-height:1.5}.brand-lede{max-width:700px;margin:14px 0 0;color:var(--text-muted);font-size:1rem;line-height:2}.brand-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:28px 0}.brand-stat{padding:16px;border:1px solid var(--border-subtle);border-radius:14px;background:var(--bg-card)}.brand-stat strong{display:block;color:var(--text-main);font-size:1.35rem}.brand-stat span{display:block;margin-top:4px;color:var(--text-muted);font-size:.78rem}.brand-section{padding-top:24px;margin-top:24px;border-top:1px solid var(--border-subtle)}.brand-section h2{margin:0 0 10px;color:var(--text-main);font-size:1.25rem}.brand-section p{margin:0;color:var(--text-muted);line-height:2}.brand-variants{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.brand-variants span{padding:6px 10px;border:1px solid var(--border-color);border-radius:999px;color:var(--text-muted);font-size:.78rem}.brand-links{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.brand-links a{padding:9px 13px;border:1px solid var(--border-color);border-radius:10px;color:var(--text-main);font-size:.82rem}.brand-links a:hover{color:var(--text-accent);border-color:var(--text-accent)}.brand-footer{margin-top:30px;padding-top:18px;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:.78rem}@media(max-width:620px){body{padding:0}.brand-shell{border:0;border-radius:0;box-shadow:none}.brand-grid{grid-template-columns:1fr 1fr}.brand-stat:last-child{grid-column:1/-1}}</style>\n' +
        '</head>\n<body>\n' +
        '  <main class="brand-shell">\n' +
        '    <p class="brand-kicker">هویت وبلاگ</p>\n' +
        '    <h1>کافپن (کاف‌پن / Coffpen)؛ سیاه و قلم</h1>\n' +
        '    <p class="brand-lede"><strong>کافپن</strong> نام وبلاگ مستقل سهیل آقایانی است؛ جایی برای داستان‌های کوتاه فارسی، مجموعه‌های دنباله‌دار و دل‌نوشته‌های شخصی. «کاف‌پن»، «کاف پن» و «Coffpen» شکل‌های دیگر همین نام‌اند.</p>\n' +
        '    <div class="brand-grid" aria-label="آمار کافپن">\n' +
        '      <div class="brand-stat"><strong>' + escapeHtml(visiblePosts.length.toLocaleString('fa-IR')) + '</strong><span>نوشتهٔ منتشرشده</span></div>\n' +
        '      <div class="brand-stat"><strong>' + escapeHtml(seriesCount.toLocaleString('fa-IR')) + '</strong><span>مجموعهٔ داستانی</span></div>\n' +
        '      <div class="brand-stat"><strong>سهیل آقایانی</strong><span>نویسنده و توسعه‌دهندهٔ وب</span></div>\n' +
        '    </div>\n' +
        '    <section class="brand-section"><h2>کافپن چیست؟</h2><p>کافپن یا سیاه و قلم یک دفتر آنلاین فارسی برای خواندن روایت‌های مستقل، قسمت‌های مجموعه‌های داستانی و یادداشت‌های شخصی است. متن‌ها بدون نیاز به حساب کاربری و با تمرکز بر خوانایی منتشر می‌شوند.</p><div class="brand-variants" aria-label="نام‌های دیگر کافپن"><span>کافپن</span><span>کاف‌پن</span><span>کاف پن</span><span>Coffpen</span><span>سیاه و قلم</span></div></section>\n' +
        '    <section class="brand-section"><h2>از کجا شروع کنم؟</h2><p>برای دیدن نوشته‌های تازه به صفحهٔ اصلی بروید؛ برای پیدا کردن یک عنوان قدیمی آرشیو را باز کنید و برای خواندن قسمت‌ها به‌ترتیب، صفحهٔ مجموعه‌های داستانی را ببینید.</p><nav class="brand-links" aria-label="صفحات اصلی کافپن"><a href="index.html">صفحهٔ اصلی</a><a href="archive.html">آرشیو نوشته‌ها</a><a href="series.html">مجموعه‌های داستانی</a><a href="about.html">دربارهٔ سهیل آقایانی</a></nav></section>\n' +
        '    <footer class="brand-footer">کافپن (کاف‌پن / Coffpen) — داستان کوتاه فارسی و دل‌نوشته‌های سهیل آقایانی.</footer>\n' +
        '  </main>\n</body>\n</html>\n';
}

function renderFeedXml(list) {
    const visiblePosts = list.filter(post => !post.empty);
    const lastBuildDate = visiblePosts[0] ? new Date(visiblePosts[0].date).toUTCString() : new Date(0).toUTCString();
    const items = visiblePosts.map(post => {
        const canonical = absolutePostUrl(post);
        const pubDate = new Date(post.date).toUTCString();
        return [
            '    <item>',
            '      <title>' + escapeXml(post.title) + '</title>',
            '      <description>' + escapeXml(post.description) + '</description>',
            '      <pubDate>' + escapeXml(pubDate) + '</pubDate>',
            '      <link>' + escapeXml(canonical) + '</link>',
            '      <guid isPermaLink="true">' + escapeXml(canonical) + '</guid>',
            '      <category>' + escapeXml(postSection(post)) + '</category>',
            '    </item>'
        ].join('\n');
    }).join('\n');
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        '    <title>کافپن (کاف‌پن / Coffpen) | سیاه و قلم</title>',
        '    <description>وبلاگ مستقل کافپن (کاف‌پن / Coffpen) متعلق به سهیل آقایانی برای داستان‌های کوتاه فارسی، مجموعه‌های داستانی و دل‌نوشته‌ها.</description>',
        '    <link>' + escapeXml(siteUrl + '/') + '</link>',
        '    <atom:link href="' + escapeXml(siteUrl + '/feed.xml') + '" rel="self" type="application/rss+xml"/>',
        '    <language>fa-IR</language>',
        '    <lastBuildDate>' + escapeXml(lastBuildDate) + '</lastBuildDate>',
        '    <generator>Coffpen sync-posts.js</generator>',
        items,
        '  </channel>',
        '</rss>',
        ''
    ].filter(Boolean).join('\n');
}

syncGeneratedPostSeo(posts);

fs.writeFileSync(archiveFile, renderArchivePage(posts), 'utf8');
fs.writeFileSync(seriesFile, renderSeriesPage(posts), 'utf8');
fs.writeFileSync(feedFile, renderFeedXml(posts), 'utf8');
fs.writeFileSync(brandFile, renderBrandPage(posts), 'utf8');

const indexFile = path.join(root, 'index.html');
if (fs.existsSync(indexFile)) {
    const minifiedStylesheet = fs.readFileSync(path.join(root, 'assets', 'css', 'style.min.css'), 'utf8')
        .replace(/\.\.\/fonts\//g, 'assets/fonts/');
    const marker = '<div id="seriesHubList" class="series-hub-list"><!-- Coffpen:series-hub --></div>';
    const staticMarkerPattern = /<div id="seriesHubList" class="series-hub-list"><!-- Coffpen:series-hub:start -->[\s\S]*?<!-- Coffpen:series-hub:end --><\/div>/;
    let indexHtml = ensureFaviconLinks(fs.readFileSync(indexFile, 'utf8'));
    indexHtml = indexHtml.replace(
        /<!-- Coffpen:inline-style:start -->[\s\S]*?<!-- Coffpen:inline-style:end -->/,
        '<!-- Coffpen:inline-style:start -->\n    <style id="coffpen-inline-style">\n' + minifiedStylesheet +
            '\n    </style>\n    <!-- Coffpen:inline-style:end -->'
    );
    const staticHub = '<div id="seriesHubList" class="series-hub-list"><!-- Coffpen:series-hub:start -->' +
        renderStaticSeriesHub(seriesUpdatesFromPosts(posts)) +
        '<!-- Coffpen:series-hub:end --></div>';
    if (staticMarkerPattern.test(indexHtml)) indexHtml = indexHtml.replace(staticMarkerPattern, staticHub);
    else if (indexHtml.includes(marker)) indexHtml = indexHtml.replace(marker, staticHub);
    const structuredDataPattern = /<!-- Coffpen:structured-data:start -->[\s\S]*?<!-- Coffpen:structured-data:end -->/;
    if (structuredDataPattern.test(indexHtml)) indexHtml = indexHtml.replace(structuredDataPattern, renderIndexStructuredData(posts));
    const discoveryPattern = /<section class="seo-discovery"[\s\S]*?<!-- Coffpen:featured-posts:end -->[\s\S]*?<\/section>/;
    const discoverySection = '<section class="seo-discovery" aria-labelledby="coffpen-discovery-title">' +
        '<div class="seo-discovery-heading"><p class="eyebrow">راهنمای کافپن</p>' +
        '<h2 id="coffpen-discovery-title">کافپن (کاف‌پن / Coffpen) را از اینجا بشناسید</h2>' +
        '<p>کافپن (کاف‌پن / کاف پن / Coffpen) نام خاص این وبلاگ و دفتر داستان کوتاه فارسی، مجموعه‌های دنباله‌دار و دل‌نوشته‌های سهیل آقایانی است. برای شروع یکی از این نوشته‌ها را انتخاب کنید. <a href="coffpen.html">دربارهٔ کافپن</a> · <a href="archive.html">آرشیو کامل نوشته‌ها</a> · <a href="series.html">مجموعه‌های داستانی</a></p></div>' +
        '<nav class="seo-discovery-links" aria-label="شروع خواندن در کافپن"><!-- Coffpen:featured-posts:start -->' +
        renderFeaturedPosts(posts) +
        '<!-- Coffpen:featured-posts:end --></nav></section>';
    if (discoveryPattern.test(indexHtml)) indexHtml = indexHtml.replace(discoveryPattern, discoverySection);
    fs.writeFileSync(indexFile, indexHtml, 'utf8');
}

const aboutFile = path.join(root, 'about.html');
if (fs.existsSync(aboutFile)) {
    const aboutHtml = ensureFaviconLinks(fs.readFileSync(aboutFile, 'utf8'));
    fs.writeFileSync(aboutFile, aboutHtml, 'utf8');
}

const output = [
    '/* Auto-generated by scripts/sync-posts.js. Do not edit manually. */',
    'window.COFFPEN_POSTS = Object.freeze(' + JSON.stringify(posts, null, 2) + ');',
    ''
].join('\n');

fs.writeFileSync(outputFile, output, 'utf8');
fs.writeFileSync(
    minOutputFile,
    'window.COFFPEN_POSTS=Object.freeze(' + JSON.stringify(posts) + ');\n',
    'utf8'
);

function escapeXml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const sitemapEntries = [
    { path: '/', date: posts[0] && posts[0].date },
    { path: '/about.html', date: posts[0] && posts[0].date },
    { path: '/coffpen.html', date: posts[0] && posts[0].date },
    { path: '/archive.html', date: posts[0] && posts[0].date },
    { path: '/series.html', date: posts[0] && posts[0].date },
    ...posts.map(post => ({ path: '/' + post.url, date: post.date }))
];
const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries.map(entry => [
        '  <url>',
        '    <loc>' + escapeXml(siteUrl + entry.path) + '</loc>',
        entry.date ? '    <lastmod>' + escapeXml(new Date(entry.date).toISOString().slice(0, 10)) + '</lastmod>' : '',
        '  </url>'
    ].filter(Boolean).join('\n')),
    '</urlset>',
    ''
].join('\n');
fs.writeFileSync(sitemapFile, sitemap, 'utf8');
console.log(`Synchronized ${posts.length} post(s) into ${path.relative(root, outputFile)}.`);
