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


TABLE_CSS = ("<style>"
  ".tcf-table{border:1px solid #E3E9EB;border-radius:14px;overflow:hidden;background:#fff;font-family:'DM Sans',Manrope,sans-serif}"
  ".tcf-thead,.tcf-trow{display:grid;grid-template-columns:minmax(0,2.3fr) minmax(100px,.9fr) minmax(130px,1.15fr) minmax(130px,1.15fr) minmax(100px,.95fr) auto;gap:20px;align-items:center}"
  ".tcf-thead{background:#0B2E40;color:rgba(255,255,255,.88);font:700 14px 'DM Sans',Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:18px 28px}"
  ".tcf-trow{padding:20px 28px;border-top:1px solid #E3E9EB;background:#fff;transition:background .15s}"
  ".tcf-tbody>.tcf-trow:first-child{border-top:0}.tcf-tbody>.tcf-trow:nth-child(even){background:#F7F9FA}.tcf-tbody>.tcf-trow:hover{background:#F3F5E6}"
  ".tcf-trow [data-label]::before{display:none}"
  "@media (max-width:900px){.tcf-thead{display:none}.tcf-trow{grid-template-columns:1fr 1fr;gap:14px 18px;padding:18px}"
  ".tcf-trow .tcf-cell-provider,.tcf-trow .tcf-cell-offer{grid-column:1 / -1}.tcf-trow .tcf-cell-offer{justify-self:stretch!important}.tcf-trow .tcf-cell-offer a{width:100%}"
  ".tcf-trow [data-label]::before{content:attr(data-label);display:block;font:700 11px 'DM Sans',Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8A9AA3;margin-bottom:4px}}"
  "</style>")

def comparison_table(body):
    """Directory list as a comparison table: provider, price, format, reporting speed, rating, offer (zebra rows)."""
    m = re.search(r'<div style="display:grid;grid-template-columns:56px minmax\(0,1fr\) 200px 180px 120px;gap:24px;padding:14px \d+px;background:#0B2E40', body)
    if not m:
        return body
    i = m.start()
    end = body.index('</sc-for>', i) + len('</sc-for>')
    chunk = body[i:end]
    logo_start = '<div style="width:56px;height:56px;border:1px solid #E3E9EB;border-radius:8px;background:#fff;display:grid;place-items:center;overflow:hidden">'
    a = chunk.index(logo_start); logo = chunk[a:chunk.index('</sc-if></div>', a) + len('</sc-if></div>')]
    logo = logo.replace(logo_start, '<div style="flex:none;width:48px;height:48px;border:1px solid #E3E9EB;border-radius:10px;background:#fff;display:grid;place-items:center;overflow:hidden">', 1).replace('width:26px;height:26px', 'width:22px;height:22px')
    pstart = '<div style="min-width:0"><div style="font:{{ p.priceWeight }} 20px/1.2 Manrope,sans-serif'
    b = chunk.index(pstart); price = chunk[b:chunk.index('</sc-if></div>', b) + len('</sc-if></div>')]
    price = price.replace('<div style="min-width:0">', '<div style="min-width:0" data-label="Price">', 1).replace('Manrope,sans-serif', "'DM Sans',Manrope,sans-serif")
    head = ('<div class="tcf-thead" role="row"><span>Provider</span><span>{{ courseShort }} price</span><span>Format</span><span>Reports to CTEC</span><span>Rating</span><span>Offer</span></div>')
    row = ('<div class="tcf-trow" role="row">'
           '<div class="tcf-cell-provider" style="display:flex;align-items:center;gap:16px;min-width:0">' + logo +
           '<div style="min-width:0"><a href="{{ p.schoolUrl }}" style="display:block;font:700 19px/1.25 \'DM Sans\',Manrope,sans-serif;color:#0B2E40;text-wrap:pretty" data-hv="9">{{ p.name }}</a>'
           '<div style="font-size:14px;color:#5A6E78;margin-top:4px;line-height:1.4">{{ p.offeringLabel }} · {{ p.domain }}{{ p.ctecLine }}</div></div></div>'
           + price +
           '<div data-label="Format" style="min-width:0;line-height:1.35"><div style="font-size:16px;color:{{ p.formatColor }}">{{ p.formatL1 }}</div><div style="font-size:15px;color:#8A9AA3;margin-top:2px">{{ p.formatL2 }}</div></div>'
           '<div data-label="Reports to CTEC" style="min-width:0;font-size:16px;font-weight:{{ p.reportWeight }};color:{{ p.reportColor }}">{{ p.reportText }}</div>'
           '<div data-label="Rating" style="min-width:0;font-size:16px;font-weight:600;color:{{ p.ratingColor }}">{{ p.ratingText }} <span style="font-weight:400;color:#8A9AA3">{{ p.ratingCount }}</span></div>'
           '<div class="tcf-cell-offer" style="justify-self:end"><sc-if value="{{ p.hasWebsite }}"><a href="{{ p.courseLink }}" target="_blank" rel="noopener" data-tcf-copy-go="{{ p.couponCode }}" '
           'style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:150px;font:700 16px \'DM Sans\',Manrope,sans-serif;border-radius:999px;white-space:nowrap;text-decoration:none;'
           'background:#95AB3B;color:#fff;padding:12px 22px;border:1.5px solid #95AB3B;transition:background .15s,border-color .15s" data-hv="4"><span data-tcf-offer-label="">{{ p.offerLabel }}</span></a></sc-if>'
           '<sc-if value="{{ p.noWebsite }}"><div style="font-size:15px;color:#8A9AA3">No website listed</div></sc-if></div>'
           '</div>')
    table = (TABLE_CSS + '<div class="tcf-table" role="table" aria-label="CTEC course providers compared">' + head +
             '<div class="tcf-tbody"><sc-for list="{{ list }}" as="p" hint-placeholder-count="10">\n        ' + row + '\n      </sc-for></div></div>')
    return body[:i] + table + body[end:]

