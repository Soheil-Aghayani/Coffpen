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
- همان اسکریپت `archive.html` را نیز تولید می‌کند؛ این صفحه باید فهرست کامل و قابل‌خزش همهٔ نوشته‌ها، لینک مستقیم به هر `posts/*.html` و JSON-LD از نوع `CollectionPage`/`ItemList` داشته باشد. آن را دستی ویرایش نکن.
- `series.html` نیز تولیدی است و باید مجموعه‌ها را گروه‌بندی کرده و به همهٔ قسمت‌های هر مجموعه لینک مستقیم بدهد؛ این صفحه برای کشف بهتر ساختار سریالی و GEO نگه داشته می‌شود.
- `coffpen.html` صفحهٔ هویتِ تولیدیِ برند است؛ شکل‌های «کافپن»، «کاف‌پن»، «کاف پن»، «Coffpen» و «سیاه و قلم» را به‌صورت طبیعی معرفی می‌کند و باید در sitemap و لینک‌های داخلی باقی بماند.
- `feed.xml` نیز از `posts/*.html` توسط همان اسکریپت تولید می‌شود؛ آن را به قالب Jekyll مبتنی بر `_posts` برنگردان، چون آن پوشه برای محتوای واقعی سایت خالی است.
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
- برای این سایت از property مستقیم URL-prefix با نشانی `https://soheil-aghayani.github.io/Coffpen/` استفاده کن؛ property والدِ `https://soheil-aghayani.github.io/` ممکن است sitemap کاف‌پن را به‌عنوان referring sitemap گزارش نکند.
- دامنهٔ ریشهٔ صاحب سایت (`Soheil-Aghayani.github.io`) هم باید در `robots.txt` به sitemap کاف‌پن اشاره کند و URL صفحهٔ اصلی کاف‌پن را در sitemap خودش داشته باشد؛ این کار برای کشف سایت از property ریشه انجام شده و نباید با sitemap کاف‌پن اشتباه گرفته شود.
- برای سیگنال معنایی و لینک داخلی، صفحهٔ `projects.html` همان دامنه نیز یک لینک قابل‌خزش به صفحهٔ اصلی کاف‌پن دارد؛ اگر دامنه/مسیر canonical عوض شد، این لینک و هر دو sitemap را با هم به‌روز کن.
- برای صفحهٔ اصلی یا نوشتهٔ تازه، از URL Inspection درخواست indexing بده. ایندکس و رتبه‌گیری ممکن است چند روز یا چند هفته طول بکشد و تضمینی نیست.
- وضعیت ثبت اولیه در ۲۰۲۶-۰۸-۱۴: مالکیت parent و property مستقیم تأیید شد؛ sitemap در property مستقیم پیام موفقیت گرفت. سپس صفحهٔ اصلی در URL Inspection به وضعیت `URL is on Google / Page is indexed` رسید؛ یک نوشتهٔ نمونه و صفحهٔ معرفی نویسنده نیز هرکدام یک‌بار وارد `priority crawl queue` شدند. جدول sitemap ممکن است مدتی `Unknown`/`Couldn't fetch` بماند، در حالی‌که درخواست مستقیم HTTP وضعیت ۲۰۰ و XML معتبر دارد؛ پشت‌سرهم sitemap یا درخواست indexing را تکرار نکن.
- آخرین انتشار تأییدشده در ۲۰۲۶-۰۸-۱۴: workflow شمارهٔ `31807612899` با commit `d11e189` با موفقیت تمام شد؛ `feed.xml` زنده با HTTP 200، نوع `application/xml` و ۵۹ آیتم RSS بررسی شد. `archive.html` فهرست مستقیم نوشته‌ها، `series.html` چهار مجموعه/۳۶ لینک قسمت و `coffpen.html` صفحهٔ هویت برند را ارائه می‌کنند. برای archive، series، `بار-مارکو.html` و `coffpen.html` هرکدام یک‌بار درخواست crawl ثبت شده است؛ درخواست تکراری لازم نیست. مخزن ریشه نیز با commit `c6c670a` لینک و sitemap صفحهٔ هویت را منتشر کرد.
- پس از آن، commit `d89fdfe` شکل‌های نوشتاری نام برند را در متادیتای همهٔ ۵۹ نوشته و صفحات discovery یکسان کرد؛ workflowهای `31808758411` و `31808757754` هر دو با موفقیت تمام شدند. این انتشار زنده با GET مستقیم بررسی شد: صفحهٔ اصلی، صفحهٔ برند و نوشتهٔ نمونه HTTP 200 هستند، sitemap شامل ۶۴ URL و feed شامل ۵۹ آیتم است.
- در مخزن ریشه، انتشار `013d713` پس از حذف ناخواستهٔ سیگنال‌های Coffpen در commitهای `3f03c2e`/`ea7dfa7`، فقط اتصال‌های فنیِ JSON-LD، `llms.txt`، robots و sitemap را برگرداند و workflow `31810271968` موفق شد؛ ظاهر پورتفولیو عمداً دست‌نخورده ماند. نسخهٔ زندهٔ ریشه اکنون نام‌های `کافپن`/`کاف‌پن` و چهار URL کافپن را در sitemap دارد.
- در بررسی Search Console در ۲۰۲۶-۰۸-۱۴، صفحهٔ اصلی و `coffpen.html` وضعیت `URL is on Google / Page is indexed` داشتند؛ `archive.html` و `series.html` با وضعیت `Crawled - currently not indexed` و نوشتهٔ نمونهٔ `بار-مارکو.html` هنوز `URL is unknown to Google` بودند. جست‌وجوی عمومی همان روز هنوز نتیجه‌ای نشان نداد؛ تا وقتی شواهد عمومی واقعی نداریم، رتبهٔ اول یا دیده‌شدن کامل را ادعا نکن و درخواست indexing را پشت‌سرهم تکرار نکن.
- آخرین اصلاح متادیتای نویسنده در commit `71467ce` منتشر شد و workflow `31810756568` موفق بود؛ `about.html` اکنون همهٔ شکل‌های نام برند را در `alternateName` و breadcrumb به‌صورت هم‌راستا دارد.
- از keyword stuffing و title/description تکراری پرهیز کن.
- برای کشف نام برند، در متادیتای تولیدی از شکل‌های طبیعی و محدود `کافپن`، `کاف‌پن`، `کاف پن`، `Coffpen` و `سیاه و قلم` استفاده کن؛ این عبارت‌ها باید در صفحهٔ هویت برند، نام/توضیح صفحهٔ اصلی و متادیتای نوشته‌ها هم‌راستا بمانند، نه اینکه به فهرست طولانی کلمات کلیدی تبدیل شوند.

