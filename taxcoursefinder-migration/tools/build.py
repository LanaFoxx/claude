import json, re, sys, os, html as H
S = sys.argv[1]
EXT = S + '/ext'; OUT = S + '/build'
os.makedirs(OUT + '/pages', exist_ok=True)

PAGES = {
 'TaxCourse Finder Home':            ('home', '/', 'Compare CTEC Courses'),
 'CTEC 20 Hour Course':               ('ctec-20-hour-course', '/ctec-20-hour-course/', 'CTEC 20 Hour Course'),
 'CTEC 60 Hour Course':               ('ctec-60-hour-course', '/ctec-60-hour-course/', 'CTEC 60 Hour Course'),
 'CTEC Requirements':                 ('ctec-requirements', '/ctec-requirements/', 'CTEC Requirements'),
 'How to Become a CTEC Tax Preparer': ('how-to-become-a-ctec-registered-tax-preparer', '/how-to-become-a-ctec-registered-tax-preparer/', 'How to Become a CTEC Registered Tax Preparer'),
 'How to Renew CTEC Registration':    ('how-to-renew-ctec-registration', '/how-to-renew-ctec-registration/', 'How to Renew Your CTEC Registration'),
 'How to Choose':                     ('how-to-choose-a-ctec-course', '/how-to-choose-a-ctec-course/', 'How to Choose a CTEC Course'),
 'How We Compare Providers':          ('how-we-compare-providers', '/how-we-compare-providers/', 'How We Compare Providers'),
 'FAQs':                              ('faqs', '/faqs/', 'CTEC Course FAQs'),
 'About':                             ('about', '/about/', 'About'),
 'Provider Rights':                   ('provider-rights', '/provider-rights/', 'Provider Profile Rights & Accuracy'),
 'Provider Application':              ('provider-application', '/provider-application/', 'Verify Your Provider Profile'),
 'Privacy Policy':                    ('privacy-policy', '/privacy-policy/', 'Privacy Policy'),
 'Terms of Use':                      ('terms-of-use', '/terms-of-use/', 'Terms of Use'),
}
RUNTIME = {'TaxCourse Finder Home', 'CTEC 20 Hour Course', 'CTEC 60 Hour Course', 'About', 'Provider Application'}

def links(s):
    def rep(m):
        name, hsh = m.group(1), m.group(2) or ''
        url = PAGES[name][1] if name in PAGES else '/'
        if hsh == '#top': hsh = ''
        return 'href="' + url + hsh + '"'
    return re.sub(r'href="([^"#]+)\.dc\.html(#[^"]*)?"', rep, s)

def media(s):  # placeholder, resolved at publish time
    return re.sub(r'(src|href)="assets/([^"]+)"', lambda m: m.group(1) + '="@@MEDIA:' + m.group(2) + '@@"', s)

def clean(s):
    return media(links(s))

def seo_tweaks(name, body):
    # Anchor every provider row so structured data (and shared links) can point at it.
    body = re.sub(r'(as="p" hint-placeholder-count="\d+">\s*<div )', r'\1id="provider-{{ p.id }}" ', body)
    # Primary keywords in the course-page H1s.
    h1 = {
        'CTEC 20 Hour Course': ('20-Hour CE</span> course before you renew.', '20 Hour CTEC Course</span> before you renew.'),
        'CTEC 60 Hour Course': ('60-Hour QE</span> course before you enroll.', '60 Hour CTEC Course</span> before you enroll.'),
    }.get(name)
    if h1:
        assert h1[0] in body, name
        body = body.replace(h1[0], h1[1], 1)
    return body

def code_for(d):
    c = d['code']
    c = c.replace("await import('./providers.js')", 'await TCF.data()')
    c = re.sub(r'subInit\(\)\s*\{', 'subInit() { return;', c)  # newsletter popup has no backend: keep it off
    props = {}
    for k, v in json.loads(d['props']).items():
        if k.startswith('$'): continue
        props[k] = v.get('default')
    return c, props

hover = json.load(open(S + '/hover.json'))
hover_css = ''.join('[data-hv="%d"]:hover{%s}' % (i, ';'.join(x.strip() + '!important' for x in v.split(';') if x.strip())) for v, i in hover.items())
json.dump({'hover_css': hover_css}, open(OUT + '/hover.json', 'w'))

home_mobile = json.load(open(EXT + '/TaxCourse Finder Home Mobile.json'))

