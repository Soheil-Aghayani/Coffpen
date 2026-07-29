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

function handleSmartShare(event, title, url) {
    if (event) event.preventDefault();

    const targetTitle = title || document.title;
    const targetUrl = url || window.location.href;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (isMobile) {
        if (navigator.share) {
            navigator.share({
                title: targetTitle,
                url: targetUrl
            }).catch(function () {
                copyStoryLink(targetUrl);
            });
        } else {
            copyStoryLink(targetUrl);
        }
    } else {
        openShareModal(targetTitle, targetUrl, event);
    }
}

function openShareModal(title, url, event) {
    currentShareTitle = title || document.title;
    currentShareUrl = url || window.location.href;

    const modal = document.getElementById('shareModal');
    const input = document.getElementById('shareModalInput');

    if (modal && input) {
        input.value = currentShareUrl;
        modal.classList.add('active');
    }
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) {
        modal.classList.remove('active');
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

// Initialize Everything on Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initSidebar();
        initContextMenu();
    });
} else {
    initTheme();
    initSidebar();
    initContextMenu();
}
