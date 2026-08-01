/* global firebase, COFFPEN_NOTIFICATIONS */
'use strict';

importScripts('./assets/js/firebase-config.js');

const notificationSettings = self.COFFPEN_NOTIFICATIONS || {};
const sdkVersion = notificationSettings.sdkVersion || '12.16.0';

if (notificationSettings.enabled && notificationSettings.firebaseConfig) {
    importScripts('https://www.gstatic.com/firebasejs/' + sdkVersion + '/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/' + sdkVersion + '/firebase-messaging-compat.js');

    firebase.initializeApp(notificationSettings.firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
        const data = payload.data || {};
        const title = data.title || 'خبر تازه‌ای در سیاه و قلم';
        const options = {
            body: data.body || 'یک داستان تازه منتشر شده است.',
            icon: data.icon || './assets/images/favicon.png',
            badge: data.badge || './assets/images/favicon.png',
            tag: data.tag || 'coffpen-new-story',
            renotify: true,
            data: {
                url: data.url || './index.html'
            }
        };
        return self.registration.showNotification(title, options);
    });
}

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const destination = new URL(
        event.notification.data && event.notification.data.url
            ? event.notification.data.url
            : './index.html',
        self.registration.scope
    ).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
            const matchingWindow = windows.find(function (client) {
                return client.url === destination;
            });
            if (matchingWindow) return matchingWindow.focus();
            return clients.openWindow(destination);
        })
    );
});
