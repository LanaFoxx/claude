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
    'all 500+ sites': 'all 200+ sites',
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

def balance_sections(html):
    # The design files sometimes have a stray </div> inside a section; browsers then close the page wrapper
    # early. Drop extra closing divs (from the end of the section) so every section is balanced.
    def fix(m):
        seg = m.group(0)
        extra = len(re.findall(r'</div>', seg)) - len(re.findall(r'<div\b', seg))
        while extra > 0:
            k = seg.rfind('</div>')
            seg = seg[:k] + seg[k + 6:]
            extra -= 1
        return seg
    return re.sub(r'<section\b.*?</section>', fix, html, flags=re.S)

def write(name, html):
    html = balance_sections(html)
    with open(os.path.join(OUT_T, name), 'w', encoding='utf-8') as f:
        f.write(html.strip() + '\n')

# ---- Site Chrome: split around {{ children }} ----
chrome = read('Site Chrome.dc.html')
add_css(chrome, 'Site Chrome')
cb = close_menu_if(transform(body_of(chrome)))
# Michael: no Hosting item in the top menu or the phone menu (the footer keeps it).
_ns = cb.find('<nav id="dw-nav"'); _me = cb.find('<main')
if _ns > -1 and _me > -1:
    _head = re.sub(r'\s*<a\b[^>]*href="%HOME%/hosting/"[^>]*>Hosting</a>', '', cb[_ns:_me])
    cb = cb[:_ns] + _head + cb[_me:]
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
# Michael: the laptop's second Goods section must show in full (the design cropped off the four promise cards).
hb = re.sub(r'<div style="position:relative;overflow:hidden;aspect-ratio:2880/945">(<img [^>]*?)style="position:absolute;left:0;top:0;width:100%;height:auto;display:block">\s*</div>',
            r'\1style="width:100%;height:auto;display:block">', hb)
# Michael: show the Upwork Job Success score and the number of Upwork projects next to the Google rating.
UP_OLD = '<span style="font-size:16px;color:#9A9A9A">100% Job Success · Top Rated Plus on Upwork</span>\n    </div>\n  </div>'
UP_NEW = '</div>\n    <div id="dw-upwork-stats" style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:24px 48px;padding:0 0 10px 40px;border-left:1px solid #333"><div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:clamp(56px,6.4vw,104px);line-height:.85;letter-spacing:-.05em;font-weight:600;color:#fff">100%</span><span style="font-size:clamp(17px,1.4vw,20px);font-weight:500;color:#fff">Job Success on Upwork</span></div><div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:clamp(56px,6.4vw,104px);line-height:.85;letter-spacing:-.05em;font-weight:600;color:#fff">%UPWORK_JOBS%</span><span style="font-size:clamp(17px,1.4vw,20px);font-weight:500;color:#fff">Projects completed on Upwork</span></div><span style="display:inline-flex;align-items:center;gap:10px;font-size:16px;color:#C9C9C9;flex-basis:100%"><svg width="30" height="30" viewBox="0 0 24 24" fill="#14A800" aria-hidden="true"><path d="M18.56 13.02c-1.33 0-2.58-.56-3.71-1.48l.28-1.3v-.02c.25-1.38.98-3.68 3.43-3.68 1.84 0 3.33 1.5 3.33 3.34 0 1.84-1.49 3.14-3.33 3.14zm0-9.88c-3.13 0-5.56 2.03-6.54 5.37-1.5-2.26-2.64-4.97-3.3-7.25H5.36v8.77c0 1.72-1.4 3.12-3.12 3.12S-.88 11.75-.88 10.03V1.26H-4.2v8.77c0 3.56 2.9 6.49 6.45 6.49s6.44-2.93 6.44-6.49V8.56c.65 1.35 1.44 2.72 2.4 3.93l-2.04 9.68h3.4l1.48-7.02c1.3.83 2.79 1.35 4.5 1.35 3.66 0 6.65-3 6.65-6.67 0-3.67-2.99-6.69-6.65-6.69z" transform="translate(3.66 2.63) scale(.8)"></path></svg>Top Rated Plus freelancer</span></div>\n  </div>'
if UP_OLD in hb:
    hb = hb.replace(UP_OLD, UP_NEW)
