# راه‌اندازی خبررسان داستان‌ها

رابط پسر روزنامه‌فروش، منوی اعلان‌ها، Service Worker و ارسال خودکار در پروژه آماده‌اند. برای فعال‌شدن اعلان واقعی، یک پروژه رایگان Firebase روی پلن Spark بسازید.

## ۱. ساخت پروژه رایگان

1. وارد [Firebase Console](https://console.firebase.google.com/) شوید و یک پروژه بسازید.
2. هیچ Billing Account یا کارت بانکی به پروژه متصل نکنید؛ پروژه باید روی **Spark** بماند.
3. از Project settings یک Web app به پروژه اضافه کنید.

## ۲. فعال‌کردن سرویس‌های رایگان

1. در **Authentication → Sign-in method**، ورود **Anonymous** را فعال کنید.
2. در **Firestore Database** یک دیتابیس بسازید.
3. محتوای فایل `firestore.rules` این پروژه را در بخش Rules فایراستور قرار دهید و Publish کنید.
4. در **Project settings → Cloud Messaging → Web Push certificates** یک Key Pair بسازید.

## ۳. اتصال سایت

فایل `assets/js/firebase-config.js` را باز کنید:

- مقدار `firebaseConfig` را از تنظیمات Web app کپی کنید.
- Public VAPID key را در `vapidKey` قرار دهید.
- در پایان `enabled` را از `false` به `true` تغییر دهید.

این مقادیر عمومی هستند. **Service Account یا Private Key را هرگز داخل این فایل نگذارید.**

## ۴. اتصال ارسال خودکار GitHub

1. در Firebase به **Project settings → Service accounts** بروید.
2. یک Private key جدید برای Service Account ایجاد و فایل JSON را دانلود کنید.
3. در GitHub به **Repository settings → Secrets and variables → Actions** بروید.
4. یک Repository secret با نام زیر بسازید:

   `FIREBASE_SERVICE_ACCOUNT`

5. تمام محتوای فایل JSON را به‌عنوان مقدار Secret قرار دهید.

از این پس وقتی یک فایل HTML تازه داخل `posts/` به شاخه `main` اضافه شود، workflow پس از همگام‌سازی نوشته‌ها اعلان را برای مشترکان می‌فرستد. برای اعلان دستی نیز می‌توان workflow با نام **Sync static posts** را از تب Actions اجرا کرد و عنوان، متن و نشانی داستان را وارد کرد.

## پیش‌نمایش بدون Firebase

برای بررسی شخصیت و انیمیشن بدون درخواست اجازه واقعی مرورگر، صفحه را با یکی از این نشانی‌ها باز کنید:

- `index.html?paperboy-preview=first`
- `index.html?paperboy-preview=return`

حالت پیش‌نمایش هیچ اشتراک واقعی ایجاد نمی‌کند.
