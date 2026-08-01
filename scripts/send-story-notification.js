#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SITE_URL = (process.env.COFFPEN_SITE_URL || 'https://soheil-aghayani.github.io/Coffpen/').replace(/\/?$/, '/');

function readArgument(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : '';
}

function hasArgument(name) {
    return process.argv.includes(name);
}

function base64Url(value) {
    return Buffer.from(value).toString('base64url');
}

function parseServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (jsonError) {
        try {
            return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        } catch (base64Error) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT is neither JSON nor base64-encoded JSON.');
        }
    }
}

async function getAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64Url(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
        aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    }));
    const unsigned = header + '.' + claims;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key).toString('base64url');
    const assertion = unsigned + '.' + signature;
    const response = await fetch(serviceAccount.token_uri || 'https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: assertion
        })
    });
    if (!response.ok) throw new Error('Could not obtain a Firebase access token: HTTP ' + response.status);
    return (await response.json()).access_token;
}

function decodeHtml(value) {
    return String(value || '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

function urlForFile(filename) {
    return new URL(
        filename.split(/[\\/]/).map(function (part) { return encodeURIComponent(part); }).join('/'),
        SITE_URL
    ).href;
}

function storyFromFile(filename) {
    const html = fs.readFileSync(filename, 'utf8');
    const rawTitle = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || path.basename(filename, path.extname(filename));
    const title = decodeHtml(rawTitle).replace(/\s*\|\s*سیاه و قلم\s*$/u, '').trim();
    const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    return {
        title: title,
        description: decodeHtml(descriptionMatch && descriptionMatch[1]),
        url: urlForFile(filename)
    };
}

async function waitUntilPublished(url) {
    if (!hasArgument('--wait')) return;
    for (let attempt = 0; attempt < 18; attempt += 1) {
        try {
            const response = await fetch(url, { method: 'HEAD', redirect: 'follow', cache: 'no-store' });
            if (response.ok) return;
        } catch (error) {
            // GitHub Pages may still be deploying; retry below.
        }
        await new Promise(function (resolve) { setTimeout(resolve, 10000); });
    }
    console.warn('The story URL was not confirmed live before notification delivery.');
}

async function listSubscriptions(projectId, token) {
    const subscriptions = [];
    let pageToken = '';
    do {
        const endpoint = new URL(
            'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) +
            '/databases/(default)/documents/pushSubscriptions'
        );
        endpoint.searchParams.set('pageSize', '300');
        if (pageToken) endpoint.searchParams.set('pageToken', pageToken);
        const response = await fetch(endpoint, {
            headers: { authorization: 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Could not read push subscriptions: HTTP ' + response.status);
        const payload = await response.json();
        (payload.documents || []).forEach(function (document) {
            const fields = document.fields || {};
            const registrationToken = fields.token && fields.token.stringValue;
            const active = !fields.active || fields.active.booleanValue !== false;
            if (registrationToken && active) subscriptions.push({
                token: registrationToken,
                documentName: document.name
            });
        });
        pageToken = payload.nextPageToken || '';
    } while (pageToken);
    return subscriptions;
}

async function deleteSubscription(documentName, accessToken) {
    await fetch('https://firestore.googleapis.com/v1/' + documentName, {
        method: 'DELETE',
        headers: { authorization: 'Bearer ' + accessToken }
    });
}

async function sendToSubscription(projectId, accessToken, subscription, story) {
    const endpoint = 'https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/messages:send';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            authorization: 'Bearer ' + accessToken,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            message: {
                token: subscription.token,
                data: {
                    title: story.notificationTitle,
                    body: story.body,
                    url: story.url,
                    icon: new URL('assets/images/favicon.png', SITE_URL).href,
                    badge: new URL('assets/images/favicon.png', SITE_URL).href,
                    tag: 'coffpen-story-' + Buffer.from(story.url).toString('base64url').slice(-24)
                },
                webpush: {
                    headers: { Urgency: 'normal' },
                    fcmOptions: { link: story.url }
                }
            }
        })
    });
    if (response.ok) return true;

    const payload = await response.json().catch(function () { return {}; });
    const errorCode = JSON.stringify(payload);
    if (response.status === 404 || /UNREGISTERED|registration-token-not-registered/i.test(errorCode)) {
        await deleteSubscription(subscription.documentName, accessToken);
        return false;
    }
    throw new Error('FCM delivery failed with HTTP ' + response.status + '.');
}

async function main() {
    const filename = readArgument('--file');
    const manualTitle = readArgument('--title');
    const manualUrl = readArgument('--url');
    const manualBody = readArgument('--body');
    if (!filename && (!manualTitle || !manualUrl)) {
        console.log('No new story was detected; notification delivery skipped.');
        return;
    }

    const story = filename ? storyFromFile(filename) : {
        title: manualTitle,
        description: manualBody,
        url: new URL(manualUrl, SITE_URL).href
    };
    story.notificationTitle = 'داستان تازه‌ای در سیاه و قلم';
    story.body = manualBody || ('«' + story.title + '» منتشر شد. برای خواندن داستان تازه سر بزنید.');

    if (hasArgument('--dry-run')) {
        console.log(JSON.stringify(story, null, 2));
        return;
    }

    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
        console.log('Notification delivery skipped: FIREBASE_SERVICE_ACCOUNT is not configured.');
        return;
    }

    await waitUntilPublished(story.url);
    const accessToken = await getAccessToken(serviceAccount);
    const subscriptions = await listSubscriptions(serviceAccount.project_id, accessToken);
    if (!subscriptions.length) {
        console.log('No active notification subscribers yet.');
        return;
    }

    let delivered = 0;
    for (let index = 0; index < subscriptions.length; index += 20) {
        const batch = subscriptions.slice(index, index + 20);
        const results = await Promise.all(batch.map(function (subscription) {
            return sendToSubscription(serviceAccount.project_id, accessToken, subscription, story);
        }));
        delivered += results.filter(Boolean).length;
    }
    console.log('Delivered "' + story.title + '" to ' + delivered + ' subscriber(s).');
}

main().catch(function (error) {
    console.error(error.message);
    process.exitCode = 1;
});