hb = hb.replace('<span data-dw-line="1">Let’s talk.</span>', '<span data-dw-line="1">Let’s talk<span style="color:#13A6EE">.</span></span>')  # blue period, like Contact
# Michael: the triangle pattern behind the Client reviews section too.
hb = hb.replace('<section id="reviews" data-theme="dark" style="background:#121212;', '<section id="reviews" data-theme="dark" style="position:relative;isolation:isolate;overflow:hidden;background:#121212;', 1)
hb = re.sub(r'(<section id="reviews"[^>]*>)', r'\1\n  <canvas id="dw-reviews-canvas" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:.85;-webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.5) 45%,#000 75%);mask-image:linear-gradient(90deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.5) 45%,#000 75%)"></canvas>', hb, 1)
# Michael: the same menu and footer on every page. The design's homepage had its own nav (with About / Services
# anchors and no Blog) and an older footer; use the shared Site Chrome versions instead.
def _cut(html, start, end_marker, include_end=False):
    i = html.find(start)
    j = html.find(end_marker, i)
    return (i, j + (len(end_marker) if include_end else 0)) if i > -1 and j > -1 else (-1, -1)
ci, cj = _cut(cb, '<nav id="dw-nav"', '<main')
hi, hj = _cut(hb, '<nav id="dw-nav"', '<main')
if ci > -1 and hi > -1:
    hb = hb[:hi] + cb[ci:cj] + hb[hj:]
ci, cj = _cut(cb, '<footer', '</footer>', True)
hi, hj = _cut(hb, '<footer', '</footer>', True)
if ci > -1 and hi > -1:
    hb = hb[:hi] + cb[ci:cj] + hb[hj:]
# Michael: "See all work" is a blue button, centered and full width.
_k = hb.find('>See all work')
if _k > -1:
    _ds = hb.rfind('<div data-dw-reveal="1" style="display:flex;justify-content:flex-end;', 0, _k)
    _as = hb.rfind('<a ', 0, _k)
    _ae = hb.find('</a>', _k)
    if _ds > -1:
        _ins = hb[_k + 1:_ae]
        hb = hb[:_ds] + '<div data-dw-reveal="1" style="display:flex;margin-top:clamp(40px,5vw,72px)"><a class="dwr-allwork" href="%HOME%/portfolio/">' + _ins + '</a></div>' + hb[hb.find('</div>', _ae) + 6:]
# Main hero button: a free quote (most people won't book a call cold).
hb = re.sub(r'href="#contact"([^>]*)>Schedule Zoom', r'href="%HOME%/quote/"\1>Get a Free Quote', hb, 1)
# Proof right after the "wow": move the reviews block up to follow the laptop/phone showcase.
_ri = hb.find('<section id="reviews"'); _re = hb.find('</section>', _ri) + len('</section>')
_wi = hb.find('<section id="work"'); _we = hb.find('</section>', _wi) + len('</section>')
if _ri > -1 and _wi > -1 and _ri > _we:
    _rev = hb[_ri:_re]
    hb = hb[:_ri] + hb[_re:]
    hb = hb[:_we] + '\n\n' + _rev + hb[_we:]
# Speed proof in the hero trust line (this site scores 95+ on Google PageSpeed).
_ps = '<span class="dwr-ps" style="display:inline-flex;align-items:center;gap:8px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#13A6EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>95+ PageSpeed on every site</span>'
for _id in ('dw-hero-trust', 'dw-hero-trust-m'):
    _ti = hb.find('<div id="' + _id + '"')
    if _ti > -1:
        _te = hb.find('</div>', _ti)
        hb = hb[:_te] + _ps + hb[_te:]
