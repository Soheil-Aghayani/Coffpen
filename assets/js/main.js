/**
 * Coffpen Blog - Main JavaScript Engine
 * Features: 6-Theme Palette Manager, Smart Share Handler, Custom Context Menu, Local Comment Fallback
 */

const THEMES = ['dark', 'light', 'sepia', 'forest', 'midnight', 'rose'];

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('coffpen_theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(themeName) {
    if (!THEMES.includes(themeName)) themeName = 'dark';

    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('coffpen_theme', themeName);

    const buttons = document.querySelectorAll('.theme-opt-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('data-theme-val') === themeName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function cycleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const currentIndex = THEMES.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
}

// Sidebar Drawer
function initSidebar() {
    const menuBtn = document.getElementById('blackthemeMenu');
    const sidebar = document.querySelector('.blackthemeSidebar');
    const overlay = document.querySelector('.blackthemeOverlay');

    if (menuBtn && sidebar && overlay) {
        menuBtn.onclick = function (e) {
            e.preventDefault();
            sidebar.classList.toggle('set');
            overlay.classList.toggle('set');
        };

        overlay.onclick = function () {
            closeSidebar();
        };
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.blackthemeSidebar');
    const overlay = document.querySelector('.blackthemeOverlay');
    if (sidebar) sidebar.classList.remove('set');
    if (overlay) overlay.classList.remove('set');
}


// Custom Right-Click Context Menu
function initContextMenu() {
    const contextMenu = document.getElementById('customContextMenu');
    if (!contextMenu) return;

    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();

        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const menuWidth = contextMenu.offsetWidth || 220;
        const menuHeight = contextMenu.offsetHeight || 240;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let leftPos = mouseX;
        let topPos = mouseY;

        if (mouseX + menuWidth > windowWidth) {
            leftPos = mouseX - menuWidth;
        }
        if (mouseY + menuHeight > windowHeight) {
            topPos = mouseY - menuHeight;
        }

        contextMenu.style.left = leftPos + 'px';
        contextMenu.style.top = topPos + 'px';
        contextMenu.classList.add('active');
    });

    document.addEventListener('click', function (e) {
        if (!contextMenu.contains(e.target)) {
            contextMenu.classList.remove('active');
        }
    });

    document.addEventListener('scroll', function () {
        contextMenu.classList.remove('active');
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            contextMenu.classList.remove('active');
            closeShareModal();
        }
    });
}

// Smart Share Handler: PC Context Menu Modal / Phone Direct Native Share & Copy
let currentShareTitle = '';
let currentShareUrl = '';

function getStoryShareData() {
    const heading = document.querySelector('.blackthemePostBoxTitle, .story-hero h1, article h1');
    const canonical = document.querySelector('link[rel="canonical"]');
    const cleanUrl = new URL(canonical ? canonical.href : window.location.href, window.location.href);
    cleanUrl.hash = '';
    cleanUrl.search = '';

    return {
        title: heading && heading.textContent.trim() ? heading.textContent.trim() + ' | سیاه و قلم' : document.title,
        url: cleanUrl.href
    };
}

function ensureStoryShareUi() {
    if (!document.getElementById('toast-notification')) {
        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = '<span>لینک نوشته با موفقیت کپی شد!</span>';
        document.body.appendChild(toast);
    }

    if (document.getElementById('shareModal')) return;

    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.className = 'share-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'shareModalTitle');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
        '<div class="share-modal-card">' +
            '<div class="share-modal-header">' +
                '<h3 id="shareModalTitle">اشتراک‌گذاری نوشته</h3>' +
                '<button type="button" class="share-modal-close" aria-label="بستن پنجره">' + readerIcon('x') + '</button>' +
            '</div>' +
            '<div class="share-grid">' +
                '<button type="button" class="share-grid-item" data-share-target="whatsapp">' + readerIcon('message') + '<span>واتساپ</span></button>' +
                '<button type="button" class="share-grid-item" data-share-target="telegram">' + readerIcon('send') + '<span>تلگرام</span></button>' +
                '<button type="button" class="share-grid-item" data-share-target="x">' + readerIcon('x') + '<span>ایکس</span></button>' +
                '<button type="button" class="share-grid-item" data-share-target="copy">' + readerIcon('link') + '<span>کپی لینک</span></button>' +
            '</div>' +
            '<div class="share-link-box">' +
                '<input id="shareModalInput" class="share-link-input" type="text" readonly aria-label="نشانی نوشته">' +
                '<button type="button" class="share-copy-btn">کپی</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('.share-modal-close')) {
            closeShareModal();
            return;
        }
        const target = event.target.closest('[data-share-target]');
        if (!target) return;
        if (target.dataset.shareTarget === 'whatsapp') shareToWhatsApp();
        else if (target.dataset.shareTarget === 'telegram') shareToTelegram();
        else if (target.dataset.shareTarget === 'x') shareToX();
        else copyModalLink();
    });
    modal.querySelector('.share-copy-btn').addEventListener('click', copyModalLink);
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.classList.contains('active')) closeShareModal();
    });
}

function handleSmartShare(event, title, url) {
    if (event) event.preventDefault();

    ensureStoryShareUi();
    const targetTitle = title || document.title;
    const targetUrl = url || window.location.href;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (isMobile) {
        if (navigator.share) {
            navigator.share({
                title: targetTitle,
                text: targetTitle,
                url: targetUrl
            }).catch(function (error) {
                if (!error || error.name !== 'AbortError') openShareModal(targetTitle, targetUrl, event);
            });
        } else {
            openShareModal(targetTitle, targetUrl, event);
        }
    } else {
        openShareModal(targetTitle, targetUrl, event);
    }
}

function openShareModal(title, url, event) {
    ensureStoryShareUi();
    currentShareTitle = title || document.title;
    currentShareUrl = url || window.location.href;

    const modal = document.getElementById('shareModal');
    const input = document.getElementById('shareModalInput');

    if (modal && input) {
        input.value = currentShareUrl;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        window.setTimeout(function () {
            const closeButton = modal.querySelector('.share-modal-close');
            if (closeButton) closeButton.focus();
        }, 0);
    }
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function copyModalLink() {
    const input = document.getElementById('shareModalInput');
    if (input) {
        copyStoryLink(input.value);
        closeShareModal();
    }
}

function shareToTelegram() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(currentShareUrl)}&text=${encodeURIComponent(currentShareTitle)}`;
    window.open(url, '_blank');
}

function shareToX() {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentShareUrl)}&text=${encodeURIComponent(currentShareTitle)}`;
    window.open(url, '_blank');
}

