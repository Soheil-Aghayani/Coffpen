(function (scope) {
    'use strict';

    // Firebase's web configuration and VAPID public key are safe to expose in a web app.
    // Keep enabled=false until the Firebase project, Anonymous Auth and Firestore rules are ready.
    scope.COFFPEN_NOTIFICATIONS = {
        enabled: false,
        sdkVersion: '12.16.0',
        vapidKey: '',
        firebaseConfig: {
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: ''
        }
    };
})(typeof self !== 'undefined' ? self : window);