# Real Upwork reviews Michael sent (Nov 2026), added beside the Google ones.
_UPWORK_REVIEWS = [
    ('Michael very much exceeded my expectations completing a website update/refresh project. He was easy to work with, stayed in touch through the project and completed the site in a fraction of the time I would have expected from other developers. If you are reading this while evaluating options for who to engage for website work, stop now and just hire Michael! He did great work.', 'Website refresh client · Upwork review'),
    ('Michael did a fantastic job. I’m super happy with my site. He was very easy to work with and fast. He also positively accepted changes and edits. I highly recommend him and plan to maintain the relationship for any future maintenance.', 'Upwork review'),
]
_gi = hb.find('<div id="dw-quotes-grid"')
if _gi > -1:
    _fs = hb.find('<figure', _gi); _fe = hb.find('</figure>', _fs) + len('</figure>')
    _tpl = hb[_fs:_fe]
    _bq = re.search(r'(<blockquote[^>]*>)(.*?)(</blockquote>)', _tpl, re.S)
    _fc = re.search(r'(<figcaption[^>]*>)(.*?)(</figcaption>)', _tpl, re.S)
    _end = hb.find('</div>', hb.rfind('</figure>', _gi, hb.find('Read all reviews', _gi)))
    _new = ''
    for _q, _c in _UPWORK_REVIEWS:
        _f = _tpl.replace(_bq.group(0), _bq.group(1) + '“' + _q + '”' + _bq.group(3)).replace(_fc.group(0), _fc.group(1) + _c + _fc.group(3))
        _new += '\n    ' + _f
    hb = hb[:_end] + _new + '\n  ' + hb[_end:]
# Price range (Michael: $1,500 up to $10k, depending on what the site needs), under the Everything included intro.
_pr = '<p class="dwr-price"><b>Most websites run $1,500 to $10,000</b>, depending on the pages and features you need. You get one flat quote up front, so the price never creeps.</p>'
# Results row under the ratings (Michael: every site scores 95+ on PageSpeed; many rank top 5 for 20+ keywords).
def _div_end(h, start):
    d, k = 0, start
    while True:
        o = h.find('<div', k + 1); cl = h.find('</div>', k + 1)
        if o > -1 and o < cl:
            d += 1; k = o
        else:
            if d == 0:
                return cl + 6
            d -= 1; k = cl
_ri = hb.find('<div id="dw-rating"')
if _ri > -1:
    _re = _div_end(hb, _ri)
    _res = ('<div class="dwr-results" data-dw-reveal="1">'
            '<div><b>95+</b><span>Google PageSpeed score on every site I build</span></div>'
            '<a href="%HOME%/portfolio/california-tax-courses/"><b>Top 5</b><span>on Google for 20+ keywords: California Tax Courses</span></a>'
            '<div><b>200+</b><span>websites designed and built by me, not a team</span></div>'
            '</div>')
    hb = hb[:_re] + _res + hb[_re:]
# Proof under The Goods and Finesse (Michael): PageSpeed, Google rating, Upwork record.
_PROOF = ('<div class="dwr-proof" data-dw-reveal="1">'
          '<span><b><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13A6EE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>95+</b><small>Google PageSpeed</small></span>'
          '<span><b><i>★</i>4.9</b><small>Google reviews</small></span>'
          '<span><b>100%</b><small>Job Success on Upwork</small></span>'
          '</div>')
_wc = hb.find('<div id="dw-work-ctas"')
if _wc > -1:
    _e = _div_end(hb, _wc); hb = hb[:_e] + _PROOF + hb[_e:]
_pc = hb.find('id="dw-phone-copy"')
if _pc > -1:
    _fb = hb.find('finessebywitney.com', _pc)
    _ds = hb.rfind('<div', _pc, _fb)
    _e = _div_end(hb, _ds); hb = hb[:_e] + _PROOF + hb[_e:]
# A white quote band between the dark Reviews and dark About sections.
_arrow = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12 12 2M4 2h8v8"></path></svg>'
_band_w = ('<section data-theme="light" class="dwr-band dwr-band-light"><div class="dwr-band-in"><div><span class="dwr-eyebrow"><i></i>Your turn</span>'
           '<h2 class="dwr-band-h">Want a website people rave about?</h2><p class="dwr-band-p">Tell me what you need and I’ll send a flat quote, usually the same day.</p></div>'
           '<div class="dwr-band-b"><a class="dwr-pill" href="%HOME%/quote/">Get a Free Quote ' + _arrow + '</a><a class="dwr-cta-call" href="tel:+17722101728">or call (772) 210-1728</a></div></div></section>')
_rs = hb.find('<section id="reviews"')
if _rs > -1:
    _re2 = hb.find('</section>', _rs) + len('</section>')
    hb = hb[:_re2] + '\n\n' + _band_w + hb[_re2:]
