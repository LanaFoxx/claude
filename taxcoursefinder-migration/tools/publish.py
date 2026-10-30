import sys, json, re, glob, random, os
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
import brand
s = session()
B = S + '/build'
STEP = sys.argv[1]

UP = BASE + '/wp-content/uploads/'
MEDIA = {
 'check-green.png': (124, UP + '2026/09/check-green.png'),
 'check-white.png': (123, UP + '2026/09/check-white.png'),
 'logo-teal.png': (805, brand.LOGO),
 'logo-white-teal.png': (806, brand.LOGO_WHITE),
 'photos/01-ctec-60-hour-learner.webp': (489, UP + '2026/09/01-ctec-60-hour-learner.webp'),
 'photos/02-ctec-20-hour-tax-review.webp': (490, UP + '2026/09/02-ctec-20-hour-tax-review.webp'),
 'photos/03-online-tax-course-desktop.webp': (491, UP + '2026/09/03-online-tax-course-desktop.webp'),
 'photos/04-tax-forms-calculator-closeup.webp': (492, UP + '2026/09/04-tax-forms-calculator-closeup.webp'),
 'photos/05-tax-study-workspace-titled.png': (820, 'https://taxcoursefinder.com/wp-content/uploads/2026/10/tax-study-workspace-federal-tax-law-2026.webp'),  # title redrawn in the book's perspective
 'photos/ctec-org-desktop.webp': (621, UP + '2026/09/ctec-org-desktop.webp'),
 'photos/ctec-course-comparison-laptop.webp': (622, UP + '2026/09/ctec-course-comparison-laptop.webp'),
 'photos/comparing-ctec-courses.webp': (623, UP + '2026/09/comparing-ctec-courses.webp'),
 'photos/ctec-renewal-records.webp': (624, UP + '2026/09/ctec-renewal-records.webp'),
}
ALT = json.load(open(S + '/alts.json'))  # media id -> alt

def fix_media(h):
    def rep(m):
        k = m.group(1)
        return MEDIA[k][1]
    h = re.sub(r'@@MEDIA:([^@]+)@@', rep, h)
    h = re.sub(r'(?<=src=")/assets/([^"]+)', lambda m: MEDIA[m.group(1)][1], h)
    # meaningful alt text for photos that had none; lazy-load everything below the hero
    def img(m):
        tag = m.group(0); src = re.search(r'src="([^"]+)"', tag)
        if src:
            mid = next((v[0] for v in MEDIA.values() if v[1] == src.group(1)), None)
            if mid and 'photos' in [k for k, v in MEDIA.items() if v[0] == mid][0] and re.search(r'alt=""', tag):
                tag = tag.replace('alt=""', 'alt="%s"' % ALT[str(mid)].replace('"', '&quot;'))
        if 'decoding=' not in tag: tag = tag.replace('<img ', '<img decoding="async" ', 1)
        return tag
    return re.sub(r'<img\b[^>]*>', img, h)

def rid(): return '%08x' % random.getrandbits(32)

def el_data(html, extra=None):
    w = [{'id': rid(), 'elType': 'widget', 'widgetType': 'html', 'settings': {'html': html}, 'elements': []}]
    if extra: w += extra
    return [{'id': rid(), 'elType': 'container', 'isInner': False,
             'settings': {'content_width': 'full', 'flex_direction': 'column', 'padding': {'unit': 'px', 'top': '0', 'right': '0', 'bottom': '0', 'left': '0', 'isLinked': True},
                          'flex_gap': {'column': '0', 'row': '0', 'unit': 'px', 'isLinked': True, 'size': 0}, 'css_classes': 'tcf-wrap'},
             'elements': w}]

def lazy(h):
    # lazy-load images except the first one (hero)
    n = [0]
    def rep(m):
        n[0] += 1
        t = m.group(0)
        if n[0] > 1 and 'loading=' not in t: t = t.replace('<img ', '<img loading="lazy" ', 1)
        elif n[0] == 1 and 'fetchpriority' not in t: t = t.replace('<img ', '<img fetchpriority="high" ', 1)
        return t
    return re.sub(r'<img\b[^>]*>', rep, h)

PAGE_ALTS = json.load(open(S + '/page_alts.json'))

