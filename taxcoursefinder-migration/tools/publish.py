import sys, json, re, glob, random, os
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
s = session()
B = S + '/build'
STEP = sys.argv[1]

UP = BASE + '/wp-content/uploads/'
MEDIA = {
 'check-green.png': (124, UP + '2026/09/check-green.png'),
 'check-white.png': (123, UP + '2026/09/check-white.png'),
 'logo-teal.png': (690, UP + '2026/10/california-tax-course-finder-logo.png'),
 'logo-white-teal.png': (689, UP + '2026/10/california-tax-course-finder-logo-white.png'),
 'photos/01-ctec-60-hour-learner.webp': (489, UP + '2026/09/01-ctec-60-hour-learner.webp'),
 'photos/02-ctec-20-hour-tax-review.webp': (490, UP + '2026/09/02-ctec-20-hour-tax-review.webp'),
 'photos/03-online-tax-course-desktop.webp': (491, UP + '2026/09/03-online-tax-course-desktop.webp'),
 'photos/04-tax-forms-calculator-closeup.webp': (492, UP + '2026/09/04-tax-forms-calculator-closeup.webp'),
 'photos/05-tax-study-workspace-titled.png': (691, UP + '2026/10/tax-study-workspace-federal-tax-law.webp'),
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

def page_html(pg):
    w = pg['widget']
    if not pg['runtime']:
        w = re.sub(r'<template id="[^"]+-tpl">.*?</template>', '', w, flags=re.S)
    w = w.replace('@@SSR@@', lazy(pg['ssr']))
    return fix_media(w)

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
            fid = 'a7f0c3e1'
            js = open(B + '/apply-submit.js').read().replace('@@PAGEID@@', str(ids[slug])).replace('@@FORMID@@', fid)
            html += '<script>' + js + '</script>'
            extra = [{'id': fid, 'elType': 'widget', 'widgetType': 'form', 'settings': {
                'form_name': 'Provider Application', '_css_classes': 'tcf-hidden-form',
                'form_fields': [
                    {'_id': 'f1', 'custom_id': 'company_name', 'field_type': 'text', 'field_label': 'Company / School Name', 'required': ''},
                    {'_id': 'f2', 'custom_id': 'contact_name', 'field_type': 'text', 'field_label': 'Primary Contact Name', 'required': ''},
                    {'_id': 'f3', 'custom_id': 'email', 'field_type': 'email', 'field_label': 'Email Address', 'required': ''},
                    {'_id': 'f4', 'custom_id': 'website', 'field_type': 'text', 'field_label': 'Website URL', 'required': ''},
                    {'_id': 'f5', 'custom_id': 'details', 'field_type': 'textarea', 'field_label': 'Application Details', 'required': ''},
                    {'_id': 'f6', 'custom_id': 'uploads', 'field_type': 'upload', 'field_label': 'Uploaded Files', 'allow_multiple_upload': 'yes', 'max_files': 10, 'file_sizes': '10', 'file_types': 'png,jpg,jpeg,gif,webp,svg,pdf', 'required': ''},
                ],
                'submit_actions': ['email'], 'email_to': 'providers@taxcoursefinder.com', 'email_subject': 'Provider Application: [field id="company_name"]',
                'email_content': '[all-fields]', 'email_from': 'no-reply@taxcoursefinder.com', 'email_from_name': 'California Tax Course Finder', 'email_reply_to': '[field id="email"]',
                'form_metadata': ['date', 'time', 'page_url', 'remote_ip'], 'email_content_type': 'plain',
                'success_message': 'Application received.', 'button_text': 'Send'}, 'elements': []}]
        ldf = B + '/%s-ld.json' % slug
        if os.path.exists(ldf): html += '<script type="application/ld+json">' + open(ldf).read().replace('</', '<\\/') + '</script>'
        data = el_data(html, extra)
        api(s, 'POST', 'wp/v2/pages/%d' % ids[slug], json={'meta': {'_elementor_data': json.dumps(data, ensure_ascii=False), '_elementor_edit_mode': 'builder', '_elementor_template_type': 'wp-page', '_elementor_page_settings': {'hide_title': 'yes'}}})
        back = api(s, 'GET', 'wp/v2/pages/%d?context=edit' % ids[slug])['meta']['_elementor_data']
        ok = json.loads(back)[0]['elements'][0]['settings']['html'] == html
        print('content', slug, len(html), 'roundtrip-ok' if ok else 'MISMATCH')

if STEP == 'hf':
    hf = json.load(open(B + '/hf.json'))
    css = open(B + '/site.css').read() + json.load(open(B + '/hover.json'))['hover_css']
    css = re.sub(r'\s*\n\s*', '', css)
    rt = open(B + '/tcf-runtime.js').read()
    head = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;500;600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">'
            '<style id="tcf-site-css">' + css + '.tcf-hidden-form{display:none!important}</style><script>' + rt + '</script>')
    hdr = fix_media(head + hf['header'])
    hdr = hdr.replace('<img ', '<img fetchpriority="high" width="193" height="80" ', 1)
    ftr = fix_media(hf['footer']).replace("<img ", "<img width=\"140\" height=\"58\" ", 1)
    for tid, html in ((40, hdr), (41, ftr)):
        data = el_data(html)
        api(s, 'POST', 'wp/v2/elementor_library/%d' % tid, json={'meta': {'_elementor_data': json.dumps(data, ensure_ascii=False)}})
        back = api(s, 'GET', 'wp/v2/elementor_library/%d?context=edit' % tid)['meta']['_elementor_data']
        print('template', tid, len(html), json.loads(back)[0]['elements'][0]['settings']['html'] == html)
