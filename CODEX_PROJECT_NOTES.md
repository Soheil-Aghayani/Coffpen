# Coffpen — Codex project notes

این فایل دفترچهٔ نگهداری پروژه است. هر بار که context فشرده شد، پیش از ویرایش کد این فایل را بخوان، وضعیت Git را بررسی کن و اول منبع اصلی تغییر را پیدا کن. هدف این است که بهینه‌سازی‌های قبلی، محتوای کاربر و قراردادهای پروژه ناخواسته از بین نروند.

## هویت و محدودهٔ پروژه

- نام پروژه: **Coffpen / کاف‌پن / سیاه و قلم**.
- سایت زنده: <https://soheil-aghayani.github.io/Coffpen/>.
- میزبانی: GitHub Pages از شاخهٔ `main`.
- این یک سایت استاتیک است؛ برای قابلیت‌های سمت سرور (کامنت، لایک، اعلان و ایمیل) باید سرویس جداگانه و مجوزهای لازم اضافه شود؛ GitHub Pages به‌تنهایی backend نیست.
- فایل‌ها و تصویرهای ناشناختهٔ کاربر را حذف یا بازنویسی نکن. در زمان ثبت این یادداشت، این دو فایل untracked هستند و نباید بدون درخواست کاربر stage شوند:
  - `assets/images/paper choke.webp`
  - `assets/images/thumbs/paper choke.webp`

## منبع اصلی محتوا و تولید فایل‌ها

- هر نوشتهٔ منتشرشده در `posts/*.html` منبع اصلی محتواست.
- `posts/posts-data.js` و `posts/posts-data.min.js` فایل‌های تولیدشده‌اند؛ آن‌ها را دستی ویرایش نکن.
- `scripts/sync-posts.js` فهرست نوشته‌ها، دادهٔ نوشته‌ها، sitemap، کارت‌های مجموعه در صفحهٔ اصلی و CSS درون‌خطی صفحهٔ اصلی را همگام می‌کند؛ هنگام sync برای هر نوشتهٔ `posts/*.html` بلوک idempotent متادیتای SEO، canonical، و JSON-LD از نوع `Article`/`BreadcrumbList` هم می‌سازد.
- بلوک‌های قابل‌تولید SEO را دستی ویرایش نکن؛ نشانگرهای `Coffpen:post-seo:start` / `Coffpen:post-seo:end` باید فقط از طریق `scripts/sync-posts.js` به‌روز شوند. دادهٔ ساختاریافتهٔ صفحهٔ اصلی و لینک‌های شروع خواندن نیز بین نشانگرهای `Coffpen:structured-data` و `Coffpen:featured-posts` تولید می‌شوند.
- نشانگرهای تولیدشدهٔ صفحهٔ اصلی را دست‌نخورده نگه دار:
  - `Coffpen:inline-style:start` / `Coffpen:inline-style:end`
  - `Coffpen:series-hub:start` / `Coffpen:series-hub:end`
- `llms.txt` خلاصهٔ machine-readable هویت، نویسنده و مسیرهای اصلی محتوای سایت است؛ لینک‌های آن را با URLهای canonical همگام نگه دار و آن را با `git add .` ناخواسته جایگزین نکن.
- اگر نوشته‌ای در پنل ساخته شد ولی در سایت دیده نشد، ابتدا فایل واقعی آن را در `posts/` بررسی کن، سپس sync را اجرا کن؛ مشکل را با ویرایش دستی `posts-data` پنهان نکن.

## روند امن انتشار

1. نوشته را در پنل یا در `posts/` ایجاد/ویرایش کن.
2. از ریشهٔ پروژه اجرا کن:

   ```powershell
   node scripts/sync-posts.js
   ```

3. اگر فایل CSS/JS اصلی تغییر کرده است، فایل‌های فشرده را دوباره بساز و سپس sync را دوباره اجرا کن:

   ```powershell
   npx.cmd --yes clean-css-cli -o assets/css/style.min.css assets/css/style.css
   npx.cmd --yes terser assets/js/main.js --compress --mangle --comments false --output assets/js/main.min.js
   node scripts/sync-posts.js
   ```

4. پیش از commit اعتبارسنجی کن:

   ```powershell
   node --check assets/js/main.js
   node --check assets/js/main.min.js
   node --check scripts/sync-posts.js
   git diff --check
   ```

5. فقط فایل‌های مربوط را stage کن؛ از `git add .` استفاده نکن، چون ممکن است تصویرهای شخصیِ untracked وارد commit شوند. بعد commit و `git push origin main` را انجام بده و موفقیت workflow مربوط به GitHub Pages را بررسی کن.