def page_alts(slug, h):
    # Page-specific, keyword-aware alt text; nth occurrence of a file gets the nth alt (last one repeats).
    alts = PAGE_ALTS.get(slug, {})
    seen = {}
    def rep(m):
        tag = m.group(0)
        src = re.search(r'src="([^"]+)"', tag)
        if not src: return tag
        f = src.group(1).rsplit('/', 1)[-1]
        if f not in alts: return tag
        n = seen.get(f, 0); seen[f] = n + 1
        alt = alts[f][min(n, len(alts[f]) - 1)].replace('"', '&quot;')
        return re.sub(r'alt="[^"]*"', 'alt="%s"' % alt, tag) if 'alt="' in tag else tag.replace('<img ', '<img alt="%s" ' % alt, 1)
    # template copies render the same images again: number them separately
    parts = re.split(r'(<template\b.*?</template>)', h, flags=re.S)
    out = []
    for part in parts:
        seen = {}
        out.append(re.sub(r'<img\b[^>]*>', rep, part))
    return ''.join(out)

# In-content links to the newer guides.
LINKS = {
    'how-to-become-a-ctec-registered-tax-preparer': [('follow CTEC’s current instructions for submitting your results.', 'follow CTEC’s current instructions for submitting your results. <a href="/ctec-live-scan-background-check/" style="color:#7E9330;font-weight:700">How the CTEC Live Scan works</a>.')],
    'ctec-requirements': [('Pass a Live Scan background check', '<a href="/ctec-live-scan-background-check/" style="color:inherit;text-decoration:underline;text-decoration-color:#95AB3B">Pass a Live Scan background check</a>')],
}

def add_links(slug, h):
    for old, new in LINKS.get(slug, []):
        h = h.replace(old, new, 1)
    return h

def page_html(pg):
    w = pg['widget']
    if not pg['runtime']:
        w = re.sub(r'<template id="[^"]+-tpl">.*?</template>', '', w, flags=re.S)
    w = w.replace('@@SSR@@', lazy(pg['ssr']))
    return brand.brand(add_links(pg['slug'], page_alts(pg['slug'], fix_media(w))))

if STEP == 'trash':
    old = [608, 609, 610, 611, 507, 494, 165, 126, 127, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 3]
    for i in old:
        r = api(s, 'DELETE', 'wp/v2/pages/%d' % i)
        print('trashed', i, r.get('status'), r.get('slug'))

if STEP == 'create':
    ids = {}
    order = ['home', 'ctec-20-hour-course', 'ctec-60-hour-course', 'ctec-requirements', 'how-to-become-a-ctec-registered-tax-preparer', 'how-to-renew-ctec-registration',
             'how-to-choose-a-ctec-course', 'how-we-compare-providers', 'faqs', 'about', 'provider-rights', 'provider-application', 'privacy-policy', 'terms-of-use']
    for n, slug in enumerate(order):
        pg = json.load(open(B + '/pages/%s.json' % slug))
        p = api(s, 'POST', 'wp/v2/pages', json={'title': pg['title'], 'slug': slug, 'status': 'publish', 'template': 'elementor_header_footer', 'menu_order': n, 'comment_status': 'closed', 'ping_status': 'closed',
                                                 'meta': {'_elementor_edit_mode': 'builder', '_elementor_template_type': 'wp-page'}})
        ids[slug] = p['id']; print('created', slug, p['id'], p['link'])
    json.dump(ids, open(S + '/ids.json', 'w'))

if STEP == 'content':
    ids = json.load(open(S + '/ids.json'))
    only = sys.argv[2:] or list(ids)
    for slug in only:
        pg = json.load(open(B + '/pages/%s.json' % slug))
        html = page_html(pg)
        extra = None
        if slug == 'provider-application':
            # listing form: submits to the plugin review queue (admin-ajax tcfd_listing_submit)
            html += '<script>' + open(B + '/listing-submit.js').read() + '</script>'
        ldf = B + '/%s-ld.json' % slug
        if os.path.exists(ldf): html += '<script type="application/ld+json">' + open(ldf).read().replace('</', '<\\/') + '</script>'
        data = el_data(html, extra)
        api(s, 'POST', 'wp/v2/pages/%d' % ids[slug], json={'meta': {'_elementor_data': json.dumps(data, ensure_ascii=False), '_elementor_edit_mode': 'builder', '_elementor_template_type': 'wp-page', '_elementor_page_settings': {'hide_title': 'yes'}}})
        back = api(s, 'GET', 'wp/v2/pages/%d?context=edit' % ids[slug])['meta']['_elementor_data']
        ok = json.loads(back)[0]['elements'][0]['settings']['html'] == html
        print('content', slug, len(html), 'roundtrip-ok' if ok else 'MISMATCH')