function shareToWhatsApp() {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(currentShareTitle)}%20${encodeURIComponent(currentShareUrl)}`;
    window.open(url, '_blank');
}

function copySelectedText() {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(function () {
            showToast('متن انتخاب‌شده کپی شد!');
        });
    } else {
        copyStoryLink();
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyStoryLink(url) {
    const targetUrl = url || window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(targetUrl).then(function () {
            showToast('لینک نوشته با موفقیت کپی شد!');
        }).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }

    function fallbackCopy() {
        const tempInput = document.createElement('input');
        tempInput.value = targetUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast('لینک نوشته با موفقیت کپی شد!');
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (toast) {
        if (msg) toast.querySelector('span').textContent = msg;
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Local Fallback Comment Engine
function submitLocalComment() {
    const nameInput = document.querySelector('.comment-input');
    const textInput = document.querySelector('.comment-textarea');
    const list = document.getElementById('localCommentsList');

    if (!textInput || !textInput.value.trim()) {
        showToast('لطفاً متن نظر خود را وارد کنید.');
        return;
    }

    const authorName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'خواننده ناشناس';
    const commentBody = textInput.value.trim();

    if (list) {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `<div class="comment-author">${escapeHtml(authorName)}</div><div class="comment-body">${escapeHtml(commentBody)}</div>`;
        list.prepend(item);
    }

    textInput.value = '';
    showToast('نظر شما با موفقیت ثبت شد!');
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

function postContentType(post) {
    return post && post.contentType === 'note' ? 'note' : 'story';
}

function readingProgressKey(pathname) {
    return 'coffpen_read_progress_' + pathname;
}

function getPostReadingProgress(post) {
    try {
        const pathname = new URL(post.url, window.location.href).pathname;
        const saved = JSON.parse(localStorage.getItem(readingProgressKey(pathname)) || '{}');
        return Math.min(1, Math.max(0, Number(saved.percent) || 0));
    } catch (error) {
        return 0;
    }
}

function getReadingState(progress) {
    if (progress >= 0.9) return 'read';
    if (progress > 0) return 'started';
    return 'unread';
}

function readingStateMarkup(state, className) {
    const labels = {
        unread: 'خوانده‌نشده',
        started: 'درحال‌خواندن',
        read: 'خوانده‌شده'
    };
    const icons = {
        unread: 'circle',
        started: 'book-open',
        read: 'check-circle'
    };
    const safeState = labels[state] ? state : 'unread';
    return '<span class="' + className + ' read-state-' + safeState + '" role="img" aria-label="' +
        labels[safeState] + '" title="' + labels[safeState] + '">' + readerIcon(icons[safeState]) + '</span>';
}

function initLiveHero() {
    const weekdayElement = document.getElementById('heroWeekday');
    const clockElement = document.getElementById('heroClock');
    const countElement = document.getElementById('heroPostCount');

    if (!weekdayElement && !clockElement && !countElement) return;

    const updateHeroTime = function () {
        const now = new Date();

        if (weekdayElement) {
            weekdayElement.textContent = new Intl.DateTimeFormat('fa-IR', {
                weekday: 'long'
            }).format(now);
        }

        if (clockElement) {
            clockElement.textContent = new Intl.DateTimeFormat('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
            }).format(now);
        }
    };

    if (countElement) {
        const publishedPosts = Array.isArray(window.COFFPEN_POSTS)
            ? window.COFFPEN_POSTS.length
            : document.querySelectorAll('.post-preview').length;
        countElement.textContent = publishedPosts.toLocaleString('fa-IR');
    }

    updateHeroTime();
    window.setInterval(updateHeroTime, 30000);
}

function initPostRegistry() {
    const postList = document.getElementById('postList');
    if (!postList) return;

    const posts = Array.isArray(window.COFFPEN_POSTS) ? window.COFFPEN_POSTS : [];
    const emptyState = document.querySelector('.empty-posts');
    const searchInput = document.getElementById('postSearch');
    const kindInput = document.getElementById('postKindFilter');
    const seriesInput = document.getElementById('postSeriesFilter');
    const seriesOrderInput = document.getElementById('postSeriesOrder');
    const seriesOrderControl = document.getElementById('postSeriesOrderControl');
    const postListTitle = document.getElementById('postListTitle');
    const resetButton = document.getElementById('postFilterReset');
    const advancedToggle = document.getElementById('postAdvancedToggle');
    const advancedFilters = document.getElementById('postAdvancedFilters');
    const filterStatus = document.getElementById('postFilterStatus');
    const sentinel = document.getElementById('postLoadSentinel');
    const loadStatus = document.getElementById('postLoadStatus');
    const loadMoreButton = document.getElementById('postLoadMore');
    const batchSize = 6;
    let filteredPosts = [];
    let renderedCount = 0;
    let searchTimer = null;

    if (!posts.length) {
        postList.hidden = true;
        if (sentinel) sentinel.hidden = true;
        if (emptyState) emptyState.hidden = false;
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedSeries = params.get('series') || 'all';
    const requestedTag = params.get('tag') || '';
    const requestedKind = params.get('kind') || 'story';
    const requestedSearch = params.get('q') || '';
    const requestedOrder = params.get('order') === 'asc' ? 'asc' : 'desc';
    const hasRequestedAdvancedFilters = requestedSeries !== 'all' || Boolean(requestedTag) || requestedKind !== 'story';
    const seriesNames = Array.from(new Set(posts.map(function (post) {
        return post.series || '';
    }).filter(Boolean))).sort(function (first, second) {
        return first.localeCompare(second, 'fa');
    });

    if (seriesInput) {
        seriesInput.innerHTML = '<option value="all">همهٔ مجموعه‌ها</option>' +
            seriesNames.map(function (name) {
                return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
            }).join('');
        seriesInput.value = seriesNames.includes(requestedSeries) ? requestedSeries : 'all';
    }
    if (kindInput) {
        kindInput.value = ['story', 'standalone', 'series', 'note', 'all'].includes(requestedKind)
            ? requestedKind
            : 'story';
        if (seriesInput && seriesInput.value !== 'all') kindInput.value = 'series';
    }
    if (searchInput) searchInput.value = requestedSearch;
    if (seriesOrderInput) seriesOrderInput.value = requestedOrder;

    function setAdvancedFiltersOpen(shouldOpen) {
        if (!advancedToggle || !advancedFilters) return;
        advancedFilters.hidden = !shouldOpen;
        advancedToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        advancedToggle.setAttribute(
            'aria-label',
            shouldOpen ? 'بستن فیلترهای پیشرفته' : 'باز کردن فیلترهای پیشرفته'
        );
    }

    setAdvancedFiltersOpen(hasRequestedAdvancedFilters);

    function normalizeLibraryText(value) {
        return String(value || '')
            .normalize('NFKC')
            .toLowerCase()
            .replace(/ي/g, 'ی')
            .replace(/ك/g, 'ک')
            .replace(/[\u200c\u200d]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function renderPostCard(post) {
        const seriesAttribute = post.series ? ' data-series="' + escapeHtml(post.series) + '"' : '';
        const tagsAttribute = Array.isArray(post.tags) && post.tags.length
            ? ' data-tags="' + escapeHtml(post.tags.join('|')) + '"'
            : '';
        const episode = post.episode
            ? '<a class="post-registry-episode" href="index.html?series=' + encodeURIComponent(post.series) +
                '#latest-posts-heading" title="مشاهده پلی‌لیست «' + escapeHtml(post.series) + '»">قسمت ' +
                Number(post.episode).toLocaleString('fa-IR') + '</a>'
            : '';
        const emptyBadge = post.empty
            ? '<span class="post-registry-empty">بدون محتوا</span>'
            : '';
        const tags = Array.isArray(post.tags) && post.tags.length
            ? '<div class="post-registry-tags">' + post.tags.map(function (tag) {
                return '<a href="index.html?tag=' + encodeURIComponent(tag) + '#latest-posts-heading">#' + escapeHtml(tag) + '</a>';
            }).join('') + '</div>'
            : '';
        const readingState = getReadingState(getPostReadingProgress(post));
        return '<article class="blackthemePostBox post-preview"' + seriesAttribute + tagsAttribute + '>' +
            '<div class="blackthemePostInfo">' +
                '<div class="blackthemePostInfoMain">' +
                    '<div class="blackthemePostInfoImg"><img src="assets/images/author-avatar.jpg" alt="' + escapeHtml(post.author) +
                        '" class="author-avatar-img" loading="lazy" decoding="async"></div>' +
                    '<div class="blackthemePostInfoContent">' +
                        '<div class="post-title-row">' +
                            '<h2 class="blackthemePostBoxTitle"><a href="' + escapeHtml(post.url) + '">' + escapeHtml(post.title) + '</a></h2>' +
                            episode +
                        '</div>' +
                        '<span class="blackthemeDate"><b>' + escapeHtml(post.author) + '</b></span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="blackthemePostText"><p>' + escapeHtml(post.description) + '</p>' + tags + '</div>' +
            '<div class="post-action-bar">' +
                '<div class="blackthemeCont"><a href="' + escapeHtml(post.url) + '">ادامه نوشته &larr;</a></div>' +
                '<div class="post-preview-actions">' + emptyBadge +
                    readingStateMarkup(readingState, 'post-read-state') +
                    '<button type="button" class="share-icon-btn post-preview-share" data-share-title="' + escapeHtml(post.title) +
                        '" data-share-url="' + escapeHtml(post.url) + '" aria-label="اشتراک‌گذاری «' + escapeHtml(post.title) +
                        '»" title="اشتراک‌گذاری نوشته">' + readerIcon('share') + '</button>' +
                '</div>' +
            '</div>' +
        '</article>';
    }

    function updateLibraryUrl() {
        const nextParams = new URLSearchParams();
        const search = searchInput ? searchInput.value.trim() : '';
        const kind = kindInput ? kindInput.value : 'story';
        const series = seriesInput ? seriesInput.value : 'all';
        const order = seriesOrderInput ? seriesOrderInput.value : 'desc';
        if (search) nextParams.set('q', search);
        if (kind !== 'story') nextParams.set('kind', kind);
        if (series !== 'all') nextParams.set('series', series);
        if (series !== 'all' && order === 'asc') nextParams.set('order', 'asc');
        if (requestedTag) nextParams.set('tag', requestedTag);
        const query = nextParams.toString();
        window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
    }

    function updateLoadState() {
        const remaining = filteredPosts.length - renderedCount;
        if (!sentinel || !loadStatus || !loadMoreButton) return;

        if (!filteredPosts.length) {
            sentinel.hidden = false;
            sentinel.classList.add('empty');
            loadStatus.textContent = 'نوشته‌ای با این فیلترها پیدا نشد.';
            loadMoreButton.hidden = true;
            return;
        }

        sentinel.classList.remove('empty');
        sentinel.hidden = remaining <= 0;
        loadStatus.textContent = remaining > 0
            ? remaining.toLocaleString('fa-IR') + ' نوشتهٔ دیگر در ادامه'
            : '';
        loadMoreButton.hidden = remaining <= 0;
    }

    function updateFilterStatus() {
        if (!filterStatus) return;
        const search = searchInput ? searchInput.value.trim() : '';
        const kind = kindInput ? kindInput.value : 'story';
        const series = seriesInput ? seriesInput.value : 'all';
        const hasActiveFilter = Boolean(search || requestedTag || kind !== 'story' || series !== 'all');
        if (!hasActiveFilter) {
            filterStatus.textContent = '';
            return;
        }
        const visible = Math.min(renderedCount, filteredPosts.length);
        let message = 'نمایش ' + visible.toLocaleString('fa-IR') + ' از ' +
            filteredPosts.length.toLocaleString('fa-IR') + ' نوشته';
        if (requestedTag) message += ' با برچسب «' + requestedTag + '»';
        filterStatus.textContent = message;
    }

    function renderNextBatch() {
        if (renderedCount >= filteredPosts.length) {
            updateLoadState();
            return;
        }
        const nextPosts = filteredPosts.slice(renderedCount, renderedCount + batchSize);
        postList.insertAdjacentHTML('beforeend', nextPosts.map(renderPostCard).join(''));
        renderedCount += nextPosts.length;
        updateFilterStatus();
        updateLoadState();
    }

    function applyLibraryFilters() {
        const query = normalizeLibraryText(searchInput ? searchInput.value : '');
        const kind = kindInput ? kindInput.value : 'story';
        const series = seriesInput ? seriesInput.value : 'all';
        const tag = normalizeLibraryText(requestedTag);
        const noteShelf = document.getElementById('noteShelf');

        filteredPosts = posts.filter(function (post) {
            const contentType = postContentType(post);
            if (kind === 'story' && contentType !== 'story') return false;
            if (kind === 'story' && !query && series === 'all' && post.series) return false;
            if (kind === 'series' && !post.series) return false;
            if (kind === 'standalone' && (post.series || contentType !== 'story')) return false;
            if (kind === 'note' && contentType !== 'note') return false;
            if (series !== 'all' && post.series !== series) return false;

            const postTags = Array.isArray(post.tags) ? post.tags : [];
            if (tag && !postTags.some(function (postTag) {
                return normalizeLibraryText(postTag) === tag;
            })) return false;

            if (!query) return true;
            const haystack = normalizeLibraryText([
                post.title,
                post.description,
                post.author,
                post.series,
                postTags.join(' ')
            ].join(' '));
            return haystack.includes(query);
        });
        if (series !== 'all') {
            const direction = seriesOrderInput && seriesOrderInput.value === 'asc' ? 1 : -1;
            filteredPosts.sort(function (first, second) {
                const episodeDifference = Number(first.episode || 0) - Number(second.episode || 0);
                if (episodeDifference) return episodeDifference * direction;
                return (new Date(first.date || 0) - new Date(second.date || 0)) * direction;
            });
        }

        postList.innerHTML = '';
        renderedCount = 0;
        postList.hidden = false;
        if (emptyState) emptyState.hidden = true;
        if (noteShelf) {
            noteShelf.hidden = Boolean(query || requestedTag || kind !== 'story' || series !== 'all');
        }
        if (seriesInput) seriesInput.disabled = kind === 'standalone' || kind === 'note';
        if (seriesOrderControl) seriesOrderControl.hidden = series === 'all';
        if (postListTitle) {
            postListTitle.textContent = query
                ? 'نتایج جست‌وجو'
                : {
                    story: 'داستان‌های مستقل',
                    standalone: 'داستان‌های مستقل',
                    series: 'قسمت‌های پلی‌لیست‌ها',
                    note: 'دل‌نوشته‌ها',
                    all: 'همهٔ نوشته‌ها'
                }[kind] || 'داستان‌ها';
        }
        updateLibraryUrl();
        renderNextBatch();
    }

    postList.addEventListener('click', function (event) {
        const shareButton = event.target.closest('.post-preview-share');
        if (!shareButton) return;
        const shareUrl = new URL(shareButton.dataset.shareUrl, window.location.href).href;
        handleSmartShare(event, shareButton.dataset.shareTitle + ' | سیاه و قلم', shareUrl);
    });

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(applyLibraryFilters, 180);
        });
    }
    if (kindInput) {
        kindInput.addEventListener('change', function () {
            if (['standalone', 'note'].includes(kindInput.value) && seriesInput) seriesInput.value = 'all';
            applyLibraryFilters();
        });
    }
    if (seriesInput) {
        seriesInput.addEventListener('change', function () {
            if (seriesInput.value !== 'all' && kindInput) kindInput.value = 'series';
            applyLibraryFilters();
        });
    }
    if (seriesOrderInput) seriesOrderInput.addEventListener('change', applyLibraryFilters);
    if (advancedToggle && advancedFilters) {
        advancedToggle.addEventListener('click', function () {
            setAdvancedFiltersOpen(advancedFilters.hidden);
        });
    }
    if (resetButton) {
        resetButton.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            if (kindInput) kindInput.value = 'story';
            if (seriesInput) {
                seriesInput.value = 'all';
                seriesInput.disabled = false;
            }
            if (seriesOrderInput) seriesOrderInput.value = 'desc';
            window.history.replaceState(null, '', window.location.pathname + '#latest-posts-heading');
            window.location.reload();
        });
    }
    if (loadMoreButton) loadMoreButton.addEventListener('click', renderNextBatch);

    if ('IntersectionObserver' in window && sentinel) {
        const loadObserver = new IntersectionObserver(function (entries) {
            if (entries.some(function (entry) { return entry.isIntersecting; })) renderNextBatch();
        }, { rootMargin: '600px 0px' });
        loadObserver.observe(sentinel);
    }

    applyLibraryFilters();
}

function initSeriesHub() {
    const hub = document.getElementById('seriesHub');
    const list = document.getElementById('seriesHubList');
    if (!hub || !list) return;
    if (new URLSearchParams(window.location.search).get('series')) {
        hub.hidden = true;
        return;
    }

    const posts = Array.isArray(window.COFFPEN_POSTS) ? window.COFFPEN_POSTS : [];
    const groups = posts.reduce(function (result, post) {
        if (!post.series) return result;
        if (!result[post.series]) result[post.series] = [];
        result[post.series].push(post);
        return result;
    }, {});

    const seriesUpdates = Object.keys(groups).map(function (name) {
        const latestEpisodeFirst = groups[name].slice().sort(function (a, b) {
            const episodeDifference = Number(b.episode || 0) - Number(a.episode || 0);
            return episodeDifference || (new Date(b.date) - new Date(a.date));
        });
        return {
            name,
            posts: latestEpisodeFirst,
            latest: latestEpisodeFirst[0],
            cover: latestEpisodeFirst.find(function (post) { return post.image; })
        };
    }).sort(function (a, b) {
        return new Date(b.latest.date) - new Date(a.latest.date);
    });

    if (!seriesUpdates.length) {
        hub.hidden = true;
        return;
    }

    list.innerHTML = seriesUpdates.map(function (update) {
        const latest = update.latest;
        const episodeNumber = Number(latest.episode || update.posts.length).toLocaleString('fa-IR');
        const episodeProgress = update.posts.map(getPostReadingProgress);
        const playlistReadingState = episodeProgress.length && episodeProgress.every(function (progress) {
            return progress >= 0.9;
        })
            ? 'read'
            : (episodeProgress.some(function (progress) { return progress > 0; }) ? 'started' : 'unread');
        const coverMarkup = update.cover && update.cover.image
            ? '<img src="' + escapeHtml(update.cover.image) + '" alt="" loading="lazy" decoding="async">'
            : '<span class="series-update-cover-fallback" aria-hidden="true">' + readerIcon('layers') + '</span>';
        return '<a class="series-hub-card" href="index.html?series=' + encodeURIComponent(update.name) + '#latest-posts-heading">' +
            '<span class="series-update-cover">' + coverMarkup +
                readingStateMarkup(playlistReadingState, 'series-read-state') + '</span>' +
            '<span class="series-hub-copy"><strong>' + escapeHtml(update.name) + '</strong>' +
                '<span class="series-update-episode">قسمت ' + episodeNumber + ' · ' + escapeHtml(latest.title) + '</span>' +
                '<span class="series-update-summary">' + escapeHtml(latest.description) + '</span>' +
                '<small>' + update.posts.length.toLocaleString('fa-IR') + ' قسمت منتشرشده</small></span>' +
            '<span class="series-hub-latest">' +
                '<span class="series-update-badge">قسمت جدید ' + episodeNumber + '</span>' +
            '</span>' +
        '</a>';
    }).join('');
    hub.hidden = false;

    const carouselControls = hub.querySelector('.series-carousel-controls');
    function updateCarouselControls() {
        if (!carouselControls) return;
        carouselControls.hidden = list.scrollWidth <= list.clientWidth + 2;
    }
    if (carouselControls) {
        carouselControls.addEventListener('click', function (event) {
            const button = event.target.closest('[data-series-scroll]');
            if (!button) return;
            const direction = button.dataset.seriesScroll === 'next' ? -1 : 1;
            list.scrollBy({ left: direction * list.clientWidth * 0.78, behavior: 'smooth' });
        });
    }
    window.requestAnimationFrame(updateCarouselControls);
    window.addEventListener('resize', updateCarouselControls, { passive: true });
}

function initNoteShelf() {
    const shelf = document.getElementById('noteShelf');
    const list = document.getElementById('noteShelfList');
    if (!shelf || !list) return;

    const notes = (Array.isArray(window.COFFPEN_POSTS) ? window.COFFPEN_POSTS : [])
        .filter(function (post) { return postContentType(post) === 'note'; })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (!notes.length) {
        shelf.hidden = true;
        return;
    }

    list.innerHTML = notes.map(function (post) {
        const minutes = Math.max(1, Math.ceil(Number(post.wordCount || 0) / 180));
        return '<a class="note-shelf-card" href="' + escapeHtml(post.url) + '">' +
            '<span class="note-shelf-icon" aria-hidden="true">' + readerIcon('book') + '</span>' +
            '<span class="note-shelf-copy"><strong>' + escapeHtml(post.title) + '</strong>' +
                '<small>' + escapeHtml(post.description) + '</small></span>' +
            '<span class="note-shelf-readtime">' + minutes.toLocaleString('fa-IR') + ' دقیقه</span>' +
        '</a>';
    }).join('');
    shelf.hidden = false;
}

function initStoryPlaylist() {
    const posts = Array.isArray(window.COFFPEN_POSTS) ? window.COFFPEN_POSTS : [];
    const story = document.querySelector('.story-body');
    if (!story || !posts.length) return;

    let filename = '';
    try {
        filename = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    } catch (error) {
        filename = window.location.pathname.split('/').pop() || '';
    }

    const current = posts.find(function (post) { return post.filename === filename; });
    if (!current || !current.series) return;

    const episodes = posts.filter(function (post) {
        return post.series === current.series;
    }).sort(function (a, b) {
        return Number(a.episode || 0) - Number(b.episode || 0);
    });
    if (!episodes.length) return;

    const currentIndex = episodes.findIndex(function (post) { return post.filename === current.filename; });
    const previous = currentIndex > 0 ? episodes[currentIndex - 1] : null;
    const next = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;
    const playlist = document.createElement('nav');
    playlist.className = 'story-playlist';
    playlist.setAttribute('aria-label', 'پلی‌لیست مجموعه ' + current.series);
    playlist.innerHTML =
        '<div class="story-playlist-head">' +
            '<div><span>از مجموعه</span><strong>' + escapeHtml(current.series) + '</strong></div>' +
            '<button type="button" class="story-playlist-toggle" aria-expanded="false">' +
                readerIcon('layers') + episodes.length.toLocaleString('fa-IR') + ' قسمت' +
            '</button>' +
        '</div>' +
        '<div class="story-playlist-list" hidden>' +
            episodes.map(function (post) {
                const active = post.filename === current.filename;
                const readingState = getReadingState(getPostReadingProgress(post));
                return '<a href="../' + escapeHtml(post.url) + '"' + (active ? ' class="active" aria-current="page"' : '') + '>' +
                    '<span>قسمت ' + Number(post.episode || 0).toLocaleString('fa-IR') + '</span>' +
                    '<strong>' + escapeHtml(post.title) + '</strong>' +
                    readingStateMarkup(readingState, 'post-read-state') +
                '</a>';
            }).join('') +
        '</div>' +
        '<div class="story-playlist-nav">' +
            (previous ? '<a href="../' + escapeHtml(previous.url) + '">→ قسمت قبلی</a>' : '<span></span>') +
            '<a href="../index.html?series=' + encodeURIComponent(current.series) + '#latest-posts-heading">همه قسمت‌ها</a>' +
            (next ? '<a href="../' + escapeHtml(next.url) + '">قسمت بعدی ←</a>' : '<span></span>') +
        '</div>';

    story.parentNode.insertBefore(playlist, story);
    const toggle = playlist.querySelector('.story-playlist-toggle');
    const episodeList = playlist.querySelector('.story-playlist-list');
    toggle.addEventListener('click', function () {
        episodeList.hidden = !episodeList.hidden;
        toggle.setAttribute('aria-expanded', episodeList.hidden ? 'false' : 'true');
        toggle.classList.toggle('active', !episodeList.hidden);
    });
}

function initStoryHero() {
    const story = document.querySelector('.story-body');
    const hero = document.querySelector('.headerImage:not(.site-hero)');
    if (!story || !hero || hero.dataset.storyHeroReady === 'true') return;
    hero.dataset.storyHeroReady = 'true';

    let filename = '';
    try {
        filename = decodeURIComponent(window.location.pathname.split('/').pop() || '');
    } catch (error) {
        filename = window.location.pathname.split('/').pop() || '';
    }

    const posts = Array.isArray(window.COFFPEN_POSTS) ? window.COFFPEN_POSTS : [];
    const current = posts.find(function (post) { return post.filename === filename; }) || null;
    const titleElement = document.querySelector('.blackthemePostBoxTitle');
    const title = titleElement ? titleElement.textContent.trim() : 'این نوشته';
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const plainText = (story.innerText || story.textContent || '').replace(/\s+/g, ' ').trim();
    const summary = current && current.description
        ? current.description
        : descriptionMeta && descriptionMeta.content
            ? descriptionMeta.content
            : plainText.slice(0, 180) + (plainText.length > 180 ? '…' : '');
    const wordCount = plainText
        ? plainText.split(/\s+/).filter(Boolean).length
        : Number(current && current.wordCount) || 0;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 180));
    const series = current && current.series ? current.series : '';
    const episode = Number(current && current.episode) || 0;
    const seriesEpisodes = series
        ? posts.filter(function (post) { return post.series === series; })
        : [];
    const chapterLabel = episode
        ? 'پیش‌درآمد قسمت ' + episode.toLocaleString('fa-IR')
        : 'پیش از شروع خواندن';
    const playlistHref = series
        ? '../index.html?series=' + encodeURIComponent(series) + '#latest-posts-heading'
        : '../index.html#latest-posts-heading';
    const article = story.closest('article');
    if (article && !article.id) article.id = 'story-reading-start';

    hero.classList.add('story-hero');
    hero.setAttribute('aria-label', 'پیش‌درآمد ' + title);
    hero.innerHTML =
        '<div class="story-hero-main">' +
            '<div class="story-hero-kicker">' + escapeHtml(chapterLabel) + '</div>' +
            '<p class="story-hero-summary">' + escapeHtml(summary || 'آماده‌ای؟ روایت از همین‌جا ادامه پیدا می‌کند.') + '</p>' +
            '<div class="story-hero-meta">' +
                (series ? '<a href="' + playlistHref + '" title="مشاهده همه قسمت‌ها">' + readerIcon('layers') + escapeHtml(series) + '</a>' : '') +
                '<span>' + readerIcon('clock') + readMinutes.toLocaleString('fa-IR') + ' دقیقه مطالعه</span>' +
                '<span>' + wordCount.toLocaleString('fa-IR') + ' کلمه</span>' +
            '</div>' +
        '</div>' +
        (episode
            ? '<div class="story-hero-chapter"><span>قسمت</span><strong>' + episode.toLocaleString('fa-IR') + '</strong><small>' +
                (seriesEpisodes.length ? 'از ' + seriesEpisodes.length.toLocaleString('fa-IR') + ' قسمت منتشرشده' : escapeHtml(series)) +
              '</small></div>'
            : '<div class="story-hero-chapter"><span>زمان مطالعه</span><strong>' + readMinutes.toLocaleString('fa-IR') + '</strong><small>دقیقه</small></div>') +
        '<div class="story-hero-footer">' +
            '<a class="story-hero-start" href="#story-reading-start">شروع خواندن ↓</a>' +
            '<div class="story-hero-progress-track" aria-hidden="true"><span></span></div>' +
            '<span class="story-hero-progress-value">۰٪</span>' +
        '</div>';

    const progressBar = hero.querySelector('.story-hero-progress-track span');
    const progressValue = hero.querySelector('.story-hero-progress-value');
    let ticking = false;
    function renderStoryHeroProgress(percent) {
        const normalized = Math.min(1, Math.max(0, Number(percent) || 0));
        progressBar.style.transform = 'scaleX(' + normalized + ')';
        progressValue.textContent = Math.round(normalized * 100).toLocaleString('fa-IR') + '٪';
    }
    function updateStoryHeroProgress() {
        if (document.body.classList.contains('reader-book-mode')) {
            ticking = false;
            return;
        }
        const rect = story.getBoundingClientRect();
        const total = Math.max(1, story.scrollHeight - window.innerHeight * 0.55);
        const percent = Math.min(1, Math.max(0, (-rect.top + window.innerHeight * 0.3) / total));
        renderStoryHeroProgress(percent);
        ticking = false;
    }
    window.addEventListener('coffpen:reader-progress', function (event) {
        if (event.detail) renderStoryHeroProgress(event.detail.percent);
    });
    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateStoryHeroProgress);
    }, { passive: true });
    updateStoryHeroProgress();
}

function initSeriesFilter() {
    if (document.querySelector('.post-library-controls')) return;
    const params = new URLSearchParams(window.location.search);
    const requestedSeries = params.get('series');
    const requestedTag = params.get('tag');
    if (!requestedSeries && !requestedTag) return;

    const posts = Array.from(document.querySelectorAll('.post-preview'));
    const postList = document.getElementById('postList');
    const emptyState = document.querySelector('.empty-posts');
    const seriesHub = document.getElementById('seriesHub');
    let visibleCount = 0;

    posts.forEach(function (post) {
        const belongs = requestedSeries
            ? post.getAttribute('data-series') === requestedSeries
            : (post.getAttribute('data-tags') || '').split('|').includes(requestedTag);
        post.hidden = !belongs;
        if (belongs) visibleCount += 1;
    });

    if (seriesHub) seriesHub.hidden = true;

    if (postList && !document.querySelector('.series-filter-summary')) {
        const summary = document.createElement('div');
        summary.className = 'series-filter-summary';
        summary.innerHTML = '<strong>' +
            escapeHtml(requestedSeries ? 'مجموعه «' + requestedSeries + '»' : 'برچسب «' + requestedTag + '»') +
            '</strong><a href="index.html#latest-posts-heading">نمایش همه نوشته‌ها ←</a>';
        postList.parentNode.insertBefore(summary, postList);
    }

    if (emptyState && visibleCount === 0) {
        const emptyTitle = emptyState.querySelector('h2');
        const emptyText = emptyState.querySelector('p');
        const emptyLink = emptyState.querySelector('a');
        if (emptyTitle) {
            emptyTitle.textContent = requestedSeries
                ? 'هنوز قسمتی از این مجموعه منتشر نشده است'
                : 'هنوز نوشته‌ای با این برچسب منتشر نشده است';
        }
        if (emptyText) {
            emptyText.textContent = requestedSeries
                ? 'قسمت‌های مجموعه «' + requestedSeries + '» پس از انتشار اینجا نمایش داده می‌شوند.'
                : 'نوشته‌های دارای برچسب «' + requestedTag + '» پس از انتشار اینجا نمایش داده می‌شوند.';
        }
        if (emptyLink) {
            emptyLink.href = 'index.html#latest-posts-heading';
            emptyLink.textContent = 'بازگشت به همه نوشته‌ها';
        }
    } else if (emptyState && posts.length > 0) {
        emptyState.hidden = true;
    }
}

function initLongformReader() {
    if (document.getElementById('postContent')) return;

    const story = document.querySelector('.story-body');
    if (!story || story.dataset.readerReady === 'true') return;
    story.dataset.readerReady = 'true';
    normalizeLooseStoryContent(story);
    story.querySelectorAll('[style*="font-size"]').forEach(function (element) {
        element.style.removeProperty('font-size');
    });

    const plainText = (story.innerText || story.textContent || '').trim();
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const storageKey = 'coffpen_reader_' + window.location.pathname;
    const progressStorageKey = readingProgressKey(window.location.pathname);
    const prefsKey = 'coffpen_reader_preferences';
    const savedPosition = readReaderStorage(storageKey, {});
    const prefs = Object.assign({
        mode: 'scroll',
        fontScale: 1,
        lineHeight: 2.1,
        width: 760,
        readerTheme: 'auto',
        focus: false,
        rememberPosition: false
    }, readReaderStorage(prefsKey, {}));
    const initialReadingProgress = readReaderStorage(progressStorageKey, {});
    if (!Number(initialReadingProgress.percent)) {
        writeReaderStorage(progressStorageKey, {
            percent: 0.01,
            updatedAt: Date.now()
        });
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'reader-toolbar';
    toolbar.setAttribute('aria-label', 'ابزارهای مطالعه');
    toolbar.innerHTML =
        '<div class="reader-actions">' +
            readerButton('share', 'share', 'اشتراک‌گذاری نوشته') +
            readerButton('mode', 'book', 'حالت ورق‌زدن') +
            readerButton('bookmark', 'bookmark', 'ذخیره محل مطالعه') +
            readerButton('focus', 'focus', 'حالت تمرکز') +
            readerButton('toc', 'list', 'فهرست بخش‌ها', 'reader-toc-toggle') +
            readerButton('settings', 'settings', 'تنظیمات مطالعه') +
        '</div>' +
        '<div class="reader-settings-panel" hidden>' +
            '<div class="reader-setting-group" aria-label="اندازه قلم">' +
                readerButton('font-down', 'minus', 'کوچک‌کردن قلم') +
                '<span class="reader-setting-value" data-reader-value="font">۱۰۰٪</span>' +
                readerButton('font-up', 'plus', 'بزرگ‌کردن قلم') +
            '</div>' +
            '<div class="reader-setting-group" aria-label="فاصله خطوط">' +
                readerButton('line-height', 'lines', 'تغییر فاصله خطوط') +
                '<span class="reader-setting-value" data-reader-value="line">معمولی</span>' +
            '</div>' +
            '<div class="reader-setting-group" aria-label="عرض متن">' +
                readerButton('width', 'width', 'تغییر عرض متن') +
                '<span class="reader-setting-value" data-reader-value="width">متوسط</span>' +
            '</div>' +
            '<div class="reader-setting-group" aria-label="پوسته مطالعه">' +
                readerButton('reader-theme', 'sun', 'تغییر پوسته مطالعه') +
                '<span class="reader-setting-value" data-reader-value="theme">خودکار</span>' +
            '</div>' +
        '</div>' +
        '<div class="reader-toc-panel" hidden></div>';

    story.parentNode.insertBefore(toolbar, story);
    story.classList.add('reader-source');

    const progress = document.createElement('div');
    progress.className = 'reader-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span></span>';
    document.body.appendChild(progress);

    const book = document.createElement('section');
    book.className = 'reader-book';
    book.hidden = true;
    book.innerHTML =
        '<button type="button" class="reader-page-nav reader-page-prev" data-page-action="prev" aria-label="صفحه قبل" title="صفحه قبل">' + readerIcon('chevron-right') + '</button>' +
        '<div class="reader-book-stage"></div>' +
        '<button type="button" class="reader-page-nav reader-page-next" data-page-action="next" aria-label="صفحه بعد" title="صفحه بعد">' + readerIcon('chevron-left') + '</button>' +
        '<div class="reader-page-counter" aria-live="polite"></div>';
    story.insertAdjacentElement('afterend', book);

    const headings = Array.from(story.querySelectorAll('h2, h3'));
    const tocButton = toolbar.querySelector('[data-reader-action="toc"]');
    const tocPanel = toolbar.querySelector('.reader-toc-panel');
    if (headings.length < 2) {
        if (tocButton) tocButton.hidden = true;
    } else {
        tocPanel.innerHTML = headings.map(function (heading, index) {
            if (!heading.id) heading.id = 'reader-section-' + (index + 1);
            return '<a href="#' + heading.id + '" data-reader-heading="' + heading.id + '">' +
                escapeHtml(heading.textContent.trim()) + '</a>';
        }).join('');
    }

    addReaderPausePoint(story, wordCount, function () {
        prefs.rememberPosition = true;
        applyReaderPreferences();
        saveReaderPosition(true);
        showToast('این نقطه ذخیره شد و یادآوری محل مطالعه روشن است.');
    });
    applyReaderPreferences();

    let pages = [];
    let currentPage = 0;
    let resizeTimer = null;
    let scrollTimer = null;
    let touchStartX = 0;
    let bookBuildToken = 0;
    let readerLayoutResolved = false;
    const readerLayoutReady = waitForReaderLayout().then(function () {
        readerLayoutResolved = true;
    });

    function applyReaderPreferences() {
        document.documentElement.style.setProperty('--reader-font-scale', prefs.fontScale);
        document.documentElement.style.setProperty('--reader-line-height', prefs.lineHeight);
        document.documentElement.style.setProperty('--reader-width', prefs.width + 'px');
        document.documentElement.setAttribute('data-reader-theme', prefs.readerTheme);
        document.body.classList.toggle('reader-focus', Boolean(prefs.focus));
        const focusButton = toolbar.querySelector('[data-reader-action="focus"]');
        if (focusButton) focusButton.classList.toggle('active', Boolean(prefs.focus));
        const bookmarkButton = toolbar.querySelector('[data-reader-action="bookmark"]');
        if (bookmarkButton) {
            bookmarkButton.classList.toggle('active', Boolean(prefs.rememberPosition));
            bookmarkButton.setAttribute('aria-pressed', prefs.rememberPosition ? 'true' : 'false');
            bookmarkButton.setAttribute('title', prefs.rememberPosition ? 'غیرفعال‌کردن ذخیره محل مطالعه' : 'فعال‌کردن ذخیره محل مطالعه');
            bookmarkButton.setAttribute('aria-label', prefs.rememberPosition ? 'غیرفعال‌کردن ذخیره محل مطالعه' : 'فعال‌کردن ذخیره محل مطالعه');
        }
        updateReaderSettingsLabels(toolbar, prefs);
        writeReaderStorage(prefsKey, prefs);
    }

    function setMode(mode, preserveBlock) {
        prefs.mode = mode === 'book' ? 'book' : 'scroll';
        const modeButton = toolbar.querySelector('[data-reader-action="mode"]');
        if (modeButton) {
            modeButton.classList.toggle('active', prefs.mode === 'book');
            modeButton.setAttribute('title', prefs.mode === 'book' ? 'حالت اسکرول' : 'حالت ورق‌زدن');
            modeButton.setAttribute('aria-label', prefs.mode === 'book' ? 'حالت اسکرول' : 'حالت ورق‌زدن');
        }

        if (prefs.mode === 'book') {
            const block = typeof preserveBlock === 'number' ? preserveBlock : getCurrentReaderBlock(story);
            story.hidden = true;
            book.hidden = false;
            document.body.classList.add('reader-book-mode');
            queueStableBookBuild(block);
        } else {
            bookBuildToken += 1;
            book.classList.remove('reader-book-loading');
            const block = typeof preserveBlock === 'number' ? preserveBlock : getCurrentBookBlock();
            story.hidden = false;
            book.hidden = true;
            document.body.classList.remove('reader-book-mode');
            window.requestAnimationFrame(function () {
                scrollToReaderBlock(story, block, false);
                updateScrollProgress();
            });
        }
        writeReaderStorage(prefsKey, prefs);
    }

    function waitForReaderLayout() {
        const imagePromises = Array.from(story.querySelectorAll('img')).map(function (image) {
            return new Promise(function (resolve) {
                let settled = false;
                let timeoutId = null;

                function finish() {
                    if (settled) return;
                    settled = true;
                    if (timeoutId) window.clearTimeout(timeoutId);
                    image.removeEventListener('load', finish);
                    image.removeEventListener('error', finish);
                    if (image.complete && image.naturalWidth && typeof image.decode === 'function') {
                        image.decode().catch(function () {}).then(resolve);
                    } else {
                        resolve();
                    }
                }

                if (image.complete) {
                    finish();
                    return;
                }

                image.addEventListener('load', finish);
                image.addEventListener('error', finish);
                timeoutId = window.setTimeout(finish, 8000);
            });
        });
        const fontsReady = document.fonts && document.fonts.ready
            ? document.fonts.ready.catch(function () {})
            : Promise.resolve();

        return Promise.all([fontsReady].concat(imagePromises));
    }

    function queueStableBookBuild(targetBlock) {
        const buildToken = ++bookBuildToken;
        const stage = book.querySelector('.reader-book-stage');
        const counter = book.querySelector('.reader-page-counter');

        if (!readerLayoutResolved) {
            book.classList.add('reader-book-loading');
            stage.innerHTML = '';
            if (counter) counter.textContent = 'در حال آماده‌سازی صفحه‌ها…';
        }

        readerLayoutReady.then(function () {
            if (buildToken !== bookBuildToken || prefs.mode !== 'book') return;
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    if (buildToken !== bookBuildToken || prefs.mode !== 'book') return;
                    buildBookPages(targetBlock);
                    book.classList.remove('reader-book-loading');
                });
            });
        });
    }

    function buildBookPages(targetBlock) {
        const stage = book.querySelector('.reader-book-stage');
        stage.innerHTML = '';
        pages = [];
        currentPage = 0;

        const blocks = Array.from(story.children);

        blocks.forEach(function (block, index) {
            block.dataset.readerBlock = index;
        });

        function createPage() {
            const page = document.createElement('article');
            page.className = 'reader-book-page measuring';
            page.dataset.startBlock = '0';
            stage.appendChild(page);
            pages.push(page);
            return page;
        }

        let page = createPage();
        blocks.forEach(function (block, index) {
            const clone = block.cloneNode(true);
            clone.dataset.readerBlock = index;
            if (!page.children.length) page.dataset.startBlock = index;
            page.appendChild(clone);

            if (page.scrollHeight > page.clientHeight && page.children.length > 1) {
                page.removeChild(clone);
                page = createPage();
                page.dataset.startBlock = index;
                page.appendChild(clone);
            }

            if (page.scrollHeight > page.clientHeight) {
                page.removeChild(clone);
                const words = (block.innerText || block.textContent || '').trim().split(/\s+/).filter(Boolean);

                if (words.length > 1 && /^(P|BLOCKQUOTE|LI|DIV)$/.test(block.tagName)) {
                    let remaining = words.slice();
                    while (remaining.length) {
                        if (page.children.length) page = createPage();
                        page.dataset.startBlock = index;

                        const piece = block.cloneNode(false);
                        piece.dataset.readerBlock = index;
                        page.appendChild(piece);

                        let low = 1;
                        let high = remaining.length;
                        let best = 1;
                        while (low <= high) {
                            const middle = Math.floor((low + high) / 2);
                            piece.textContent = remaining.slice(0, middle).join(' ');
                            if (page.scrollHeight <= page.clientHeight) {
                                best = middle;
                                low = middle + 1;
                            } else {
                                high = middle - 1;
                            }
                        }

                        const trailingWords = remaining.length - best;
                        const minimumFinalPageWords = 24;
                        const balancedBest = trailingWords > 0 && trailingWords < minimumFinalPageWords &&
                            best > minimumFinalPageWords
                            ? best - (minimumFinalPageWords - trailingWords)
                            : best;
                        piece.textContent = remaining.slice(0, balancedBest).join(' ');
                        remaining = remaining.slice(balancedBest);
                        if (remaining.length) page = createPage();
                    }
                } else {
                    page.appendChild(clone);
                    clone.classList.add('reader-oversized-block');
                }
            }
        });

        if (pages.length > 1 && !pages[pages.length - 1].children.length) {
            pages[pages.length - 1].remove();
            pages.pop();
        }

        pages.forEach(function (readerPage) {
            readerPage.classList.remove('measuring');
        });

        const wantedBlock = Number.isFinite(Number(targetBlock)) ? Number(targetBlock) : 0;
        let foundPage = pages.findIndex(function (candidate) {
            return Number(candidate.dataset.startBlock || 0) === wantedBlock;
        });
        if (foundPage < 0) {
            pages.forEach(function (candidate, index) {
                if (Number(candidate.dataset.startBlock || 0) <= wantedBlock) foundPage = index;
            });
        }
        currentPage = foundPage >= 0 ? foundPage : 0;
        showBookPage(currentPage, false);
    }

    function showBookPage(index, animate) {
        if (!pages.length) return;
        currentPage = Math.max(0, Math.min(index, pages.length - 1));
        pages.forEach(function (page, pageIndex) {
            page.classList.toggle('active', pageIndex === currentPage);
            page.classList.remove('turning');
        });
        if (animate) {
            pages[currentPage].classList.add('turning');
            window.setTimeout(function () {
                if (pages[currentPage]) pages[currentPage].classList.remove('turning');
            }, 320);
        }

        const counter = book.querySelector('.reader-page-counter');
        counter.textContent = 'صفحه ' + (currentPage + 1).toLocaleString('fa-IR') + ' از ' + pages.length.toLocaleString('fa-IR');
        book.querySelector('[data-page-action="prev"]').disabled = currentPage === 0;
        book.querySelector('[data-page-action="next"]').disabled = currentPage === pages.length - 1;
        updateBookProgress(animate);
        saveReaderPosition();
    }

    function getCurrentBookBlock() {
        if (!pages[currentPage]) return 0;
        return Number(pages[currentPage].dataset.startBlock || 0);
    }

    function updateScrollProgress(trackStatus) {
        if (prefs.mode !== 'scroll') return;
        const rect = story.getBoundingClientRect();
        const total = Math.max(1, story.scrollHeight - window.innerHeight * 0.6);
        const read = Math.max(0, -rect.top + window.innerHeight * 0.25);
        const percent = Math.min(1, read / total);
        progress.querySelector('span').style.transform = 'scaleX(' + percent + ')';
        if (trackStatus) {
            trackReadingProgress(percent, {
                mode: 'scroll',
                block: getCurrentReaderBlock(story)
            });
        }
        window.dispatchEvent(new CustomEvent('coffpen:reader-progress', {
            detail: { percent: percent, mode: 'scroll' }
        }));
    }

    function updateBookProgress(trackStatus) {
        const percent = pages.length ? (currentPage + 1) / pages.length : 0;
        progress.querySelector('span').style.transform = 'scaleX(' + percent + ')';
        if (trackStatus) {
            trackReadingProgress(percent, {
                mode: 'book',
                block: getCurrentBookBlock(),
                page: currentPage
            });
        }
        window.dispatchEvent(new CustomEvent('coffpen:reader-progress', {
            detail: {
                percent: percent,
                mode: 'book',
                page: currentPage + 1,
                totalPages: pages.length
            }
        }));
    }

    function trackReadingProgress(percent, position) {
        const previous = readReaderStorage(progressStorageKey, {});
        const highestPercent = Math.max(Number(previous.percent) || 0, Number(percent) || 0, 0.01);
        writeReaderStorage(progressStorageKey, Object.assign({}, previous, position || {}, {
            percent: Math.min(1, highestPercent),
            updatedAt: Date.now()
        }));
    }

    function saveReaderPosition(force) {
        if (!prefs.rememberPosition && force !== true) return;
        const data = prefs.mode === 'book'
            ? { mode: 'book', block: getCurrentBookBlock(), page: currentPage, savedAt: Date.now() }
            : {
                mode: 'scroll',
                block: getCurrentReaderBlock(story),
                percent: getReaderScrollPercent(story),
                savedAt: Date.now()
            };
        writeReaderStorage(storageKey, data);
    }

    toolbar.addEventListener('click', function (event) {
        const button = event.target.closest('[data-reader-action]');
        if (!button) return;
        const action = button.dataset.readerAction;

        if (action === 'share') {
            const shareData = getStoryShareData();
            handleSmartShare(event, shareData.title, shareData.url);
        } else if (action === 'mode') {
            setMode(prefs.mode === 'book' ? 'scroll' : 'book');
        } else if (action === 'bookmark') {
            prefs.rememberPosition = !prefs.rememberPosition;
            applyReaderPreferences();
            if (prefs.rememberPosition) {
                saveReaderPosition(true);
                showToast('ذخیره خودکار محل مطالعه فعال شد.');
            } else {
                writeReaderStorage(storageKey, {});
                showToast('ذخیره محل مطالعه غیرفعال و موقعیت قبلی پاک شد.');
            }
        } else if (action === 'focus') {
            prefs.focus = !prefs.focus;
            button.classList.toggle('active', prefs.focus);
            applyReaderPreferences();
        } else if (action === 'settings') {
            const panel = toolbar.querySelector('.reader-settings-panel');
            panel.hidden = !panel.hidden;
            tocPanel.hidden = true;
        } else if (action === 'toc') {
            tocPanel.hidden = !tocPanel.hidden;
            toolbar.querySelector('.reader-settings-panel').hidden = true;
        } else if (action === 'font-up' || action === 'font-down') {
            const fontChange = action === 'font-up' ? 0.1 : -0.1;
            prefs.fontScale = Math.round(
                Math.min(1.6, Math.max(0.8, Number(prefs.fontScale || 1) + fontChange)) * 100
            ) / 100;
            applyReaderPreferences();
            rebuildBookAfterPreferenceChange();
        } else if (action === 'line-height') {
            const lines = [1.75, 2.1, 2.5];
            prefs.lineHeight = lines[(lines.indexOf(prefs.lineHeight) + 1) % lines.length];
            applyReaderPreferences();
            rebuildBookAfterPreferenceChange();
        } else if (action === 'width') {
            const widths = [620, 760, 900];
            prefs.width = widths[(widths.indexOf(prefs.width) + 1) % widths.length];
            applyReaderPreferences();
            rebuildBookAfterPreferenceChange();
        } else if (action === 'reader-theme') {
            const themes = ['auto', 'paper', 'light', 'dark'];
            prefs.readerTheme = themes[(themes.indexOf(prefs.readerTheme) + 1) % themes.length];
            applyReaderPreferences();
        }
    });

    tocPanel.addEventListener('click', function (event) {
        const link = event.target.closest('a[data-reader-heading]');
        if (!link) return;
        event.preventDefault();
        const target = story.querySelector('#' + link.dataset.readerHeading);
        if (!target) return;
        const block = Array.from(story.children).indexOf(target);
        if (prefs.mode === 'book') {
            queueStableBookBuild(block);
        } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        tocPanel.hidden = true;
    });

    book.addEventListener('click', function (event) {
        const pauseButton = event.target.closest('.reader-pause-point button');
        if (pauseButton) {
            prefs.rememberPosition = true;
            applyReaderPreferences();
            saveReaderPosition(true);
            showToast('این صفحه ذخیره شد و یادآوری محل مطالعه روشن است.');
            return;
        }
        const pageButton = event.target.closest('[data-page-action]');
        if (!pageButton) return;
        showBookPage(currentPage + (pageButton.dataset.pageAction === 'next' ? 1 : -1), true);
    });

    book.addEventListener('pointerdown', function (event) {
        touchStartX = event.clientX;
    });
    book.addEventListener('pointerup', function (event) {
        const delta = event.clientX - touchStartX;
        if (Math.abs(delta) < 55) return;
        showBookPage(currentPage + (delta < 0 ? 1 : -1), true);
    });

    document.addEventListener('keydown', function (event) {
        if (prefs.mode !== 'book' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
        if (event.key === 'ArrowLeft' || event.key === 'PageDown') showBookPage(currentPage + 1, true);
        if (event.key === 'ArrowRight' || event.key === 'PageUp') showBookPage(currentPage - 1, true);
    });

    window.addEventListener('scroll', function () {
        if (prefs.mode !== 'scroll') return;
        updateScrollProgress(true);
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(saveReaderPosition, 180);
    }, { passive: true });

    window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
            if (prefs.mode === 'book') queueStableBookBuild(getCurrentBookBlock());
        }, 180);
    });

    if (prefs.rememberPosition) {
        maybeShowResumeNotice(savedPosition, story, function (block) {
            if (prefs.mode === 'book') queueStableBookBuild(block);
            else scrollToReaderBlock(story, block, true);
        }, function () {
            writeReaderStorage(storageKey, {});
        });
    }

    window.addEventListener('beforeunload', function () {
        saveReaderPosition();
    });

    setMode(prefs.mode, 0);
    updateScrollProgress();

    function rebuildBookAfterPreferenceChange() {
        if (prefs.mode === 'book') {
            window.requestAnimationFrame(function () {
                queueStableBookBuild(getCurrentBookBlock());
            });
        }
    }
}

function normalizeLooseStoryContent(story) {
    const blockTags = new Set([
        'ADDRESS', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'FIGCAPTION', 'FIGURE', 'H1', 'H2', 'H3', 'H4',
        'H5', 'H6', 'HR', 'IMG', 'LI', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'UL', 'VIDEO'
    ]);
    const nodes = Array.from(story.childNodes);
    let paragraph = null;

    function ensureParagraph() {
        if (paragraph) return paragraph;
        paragraph = document.createElement('p');
        story.insertBefore(paragraph, currentNode || null);
        return paragraph;
    }

    let currentNode = null;
    nodes.forEach(function (node) {
        currentNode = node;
        const isBlock = node.nodeType === Node.ELEMENT_NODE && blockTags.has(node.tagName);
        if (isBlock) {
            paragraph = null;
            return;
        }

        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim() && !paragraph) {
            node.remove();
            return;
        }

        ensureParagraph().appendChild(node);
    });
}

function readerButton(action, icon, label, extraClass) {
    return '<button type="button" class="reader-icon-btn ' + (extraClass || '') + '" data-reader-action="' + action +
        '" aria-label="' + label + '" title="' + label + '">' + readerIcon(icon) + '</button>';
}

function readerIcon(name) {
    const icons = {
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
        'book-open': '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
        circle: '<circle cx="12" cy="12" r="8"/>',
        'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/>',
        bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
        layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
        focus: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
        list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.4.3.7.6.8 1.1h.1v4h-.1c-.1.4-.4.8-.8.9z"/>',
        minus: '<path d="M5 12h14"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        lines: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        width: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/><path d="M8 12h8"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.1M8.7 13.3l6.6 4.1"/>',
        message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.4 9.4 0 0 1-4-.9L3 21l1.8-4.7A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 9.5c1 2.5 2.5 4 5 5"/>',
        send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
        x: '<path d="M6 6l12 12M18 6 6 18"/>',
        'chevron-right': '<path d="m9 18 6-6-6-6"/>',
        'chevron-left': '<path d="m15 18-6-6 6-6"/>'
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (icons[name] || icons.settings) + '</svg>';
}

function updateReaderSettingsLabels(toolbar, prefs) {
    const font = toolbar.querySelector('[data-reader-value="font"]');
    const line = toolbar.querySelector('[data-reader-value="line"]');
    const width = toolbar.querySelector('[data-reader-value="width"]');
    const theme = toolbar.querySelector('[data-reader-value="theme"]');
    if (font) font.textContent = Math.round(prefs.fontScale * 100).toLocaleString('fa-IR') + '٪';
    if (line) line.textContent = prefs.lineHeight < 2 ? 'فشرده' : prefs.lineHeight > 2.2 ? 'باز' : 'معمولی';
    if (width) width.textContent = prefs.width < 700 ? 'باریک' : prefs.width > 800 ? 'عریض' : 'متوسط';
    if (theme) theme.textContent = { auto: 'خودکار', paper: 'کاغذی', light: 'روشن', dark: 'تاریک' }[prefs.readerTheme] || 'خودکار';
}

function addReaderPausePoint(story, wordCount, onSave) {
    if (wordCount < 700 || story.querySelector('.reader-pause-point')) return;
    const blocks = Array.from(story.children);
    if (blocks.length < 6) return;
    const middle = blocks[Math.floor(blocks.length / 2)];
    const marker = document.createElement('aside');
    marker.className = 'reader-pause-point';
    marker.innerHTML = '<span>جای مناسبی برای مکث</span><button type="button" title="ذخیره این نقطه">' +
        readerIcon('bookmark') + 'ذخیره و ادامه در فرصتی دیگر</button>';
    middle.insertAdjacentElement('afterend', marker);
    marker.querySelector('button').addEventListener('click', function () {
        if (typeof onSave === 'function') onSave();
    });
}

function getCurrentReaderBlock(story) {
    const blocks = Array.from(story.children);
    let current = 0;
    blocks.forEach(function (block, index) {
        if (block.getBoundingClientRect().top <= window.innerHeight * 0.38) current = index;
    });
    return current;
}

function getReaderScrollPercent(story) {
    const rect = story.getBoundingClientRect();
    const total = Math.max(1, story.scrollHeight - window.innerHeight * 0.6);
    return Math.min(1, Math.max(0, (-rect.top + window.innerHeight * 0.25) / total));
}

function scrollToReaderBlock(story, block, smooth) {
    const blocks = Array.from(story.children);
    const target = blocks[Math.max(0, Math.min(Number(block) || 0, blocks.length - 1))];
    if (target) target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
}

function maybeShowResumeNotice(saved, story, resume, discard) {
    if (!saved || (!saved.block && !saved.percent) || Date.now() - Number(saved.savedAt || 0) > 1000 * 60 * 60 * 24 * 90) return;
    const notice = document.createElement('div');
    notice.className = 'reader-resume-notice';
    notice.innerHTML = '<span>' + readerIcon('bookmark') + 'ادامه از آخرین محل مطالعه؟</span>' +
        '<div><button type="button" data-resume="yes">ادامه</button><button type="button" data-resume="no">از ابتدا</button></div>';
    document.body.appendChild(notice);
    notice.addEventListener('click', function (event) {
        const choice = event.target.closest('[data-resume]');
        if (!choice) return;
        if (choice.dataset.resume === 'yes') resume(Number(saved.block || 0));
        else {
            scrollToReaderBlock(story, 0, true);
            if (discard) discard();
        }
        notice.remove();
    });
}

function readReaderStorage(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
        return fallback;
    }
}

function writeReaderStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        // Reading preferences remain functional even when storage is unavailable.
    }
}

function initializeCoffpenPage() {
    initTheme();
    initSidebar();
    initContextMenu();
    initNoteShelf();
    initPostRegistry();
    initSeriesHub();
    initLiveHero();
    initSeriesFilter();
    initStoryHero();
    initStoryPlaylist();
    initLongformReader();
    window.setTimeout(function () {
        window.requestAnimationFrame(function () {
            document.documentElement.classList.add('page-ready');
        });
    }, 0);
}

// Initialize Everything on Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCoffpenPage);
} else {
    initializeCoffpenPage();
}