## قراردادهای عملکردی که نباید شکسته شوند

- فونت‌ها local و فایل‌های CSS/JS عمومی minified هستند؛ Google Fonts یا درخواست شبکهٔ غیرضروری اضافه نکن.
- صفحهٔ اصلی کارت‌های مجموعه را به‌صورت HTML اولیه دارد و JS بعداً hydration می‌کند. نشانگرهای `series-hub`، `defer` بودن اسکریپت‌ها، `fetchpriority` تصویرهای مهم و lazy-loading تصویرهای بعدی را حفظ کن.
- از بازگرداندن `document.write`، cache-busting با `Date.now()`، مخفی‌کردن بدنه تا پایان JS، یا بازسازی کامل فهرست در زمان render پرهیز کن؛ این‌ها باعث پرش صفحه و افت LCP می‌شوند.
- هدف عملکرد موبایل PageSpeed بالاتر از ۹۵ است. baseline تأییدشده در ۱۴۰۵/۰۵/۲۳ (۲۰۲۶-۰۸-۱۴): Performance 100، Accessibility 96، Best Practices 100، SEO 100، با FCP حدود ۰٫۹ ثانیه، LCP حدود ۱٫۸ ثانیه، TBT صفر و CLS حدود ۰٫۰۰۱.
- اگر گزارش PageSpeed قدیمی خطای `NO_LCP` نشان داد، ابتدا Analyze تازه اجرا کن؛ ممکن است اجرای ناقص یا cache باشد. گزارش baseline تازه با شناسهٔ `5eso3otc10` ثبت شده است.

## قراردادهای SEO و ایندکس

- `index.html` باید title، description، canonical و JSON-LD معتبر داشته باشد.
- `robots.txt` باید sitemap را معرفی کند و `sitemap.xml` بعد از sync به‌روز شود.
- تأیید مالکیت Search Console به‌تنهایی ایندکس‌شدن را تضمین نمی‌کند. پس از انتشارهای مهم، در Search Console sitemap زیر را ثبت/بررسی کن:
  `https://soheil-aghayani.github.io/Coffpen/sitemap.xml`
- برای صفحهٔ اصلی یا نوشتهٔ تازه، از URL Inspection درخواست indexing بده. ایندکس و رتبه‌گیری ممکن است چند روز یا چند هفته طول بکشد و تضمینی نیست.
- وضعیت ثبت اولیه در ۲۰۲۶-۰۸-۱۴: مالکیت با روش `Parent property` تأیید شد، sitemap ارسال شد و درخواست indexing صفحهٔ اصلی با موفقیت وارد صف شد. اگر Search Console بلافاصله برای sitemap وضعیت `Couldn't fetch` نشان داد اما درخواست مستقیم HTTP وضعیت ۲۰۰ و XML معتبر دارد، آن را موقت/در حال پردازش در نظر بگیر؛ ۲۴ تا ۴۸ ساعت بعد دوباره بررسی کن و پشت‌سرهم sitemap را duplicate نکن.
- از keyword stuffing و title/description تکراری پرهیز کن.

## راهنمای عیب‌یابی سریع

- **نوشته در فهرست نیست:** وجود فایل در `posts/`، front matter/متادیتا، خروجی `node scripts/sync-posts.js` و تغییرات `git diff` را بررسی کن.
- **صفحه در بار اول ناقص است ولی با refresh درست می‌شود:** ترتیب اجرای hydration، selectorهای موجود، و خطاهای Console را بررسی کن؛ راه‌حل نباید با opacity یا refresh اجباری باشد.
- **تصویر یا متن دیر می‌آید:** مسیر نسبی، وجود WebP/thumbnail و `loading`/`fetchpriority` را بررسی کن؛ فایل بزرگ را بی‌دلیل eager نکن.
- **فیلتر/تگ کار نمی‌کند:** URL و state فیلتر را بدون reload بررسی کن و مطمئن شو دادهٔ tag واقعاً در manifest تولیدشده وجود دارد.
- **Push رد شد:** اول وضعیت merge و branch را با `git status` و `git log --oneline --decorate -5` بررسی کن؛ از reset مخرب استفاده نکن.

## قانون طلایی برای ادامهٔ کار

پیش از هر تغییر: `git status --short`، منبع اصلی داده، و فایل‌های تولیدشدهٔ مرتبط را شناسایی کن. پس از هر تغییر: sync، اعتبارسنجی، diff، و تست صفحهٔ زنده. تغییرات کاربر را حفظ کن، فایل تولیدشده را دستی اصلاح نکن، و اگر scope روشن نیست سؤال بپرس.
