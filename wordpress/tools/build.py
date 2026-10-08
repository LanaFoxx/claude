"""Convert the rendered Claude Design screens into the Magnolia WordPress theme.

Usage: python3 -I build.py <unpacked_dir> <render_dir> <theme_out_dir>
"""
import hashlib
import html
import json
import os
import re
import shutil
import sys

UNPACKED, RENDER, OUT = sys.argv[1:4]
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')

ASSET_NAMES = {
    '5fef7693-5a4d-4738-805c-7e9715a07692': 'icon-olive.png',
    '5beb08fa-9c88-4281-815e-497c1ba07a6e': 'logo-h-olive-ivory.png',
    '79582590-eeae-475a-a520-052519941189': 'logo-stacked-olive-ivory.png',
    '44a5f163-dfcd-4ec2-b1b6-3d669a2edbe1': 'photos/forestry-mulcher.jpg',
    'a56f39e0-ad46-4aa0-85e9-23cd563dc769': 'photos/tree-removal.jpg',
    '6cf7b3d9-e237-4f6b-a69b-d29dde078f26': 'photos/gravel-drive.jpg',
    'f490e125-f1d8-421a-8398-cbc41aa3755e': 'photos/power-wash-1.jpg',
    '4a4e7c22-6c31-443b-8615-5076940ee4e4': 'photos/power-wash-2.jpg',
    '246077bf-ce0f-4ca9-8967-3fc5c1a76918': 'photos/landscape-bed.jpg',
    '4a5aa9b2-99a2-46ce-af72-b1a876bde355': 'photos/drainage.jpg',
    '21445919-60f9-454d-a654-e9e122dcf3a8': 'photos/firepit-home.jpg',
    '04f87f3f-cbd1-4d6e-b66e-9b58e5d007e0': 'photos/gravel-spread.jpg',
    '1406c4a9-0738-4151-9d6c-f0e2079fd013': 'photos/sod-install.jpg',
}

PAGES = {  # screen -> (slug, title)
    'home': ('home', 'Home'),
    'about': ('about-us', 'About Us'),
    'services': ('services', 'Services'),
    'projects': ('past-projects', 'Past Projects'),
    'contact': ('contact', 'Contact'),
}

PROJECT_CATEGORIES = {
    'Wooded Lot to Build-Ready Homesite': 'Site Preparation',
    'Hillside Drainage &amp; Retaining Wall': 'Landscape Development',
    'Lake Property Treeline Clearing': 'Tree Care',
    'Farm Driveway Rebuild': 'Site Preparation',
    'Retail Center Exterior Refresh': 'Power Washing',
    'Second Home Seasonal Care': 'Property Care',
}

# --- copy assets, build sha -> name map -------------------------------------
sha_to_name = {}
for uuid, name in ASSET_NAMES.items():
    ext = name.rsplit('.', 1)[1]
    src = os.path.join(UNPACKED, f'{uuid}.{ext}')
    data = open(src, 'rb').read()
    sha_to_name[hashlib.sha256(data).hexdigest()] = name
    dst = os.path.join(OUT, 'assets', name)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)


def read(name):
    return open(os.path.join(RENDER, name), encoding='utf-8').read()


def clean(markup, img_fmt):
    """Strip design-runtime attributes and swap blob image URLs for asset refs."""
    def img(m):
        tag = m.group(0)
        sha = re.search(r'data-sha="([0-9a-f]+)"', tag).group(1)
        name = sha_to_name[sha]
        tag = re.sub(r'\s*data-sha="[0-9a-f]+"', '', tag)
        return re.sub(r'src="blob:[^"]+"', 'src="%s"' % img_fmt(name), tag)

    markup = re.sub(r'<img\b[^>]*>', img, markup)
    markup = re.sub(r'\s*data-dc-tpl="\d+"', '', markup)
    markup = re.sub(r'<span class="sc-interp">(.*?)</span>', r'\1', markup, flags=re.S)
    assert 'blob:' not in markup and 'sc-' not in markup.replace('sc-interp', '')
    return markup


def link(markup, url_fmt):
    def repl(m):
        frag = m.group(1)
        if frag.startswith('services-'):
            return 'href="%s#%s"' % (url_fmt('services'), frag)
        return 'href="%s"' % url_fmt(frag)
    return re.sub(r'href="#([a-z-]+)"', repl, markup)


# --- page content -------------------------------------------------------------
content_dir = os.path.join(OUT, 'content')
os.makedirs(content_dir, exist_ok=True)
for screen in PAGES:
    m = read(f'{screen}.main.html')
    m = re.sub(r'^<main[^>]*>|</main>$', '', m.strip())
    m = clean(m, lambda n: '%%MPC_IMG:' + n + '%%')
    m = link(m, lambda s: '%%MPC_URL:' + s + '%%')
    if screen == 'projects':
        m = re.sub(r'<button class="scp7" style="([^"]*)">([^<]+)</button>',
                   lambda b: '<button type="button" class="scp7 mpc-filter" data-filter="%s" style="%s">%s</button>'
                   % (b.group(2), b.group(1), b.group(2)), m)

        def art(a):
            title = re.search(r'<h3[^>]*>(.*?)</h3>', a.group(0), re.S).group(1).strip()
            return a.group(0).replace('<article ', '<article class="mpc-project" data-category="%s" ' % PROJECT_CATEGORIES[title], 1)
        m = re.sub(r'<article .*?</article>', art, m, flags=re.S)
        assert m.count('data-category=') == 6
    if screen == 'contact':
        m, n = re.subn(r'<form\b.*?</form>', '[magnolia_estimate_form]', m, flags=re.S)
        assert n == 1
    open(os.path.join(content_dir, f'{screen}.html'), 'w', encoding='utf-8').write(m.strip() + '\n')