def seo_tweaks(name, body):
    body = comparison_table(body)
    # Anchor every provider row so structured data (and shared links) can point at it.
    body = re.sub(r'(as="p" hint-placeholder-count="\d+">\s*<div )', r'\1id="provider-{{ p.id }}" ', body)
    # Provider name links to its school page only when one is live; otherwise plain text.
    body = re.sub(r'<a href="\{\{ p\.schoolUrl \}\}" style="([^"]*)"[^>]*>\{\{ p\.name \}\}</a>',
                  r'<sc-if value="{{ p.hasSchool }}"><a href="{{ p.schoolUrl }}" style="\1" data-hv="9">{{ p.name }}</a></sc-if><sc-if value="{{ p.noSchool }}"><div style="\1">{{ p.name }}</div></sc-if>', body)
    # Feature pills under each provider's name (online, video, book, support…), from the listing's feature switches.
    body = body.replace('{{ p.offeringLabel }} · {{ p.domain }}</div>',
        '{{ p.offeringLabel }} · {{ p.domain }}</div><sc-if value="{{ p.hasPills }}"><ul class="tcf-pills" aria-label="Course features" style="list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px">'
        '<sc-for list="{{ p.pills }}" as="f"><li style="font:600 13px/1 Manrope,sans-serif;padding:5px 10px;border-radius:999px;border:1px solid {{ f.border }};background:{{ f.bg }};color:{{ f.color }};white-space:nowrap">{{ f.label }}</li></sc-for></ul></sc-if>')
    # Hero search bar: fully rounded to match its Search button.
    body = body.replace('max-width:1200px;background:#fff;border-radius:14px;padding:8px;gap:8px;box-shadow:0 30px 70px',
                        'max-width:1200px;background:#fff;border-radius:999px;padding:8px 8px 8px 18px;gap:8px;box-shadow:0 30px 70px', 1)
    # Method page: "The same facts, the same way" cards get icons and a preview of how each fact looks on a listing.
    if name == 'How We Compare Providers':
        start = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">'
        i = body.index(start); depth = 0
        for m in re.finditer(r'<(/?)div\b', body[i:]):
            depth += -1 if m.group(1) else 1
            if depth == 0: j = body.index('>', i + m.end()) + 1; break
        svg = lambda d: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7E9330" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'
        pill = lambda t: '<span style="font:600 14px/1 Manrope,sans-serif;padding:6px 11px;border-radius:999px;border:1px solid #D7DFE2;background:#fff;color:#2F4652;white-space:nowrap">' + t + '</span>'
        cap = lambda t: '<span style="font:700 12px Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8A9AA3">' + t + '</span>'
        facts = [
            ('CTEC approval', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path><path d="m9 12 2 2 4-4"></path>',
             'Every school is matched to CTEC&#8217;s approved-provider registry before it appears, with the course types (20-hour CE, 60-hour QE) its approval covers.',
             '<span style="font:700 16px Manrope,sans-serif;color:#0B2E40">CE &#183; QE</span>' + cap('CTEC approved')),
            ('Course bundle price', '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle>',
             'The price on the provider&#8217;s own website for the complete course. If a school publishes no flat price, the row says so instead of estimating.',
             '<span style="font:700 20px Manrope,sans-serif;color:#0B2E40;font-variant-numeric:tabular-nums">$49.95</span>' + cap('Course bundle price')),
            ('Current offers', '<path d="M19 5 5 19"></path><circle cx="7" cy="7" r="2.5"></circle><circle cx="17" cy="17" r="2.5"></circle>',
             'Coupon codes and sales are recorded only when found on the provider&#8217;s site or supplied by the provider, with the date checked. Expired offers are removed.',
             '<span style="font:700 15px ui-monospace,Menlo,monospace;color:#7E9330;background:#F3F5E6;border:1.5px dashed #95AB3B;border-radius:6px;padding:4px 9px">SAVE10</span>' + cap('Coupon code')),
            ('Course format', '<rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path><path d="m10.5 8 3.5 2-3.5 2z"></path>',
             'Online, in-person, self-paced and live classes, plus printed books, PDFs and online videos, shown once confirmed by the provider or our review.',
             pill('Online') + pill('Self-paced') + pill('Online videos')),
            ('Student support', '<path d="M4 14v-2a8 8 0 0 1 16 0v2"></path><rect x="3" y="14" width="4" height="6" rx="1.5"></rect><rect x="17" y="14" width="4" height="6" rx="1.5"></rect>',
             'Phone, email and live chat support, shown only when verified, so you know how to get help before you enroll.',
             pill('Phone support') + pill('Email support') + pill('Live chat')),
            ('Website link', '<path d="M14 4h6v6"></path><path d="M20 4 11 13"></path><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path>',
             'A direct link to the provider&#8217;s course page. You enroll with the school, not with us.',
             '<span style="display:inline-flex;align-items:center;gap:6px;font:700 15px Manrope,sans-serif;background:#95AB3B;color:#fff;border-radius:999px;padding:8px 16px">View course<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg></span>'),
        ]
        cards = ''.join(
            '<div class="tcf-fact" style="position:relative;background:#fff;border:1px solid #D7DFE2;border-radius:18px;padding:28px 28px 24px;display:flex;flex-direction:column;gap:14px;overflow:hidden">'
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div style="width:52px;height:52px;border-radius:14px;background:#F3F5E6;display:grid;place-items:center;flex:none">' + svg(icon) + '</div>'
            '<span style="font:700 13px Manrope,sans-serif;letter-spacing:.12em;color:#B5BECB">0' + str(n + 1) + '</span></div>'
            '<h3 style="margin:4px 0 0;font:800 22px Manrope,sans-serif;color:#0B2E40">' + title + '</h3>'
            '<p style="margin:0;font-size:19px;line-height:1.6;color:#2F4652;flex:1">' + text + '</p>'
            '<div style="margin-top:6px;padding-top:16px;border-top:1px dashed #D7DFE2;display:flex;flex-direction:column;gap:10px">' + cap('On the listing')
            + '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px">' + demo + '</div></div></div>'
            for n, (title, icon, text, demo) in enumerate(facts))
        style = ('<style>.tcf-fact{transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}'
                 '.tcf-fact::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:#95AB3B;transform:scaleX(0);transform-origin:left;transition:transform .25s ease}'
                 '.tcf-fact:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(11,46,64,.10);border-color:#C9D58F!important}.tcf-fact:hover::before{transform:scaleX(1)}</style>')
        body = body[:i] + style + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px">' + cards + '</div>' + body[j:]
    # Mid-page call to action on the method page: send readers to the school directory.
    if name == 'How We Compare Providers':
        arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>'
        btn = 'display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 19px Manrope,sans-serif;border-radius:999px;white-space:nowrap;text-decoration:none;cursor:pointer;transition:background .15s,border-color .15s,color .15s;line-height:1.2;padding:14px 28px;'
        cta_html = ('<div class="tcf-cta" style="background:#0B2E40;padding:64px 56px;color:#fff"><div style="max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:28px 48px">'
            '<div style="flex:1 1 520px;display:flex;flex-direction:column;gap:12px">'
            '<div style="display:flex;align-items:center;gap:12px;font:700 17px Manrope,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#AEC25A"><span style="width:28px;height:2px;background:#95AB3B"></span>Find your course</div>'
            '<h2 style="margin:0;font:300 44px/1.1 \'Source Serif 4\',Georgia,serif;text-wrap:balance">Search our directory of CTEC-approved schools</h2>'
            '<p style="margin:0;font-size:20px;line-height:1.6;color:rgba(255,255,255,.78);max-width:640px">See every provider side by side: prices, current coupons, course format and support. Then go straight to the school&#8217;s course page.</p></div>'
            '<div style="display:flex;flex-wrap:wrap;gap:12px;flex:0 1 auto">'
            '<a href="/#find-schools" style="' + btn + 'background:#95AB3B;color:#fff;border:1.5px solid #95AB3B" data-hv="4">Search the school directory' + arrow + '</a>'
            '<a href="/ctec-20-hour-course/" style="' + btn + 'background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.45)" data-hv="5">20 Hour CTEC Courses</a>'
            '<a href="/ctec-60-hour-course/" style="' + btn + 'background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.45)" data-hv="5">60 Hour CTEC Courses</a>'
            '</div></div></div>')
        anchor = '<div style="background:#fff;padding:72px 56px">'
        assert body.count(anchor) >= 1, 'compare page section not found'
        body = body.replace(anchor, cta_html + anchor, 1)
    # Directory rows: give the "View course" button its own room on desktop (it overflowed into the offer column)
    # and present a sale like a coupon: badge + small caps label. Mobile rules key off the inline grid string, so it stays.
    old_sale = '<div style="font-weight:700">On sale</div><div style="color:#8A9AA3;font-size:19px;margin-top:2px">No code needed</div>'
    if old_sale in body:
        tag = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle></svg>'
        body = body.replace(old_sale, '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">'
            '<span style="display:inline-flex;align-items:center;gap:6px;font:700 16px/1 Manrope,sans-serif;color:#5E6F22;background:#F3F5E6;border:1px solid #C9D58F;border-radius:999px;padding:6px 12px;white-space:nowrap">' + tag + 'On sale</span>'
            '<span style="font:700 13px Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8A9AA3;white-space:nowrap">No code needed</span></div>')
        grid = 'grid-template-columns:56px minmax(0,1fr) 200px 180px 120px'
        sel = '.tcf-scope [style*="' + grid + '"]'
        body = ('<style>'
                '@media (min-width:1101px){' + sel + '{grid-template-columns:56px minmax(0,1fr) 190px 200px auto!important}}'
                '@media (min-width:761px) and (max-width:1100px){' + sel + '{grid-template-columns:48px minmax(0,1fr) 130px 150px auto!important;gap:18px!important;padding-left:20px!important;padding-right:20px!important}'
                + sel + '>*:last-child a{padding:12px 18px!important;font-size:17px!important}}'
                '@media (max-width:760px){' + sel + '>*:last-child a{padding:12px 22px!important;font-size:17px!important}}'
                '</style>') + body
    # Coupon codes are click-to-copy (handled in tcf-runtime.js).
    body = re.sub(r'<span style="display:inline-block;border:1.5px dashed #95AB3B;([^"]*)">\{\{ ([\w.]+) \}\}</span>',
                  lambda m: '<span data-tcf-copy="{{ %s }}" role="button" tabindex="0" title="Click to copy code" style="cursor:pointer;display:inline-block;border:1.5px dashed #95AB3B;%s">{{ %s }}</span>' % (m.group(2), m.group(1), m.group(2)), body)
    body = re.sub(r'<span (style="[^"]*")>\{\{ ([\w.]*couponLabel) \}\}</span>', r'<span data-tcf-copy-label="" \1>{{ \2 }}</span>', body)
    # Directory rows: logo box sits beside the school name; domain under the name; feature pills run full width below.
    logo_start = '<div style="width:56px;height:56px;border:1px solid #E3E9EB;border-radius:8px;background:#fff;display:grid;place-items:center;overflow:hidden">'
    if logo_start in body and 'tcf-rowhead' not in body:
        i = body.index(logo_start); j = body.index('</sc-if></div>', i) + len('</sc-if></div>')
        logo = body[i:j].replace(logo_start, logo_start.replace('<div style="', '<div style="flex:none;'), 1)
        k = body.index('<div style="min-width:0">', j); pills_at = body.index('<sc-if value="{{ p.hasPills }}">', k)
        end = body.index('</ul></sc-if></div>', pills_at) + len('</ul></sc-if></div>')
        title = body[k + len('<div style="min-width:0">'):pills_at]
        pills = body[pills_at:end - len('</div>')].replace('margin:10px 0 0;', 'margin:14px 0 0;', 1)
        head = ('<div class="tcf-rowhead" style="grid-column:1 / span 2;min-width:0"><div style="display:flex;align-items:center;gap:16px;min-width:0">'
                + logo + '<div style="min-width:0">' + title + '</div></div></div>')
        body = body[:i] + head + body[end:]
        # Feature pills: a full-width footer under a divider, grouped by category.
        pill = '<span style="font:600 13px/1 Manrope,sans-serif;padding:5px 10px;border-radius:999px;border:1px solid #D7DFE2;background:#fff;color:#2F4652;white-space:nowrap">{{ f.label }}</span>'
        foot = ('<sc-if value="{{ p.hasPills }}"><div class="tcf-rowfoot" aria-label="Course features" style="grid-column:1 / -1;border-top:1px solid #E3E9EB;padding-top:16px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 30px">'
                '<sc-for list="{{ p.pillGroups }}" as="g"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">'
                '<span style="font:700 12px Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8A9AA3;margin-right:4px">{{ g.label }}</span>'
                '<sc-for list="{{ g.items }}" as="f">' + pill + '</sc-for></div></sc-for></div></sc-if>')
        close = '\n        </div>\n      </sc-for>'
        c = body.index(close, i)
        body = body[:c] + foot + body[c:]
        g = '.tcf-scope.tcf-scope:not(.tcf-mobile) [style*="grid-template-columns:56px minmax(0,1fr) 200px 180px 120px"]'
        body = ('<style>@media (max-width:760px){' + g + '>.tcf-rowhead{width:auto!important;height:auto!important;grid-column:1 / -1!important}'
                + g + '>*:not(.tcf-rowhead){grid-column:1 / -1!important}' + g + ' .tcf-rowhead>div>div:first-child{width:44px!important;height:44px!important}' + g + '>.tcf-rowfoot{flex-direction:column;align-items:flex-start!important;gap:10px!important}}</style>') + body
    # Primary keywords in the course-page H1s.
    h1 = {
        'CTEC 20 Hour Course': ('20-Hour CE</span> course before you renew.', '20 Hour CTEC Course</span> before you renew.'),
        'CTEC 60 Hour Course': ('60-Hour QE</span> course before you enroll.', '60 Hour CTEC Course</span> before you enroll.'),
    }.get(name)
    if name == 'TaxCourse Finder Home':
        # Exact target keywords in the home course cards (headings + copy), wording unchanged otherwise.
        for old, new in [('CTEC 20-Hour <span style="font-weight:800">CE Course</span>', '20 Hour <span style="font-weight:800">CTEC Course</span>'),
                         ('CTEC 60-Hour <span style="font-weight:800">QE Course</span>', '60 Hour <span style="font-weight:800">CTEC Course</span>'),
                         ('Compare every approved 20-hour course', 'Compare every approved 20 hour CTEC course'),
                         ('The 60-hour qualifying education course is required', 'The 60 hour CTEC course (qualifying education) is required')]:
            assert old in body, old
            body = body.replace(old, new, 1)
        # block-level spans inside the H1 need real spaces for text-only readers (crawlers, AI tools)
        body = body.replace('Compare every<span', 'Compare every <span', 1).replace('</span>before you enroll.', '</span> before you enroll.', 1)
    if h1:
        assert h1[0] in body, name
        body = body.replace(h1[0], h1[1], 1)
    return body