for name, (slug, url, title) in PAGES.items():
    d = json.load(open(EXT + '/' + name + '.json'))
    body = clean(d['body'])
    body = body.replace('style="min-width:1100px"', 'class="tcf-screen"', 1)
    body = seo_tweaks(name, body)
    rid = 'tcf-' + slug
    parts = ['<div class="tcf-page tcf-scope tcf-p-%s"><div id="%s-root" class="tcf-root">@@SSR@@</div></div>' % (slug, rid)]
    if name in RUNTIME:
        code, props = code_for(d)
        parts.append('<template id="%s-tpl">%s</template>' % (rid, body))
        mob = ''
        if slug == 'home':
            mcode, mprops = code_for(home_mobile)
            from bs4 import BeautifulSoup
            ms = BeautifulSoup(home_mobile['body'], 'html.parser'); mroot = ms.select_one('[data-screen-label]')
            kids = mroot.find_all(recursive=False)
            assert kids[0].name == 'sc-if' and 'Independent comparisons' in kids[-1].get_text()
            kids[0].decompose(); kids[-1].decompose()
            mroot['style'] = 'background:#fff;position:relative;overflow:hidden'
            mbody = seo_tweaks('mobile', clean(str(ms)))
            # mobile homepage: drop its own header/footer pieces are kept (design is self-contained); header stays from theme
            parts.append('<template id="%s-mtpl">%s</template>' % (rid, mbody))
            mob = ('var M=(function(){%s\nreturn Component;})();var useM=window.matchMedia&&matchMedia("(max-width: 760px)").matches&&document.getElementById("%s-mtpl");'
                   % (mcode, rid))
        js = ('(function(){var root=document.getElementById("%(rid)s-root"),tpl=document.getElementById("%(rid)s-tpl");'
              'var C=(function(){%(code)s\nreturn Component;})();%(mob)s'
              'function go(){if(%(usem)s){root.parentNode.classList.add("tcf-mobile");TCF.mount(root,document.getElementById("%(rid)s-mtpl"),M,%(mprops)s);}else TCF.mount(root,tpl,C,%(props)s);}'
              'if(!window.TCF||!TCF.mount)return;%(wait)s})();') % dict(
                rid=rid, code=code, mob=mob, usem='typeof useM!=="undefined"&&useM', mprops=json.dumps(code_for(home_mobile)[1]) if slug == 'home' else '{}',
                props=json.dumps(props), wait='TCF.data().then(go,go);' if 'TCF.data' in code else 'go();')
        parts.append('<script>' + js + '</script>')
    else:
        parts.append('<template id="%s-tpl">%s</template>' % (rid, body))  # used only at build time for SSR, stripped before publish
    _c, _p = code_for(d)
    json.dump({'code': _c, 'props': _p, 'name': name, 'slug': slug, 'url': url, 'title': title, 'runtime': name in RUNTIME, 'rid': rid, 'widget': '\n'.join(parts), 'css': d['css']},
              open(OUT + '/pages/' + slug + '.json', 'w'), indent=1)

# header/footer
d = json.load(open(EXT + '/About.json'))
hdr = clean(d['header'])
hdr = hdr.replace('<div style="background:#fff;border-bottom:1px solid #E3E9EB;position:sticky;top:0;z-index:10">', '<header id="top" class="tcf-header tcf-scope" style="background:#fff;border-bottom:1px solid #E3E9EB;position:sticky;top:0;z-index:50">', 1)
assert hdr.startswith('<header')
hdr = hdr[:hdr.rfind('</div>')] + '</header>'
hdr = hdr.replace('<div style="display:flex;gap:0;align-items:center;justify-content:flex-end;flex:none;font:600 19px Manrope,sans-serif;white-space:nowrap">',
                  '<button type="button" class="tcf-burger" data-tcf-menu-toggle aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>'
                  '<nav class="tcf-nav" aria-label="Main" style="display:flex;gap:0;align-items:center;justify-content:flex-end;flex:none;font:600 19px Manrope,sans-serif;white-space:nowrap">', 1)
# close nav: the nav div is the last child of the inner bar -> its closing tag is the 2nd-to-last </div> before </header>
i = hdr.rfind('</div>'); j = hdr.rfind('</div>', 0, i)
hdr = hdr[:j] + '</nav>' + hdr[j + 6:]
ftr = clean(d['footer']).replace('<div id="site-footer" style=', '<footer id="site-footer" class="tcf-footer tcf-scope" style=', 1)
ftr = ftr[:ftr.rfind('</div>')] + '</footer>'
json.dump({'header': hdr, 'footer': ftr}, open(OUT + '/hf.json', 'w'), indent=1)
print('ok')