# A dark quote band (with the price range) between the white Services and white Contact sections.
_band_d = ('<section data-theme="dark" class="dwr-band dwr-band-dark"><div class="dwr-band-in"><div><span class="dwr-eyebrow"><i></i>Flat pricing</span>'
           '<h2 class="dwr-band-h">Most websites run <span>$1,500 to $10,000</span>.</h2><p class="dwr-band-p">It depends on the pages and features you need. You get one flat quote up front, so the price never creeps.</p></div>'
           '<div class="dwr-band-b"><a class="dwr-pill" href="%HOME%/quote/">Get a Free Quote ' + _arrow + '</a><a class="dwr-cta-call" href="tel:+17722101728">or call (772) 210-1728</a></div></div></section>')
_ss = hb.find('<section id="services"')
if _ss > -1:
    hb = hb[:_ss] + hb[_ss:].replace('<section id="services"', '<section data-nocta="1" id="services"', 1)
    _se = hb.find('</section>', _ss) + len('</section>')
    hb = hb[:_se] + '\n\n' + _band_d + hb[_se:]
# Google logo above the rating stars (Michael).
_G = ('<span class="dwr-glogo" aria-label="Google"><svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Google</span>')
hb = hb.replace('<span id="dw-rating-stars"', _G + '<span id="dw-rating-stars"', 1)
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


def BUDGET(h):
    """Budget choices match the real price range ($1,500 to $10,000+)."""
    return h.replace('<option value="under-2500">Under $2,500</option>', '<option value="1500-3000">$1,500 to $3,000</option>').replace('<option value="2500-5000">$2,500 to $5,000</option>', '<option value="3000-5000">$3,000 to $5,000</option>')

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
# Contact gets the quote form's budget, timeline and source questions (so every lead arrives with them).
_q = interior('Quote.dc.html', 'quote.html')
_r3 = _q.find('<div id="qt-row3"')
if _r3 > -1:
    # find the matching close of the row div
    _d, _k = 0, _r3
    while True:
        _o = _q.find('<div', _k + 1); _cl = _q.find('</div>', _k + 1)
        if _o > -1 and _o < _cl:
            _d += 1; _k = _o
        else:
            if _d == 0:
                _row = _q[_r3:_cl + 6]; break
            _d -= 1; _k = _cl
    _row = _row.replace('id="qt-row3"', 'id="ct-row3"').replace(' id="budget"', '').replace(' id="timeline"', '').replace(' id="source"', '')
    _m = c.find('What do you need?')
    _l = c.rfind('<label', 0, _m)
    c = c[:_l] + _row + '\n        ' + c[_l:]
c = BUDGET(c)
write('contact.html', c)

# ---- Portfolio: the card loop becomes its own partial ----
p = interior('Portfolio.dc.html', 'portfolio.html')
m = re.search(r'<sc-for list="\{\{ items \}\}"[^>]*>(.*?)</sc-for>', p, re.S)
card = m.group(1).strip()
card = re.sub(r'^<a ', '<a data-platform="{{ p.platform_key }}" data-dw-card="1" ', card, 1)
assert 'data-dw-card' in card
card = card.replace(' target="_blank" rel="noopener"', '')
card = card.replace('{{ p.num }}', '<span data-dw-num>{{ p.num }}</span>')
card = card.replace('border-top:1px solid #121212;padding-top:16px', 'padding-top:6px')  # Michael: no line under each card
card = card.replace('border-top:1px solid #121212;', '')  # no rule between portfolio rows either
write('portfolio-card.html', card)
p = p[:m.start()] + '{{{ cards }}}' + p[m.end():]
for key, f in (('showAll', 'all'), ('showWP', 'wordpress'), ('showWF', 'webflow')):
    p = p.replace('onClick="{{ ' + key + ' }}"', 'data-filter="' + f + '"')
write('portfolio.html', p)

# ---- Quote: form only; posts to the site and goes to /thank-you/ ----
q = interior('Quote.dc.html', 'quote.html')
q = q.replace('onSubmit="{{ submit }}"', 'class="dwr-form" data-redirect="%HOME%/thank-you/" novalidate')
q = BUDGET(q)
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
