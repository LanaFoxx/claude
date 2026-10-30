"""Provider listing form (provider-application page): only the fields the directory shows and filters on.
Submissions go to the plugin's review queue (admin-ajax action tcfd_listing_submit) and are applied to the listing from there."""
import html as H
e = H.escape

FEATURES = [  # same groups, keys and labels as the directory filters (TCFD_Fields::FEATURES, public groups)
    ('features', 'Format & materials', 'Tick everything your course includes. These match the filters students use in the directory.', [
        ('Delivery / Format', [('online_course_available', 'Online Course'), ('in_person_course_available', 'In-Person Course'), ('live_instruction_available', 'Live Instruction')]),
        ('Course Materials', [('physical_book_available', 'Physical Book'), ('digital_book_available', 'PDF'), ('downloadable_materials', 'Downloadable Materials'), ('video_lessons_available', 'Online Videos')]),
        ('Learning Format', [('text_based_course_available', 'Text-Based Course'), ('audio_content_available', 'Audio Content')]),
    ]),
    ('support', 'Student support', 'How students can reach you.', [
        ('Support', [('phone_support', 'Phone Support'), ('email_support', 'Email Support'), ('live_chat_support', 'Live Chat Support')]),
    ]),
]
REPORTING = [('same_day', 'Same day'), ('24h', 'Within 24 hours'), ('next_day', 'Next business day'), ('1_2_days', '1–2 business days'),
             ('3_5_days', '3–5 business days'), ('weekly', 'Weekly'), ('longer', 'More than a week')]
SECTIONS = [('school', 'School & contact'), ('courses', 'Courses & prices'), ('features', 'Format & materials'), ('support', 'Student support'),
            ('reporting', 'Reporting to CTEC'), ('coupon', 'Current coupon'), ('logo', 'Logo'), ('confirm', 'Confirm & submit')]

CARD = 'background:#fff;border:1px solid #D7DFE2;border-radius:16px;padding:36px;display:flex;flex-direction:column;gap:22px;scroll-margin-top:calc(var(--tcf-head,108px) + 50px);box-shadow:0 2px 8px rgba(11,46,64,.06)'
LABEL = 'display:flex;flex-direction:column;gap:6px;font:700 19px Manrope,sans-serif'
INPUT = 'height:44px;border:1px solid #D7DFE2;border-radius:8px;padding:0 14px;font-size:20px;color:#0B2E40;background:#fff'
HINT = 'margin:0;font-size:19px;line-height:1.5;color:#5A6E78'
CHECK = 'display:flex;gap:12px;align-items:center;font-size:20px;line-height:1.4;color:#2F4652;padding:12px 14px;border:1px solid #E3E9EB;border-radius:8px;background:#F9FBFD;cursor:pointer'
BOX = 'width:18px;height:18px;accent-color:#7E9330;margin:0;flex:none'
GRP = 'font:700 15px Manrope,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5A6E78'


def head(n, title):
    return ('<div style="display:flex;gap:14px;align-items:center"><span style="width:36px;height:36px;border-radius:10px;background:#0B2E40;color:#fff;display:grid;place-items:center;font:800 22px Manrope,sans-serif">%d</span>'
            '<h2 style="margin:0;font:300 26px \'Source Serif 4\',Georgia,serif;">%s</h2></div>' % (n, e(title)))


def field(label, name, kind='text', required=False, placeholder='', hint=''):
    req = ' required=""' if required else ''
    ph = ' placeholder="%s"' % e(placeholder) if placeholder else ''
    star = ' <span style="color:#7E9330">*</span>' if required else ''
    sub = '<span style="font:400 17px \'Source Sans 3\',sans-serif;color:#5A6E78">%s</span>' % e(hint) if hint else ''
    return '<label style="%s"><span>%s%s</span>%s<input type="%s" name="%s"%s%s style="%s"></label>' % (LABEL, e(label), star, sub, kind, name, req, ph, INPUT)


def check(name, value, label, big=False):
    return '<label style="%s"><input type="checkbox" name="%s" value="%s" style="%s">%s</label>' % (
        CHECK + (';font-weight:700' if big else ''), name, e(value), BOX, e(label))


def card(sid, n, title, inner):
    return '<div id="%s" style="%s">%s%s</div>' % (sid, CARD, head(n, title), inner)


