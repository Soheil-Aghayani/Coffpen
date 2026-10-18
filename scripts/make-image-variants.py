#!/usr/bin/env python3
"""Create the small images that posts depend on, for covers that do not have them yet.

For every cover image used at the top of a post in posts/*.html this makes
  assets/images/thumbs/<cover>   360x360   (homepage and series cards)
  assets/images/social/<cover>.jpg  1000x1000, <= 280 KB   (link previews on Telegram, WhatsApp, X)
Existing files are never overwritten. Requires Pillow. Run before scripts/sync-posts.js.
"""
import glob
import os
import re
import urllib.parse

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, 'assets', 'images')
SOCIAL_MAX_BYTES = 280_000


def covers():
    found = set()
    for path in glob.glob(os.path.join(ROOT, 'posts', '*.html')):
        with open(path, encoding='utf8') as handle:
            match = re.search(r'story-body[^>]*>\s*<div[^>]*><img src="\.\./assets/images/([^"]+)"', handle.read())
        if match:
            found.add(urllib.parse.unquote(match.group(1)))
    return sorted(found)


def square(image, size):
    side = min(image.size)
    left, top = (image.width - side) // 2, (image.height - side) // 2
    return image.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)


def main():
    made = 0
    for cover in covers():
        source = os.path.join(IMAGES, cover)
        if not os.path.exists(source):
            continue
        thumb = os.path.join(IMAGES, 'thumbs', cover)
        social = os.path.join(IMAGES, 'social', os.path.splitext(cover)[0] + '.jpg')
        if os.path.exists(thumb) and os.path.exists(social):
            continue
        image = Image.open(source).convert('RGB')
        if not os.path.exists(thumb):
            os.makedirs(os.path.dirname(thumb), exist_ok=True)
            fmt = 'WEBP' if cover.lower().endswith('.webp') else 'PNG' if cover.lower().endswith('.png') else 'JPEG'
            square(image, 360).save(thumb, fmt, quality=80)
            made += 1
        if not os.path.exists(social):
            os.makedirs(os.path.dirname(social), exist_ok=True)
            quality = 74
            square(image, 1000).save(social, 'JPEG', quality=quality, optimize=True, progressive=True)
            while os.path.getsize(social) > SOCIAL_MAX_BYTES and quality > 50:
                quality -= 6
                square(image, 1000).save(social, 'JPEG', quality=quality, optimize=True, progressive=True)
            made += 1
    print('Image variants created: %d' % made)


if __name__ == '__main__':
    main()