# --- contact form (shortcode markup) -------------------------------------------
form = re.search(r'<form\b.*?</form>', read('contact.main.html'), re.S).group(0)
form = clean(form, lambda n: n)
form = form.replace('name="services"', 'name="services[]"')
hidden = ('\n          <input type="hidden" name="action" value="magnolia_estimate">'
          '\n          <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>')
open_tag = re.match(r'<form[^>]*>', form).group(0)
form = form.replace(open_tag, open_tag.replace('<form ', '<form method="post" action="<?php echo esc_url( admin_url( \'admin-post.php\' ) ); ?>" ', 1) + hidden, 1)
os.makedirs(os.path.join(OUT, 'template-parts'), exist_ok=True)
open(os.path.join(OUT, 'template-parts', 'estimate-form.php'), 'w', encoding='utf-8').write(form + '\n')

# --- header / footer ------------------------------------------------------------
php_img = lambda n: "<?php echo esc_url( get_template_directory_uri() . '/assets/%s' ); ?>" % n
php_url = lambda s: "<?php echo esc_url( magnolia_page_url( '%s' ) ); ?>" % s

header = clean(read('header.html'), php_img)
header = link(header, php_url)
# Active-page underline is set per request.
header = re.sub(r'(<a href="[^"]*magnolia_page_url\( \'([a-z]+)\' \)[^"]*" class="scp0" style="[^"]*border-bottom: 1.5px solid )(?:transparent|rgb\(115, 130, 56\))',
                lambda m: m.group(1) + "<?php echo magnolia_nav_line( '%s' ); ?>" % m.group(2), header)
assert header.count('magnolia_nav_line') == 5
header = header.replace('<nav style="', '<nav class="mpc-nav-wide" style="', 1)
header = header.replace('<div style="display: flex; align-items: center; gap: 22px;">', '<div class="mpc-nav-wide" style="display: flex; align-items: center; gap: 22px;">', 1)
mobile_links = ''.join(
    '\n      <a href="%s" style="color: rgb(213, 212, 190); font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 0px;%s">%s</a>'
    % (php_url(s), '' if s == 'contact' else ' border-bottom: 1px solid rgba(213, 212, 190, 0.1);', label)
    for s, label in [('home', 'Home'), ('about', 'About Us'), ('services', 'Services'), ('projects', 'Past Projects'), ('contact', 'Contact')])
mobile = ('\n    <button type="button" class="mpc-menu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="mpc-mobile-nav" '
          'style="background: transparent; border: 1px solid rgba(213, 212, 190, 0.4); color: rgb(213, 212, 190); padding: 10px 16px; font-size: 12px; '
          'letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer; min-height: 44px;">Menu</button>')
header = re.sub(r'(\s*</div>\s*</header>)$', mobile + r'\1', header.strip())
header = header.replace('</header>', '  <nav id="mpc-mobile-nav" hidden style="display: flex; flex-direction: column; border-top: 1px solid rgba(213, 212, 190, 0.12); padding: 8px 28px 20px; background: rgb(40, 58, 51);">'
                        + mobile_links + '\n    <a href="tel:3365839398" style="color: rgb(169, 184, 106); font-size: 15px; padding: 14px 0px;">(336) 583-9398</a>\n  </nav>\n</header>')
header = header.replace('<header style="', '<header class="mpc-header" style="', 1)

footer = clean(read('footer.html'), php_img)
footer = link(footer, php_url)
footer = footer.replace('© 2026', "© <?php echo esc_html( gmdate( 'Y' ) ); ?>")

# Fonts: keep the latin + latin-ext faces only.
tpl = open(os.path.join(UNPACKED, 'template.html'), encoding='utf-8').read()
faces = re.findall(r'/\* (latin(?:-ext)?) \*/\s*(@font-face \{.*?\})', tpl, re.S)
font_css = []
os.makedirs(os.path.join(OUT, 'assets', 'fonts'), exist_ok=True)
for _, face in faces:
    uuid = re.search(r'url\("([0-9a-f-]+)"\)', face).group(1)
    shutil.copyfile(os.path.join(UNPACKED, uuid + '.woff2'), os.path.join(OUT, 'assets', 'fonts', uuid + '.woff2'))
    font_css.append(face.replace('url("%s")' % uuid, 'url("assets/fonts/%s.woff2")' % uuid))
assert len(font_css) >= 6

hover = '\n'.join(l for l in read('scp.css').splitlines() if l.startswith('.scp'))
base_css = re.search(r'<style>\s*(html,body\{.*?)</style>', tpl, re.S).group(1).strip()

open(os.path.join(OUT, 'template-parts', 'site-header.php'), 'w', encoding='utf-8').write(header + '\n')
open(os.path.join(OUT, 'template-parts', 'site-footer.php'), 'w', encoding='utf-8').write(footer.strip() + '\n')
style_head = open(os.path.join(SRC, 'style-header.css'), encoding='utf-8').read()
open(os.path.join(OUT, 'style.css'), 'w', encoding='utf-8').write(
    style_head + '\n/* Fonts: Jost + Marcellus (bundled) */\n' + '\n'.join(font_css)
    + '\n\n/* Base styles from the design */\n' + base_css
    + '\n\n/* Hover states from the design */\n' + hover + '\n'
    + open(os.path.join(SRC, 'style-extra.css'), encoding='utf-8').read())
print('ok')