def hf_html():
    hf = json.load(open(B + '/hf.json'))
    hover = json.load(open(B + '/hover.json'))['hover_css'].replace('#7E9330', brand.COBALT_HOVER)  # darker cobalt on hover
    css = open(B + '/site.css').read() + hover + brand.CSS
    css = re.sub(r'\s*\n\s*', '', css)
    rt = open(B + '/tcf-runtime.js').read()
    head = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link href="' + brand.FONTS_URL + '" rel="stylesheet">'
            '<style id="tcf-site-css">' + css + '.tcf-hidden-form{display:none!important}</style><script>' + rt + '</script>')
    hdr = fix_media(head + hf['header'])
    hdr = hdr.replace('max-width:1200px;margin:0 auto;padding:0 56px;height:110px', 'max-width:1312px;margin:0 auto;padding:0 56px;height:110px', 1)  # header lines up with the content column  # full-width header: logo left, menu right
    hdr = hdr.replace('<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:8px;cursor:pointer;color:#0B2E40;font:600 19px Manrope,sans-serif;white-space:nowrap" data-hv="2">For CTEC Providers<svg',
                      '<div class="tcf-nav-btn" style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:8px;cursor:pointer;color:#0B2E40;font:600 19px Manrope,sans-serif;white-space:nowrap">For Providers<svg', 1)
    assert 'tcf-nav-btn' in hdr, 'providers button'
    # Primary call to action: filled button, shown last in the desktop menu (CSS order).
    hdr = hdr.replace('<a href="/" style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:8px;color:#0B2E40" data-hv="2">Find &amp; Compare Courses</a>',
                      '<a href="/#find-schools" class="tcf-nav-cta" style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-radius:8px;color:#0B2E40">' + (brand.MAG if brand.COLORS_ONLY else '') + brand.CTA + '</a>', 1)
    assert 'tcf-nav-cta' in hdr, 'cta'
    # Deadline top bar above the header (text filled live by tcf-runtime.js, California time).
    topbar = ('<div class="tcf-topbar" role="note"><div class="tcf-topbar-in"><span class="tcf-topbar-dot" aria-hidden="true"></span>'
              '<span data-tcf-cd><span>CTEC renewal deadline: October 31</span></span>'
              '<a class="tcf-topbar-link" href="/ctec-20-hour-course/">Compare 20-hour courses <span aria-hidden="true">&rarr;</span></a></div></div>')
    hdr = hdr.replace('<header id="top"', topbar + '<header id="top"', 1)
    assert 'tcf-topbar' in hdr
    hdr = hdr.replace('style="height:80px;width:auto;display:block"', 'width="188" height="68" style="height:68px;width:auto;display:block"', 1)
    hdr = hdr.replace('<img ', '<img fetchpriority="high" width="193" height="80" ', 1)
    ftr = fix_media(hf['footer']).replace('style="height:58px;width:auto;display:block"', 'style="height:68px;width:auto;display:block"', 1).replace("<img ", "<img width=\"188\" height=\"68\" ", 1)
    # CTEC deadline countdown strip above the footer on every page (filled live by tcf-runtime.js, California time)
    cdstrip = ('<div data-tcf-cdstrip="" class="tcf-cdstrip tcf-scope" style="background:#fff;color:#23272A;padding:24px 56px;min-height:120px;box-sizing:border-box;display:flex;align-items:center;border-top:1px solid #EEE9E1;visibility:hidden">'
               '<div style="width:100%;max-width:1200px;margin:0 auto;display:flex;justify-content:center;align-items:center;gap:16px;flex-wrap:wrap;font:600 19px Manrope,sans-serif;text-align:center">'
               '<span data-cd-title="" style="letter-spacing:.1em;text-transform:uppercase;font-size:17px;opacity:.9">CTEC renewal deadline</span>'
               '<span data-cd-time="" style="font:800 22px Manrope,sans-serif;color:#FF6B57"></span>'
               '<a href="/ctec-20-hour-course/" style="color:#23272A;text-decoration:underline;font-weight:700">Compare 20-hour courses</a></div></div>')
    ftr = cdstrip + ftr
    ftr = re.sub(r'<p[^>]*>The independent directory of CTEC-approved education providers in California\.</p>', '', ftr)  # no tagline under the footer logo
    hdr, ftr = brand.brand(hdr), brand.brand(ftr)
    return hdr, ftr

if STEP == 'hf':
    hdr, ftr = hf_html()
    for tid, html in ((40, hdr), (41, ftr)):
        data = el_data(html)
        api(s, 'POST', 'wp/v2/elementor_library/%d' % tid, json={'meta': {'_elementor_data': json.dumps(data, ensure_ascii=False)}})
        back = api(s, 'GET', 'wp/v2/elementor_library/%d?context=edit' % tid)['meta']['_elementor_data']
        print('template', tid, len(html), json.loads(back)[0]['elements'][0]['settings']['html'] == html)
