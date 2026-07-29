<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="rss/channel/title"/> - خوارک RSS</title>
        <link rel="stylesheet" href="style.css"/>
        <style>
          .rss-container {
            max-width: 740px;
            margin: 40px auto;
            padding: 30px;
            background-color: var(--bg-box, #181a20);
            border-radius: 12px;
            border: 1px solid var(--border-color, #282c37);
            color: var(--text-main, #f0f2f5);
          }
          .rss-header {
            border-bottom: 1px solid var(--border-subtle, #282c37);
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .rss-header h1 {
            margin: 0 0 8px 0;
            font-size: 1.5em;
            color: var(--text-main, #f0f2f5);
          }
          .rss-header p {
            margin: 0 0 16px 0;
            color: var(--text-muted, #8b92a2);
            font-size: 9pt;
          }
          .rss-notice {
            background-color: var(--bg-tag, #282c37);
            border-right: 3px solid var(--text-accent, #e5b869);
            padding: 12px 16px;
            border-radius: 0 8px 8px 0;
            font-size: 8.5pt;
            color: var(--text-muted, #8b92a2);
            margin-bottom: 25px;
          }
          .rss-item {
            padding: 20px 0;
            border-bottom: 1px solid var(--border-subtle, #282c37);
          }
          .rss-item:last-child {
            border-bottom: none;
          }
          .rss-item h2 {
            margin: 0 0 8px 0;
            font-size: 1.2em;
          }
          .rss-item h2 a {
            color: var(--text-main, #f0f2f5);
            text-decoration: none;
          }
          .rss-item h2 a:hover {
            color: var(--text-accent, #e5b869);
          }
          .rss-date {
            font-size: 8pt;
            color: var(--text-muted, #8b92a2);
            margin-bottom: 10px;
          }
          .rss-desc {
            font-size: 9.5pt;
            line-height: 1.9;
            color: var(--text-muted, #8b92a2);
          }
          .back-home-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 18px;
            background-color: var(--bg-tag, #282c37);
            color: var(--text-main, #f0f2f5);
            border-radius: 20px;
            font-size: 8.5pt;
            text-decoration: none;
            transition: all 0.2s ease;
          }
          .back-home-btn:hover {
            background-color: var(--text-accent, #e5b869);
            color: #181a20 !important;
          }
        </style>
      </head>
      <body>
        <div class="rss-container">
          <div class="rss-header">
            <a href="/" class="back-home-btn">&rarr; بازگشت به صفحه اصلی وبلاگ</a>
            <h1 style="margin-top: 15px;"><xsl:value-of select="rss/channel/title"/></h1>
            <p><xsl:value-of select="rss/channel/description"/></p>
            <div class="rss-notice">
              این صفحه فید RSS رسمی وبلاگ سیاه و قلم است. می‌توانید آدرس این صفحه را در فیدخوان خود ثبت کنید.
            </div>
          </div>

          <div class="rss-feed-list">
            <xsl:for-each select="rss/channel/item">
              <div class="rss-item">
                <h2>
                  <a href="{link}"><xsl:value-of select="title"/></a>
                </h2>
                <div class="rss-date">تاریخ انتشار: <xsl:value-of select="pubDate"/></div>
                <div class="rss-desc"><xsl:value-of select="description"/></div>
              </div>
            </xsl:for-each>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