## راهنمای عیب‌یابی سریع

- **نوشته در فهرست نیست:** وجود فایل در `posts/`، front matter/متادیتا، خروجی `node scripts/sync-posts.js` و تغییرات `git diff` را بررسی کن.
- **صفحه در بار اول ناقص است ولی با refresh درست می‌شود:** ترتیب اجرای hydration، selectorهای موجود، و خطاهای Console را بررسی کن؛ راه‌حل نباید با opacity یا refresh اجباری باشد.
- **تصویر یا متن دیر می‌آید:** مسیر نسبی، وجود WebP/thumbnail و `loading`/`fetchpriority` را بررسی کن؛ فایل بزرگ را بی‌دلیل eager نکن.
- **فیلتر/تگ کار نمی‌کند:** URL و state فیلتر را بدون reload بررسی کن و مطمئن شو دادهٔ tag واقعاً در manifest تولیدشده وجود دارد.
- **Push رد شد:** اول وضعیت merge و branch را با `git status` و `git log --oneline --decorate -5` بررسی کن؛ از reset مخرب استفاده نکن.

## قانون طلایی برای ادامهٔ کار

پیش از هر تغییر: `git status --short`، منبع اصلی داده، و فایل‌های تولیدشدهٔ مرتبط را شناسایی کن. پس از هر تغییر: sync، اعتبارسنجی، diff، و تست صفحهٔ زنده. تغییرات کاربر را حفظ کن، فایل تولیدشده را دستی اصلاح نکن، و اگر scope روشن نیست سؤال بپرس.

## چک‌لیست ادامه پس از فشرده‌شدن context

1. این فایل را کامل بخوان و سپس `git status --short` و `git log --oneline --decorate -5` را اجرا کن؛ فرض نکن وضعیت branch همان وضعیت قبلی است.
2. برای نوشته‌ها فقط `posts/*.html` را منبع اصلی بدان؛ بعد از هر تغییر محتوایی `node scripts/sync-posts.js` را اجرا کن و diff فایل‌های تولیدشده را بررسی کن.
3. پیش از commit این بررسی‌ها را انجام بده: `node --check scripts/sync-posts.js`، `node --check assets/js/main.js` و `git diff --check`؛ فایل‌های تصویری untracked کاربر را stage نکن.
4. برای SEO/GEO، canonical، robots، sitemap، JSON-LD و لینک‌های داخلی را هم‌زمان حفظ کن. ارتباط نویسنده با repository کاف‌پن باید در `sameAs` صفحهٔ اصلی/درباره و در `llms.txt` باقی بماند.
5. برای Search Console از property مستقیم URL-prefix یعنی `https://soheil-aghayani.github.io/Coffpen/` استفاده کن. درخواست indexing را تکرار نکن؛ وضعیت ایندکس را با URL Inspection و جست‌وجوی عمومی بررسی کن و تا پیش از شواهد واقعی، رتبهٔ اول یا نتیجهٔ عمومی را ادعا نکن.
6. اگر از مرورگر داخلی استفاده شد، پیش از پایان کار تب‌ها را finalize کن؛ پس از finalize دیگر ابزار مرورگر را صدا نزن.
