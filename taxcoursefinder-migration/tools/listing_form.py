"""Provider listing form (provider-application page): only the fields the directory shows and filters on.
Submissions go to the plugin's review queue (admin-ajax action tcfd_listing_submit) and are applied to the listing from there."""
import html as H
e = H.escape

FEATURES = [  # same groups, keys and labels as the directory filters (TCFD_Fields::FEATURES, public groups)
    ('features', 'Format & materials', 'Shown under \u201cHow will I learn?\u201d on your school page. Tick everything your course includes. These match the filters students use in the directory.', [
        ('Delivery / Format', [('online_course_available', 'Online Course'), ('in_person_course_available', 'In-Person Course'), ('live_instruction_available', 'Live Instruction')]),
        ('Course Materials', [('physical_book_available', 'Physical Book'), ('digital_book_available', 'PDF'), ('downloadable_materials', 'Downloadable Materials'), ('video_lessons_available', 'Online Videos')]),
        ('Learning Format', [('text_based_course_available', 'Text-Based Course'), ('audio_content_available', 'Audio Content')]),
    ]),
    ('support', 'Student support', 'Shown under \u201cCan I get help?\u201d on your school page. Tick how students can reach you and add the details.', [
        ('Support', [('phone_support', 'Phone Support'), ('email_support', 'Email Support'), ('live_chat_support', 'Live Chat Support')]),
    ]),
]
REPORTING = [('same_day', 'Same day'), ('24h', 'Within 24 hours'), ('next_day', 'Next business day'), ('1_2_days', '1–2 business days'),
             ('3_5_days', '3–5 business days'), ('weekly', 'Weekly'), ('longer', 'More than a week')]
SECTIONS = [('school', 'School & contact'), ('courses', 'Courses & prices'), ('features', 'Format & materials'),
            ('reporting', 'Reporting to CTEC'), ('coupon', 'Current coupons'), ('logo', 'Logo'), ('confirm', 'Confirm & submit')]
PROFILE_SECTIONS = [('school', 'Your school'), ('profile', 'About your school'), ('options', 'Packages & exams'), ('support', 'Student support'), ('confirm', 'Confirm & submit')]

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


def area(label, name, placeholder='', hint='', rows=4):
    sub = '<span style="font:400 17px \'Source Sans 3\',sans-serif;color:#5A6E78">%s</span>' % e(hint) if hint else ''
    return ('<label style="%s"><span>%s</span>%s<textarea name="%s" rows="%d" placeholder="%s" style="border:1px solid #D7DFE2;border-radius:8px;padding:10px 14px;font:400 19px/1.5 \'Source Sans 3\',sans-serif;color:#0B2E40;resize:vertical"></textarea></label>'
            % (LABEL, e(label), sub, name, rows, e(placeholder)))


def check(name, value, label, big=False):
    return '<label style="%s"><input type="checkbox" name="%s" value="%s" style="%s">%s</label>' % (
        CHECK + (';font-weight:700' if big else ''), name, e(value), BOX, e(label))


def card(sid, n, title, inner):
    return '<div id="%s" style="%s">%s%s</div>' % (sid, CARD, head(n, title), inner)


SUBMIT = ('<div data-tcf-listing-status="" role="alert" style="display:none;border-radius:10px;padding:14px 16px;font:700 19px Manrope,sans-serif"></div>'
          '<button type="submit" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 19px Manrope,sans-serif;border-radius:999px;white-space:nowrap;cursor:pointer;line-height:1.2;background:#95AB3B;color:#fff;padding:14px 28px;border:1.5px solid #95AB3B;align-self:flex-start" data-hv="4">%s</button>')
CONFIRM = '<label style="%s"><input type="checkbox" name="confirm" value="1" required="" style="%s">I am authorized to submit these details for this school, and they are accurate to the best of my knowledge.</label>' % (CHECK, BOX)
COURSES = (('ce', '20-Hour CE course (renewal)'), ('qe', '60-Hour QE course (new preparers)'))
IMG = '<label style="%s">%s<span style="font:400 17px \'Source Sans 3\',sans-serif;color:#5A6E78">%s</span><input type="file" name="%s"%s accept="image/png,image/jpeg,image/webp" style="font-size:18px"></label>'


def boxes(groups):
    return ''.join('<div style="display:flex;flex-direction:column;gap:10px"><div style="%s">%s</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">%s</div></div>'
                   % (GRP, e(g), ''.join(check('features[]', k, l) for k, l in items)) for g, items in groups)


def start():
    return ['<form data-tcf-listing-form="" novalidate="" style="display:flex;flex-direction:column;gap:24px">',
            '<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label>Leave empty<input name="company_fax" tabindex="-1" autocomplete="off"></label></div>']


