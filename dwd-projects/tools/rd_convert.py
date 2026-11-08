#!/usr/bin/env python3
"""Convert the Claude Design .dc.html handoff into plugin partials.

Output (in <plugin>/templates/redesign/):
  chrome-top.html, chrome-bottom.html, home.html, process.html, hosting.html, contact.html,
  portfolio.html, portfolio-card.html, project.html
and <plugin>/assets/redesign/redesign.css (helmet CSS + generated hover/focus rules).

Placeholders left for PHP: %HOME% (site root, no trailing slash), %MEDIA% (media folder URL, trailing slash),
{{ token }} values (filled and escaped by PHP), <!--if:x-->…<!--/if:x--> blocks.
"""
import re, sys, os

SRC, PLUGIN = sys.argv[1], sys.argv[2]
OUT_T = os.path.join(PLUGIN, 'templates/redesign')
OUT_A = os.path.join(PLUGIN, 'assets/redesign')
os.makedirs(OUT_T, exist_ok=True)
os.makedirs(OUT_A, exist_ok=True)

def read(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()

css_parts = []
hover_rules = {}  # (pseudo, decls) -> class

def add_css(text, label):
    m = re.search(r'<helmet>(.*?)</helmet>', text, re.S)
    if not m:
        return
    for s in re.findall(r'<style>(.*?)</style>', m.group(1), re.S):
        css_parts.append('/* ' + label + ' */\n' + s.strip())

def imp(decls):
    out = []
    for d in decls.split(';'):
        d = d.strip()
        if d:
            out.append(d + ' !important')
    return ';'.join(out)

def hover_class(pseudo, decls):
    key = (pseudo, decls.strip())
    if key not in hover_rules:
        hover_rules[key] = ('dwh' if pseudo == 'hover' else 'dwf') + str(len(hover_rules) + 1)
    return hover_rules[key]

LINKS = {
    'DreamWeb%20Home.dc.html': '%HOME%/',
    'Portfolio.dc.html': '%HOME%/portfolio/',
    'Process.dc.html': '%HOME%/process/',
    'Hosting.dc.html': '%HOME%/hosting/',
    'Contact.dc.html': '%HOME%/contact/',
    'Quote.dc.html': '%HOME%/quote/',
    'Blog.dc.html': '%HOME%/blog/',
    'Quote%20Thank%20You.dc.html': '%HOME%/thank-you/',
    'https://dreamwebdigital.com/blog/': '%HOME%/blog/',
    'https://dreamwebdigital.com/contact/': '%HOME%/contact/',
    'https://dreamwebdigital.com/checkout/?dwd-order=hosting': '%HOME%/checkout/?dwd-order=hosting',
    'mailto:michael@dreamwebdigital.com': 'mailto:mike@dreamwebdigital.com',
}

def fix_tag(tag):
    classes = []
    for pseudo in ('hover', 'focus'):
        m = re.search(r'\sstyle-' + pseudo + r'="([^"]*)"', tag)
        if m:
            classes.append(hover_class(pseudo, m.group(1)))
            tag = tag[:m.start()] + tag[m.end():]
    tag = re.sub(r'\s(data-screen-label|hint-[a-z-]+)="[^"]*"', '', tag)
    tag = tag.replace('onClick="{{ toggleMenu }}"', 'data-dw-menu="toggle"')
    tag = tag.replace('onClick="{{ closeMenu }}"', 'data-dw-menu="close"')
    if classes:
        if re.search(r'\sclass="', tag):
            tag = re.sub(r'\sclass="([^"]*)"', lambda m: ' class="' + m.group(1) + ' ' + ' '.join(classes) + '"', tag, 1)
        else:
            tag = re.sub(r'^(<[a-zA-Z0-9-]+)', r'\1 class="' + ' '.join(classes) + '"', tag)
    return tag

# Copy corrections from Michael (applied on every run).
COPY_FIX = {
    '500+ websites': '200+ websites',
    '500+ Websites Built': '200+ Websites Built',
    'letter-spacing:-.04em;line-height:1">500+</span>': 'letter-spacing:-.04em;line-height:1">200+</span>',
    'more than 500 websites': 'more than 200 websites',
    'A custom WordPress website for a personal training business, built mobile-first so clients can book from their phone.':
        'The launch site for Witney Carson’s fitness app, built to drive App Store downloads.',
    'A bold, product-forward WordPress website for a healthy vending company, built from scratch on Elementor with video throughout.':
        'A bold, video-led WordPress site for a premium vending company.',
}

def transform(html):
    for a, b in COPY_FIX.items():
        html = html.replace(a, b)
    # Michael: body text should never run much wider than its heading. Paragraphs get at most 600px.
    def cap(m):
        t = m.group(0)
        if 'style="' not in t:
            return t
        mw = re.search(r'max-width:(\d+)px', t)
        if not mw:
            return t.replace('style="', 'style="max-width:600px;', 1)
        return t if int(mw.group(1)) <= 600 else t.replace(mw.group(0), 'max-width:600px')
    html = re.sub(r'<p\b[^>]*>', cap, html)
    html = re.sub(r'<[a-zA-Z][^>]*>', lambda m: fix_tag(m.group(0)), html)
    for a, b in LINKS.items():
        html = html.replace('href="' + a + '"', 'href="' + b + '"')
    html = re.sub(r'href="Project\.dc\.html\?slug=([a-z0-9-]+)"', r'href="%HOME%/portfolio/\1/"', html)
    html = re.sub(r'href="Article\.dc\.html\?slug=([a-z0-9-]+)"', r'href="%HOME%/\1/"', html)
    html = re.sub(r'(src|poster)="assets/([^"]+)"', lambda m: m.group(1) + '="%MEDIA%' + media_name(m.group(2)) + '"', html)
    # The menu: rendered hidden, toggled by redesign.js.
    html = re.sub(r'<sc-if value="\{\{ menuOpen \}\}"[^>]*>', '<div id="dw-menu" hidden>', html)
    return html

def media_name(n):
    base = n.rsplit('.', 1)[0]
    if n.endswith('.png'):
        return 'dwd-' + base + '.webp'
    return {'the-goods-hero-recording.mp4': 'dwd-goods-hero.mp4', 'the-goods-brands-recording.mp4': 'dwd-goods-brands.mp4',
            'finesse-mobile-hero.mp4': 'dwd-finesse-hero.mp4'}.get(n, n)

def close_menu_if(html):
    # The menu block is the first <div id="dw-menu" hidden> … </sc-if>.
    i = html.find('<div id="dw-menu" hidden>')
    if i < 0:
        return html
    j = html.find('</sc-if>', i)
    return html[:j] + '</div>' + html[j + len('</sc-if>'):]

def body_of(text):
    m = re.search(r'</helmet>(.*)</x-dc>', text, re.S)
    return m.group(1).strip()

def write(name, html):
    with open(os.path.join(OUT_T, name), 'w', encoding='utf-8') as f:
        f.write(html.strip() + '\n')

# ---- Site Chrome: split around {{ children }} ----
chrome = read('Site Chrome.dc.html')
add_css(chrome, 'Site Chrome')
cb = close_menu_if(transform(body_of(chrome)))
top, bottom = cb.split('<main>{{ children }}</main>')
write('chrome-top.html', top + '<main id="content">')
write('chrome-bottom.html', '</main>' + bottom)

# ---- Home: self-contained (own nav, menu and footer) ----
home = read('DreamWeb Home.dc.html')
add_css(home, 'Home')
hb = close_menu_if(transform(body_of(home)))
# The laptop videos are given their src by script once the lid opens.
hb = hb.replace('id="dw-laptop-rec"', 'id="dw-laptop-rec" data-src="%MEDIA%dwd-goods-hero.mp4"')
hb = hb.replace('id="dw-laptop-brands"', 'id="dw-laptop-brands" data-src="%MEDIA%dwd-goods-brands.mp4"')
# Their posters wait too (one is a 400 KB image from another site).
hb = re.sub(r'(<video id="dw-laptop-(?:rec|brands)"[^>]*?) poster="', r'\1 data-poster="', hb)
# Services rows on the homepage: thin line icons instead of 01–06 (Michael's request).
SERVICE_ICONS = {'01': '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>', '02': '<path d="M21 4v5h-5"/><path d="M3 20v-5h5"/><path d="M4.6 9A8 8 0 0 1 18 6.3L21 9"/><path d="M3 15l3 2.7A8 8 0 0 0 19.4 15"/>', '03': '<rect x="2" y="4.5" width="14.5" height="10" rx="1.2"/><path d="M1 18h12.5"/><rect x="17" y="8.5" width="6" height="11.5" rx="1.4"/><path d="M19.4 17.8h1.2"/>', '04': '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19"/><path d="M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5c-2.6-2.6-3.9-5.8-3.9-9.5S9.4 5.1 12 2.5z"/>', '05': '<rect x="2" y="3.5" width="20" height="13.5" rx="1.6"/><path d="M8 21h8"/><path d="M12 17v4"/><circle cx="12" cy="9" r="2.4"/><path d="M7.8 14.6a4.4 4.4 0 0 1 8.4 0"/>', '06': '<path d="M3.5 14v-2a8.5 8.5 0 0 1 17 0v2"/><path d="M20.5 15a2 2 0 0 1-2 2h-1v-5.5h1a2 2 0 0 1 2 2z"/><path d="M3.5 15a2 2 0 0 0 2 2h1v-5.5h-1a2 2 0 0 0-2 2z"/><path d="M18.5 17v.5a3 3 0 0 1-3 3H13"/>'}
for num, paths in SERVICE_ICONS.items():
    old = '<span style="flex:0 0 56px;font-size:14px;font-weight:500;color:#6B6B6B">' + num + '</span>'
    new = '<span class="dwr-sicon" aria-hidden="true" style="flex:0 0 56px;align-self:center;display:flex;color:#13A6EE"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg></span>'
    hb = hb.replace(old, new, 1)
write('home.html', hb)

def interior(name, out):
    t = read(name)
    add_css(t, name.replace('.dc.html', ''))
    b = body_of(t)
    b = re.sub(r'<dc-import name="Site Chrome"[^>]*>', '', b)
    b = b.replace('</dc-import>', '')
    return transform(b)

# Trust badges on Process: larger, with the Upwork and Google logos (Michael: the small text line was too tiny).
TRUST_OLD = '''<div data-dw-reveal="1" style="display:flex;flex-wrap:wrap;gap:12px 32px;margin-top:32px;font-size:14px;color:#9A9A9A">
    <span>100% Job Success · Upwork</span>
    <span><span style="color:#F5B301;letter-spacing:2px">★★★★★</span> · Google Reviews</span>
  </div>'''
TRUST_NEW = '''<div data-dw-reveal="1" class="dwr-trust"><a class="dwr-badge" href="https://www.upwork.com/freelancers/dreamwebdigital" target="_blank" rel="noopener"><svg width="34" height="34" viewBox="0 0 24 24" fill="#14A800" aria-hidden="true"><path d="M18.56 13.02c-1.33 0-2.58-.56-3.71-1.48l.28-1.3v-.02c.25-1.38.98-3.68 3.43-3.68 1.84 0 3.33 1.5 3.33 3.34 0 1.84-1.49 3.14-3.33 3.14zm0-9.88c-3.13 0-5.56 2.03-6.54 5.37-1.5-2.26-2.64-4.97-3.3-7.25H5.36v8.77c0 1.72-1.4 3.12-3.12 3.12S-.88 11.75-.88 10.03V1.26H-4.2v8.77c0 3.56 2.9 6.49 6.45 6.49s6.44-2.93 6.44-6.49V8.56c.65 1.35 1.44 2.72 2.4 3.93l-2.04 9.68h3.4l1.48-7.02c1.3.83 2.79 1.35 4.5 1.35 3.66 0 6.65-3 6.65-6.67 0-3.67-2.99-6.69-6.65-6.69z" transform="translate(3.66 2.63) scale(.8)"></path></svg><span><b>100% Job Success</b><small>Top Rated Plus on Upwork</small></span></a><a class="dwr-badge" href="https://maps.app.goo.gl/z4HfYnTZaqccWhhy9" target="_blank" rel="noopener"><svg width="32" height="32" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg><span><b class="dwr-stars">★★★★★</b><small>Google Reviews</small></span></a></div>'''
for n, o in (('Process.dc.html', 'process.html'), ('Hosting.dc.html', 'hosting.html')):
    h = interior(n, o)
    if TRUST_OLD in h:
        h = h.replace(TRUST_OLD, TRUST_NEW)
    write(o, h)

# ---- Contact: the sent / not-sent states become two blocks toggled by script ----
c = interior('Contact.dc.html', 'contact.html')
c = c.replace('onSubmit="{{ submit }}"', 'class="dwr-form" data-redirect="%HOME%/thank-you/" novalidate')
c = re.sub(r'<sc-if value="\{\{ sent \}\}"[^>]*>', '<div class="dwr-sent" hidden>', c)
c = re.sub(r'<sc-if value="\{\{ notSent \}\}"[^>]*>', '<div class="dwr-fields">', c)
c = c.replace('</sc-if>', '</div>')
# Michael: no "Three steps to a flat quote" section on Contact.
k = c.find('Three steps to')
if k > -1:
    i = c.rfind('<section', 0, k)
    j = c.find('</section>', k) + len('</section>')
    c = c[:i] + c[j:]
write('contact.html', c)

# ---- Portfolio: the card loop becomes its own partial ----
p = interior('Portfolio.dc.html', 'portfolio.html')
m = re.search(r'<sc-for list="\{\{ items \}\}"[^>]*>(.*?)</sc-for>', p, re.S)
card = m.group(1).strip()
card = re.sub(r'^<a ', '<a data-platform="{{ p.platform_key }}" data-dw-card="1" ', card, 1)
assert 'data-dw-card' in card
card = card.replace(' target="_blank" rel="noopener"', '')
card = card.replace('{{ p.num }}', '<span data-dw-num>{{ p.num }}</span>')
write('portfolio-card.html', card)
p = p[:m.start()] + '{{{ cards }}}' + p[m.end():]
for key, f in (('showAll', 'all'), ('showWP', 'wordpress'), ('showWF', 'webflow')):
    p = p.replace('onClick="{{ ' + key + ' }}"', 'data-filter="' + f + '"')
write('portfolio.html', p)

# ---- Quote: form only; posts to the site and goes to /thank-you/ ----
q = interior('Quote.dc.html', 'quote.html')
q = q.replace('onSubmit="{{ submit }}"', 'class="dwr-form" data-redirect="%HOME%/thank-you/" novalidate')
write('quote.html', q)
write('thank-you.html', interior('Quote Thank You.dc.html', 'thank-you.html'))

# ---- Blog: post cards become a partial filled from WordPress posts ----
bl = interior('Blog.dc.html', 'blog.html')
m = re.search(r'<sc-for list="\{\{ posts \}\}"[^>]*>(.*?)</sc-for>', bl, re.S)
write('blog-card.html', m.group(1).strip())
write('blog.html', bl[:m.start()] + '{{{ cards }}}' + bl[m.end():])

# ---- Article: the sample body becomes the published post content ----
ar = interior('Article.dc.html', 'article.html')
i = ar.index('<sc-for list="{{ sections }}"')
j = ar.index('</sc-if>', ar.index('<sc-if value="{{ noBody }}"')) + len('</sc-if>')
ar = ar[:i] + '<div class="dwr-prose" data-dw-reveal="1">{{{ content }}}</div>' + ar[j:]
write('article.html', ar)

# ---- Project ----
pj = interior('Project.dc.html', 'project.html')
pj = re.sub(r'<sc-if value="\{\{ hasSite \}\}"[^>]*>', '<!--if:hasSite-->', pj)
pj = pj.replace('</sc-if>', '<!--/if:hasSite-->')
write('project.html', pj)

# ---- Case-study copy (COPY in Project.dc.html) → copy.json for PHP ----
import subprocess, json
src = read('Project.dc.html')
mm = re.search(r'^const COPY = (\{.*?^\});', src, re.S | re.M)
if mm:
    out = subprocess.run(['node', '-e', 'const COPY=' + mm.group(1) + ';process.stdout.write(JSON.stringify(COPY))'], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    for k in data:
        for f in data[k]:
            for a2, b2 in COPY_FIX.items():
                data[k][f] = data[k][f].replace(a2, b2)
    with open(os.path.join(OUT_T, 'copy.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

# ---- CSS ----
seen, lines = set(), []
for part in css_parts:
    lines.append(part)
rules = []
for (pseudo, decls), cls in hover_rules.items():
    rules.append('.' + cls + ':' + pseudo + '{' + imp(decls) + '}')
css = '/* Generated from the Claude Design handoff by rd_convert.py; edit the source and re-run. */\n' + '\n'.join(lines) + '\n/* hover / focus states */\n' + '\n'.join(rules) + '\n'
with open(os.path.join(OUT_A, 'redesign-src.css'), 'w', encoding='utf-8') as f:
    f.write(css)

left = []
for fn in os.listdir(OUT_T):
    s = open(os.path.join(OUT_T, fn), encoding='utf-8').read()
    for tok in re.findall(r'\{\{\{? ?[a-zA-Z.]+ ?\}?\}\}|sc-[a-z]+|dc\.html|assets/', s):
        left.append((fn, tok))
from collections import Counter
print(Counter(left))
print(len(hover_rules), 'hover/focus rules')
