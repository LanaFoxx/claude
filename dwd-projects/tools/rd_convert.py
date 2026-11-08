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
    'more than 500 websites': 'more than 200 websites',
    'A custom WordPress website for a personal training business, built mobile-first so clients can book from their phone.':
        'Launch website for Finesse, the fitness app by Dancing with the Stars pro Witney Carson, built mobile-first to drive App Store downloads.',
}

def transform(html):
    for a, b in COPY_FIX.items():
        html = html.replace(a, b)
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
write('home.html', hb)

def interior(name, out):
    t = read(name)
    add_css(t, name.replace('.dc.html', ''))
    b = body_of(t)
    b = re.sub(r'<dc-import name="Site Chrome"[^>]*>', '', b)
    b = b.replace('</dc-import>', '')
    return transform(b)

for n, o in (('Process.dc.html', 'process.html'), ('Hosting.dc.html', 'hosting.html')):
    write(o, interior(n, o))

# ---- Contact: the sent / not-sent states become two blocks toggled by script ----
c = interior('Contact.dc.html', 'contact.html')
c = c.replace('onSubmit="{{ submit }}"', 'class="dwr-form" data-redirect="%HOME%/thank-you/" novalidate')
c = re.sub(r'<sc-if value="\{\{ sent \}\}"[^>]*>', '<div class="dwr-sent" hidden>', c)
c = re.sub(r'<sc-if value="\{\{ notSent \}\}"[^>]*>', '<div class="dwr-fields">', c)
c = c.replace('</sc-if>', '</div>')
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