def form():
    """Short verify form: only what the directory table shows (name, link, price, format, reporting, coupon, logo)."""
    out = start()
    out.append(card('school', 1, 'School & contact',
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
        + field('School name', 'school_name', required=True) + field('Website', 'website', 'url', placeholder='https://')
        + field('CTEC provider number', 'ctec_number', placeholder='e.g. 6258') + field('Your name', 'contact_name', required=True)
        + field('Email address', 'contact_email', 'email', required=True) + '</div>'
        + '<p style="%s">Your contact details are only used to confirm the listing with you. They are not published.</p>' % HINT))
    courses = ''.join('<div style="border:1px solid #E3E9EB;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px">'
                      + check(c + '_offered', '1', 'We offer the ' + name, big=True)
                      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
                      + field('Price ($)', c + '_price', placeholder='e.g. 69.95') + field('Regular price ($)', c + '_regular', placeholder='Only if on sale')
                      + '</div>' + field('Course page URL', c + '_url', 'url', placeholder='https://', hint='Where the View Course button sends students.') + '</div>'
                      for c, name in COURSES)
    out.append(card('courses', 2, 'Courses & prices', '<p style="%s">Tick each course you offer.</p>' % HINT + courses))
    out.append(card('features', 3, 'Format & materials', '<p style="%s">Tick everything your course includes.</p>' % HINT + boxes([g for g in FEATURES[0][3] if g[0] != 'Learning Format'])))
    out.append(card('reporting', 4, 'Reporting to CTEC',
        '<label style="%s">How quickly are completions reported to CTEC?<select name="reporting" style="%s"><option value="">Select</option>%s</select></label>'
        % (LABEL, INPUT, ''.join('<option value="%s">%s</option>' % (k, e(l)) for k, l in REPORTING))))
    out.append(card('coupon', 5, 'Current coupons (optional)',
        '<p style="%s">Running a coupon code now? Add it here.</p>' % HINT
        + ''.join('<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">' + field(name.split(' (')[0] + ' coupon code', c + '_coupon_code', placeholder='e.g. SAVE10')
                  + field('What it gives', c + '_coupon_details', placeholder='e.g. 10% off') + '</div>' for c, name in COURSES)))
    out.append(card('logo', 6, 'Logo (optional)', IMG % (LABEL, 'School logo', 'PNG, JPG or WebP, up to 5 MB. A transparent background works best.', 'logo', '')
        + '<label style="%s"><input type="checkbox" name="logo_ok" value="1" style="%s">I give Tax Course Finder permission to show our school&rsquo;s logo on our directory listing and school profile page so students can identify our school.</label>' % (CHECK, BOX)))
    out.append(card('confirm', 7, 'Confirm & submit', CONFIRM
        + '<p style="%s">We review every submission before it changes your listing. Listing your school is free. Want a full school page too? <a href="/create-your-school-profile/" style="color:#7E9330;text-decoration:underline;font-weight:700">Create your school profile page</a>.</p>' % HINT
        + SUBMIT % 'Submit listing details'))
    out.append('</form>')
    return ''.join(out)


def profile_form():
    """Longer, optional form: everything the school's profile page shows beyond the directory listing."""
    out = start()
    out.append('<input type="hidden" name="part" value="profile">')
    out.append(card('school', 1, 'Your school',
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
        + field('School name', 'school_name', required=True) + field('CTEC provider number', 'ctec_number', placeholder='e.g. 6258')
        + field('Your name', 'contact_name', required=True) + field('Email address', 'contact_email', 'email', required=True) + '</div>'
        + '<p style="%s">Used to match this to your listing. Your contact details are not published.</p>' % HINT))
    out.append(card('profile', 2, 'About your school',
        area('Short intro', 'intro', 'One or two sentences about your school. Shown under your school name.', rows=3)
        + area('About your school', 'about', 'Who you are, how long you have taught tax courses, and what makes your courses different.', rows=5)
        + IMG % (LABEL, 'School photo (optional)', 'Shown next to your About section. PNG, JPG or WebP, up to 5 MB.', 'photo', '')
        + IMG % (LABEL, 'Course screenshots (optional, up to 3)', 'Shown under &ldquo;How will I learn?&rdquo;. PNG, JPG or WebP, up to 5 MB each.', 'screenshots[]', ' multiple=""')))
    opts = ''
    for c, name in COURSES:
        opts += ('<div style="border:1px solid #E3E9EB;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px"><div style="%s">%s</div>' % (GRP, e(name))
                 + '<p style="%s">Sell this course more than one way (for example video only, or video + printed book)? List each option and its price.</p>' % HINT
                 + ''.join('<div class="tcf-optrow" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr);gap:10px">'
                           '<input type="text" name="%s_opt%d_label" placeholder="%s" aria-label="Option %d name" style="%s">'
                           '<input type="text" name="%s_opt%d_price" placeholder="Price ($)" aria-label="Option %d price" style="%s">'
                           '<input type="text" name="%s_opt%d_regular" placeholder="Regular (if on sale)" aria-label="Option %d regular price" style="%s"></div>'
                           % (c, i, ['e.g. Online video course', 'e.g. Video + printed book', 'e.g. Printed book only'][i - 1], i, INPUT, c, i, i, INPUT, c, i, i, INPUT) for i in (1, 2, 3))
                 + '<label style="%s"><span>Unlimited exam attempts?</span><select name="%s_attempts" style="%s"><option value="">Select</option><option value="Unlimited">Yes</option><option value="Limited">No</option></select></label>' % (LABEL, c, INPUT)
                 + '</div>')
    out.append(card('options', 3, 'Packages & exams', '<p style="%s">Fill in the course(s) you offer. Leave the other one empty.</p>' % HINT + opts))
    out.append(card('support', 4, 'Student support',
        '<p style="%s">How students can reach you. Shown under &ldquo;Can I get help?&rdquo;.</p>' % HINT + boxes(FEATURES[1][3])
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">'
        + field('Student support phone', 'phone', 'tel') + field('Student support email', 'support_email', 'email')
        + field('Support hours', 'hours', placeholder='e.g. Mon–Fri 8am–5pm Pacific') + '</div>'))
    out.append(card('confirm', 5, 'Confirm & submit', CONFIRM
        + '<p style="%s">We review every submission. Once approved, your school profile page goes live.</p>' % HINT
        + SUBMIT % 'Submit profile page details'))
    out.append('</form>')
    return ''.join(out)


def sections_js(secs=None):
    return "[" + ", ".join("['%s', '%s']" % (i, l.replace("'", "\\'")) for i, l in (secs or SECTIONS)) + "]"
