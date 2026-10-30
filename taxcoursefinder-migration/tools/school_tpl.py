"""Convert the School Page design into the plugin's template (links -> site URLs, media -> WP uploads)."""
import json, re, sys
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
sys.argv = ['x', 'none']; sys.path.insert(0, S + '/tools')
exec(open(S + '/tools/publish.py').read())          # fix_media, MEDIA
URLS = {'TaxCourse Finder Home': '/', 'Provider Application': '/provider-application/', 'Provider Rights': '/provider-rights/'}
d = json.load(open(S + '/ext/School Page.json'))
b = d['body']
b = re.sub(r'href="([^"#]+)\.dc\.html(#[^"]*)?"', lambda m: 'href="%s%s"' % (URLS[m.group(1)], m.group(2) or ''), b)
b = re.sub(r'(src|href)="assets/([^"]+)"', lambda m: m.group(1) + '="@@MEDIA:' + m.group(2) + '@@"', b)
b = fix_media(b)
b = b.replace('style="min-width:1100px"', 'class="tcf-screen"', 1)
# outbound school links: new tab, no endorsement signal
b = re.sub(r'<a href="\{\{ (courseUrl|website|refundUrl) \}\}"', lambda m: '<a href="{{ %s }}" target="_blank" rel="nofollow sponsored noopener"' % m.group(1), b)
b = re.sub(r'(<a href="\{\{ \w+ \}\}" target="_blank" rel="nofollow sponsored noopener")((?:[^>]*?) (?:target|rel)="[^"]*")+', r'\1', b)
# image slots -> real screenshots / school photo (hidden when none)
shots = re.search(r'<div style="display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:16px">\s*(<div style="aspect-ratio:4/3;[^"]*"><image-slot id="school-shot-\d"[^>]*></image-slot></div>\s*){3}</div>', b)
assert shots, 'screenshot grid not found'
b = b.replace(shots.group(0), '<sc-if value="{{ hasShots }}"><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px"><sc-for list="{{ shots }}" as="sh" hint-placeholder-count="3"><div style="aspect-ratio:4/3;border-radius:14px;overflow:hidden;border:1px solid #D7DFE2;background:#F4F6F7"><img src="{{ sh.src }}" alt="{{ sh.alt }}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block"></div></sc-for></div></sc-if>', 1)
about = re.search(r'(<div style="display:grid;)grid-template-columns:minmax\(0,1fr\) 300px;(gap:28px;align-items:start">\s*<p [^>]*>\{\{ about \}\}</p>\s*)<div style="aspect-ratio:4/3;[^"]*"><image-slot id="school-about"[^>]*></image-slot></div>', b)
assert about, 'about photo slot not found'
b = b.replace(about.group(0), about.group(1) + 'grid-template-columns:{{ aboutCols }};' + about.group(2) + '<sc-if value="{{ hasPhoto }}"><div style="aspect-ratio:4/3;border-radius:14px;overflow:hidden;border:1px solid #D7DFE2;background:#F4F6F7"><img src="{{ photo.src }}" alt="{{ photo.alt }}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block"></div></sc-if>', 1)
assert 'image-slot' not in b
# hooks for the school page's own responsive rules (TCFD_School::css)
def tag(old, cls):
    global b
    assert old in b, old
    b = b.replace(old, old.replace('<div ', '<div class="%s" ' % cls, 1), 1)
tag('<div style="min-height:420px">', 'tcfd-hero-spacer')
tag('<div style="position:relative;z-index:6;margin-top:-720px">', 'tcfd-card-wrap')
tag('<div style="position:sticky;top:184px;width:400px;', 'tcfd-card')
i = b.find('onclick="{{ pickCE }}"'); j = b.rfind('<div style="display:flex;gap:10px">', 0, i)
b = b[:j] + '<div class="tcfd-tabs" style="display:flex;gap:10px">' + b[j + len('<div style="display:flex;gap:10px">'):]
m = re.search(r'(<div style="background:#fff;border-bottom:1px solid #E3E9EB;position:sticky;top:110px;z-index:5">)<div ', b)
b = b.replace(m.group(0), m.group(1).replace('<div ', '<div class="tcfd-subnav-bar" ') + '<div class="tcfd-subnav" ', 1)

# coupon codes are click-to-copy (tcf-runtime.js)
b = re.sub(r'<span style="display:inline-block;border:1.5px dashed #95AB3B;([^"]*)">\{\{ ([\w.]+) \}\}</span>',
           lambda m: '<span data-tcf-copy="{{ %s }}" role="button" tabindex="0" title="Click to copy code" style="cursor:pointer;display:inline-block;border:1.5px dashed #95AB3B;%s">{{ %s }}</span>' % (m.group(2), m.group(1), m.group(2)), b)
b = re.sub(r'<span (style="[^"]*")>\{\{ ([\w.]*couponLabel) \}\}</span>', r'<span data-tcf-copy-label="" \1>{{ \2 }}</span>', b)
# sticky offsets follow the compact header (site.css --tcf-head)
b = b.replace('top:110px', 'top:var(--tcf-head,110px)').replace('top:184px', 'top:calc(var(--tcf-head,110px) + 74px)')
assert '.dc.html' not in b and '@@MEDIA' not in b
b, _n = re.subn(r'<div style="display:grid;grid-template-columns:220px minmax\(0,1fr\);gap:24px;padding:20px 26px;border-bottom:1px solid #E3E9EB"><div style="font:700 17px Manrope,sans-serif;color:#0B2E40">Edition / tax year</div><div[^>]*>\{\{ edition \}\}</div></div>\s*', '', b)  # no edition row
_a = b.find('<section id="faq"')  # no School FAQ section on profiles
if _a >= 0: b = b[:_a] + b[b.index('</section>', _a) + len('</section>'):]
b = re.sub(r'\s*<a href="#faq"[^>]*>FAQ</a>', '', b)  # School FAQ section removed: drop its menu tab too
b = re.sub('<div style="border:1px solid #D7DFE2;border-radius:14px;overflow:hidden">\\s*<div[^>]*><div[^>]*>Help with course material</div>.*?<div[^>]*>Instructors</div><div[^>]*>\\{\\{ instructors \\}\\}</div></div>\\s*</div>\\s*', '', b, flags=re.S)  # no course-help / billing-help / instructors box
b = re.sub('<div style="border:1px solid #D7DFE2;border-radius:14px;overflow:hidden">\\s*<div[^>]*><div[^>]*>Pace</div>.*?<div[^>]*>Language &amp; accessibility</div><div[^>]*>\\{\\{ accessibility \\}\\}</div></div>\\s*</div>\\s*', '', b, flags=re.S)  # How will I learn: pills only, no table
b = brand.brand(b)  # Cobalt / Coral brand
open('/home/user/claude/tcf-directory-manager/templates/school-template.html', 'w').write(b)
print('template', len(b), 'outbound links:', len(re.findall(r'rel="nofollow sponsored', b)))