def code_for(d):
    c = d['code']
    # School pages: link a provider only when its page is live (school_url comes from the provider feed).
    c, n = re.subn(r"schoolUrl: 'School Page\.dc\.html\?provider=' \+ encodeURIComponent\(p\.id\) \+ '&course=' \+ (\([^()]*\)|'[^']*'),",
                   r"schoolUrl: p.schoolUrl ? p.schoolUrl + '?course=' + \1 : '', hasSchool: !!p.schoolUrl, noSchool: !p.schoolUrl,", c)
    assert 'School Page.dc.html' not in c, 'unhandled school link'
    c = c.replace("await import('./providers.js')", 'await TCF.data()')
    c = c.replace("'Progress Tracking', ", '')  # not offered as a feature anywhere on the site
    c = c.replace("'Practice Exams', ", '')  # no study-feature options on the site
    c = c.replace("'Published package price'", "'Course bundle price'")
    # FAQ page: answer the "best CTEC course" question (also in faqs-ld.json).
    c = c.replace("{ eyebrow: 'Using this site', title: 'Comparing providers', items: [",
                  "{ eyebrow: 'Using this site', title: 'Comparing providers', items: [\n        { q: 'What is the best CTEC course?', a: 'The best CTEC course is the one that fits how you learn and what you need: the price, whether you want self-paced online study or live classes, a printed book, PDF or online videos, the support available, and how quickly the school reports your hours to CTEC. Tax Course Finder lists every CTEC-approved provider side by side so you can filter by those features, compare current prices and coupon codes, and go straight to the school’s course page to enroll.' },")
    # no device-access options (mobile / desktop) on the site
    c = c.replace(", 'mobile_friendly']", ']').replace("['mobile_friendly', 'Mobile friendly'], ", '').replace("'Mobile-Friendly Course', 'Dedicated Mobile App', ", '')
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
# Drop the California / Federal jurisdiction dropdown next to the logo (site covers California only).
def drop_block(h, start):
    i = h.index(start); depth = 0; j = i
    for m in re.finditer(r'<(/?)div\b', h[i:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            j = i + m.end(); j = h.index('>', j) + 1; break
    return h[:i] + h[j:]
hdr = drop_block(hdr, '<div class="dd" tabindex="0"')
assert 'Jurisdiction' not in hdr and 'Coming soon' not in hdr
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
# Menu links for guides that exist only on WordPress (not in the design files).
EXTRA_GUIDES = [('/ctec-live-scan-background-check/', 'CTEC Live Scan Background Check', 'Live Scan Background Check'),
                ('/ctec-experience-in-lieu-15-hour-course/', 'Experience in Lieu (15-Hour)', 'Experience in Lieu')]
m = re.search(r'<a href="/how-to-renew-ctec-registration/"[^>]*>[^<]*</a>', hdr)
assert m, 'renew link missing in header'
hdr = hdr.replace(m.group(0), m.group(0) + ''.join(re.sub(r'href="[^"]*"', 'href="%s"' % u, m.group(0)).replace('>' + re.sub('<[^>]+>', '', m.group(0)) + '<', '>' + t + '<') for u, t, _ in EXTRA_GUIDES), 1)
m = re.search(r'<a href="/how-to-renew-ctec-registration/"[^>]*>[^<]*</a>', ftr)
assert m, 'renew link missing in footer'
ftr = ftr.replace(m.group(0), m.group(0) + ''.join(re.sub(r'href="[^"]*"', 'href="%s"' % u, m.group(0)).replace('>' + re.sub('<[^>]+>', '', m.group(0)) + '<', '>' + t + '<') for u, _, t in EXTRA_GUIDES), 1)
json.dump({'header': hdr, 'footer': ftr}, open(OUT + '/hf.json', 'w'), indent=1)
print('ok')