def form():
    out = ['<form data-tcf-listing-form="" novalidate="" style="display:flex;flex-direction:column;gap:24px">',
           '<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label>Leave empty<input name="company_fax" tabindex="-1" autocomplete="off"></label></div>']
    out.append(card('school', 1, 'School & contact',
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
        + field('School name', 'school_name', required=True) + field('Website', 'website', 'url', placeholder='https://')
        + field('CTEC provider number', 'ctec_number', placeholder='e.g. 6258') + field('Your name', 'contact_name', required=True)
        + field('Email address', 'contact_email', 'email', required=True) + field('Phone (optional)', 'contact_phone', 'tel')
        + '</div><p style="%s">Your contact details are only used to confirm the listing with you. They are not published.</p>' % HINT))
    courses = ''
    for c, name in (('ce', '20-Hour CE course (renewal)'), ('qe', '60-Hour QE course (new preparers)')):
        courses += ('<div style="border:1px solid #E3E9EB;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">'
                    + check(c + '_offered', '1', 'We offer the ' + name, big=True)
                    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
                    + field('Course bundle price ($)', c + '_price', placeholder='e.g. 69.95', hint='The price for the complete course.')
                    + field('Regular price ($)', c + '_regular', placeholder='If on sale', hint='Leave empty unless on sale.')
                    + '</div>' + field('Course page URL', c + '_url', 'url', placeholder='https://') + '</div>')
    out.append(card('courses', 2, 'Courses & prices', '<p style="%s">Tick each course you offer and add its price and the page where students enroll.</p>' % HINT + courses))
    n = 3
    for sid, title, hint, groups in FEATURES:
        inner = '<p style="%s">%s</p>' % (HINT, e(hint))
        for g, items in groups:
            inner += ('<div style="display:flex;flex-direction:column;gap:10px"><div style="%s">%s</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">%s</div></div>'
                      % (GRP, e(g), ''.join(check('features[]', k, l) for k, l in items)))
        out.append(card(sid, n, title, inner)); n += 1
    out.append(card('reporting', n, 'Reporting to CTEC',
        '<label style="%s">How quickly are completions reported to CTEC?<select name="reporting" style="%s"><option value="">Select</option>%s</select></label>'
        % (LABEL, INPUT, ''.join('<option value="%s">%s</option>' % (k, e(l)) for k, l in REPORTING)))); n += 1
    out.append(card('coupon', n, 'Current coupon (optional)',
        '<p style="%s">Have a coupon code or sale running now? It will show on your listing once confirmed.</p>' % HINT
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
        + field('Coupon code', 'coupon_code', placeholder='e.g. SAVE10') + field('What it gives', 'coupon_details', placeholder='e.g. 10% off the course')
        + '<label style="%s">Applies to<select name="coupon_scope" style="%s"><option value="both">Both courses</option><option value="ce">20-Hour CE</option><option value="qe">60-Hour QE</option></select></label>' % (LABEL, INPUT)
        + field('Expires (optional)', 'coupon_expires', 'date') + '</div>')); n += 1
    out.append(card('logo', n, 'Logo',
        '<label style="%s">School logo<span style="font:400 17px \'Source Sans 3\',sans-serif;color:#5A6E78">PNG, JPG or WebP, up to 5 MB. A transparent background works best.</span>'
        '<input type="file" name="logo" accept="image/png,image/jpeg,image/webp" style="font-size:18px"></label>' % LABEL)); n += 1
    out.append(card('confirm', n, 'Confirm & submit',
        '<label style="%s"><input type="checkbox" name="confirm" value="1" required="" style="%s">I am authorized to submit these details for this school, and they are accurate to the best of my knowledge.</label>' % (CHECK, BOX)
        + '<p style="%s">We review every submission before it changes your listing. Listing your school is free.</p>' % HINT
        + '<div data-tcf-listing-status="" role="alert" style="display:none;border-radius:10px;padding:14px 16px;font:700 19px Manrope,sans-serif"></div>'
        + '<button type="submit" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 19px Manrope,sans-serif;border-radius:999px;white-space:nowrap;cursor:pointer;line-height:1.2;background:#95AB3B;color:#fff;padding:14px 28px;border:1.5px solid #95AB3B;align-self:flex-start" data-hv="4">Submit listing details</button>'))
    out.append('</form>')
    return ''.join(out)


def sections_js():
    return "[" + ", ".join("['%s', '%s']" % (i, l.replace("'", "\\'")) for i, l in SECTIONS) + "]"
