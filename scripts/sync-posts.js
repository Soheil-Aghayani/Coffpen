const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const postsDirectory = path.join(root, 'posts');
const outputFile = path.join(postsDirectory, 'posts-data.js');
const minOutputFile = path.join(postsDirectory, 'posts-data.min.js');
const siteUrl = 'https://soheil-aghayani.github.io/Coffpen';
const sitemapFile = path.join(root, 'sitemap.xml');

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
    const keywords = post.tags.length ? post.tags : [section, 'کاف‌پن', 'Coffpen', 'سیاه و قلم'];
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
                    { '@type': 'ListItem', position: 1, name: 'کاف‌پن', item: siteUrl + '/' },
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
        '    <meta name="application-name" content="کاف‌پن (Coffpen)">',
        '    <meta name="author" content="سهیل آقایانی">',
        '    <meta property="article:published_time" content="' + escapeHtml(post.date) + '">',
        '    <meta property="article:modified_time" content="' + escapeHtml(post.date) + '">',
        '    <meta property="article:section" content="' + escapeHtml(section) + '">',
        '    <link rel="alternate" type="application/rss+xml" title="کاف‌پن (Coffpen)" href="../feed.xml">',
        tagMeta,
        '    <script type="application/ld+json">' + jsonForHtml(graph) + '</script>',
        '<!-- Coffpen:post-seo:end -->'
    ].filter(Boolean).join('\n');
}

function syncGeneratedPostSeo(list) {
    list.forEach(post => {
        const file = path.join(postsDirectory, post.filename);
        const source = fs.readFileSync(file, 'utf8');
        const block = renderPostSeo(post);
        const marker = /<!-- Coffpen:post-seo:start -->[\s\S]*?<!-- Coffpen:post-seo:end -->/;
        const updated = marker.test(source)
            ? source.replace(marker, block)
            : source.replace(/<\/head>/i, block + '\n</head>');
        if (updated !== source) fs.writeFileSync(file, updated, 'utf8');
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
            'name': 'کاف‌پن (Coffpen) | سیاه و قلم',
            'alternateName': ['کافپن', 'کاف پن', 'Coffpen', 'سیاه و قلم'],
            'description': 'وبلاگ شخصی سهیل آقایانی برای داستان‌های کوتاه فارسی، مجموعه‌های داستانی و دل‌نوشته‌ها.',
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
            'alternateName': ['کاف‌پن', 'کافپن', 'Coffpen'],
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
            'name': 'کاف‌پن؛ داستان و دل‌نوشته فارسی',
            'description': 'آرشیو داستان‌های کوتاه، مجموعه‌های دنباله‌دار و دل‌نوشته‌های سهیل آقایانی در کاف‌پن.',
            'inLanguage': 'fa-IR',
            'isPartOf': { '@id': siteUrl + '/#website' },
            'about': { '@id': personId },
            'mainEntity': {
                '@type': 'ItemList',
                'name': 'آخرین نوشته‌های کاف‌پن',
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

syncGeneratedPostSeo(posts);

const indexFile = path.join(root, 'index.html');
if (fs.existsSync(indexFile)) {
    const minifiedStylesheet = fs.readFileSync(path.join(root, 'assets', 'css', 'style.min.css'), 'utf8')
        .replace(/\.\.\/fonts\//g, 'assets/fonts/');
    const marker = '<div id="seriesHubList" class="series-hub-list"><!-- Coffpen:series-hub --></div>';
    const staticMarkerPattern = /<div id="seriesHubList" class="series-hub-list"><!-- Coffpen:series-hub:start -->[\s\S]*?<!-- Coffpen:series-hub:end --><\/div>/;
    let indexHtml = fs.readFileSync(indexFile, 'utf8');
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
        '<div class="seo-discovery-heading"><p class="eyebrow">راهنمای کاف‌پن</p>' +
        '<h2 id="coffpen-discovery-title">کاف‌پن (Coffpen) را از اینجا بشناسید</h2>' +
        '<p>داستان کوتاه فارسی، مجموعه‌های دنباله‌دار و دل‌نوشته‌های سهیل آقایانی؛ برای شروع یکی از این نوشته‌ها را انتخاب کنید.</p></div>' +
        '<nav class="seo-discovery-links" aria-label="شروع خواندن در کاف‌پن"><!-- Coffpen:featured-posts:start -->' +
        renderFeaturedPosts(posts) +
        '<!-- Coffpen:featured-posts:end --></nav></section>';
    if (discoveryPattern.test(indexHtml)) indexHtml = indexHtml.replace(discoveryPattern, discoverySection);
    fs.writeFileSync(indexFile, indexHtml, 'utf8');
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
