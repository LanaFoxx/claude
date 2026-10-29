"""Builds the Brian Apple site as Elementor data and saves it to WordPress."""
import json, hashlib, sys, os, itertools
sys.path.insert(0, os.path.dirname(__file__))
import wp

D = os.path.dirname(__file__)
MEDIA = json.load(open(f'{D}/media.json'))
PAGES = json.load(open(f'{D}/pages.json'))
EMAIL = 'brian@brianapple.com'
IAPD = 'https://adviserinfo.sec.gov/firm/summary/343048'

_seq = itertools.count()
_ns = 'x'
def eid():
    return hashlib.md5(f'{_ns}-{next(_seq)}'.encode()).hexdigest()[:7]

def url(k):
    return PAGES[k]['url']

def link(u, ext=False):
    return {'url': u, 'is_external': 'on' if ext else '', 'nofollow': '', 'custom_attributes': ''}

# ---------- element helpers ----------
def C(cls, *children, tag=None, **extra):
    s = {'content_width': 'full', 'css_classes': ('ba ' + cls).strip()}
    if tag: s['html_tag'] = tag
    s.update(extra)
    return {'id': eid(), 'elType': 'container', 'isInner': False, 'settings': s, 'elements': list(children)}

def W(widget, cls, **settings):
    settings['_css_classes'] = cls
    return {'id': eid(), 'elType': 'widget', 'widgetType': widget, 'settings': settings, 'elements': []}

def H(text, cls='ba-h2', tag='h2'):
    return W('heading', cls, title=text, header_size=tag)

def T(html, cls='ba-text'):
    return W('text-editor', cls, editor=html)

def B(text, u, cls='ba-btn', ext=False):
    return W('button', cls, text=text, link=link(u, ext))

def X(html, cls=''):
    return W('html', cls, html=html)

def IMG(key, cls=''):
    m = MEDIA[key]
    return W('image', cls, image={'id': m['id'], 'url': m['url']}, image_size='full')

def FORM(name, fields, button, cls, success):
    ff = []
    for f in fields:
        d = {'_id': eid(), 'custom_id': f['id'], 'field_type': f['type'], 'field_label': f.get('label', ''),
             'placeholder': f.get('placeholder', ''), 'required': 'true' if f.get('required') else '', 'width': '100'}
        if f['type'] == 'acceptance':
            d['acceptance_text'] = f['text']
        if f['type'] == 'textarea':
            d['rows'] = 5
        ff.append(d)
    return W('form', 'ba-form ' + cls, form_name=name, form_fields=ff, show_labels=fields[0].get('show_labels', ''),
             mark_required='', button_text=button, button_width='100',
             submit_actions=['save-to-database', 'email'],
             email_subject=f'New {name} submission — Brian Apple Retirement Planning',
             email_content='[all-fields]', success_message=success,
             custom_messages='yes',
             error_message='Something went wrong. Please try again or email ' + EMAIL + '.',
             required_field_message='This field is required.',
             invalid_message='Please enter a valid email address.')

# ---------- shared bits ----------
def logo_html(white=False):
    m = MEDIA['brian-apple-mark-white.png' if white else 'brian-apple-mark.png']
    return (f'<a href="{url("home")}" aria-label="Brian Apple Retirement Planning — home">'
            f'<img src="{m["url"]}" alt="Brian Apple mark" width="46" height="52">'
            '<span class="ba-logo-txt"><span class="ba-logo-name">BRIAN APPLE</span>'
            '<span class="ba-logo-sub">Retirement Planning</span></span></a>')

DISCLOSURE_1 = ('Additional information about Brian Apple Retirement Planning CRD#343048 and its representatives is available '
                'online on the SEC’s Investment Adviser Public Disclosure (IAPD) database. Direct link here: '
                f'<a href="{IAPD}" target="_blank" rel="noopener">IAPD Website</a>.')
DISCLOSURE_2 = ('Brian Apple Retirement Planning LLC is a registered investment adviser in the state of North Carolina. The adviser '
                'may transact business in states where it is appropriately registered, or where it is excluded or exempted from '
                'registration. Information presented is for educational purposes only and is not an offer or solicitation for the '
                'sale or purchase of any securities or investment advisory services. Investments involve risk and are not '
                'guaranteed. Be sure to consult with a qualified financial adviser or a tax professional before implementing any '
                'strategy discussed herein.')
COPY = '© 2026 Brian Apple Retirement Planning LLC. All rights reserved.'

def book_form(cls='ba-form-inline'):
    return FORM('Audiobook Download', [
        {'id': 'email', 'type': 'email', 'placeholder': 'Email address', 'required': True, 'label': 'Email'},
        {'id': 'newsletter', 'type': 'acceptance', 'text': 'Also subscribe me to the newsletter for periodic educational insights.', 'label': 'Newsletter'},
    ], 'Download My Audiobook', cls,
        'Thank you! Your complimentary copy of the audiobook will be sent to your inbox shortly.')

def webinar_form(cls='ba-form-inline ba-form-navy ba-on-dark',
                 consent='Yes, I would like to receive notifications about upcoming webinars and periodic educational insights from Brian Apple Retirement Planning.'):
    return FORM('Webinar Updates', [
        {'id': 'email', 'type': 'email', 'placeholder': 'Email address', 'required': True, 'label': 'Email'},
        {'id': 'consent', 'type': 'acceptance', 'text': consent, 'required': True, 'label': 'Consent'},
    ], 'Get Webinar Updates', cls,
        'Thank you — you’re on the list. We’ll let you know about upcoming webinar dates.')

# ---------- header / footer ----------
def header():
    nav = W('nav-menu', 'ba-nav', menu='brian-apple-main', layout='horizontal', pointer='none',
            dropdown='tablet', toggle='burger', full_width='stretch', align_items='right')
    return [C('ba-header ba-sec',
              C('ba-wrap ba-header-in',
                X(logo_html(), 'ba-logo'),
                C('ba-header-nav', nav, B('Talk with Brian', url('contact'), 'ba-btn ba-btn-sm ba-header-cta'))),
              tag='div')]

def footer():
    pages = [('Home', 'home'), ('Services', 'services'), ('About Brian', 'about'), ('FAQs', 'faq'), ('Contact', 'contact'), ('Legal &amp; Compliance', 'legal')]
    links = '<ul>' + ''.join(f'<li><a href="{url(k)}">{t}</a></li>' for t, k in pages) + '</ul>'
    return [C('ba-footer ba-sec',
              C('ba-wrap ba-footer-cols',
                C('',
                  X(logo_html(white=True), 'ba-logo'),
                  T('<p>Fiduciary, tax-coordinated retirement planning — Social Security, withdrawals, and taxes working as one plan.</p>', 'ba-footer-blurb')),
                C('', T('<p>Pages</p>', 'ba-footer-label'), T(links, 'ba-footer-links')),
                C('ba-footer-get',
                  T('<p>Get in touch</p>', 'ba-footer-label'),
                  T(f'<p><a href="mailto:{EMAIL}">{EMAIL}</a></p>', 'ba-footer-mail'),
                  B('Talk with Brian →', url('contact'), 'ba-btn ba-btn-white'))),
              C('ba-wrap ba-footer-legal',
                X('<span class="ba-badge">Fiduciary</span>', ''),
                T(f'<p>{DISCLOSURE_1}</p><p>{DISCLOSURE_2}</p>', 'ba-disclosure')),
              C('ba-wrap ba-footer-bottom',
                T(f'<p>{COPY}</p>', 'ba-copy'),
                T(f'<p><a href="{url("legal")}">Legal &amp; Compliance</a></p>', 'ba-copy ba-copy-links')),
              tag='footer')]

# ---------- home ----------
ICONS = [
    '<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M10 5.5 h16 a2 2 0 0 1 2 2 v21 a2 2 0 0 1 -2 2 h-16 a2 2 0 0 1 -2 -2 v-21 a2 2 0 0 1 2 -2 Z" stroke="currentColor" stroke-width="1.5"/><path d="M14 3.5 h8 v4 h-8 Z" fill="#FFFFFF" stroke="currentColor" stroke-width="1.5"/><path d="M13 14.5 l3 3 l6 -6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 23 h10 M13 26.5 h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></svg>',
    '<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><circle cx="18" cy="18" r="13.5" stroke="currentColor" stroke-width="1.5"/><path d="M18 6.5 v3 M18 26.5 v3 M6.5 18 h3 M26.5 18 h3" stroke="currentColor" stroke-width="1.2" opacity=".6"/><path d="M22.5 13.5 L19.5 19.5 L13.5 22.5 L16.5 16.5 Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="18" cy="18" r="1.4" fill="currentColor"/></svg>',
    '<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="5.5" y="11.5" width="25" height="17" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 11.5 V9 a2 2 0 0 1 2 -2 h5 a2 2 0 0 1 2 2 v2.5" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 18.5 h25" stroke="currentColor" stroke-width="1.2" opacity=".6"/><rect x="15.5" y="16.5" width="5" height="4" rx="1" fill="#FFFFFF" stroke="currentColor" stroke-width="1.3"/></svg>',
]
ARROW = '<svg width="46" height="30" viewBox="0 0 46 30" fill="none"><path d="M2 15 h37 M31 5.5 L41 15 L31 24.5" stroke="#692427" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

def home():
    opts = [('One-Time Planning Project:', 'I will create a custom, comprehensive retirement plan tailored to your unique financial situation.'),
            ('Ongoing Advice (Advice-Only):', 'Work with me on a retainer basis for ongoing guidance, without the need to transfer your assets.'),
            ('Full-Service Management:', 'I manage your investment assets while providing integrated, ongoing retirement planning.')]
    opts_html = '<div class="ba-opts">' + ''.join(
        f'<div class="ba-opt"><span class="ba-opt-ico">{ICONS[i]}</span><p><strong>{a}</strong> {b}</p></div>'
        for i, (a, b) in enumerate(opts)) + '</div>'
    steps = [('Discovery Meeting', 'We’ll discuss your goals and concerns.'),
             ('Custom Plan Creation', 'We’ll create a personalized retirement plan tailored to your needs.'),
             ('Ongoing Support', 'We’ll meet regularly to adjust your plan and keep you on track.')]
    steps_html = '<div class="ba-steps">' + f'<div class="ba-step-arrow" aria-hidden="true">{ARROW}</div>'.join(
        f'<div class="ba-step"><div class="ba-step-num">{i+1}</div><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(steps)) + '</div>'
    cover = ('<div class="ba-cover" aria-hidden="true"><div class="ba-cover-in"><div class="ba-cover-by">Brian Apple, EA</div>'
             '<div class="ba-cover-rule"></div><div class="ba-cover-title">Coordinating Social Security Strategies</div>'
             '<div class="ba-cover-sp"></div><div class="ba-cover-sub">Insights on Social Security and tax strategies.</div></div></div>')
    qs = ['What are the tax implications of my retirement account withdrawals?',
          'When should I start taking Social Security benefits?',
          'What is the best way to invest my retirement savings?']
    return [
        C('ba-sec',
          C('ba-wrap ba-hero',
            C('ba-hero-intro',
              H('Strategic Retirement Planning for the Years That Matter Most.', 'ba-h1-hero', 'h1'),
              T('<p>You can work with me in one of the following three ways, depending on what best fits your situation:</p>', 'ba-text ba-text-lg')),
            C('ba-hero-media', IMG('couple-balcony-view.jpg', 'ba-framed ba-hero-img')),
            C('ba-hero-opts', X(opts_html), B('Talk with Brian', url('contact'), 'ba-btn')))),
        C('ba-sec ba-navy',
          C('ba-wrap ba-value',
            C('', H('My Value Proposition', 'ba-h2 ba-white'),
              T('<p>As a fiduciary, I bridge the gap between wealth management and tax-efficient retirement planning. I focus on comprehensive strategies to help investors coordinate their Social Security and withdrawal plans.</p>', 'ba-value-copy')),
            C('ba-qlist',
              T('<p>Questions we answer</p>', 'ba-eyebrow'),
              T('<ul><li>Do you have enough?</li><li>Which Social Security strategy should you use?</li><li>How can you keep taxes low?</li></ul>', '')))),
        C('ba-sec',
          C('ba-wrap ba-steps-sec',
            H('How It Works: My Simple 3-Step Process', 'ba-h2 ba-center'),
            X(steps_html))),
        C('ba-sec ba-gray e-no-lazyload',
          C('ba-wrap ba-book',
            C('ba-book-cover-w', X(cover)),
            C('ba-book-copy',
              H('Get Your Complimentary Copy of My Audiobook', 'ba-h2'),
              T('<p>Download my audiobook, <em>Coordinating Social Security Strategies</em>, to learn valuable insights on Social Security and tax strategies. Enter your email address below to receive your complimentary copy.</p>'),
              book_form())), _element_id='audiobook'),
        C('ba-sec',
          C('ba-wrap ba-faq-teaser',
            H('Common Questions I Answer', 'ba-h2 ba-center'),
            T('<ul>' + ''.join(f'<li><a href="{url("faq")}">{q}</a></li>' for q in qs) + '</ul>', 'ba-qrows'),
            B('Talk with Brian', url('contact'), 'ba-btn ba-mobile-only'))),
        C('ba-sec ba-gray2',
          C('ba-wrap ba-cta-sec',
            C('ba-cta',
              C('ba-cta-tag', T('<p>Ready when you are</p>', 'ba-eyebrow')),
              H('Let’s work together to build a retirement strategy and create a tax-efficient plan for your wealth.', 'ba-h2'),
              B('Talk with Brian', url('contact'), 'ba-btn')))),
        webinar_band(),
    ]

def webinar_band():
    return C('ba-sec ba-maroon-band',
             C('ba-wrap ba-webinar',
               C('ba-webinar-copy',
                 H('Stay Informed: Join My Retirement Strategy Webinars', 'ba-h2-sm'),
                 T('<p>Retirement planning is an evolving landscape. Each month, I host live, interactive webinars where I break down complex topics like Social Security and tax-efficient withdrawal strategies. Sign up to be the first to know about upcoming dates and exclusive educational content.</p>', 'ba-webinar-text')),
               C('ba-webinar-form', webinar_form())), _element_id='webinars')

# ---------- services ----------
def services():
    svcs = [('One-Time Planning Project',
             'I will create a custom, comprehensive retirement plan tailored to your unique financial situation. Through a series of personal interviews, I develop a customized roadmap addressing your specific goals and concerns.',
             'Determine the most appropriate Social Security strategy, create a flexible and tax-efficient withdrawal plan, and assess your property, life, and long-term care insurance coverage.',
             'A fixed fee ranging between $5,000 and $10,000, depending on the complexity of your individual circumstances.',
             'Schedule a One-Time Plan Consultation'),
            ('Ongoing Advice &amp; Consulting',
             'Work with me on a retainer basis for ongoing guidance, without the need to transfer your assets. This involves an ongoing relationship beyond simply creating an initial financial plan.',
             'I continuously monitor your financial situation to update your plan as needed. This service can cover assets not directly managed by my firm, such as employer-sponsored retirement plans (401ks) and personal brokerage accounts.',
             'Billed monthly at up to $800 for individuals and $1,000 for families.',
             'Explore Ongoing Advice'),
            ('Full-Service Wealth Management',
             'I manage your investment assets while providing integrated, ongoing retirement planning.',
             'I create a customized portfolio using a combination of model portfolios designed to manage volatility, help address inflation, and support long-term goals. I base my recommendations on risk tolerance, tax efficiency, and your personal preferences, utilizing Altruist LLC-generated portfolios and tax management tools.',
             'An annual management fee of 1.35%. I require a minimum account size of $750,000 (which may be waived at my discretion).',
             'Discuss Full-Service Management')]
    rows = [C('ba-svc',
              C('', H(t, 'ba-h2-sm'), T(f'<p>{intro}</p>', 'ba-svc-intro')),
              C('', T('<p>What I do</p>', 'ba-eyebrow'), T(f'<p>{what}</p>', 'ba-svc-what'),
                T(f'<p><strong>Fee:</strong> {fee}</p>', 'ba-svc-fee'), B(btn, url('contact'), 'ba-btn ba-btn-sm')))
            for t, intro, what, fee, btn in svcs]
    return [
        C('ba-sec ba-gray-head',
          C('ba-wrap ba-pagehead',
            H('How We Can Work Together', 'ba-h1 ba-center', 'h1'),
            T('<p>Strategic Retirement Planning for the Years That Matter Most.</p>', 'ba-lede'),
            T('<p>You can work with me in one of the following three ways, depending on what best fits your situation:</p>'))),
        C('ba-sec', C('ba-wrap ba-svc-list', *rows)),
    ]

# ---------- about ----------
def about():
    copy = ''.join(f'<p>{p}</p>' for p in [
        'You deserve to work with someone who understands the complexities of retirement planning.',
        'I experienced those complexities first hand when I unexpectedly lost both my father and my stepfather in 2018. I realized that I needed to master retirement planning to help my family navigate a financial landscape that was far more complex and dangerous than I had understood. I created my firm to ensure your retirement plan is unified across all areas, coordinated, and built to withstand the complexities of this new retirement era. My approach is rooted in my own experiences and a deep, fiduciary commitment to your success.',
        'When I’m not in the digital ‘office,’ you’ll find me on the water fishing and boating, serving with my church or Grace Ministries, or helping retirees with their taxes through AARP Tax Aide. My wife, Kristy, and our family keep me grounded and focused on the real ‘why’, protecting the people and passions that matter most.',
        'If you’re ready to take the next step in securing your retirement legacy, contact me today.'])
    cards = [('Education', ['M.S. in Personal Financial Planning, Kansas State University <span class="ba-dim">(Candidate, expected conferral December 2026)</span>',
                            'Finance ’98, University of North Carolina Wilmington (UNCW)']),
             ('Credentials', ['Series 65 License', 'Enrolled Agent (EA)',
                              'Author, <em>Dynamic Social Security Strategies: Mastering the Rules and Coordinating Benefits with Your Investments and Taxes</em>']),
             ('Volunteer Work', ['Volunteer AARP Tax Aide, providing tax assistance to retirees',
                                 'Board of Directors, Grace Ministries at Camp Albright'])]
    cards_html = '<div class="ba-cards">' + ''.join(
        f'<div class="ba-card"><h3>{t}</h3><ul>' + ''.join(f'<li>{li}</li>' for li in items) + '</ul></div>' for t, items in cards) + '</div>'
    return [
        C('ba-sec',
          C('ba-wrap ba-about',
            C('', H('About Brian', 'ba-h1', 'h1'), T(copy, 'ba-about-copy'),
              B('Talk with Brian about Your Retirement Plan', url('contact'), 'ba-btn')),
            C('', IMG('brian-apple-headshot.jpg', 'ba-framed ba-portrait'), T('<p>Brian Apple, EA — Founder</p>', 'ba-caption')))),
        C('ba-sec ba-gray',
          C('ba-wrap ba-guide',
            C('ba-guide-intro',
              H('Your Trusted Guide in Retirement Planning', 'ba-h2'),
              T('<p>With a deep commitment to mastering the complexities of retirement planning, I bring a wealth of education and credentials to ensure your financial future is secure. Here are some of the experiences I bring to the table:</p>')),
            X(cards_html))),
    ]

# ---------- faq ----------
FAQS = [
    ('Why is this firm different?', "I founded this firm because I saw a disconnect between the complexity of financial life transitions and the advice available to help people navigate them. As a solo practitioner, I provide you with direct, personalized attention. I don't believe in product-driven sales. Instead, I take you through a structured, objective process that puts you in the driver's seat. I am here to be the guide who helps you avoid common pitfalls and provides the clarity you need to enjoy your retirement with confidence."),
    ('Why did I write a book on Social Security strategies?', "As I pursued my Master of Science in Personal Financial Planning, I did a deep dive into the mechanics of Social Security. I realized these rules were broadly misunderstood, not only by the public but often within the industry. I saw that when this foundational piece of the retirement puzzle is misaligned, the rest of your plan suffers. I wrote this book to translate that academic-level research into simple, actionable terms. My goal is to help you see the possibilities within your benefits so you can build a more reliable, tax-efficient base for your retirement."),
    ('I’m nearing retirement (age 60–65). When should I start planning?', "The years leading up to retirement are a critical window of opportunity. The best time to start a conversation with me is 3-5 years before you plan to stop working. This timeline gives me the space to model your income, optimize your tax strategy, and align your investments with your long-term vision. However, you may be much farther along in this journey, and the best time to start is immediately. My role is to help you use this period to prepare, so that when you finally retire, you can do so on your own terms, without the stress of last-minute adjustments."),
    ('What is a “fiduciary,” and why is it important?', "As a fiduciary, I am legally obligated to put your interests before my own. This is the cornerstone of my practice. You never have to wonder if a recommendation is designed to benefit me or your family. My commitment is to provide objective, unbiased advice that serves your best interests. You are the hero of your financial story; I am simply the guide providing the map to help you succeed."),
    ('How do I approach the decision of when to claim Social Security?', "Social Security is a critical pillar of your income, but it shouldn't be managed in isolation. I help you view the big picture by evaluating how your claiming strategy interacts with your other income sources, spousal protections, and your overall tax bracket. Rather than guessing, we will look at the data together. I will provide the professional analysis you need to make the decision that best fits your retirement goals."),
    ('Why is tax-efficient decumulation so important for your retirement?', "Many pre-retirees have accumulated significant assets in pre-tax accounts, where every dollar withdrawn can become a future tax liability. I specialize in helping you manage this transition by focusing on tax-bracket management, strategic withdrawal sequencing, and Roth conversions. My goal is to help you build a plan that preserves more of your wealth, giving you the freedom to enjoy your retirement on your own terms."),
    ('How can I get started?', "I know that taking the first step toward achieving your lifelong goals for your retirement years and for your family can feel daunting. That's why I start every engagement with a discovery conversation. This is simply an opportunity for me to understand your current situation and your goals. If we determine that I am the right guide for your journey, I will outline a clear, simple path forward to align your financial foundation with your retirement dreams."),
]

def faq():
    acc = W('accordion', 'ba-faq', tabs=[{'_id': eid(), 'tab_title': q, 'tab_content': f'<p>{a}</p>'} for q, a in FAQS],
            selected_icon={'value': 'fas fa-plus', 'library': 'fa-solid'},
            selected_active_icon={'value': 'fas fa-minus', 'library': 'fa-solid'},
            title_html_tag='h3', icon_align='right', faq_schema='yes')
    return [C('ba-sec',
              C('ba-wrap ba-narrow ba-faq-page',
                H('Frequently Asked Questions', 'ba-h1', 'h1'),
                acc,
                C('ba-still',
                  H('Still have a question?', 'ba-h2'),
                  T('<p>Every engagement starts with a discovery conversation — bring your question there.</p>'),
                  B('Talk with Brian', url('contact'), 'ba-btn ba-btn-sm')),
                T(f'<p>{DISCLOSURE_2}</p>', 'ba-fine')))]

# ---------- contact ----------
def contact():
    form = FORM('Contact', [
        {'id': 'name', 'type': 'text', 'label': 'Name', 'placeholder': 'Your name', 'required': True, 'show_labels': 'yes'},
        {'id': 'email', 'type': 'email', 'label': 'Email', 'placeholder': 'you@example.com', 'required': True},
        {'id': 'message', 'type': 'textarea', 'label': 'Message', 'placeholder': 'Retiring in a few years — wondering about Social Security timing and whether we’re being tax-smart…'},
        {'id': 'webinars', 'type': 'acceptance', 'label': '', 'text': 'I would like to receive notifications about upcoming webinars and periodic educational insights.'},
    ], 'Send Message', '', 'Thank you for reaching out. Brian will be in touch shortly.')
    return [C('ba-sec',
              C('ba-wrap ba-contact',
                C('',
                  H('Schedule a Consultation', 'ba-h1', 'h1'),
                  T('<p>Ready to take the next step?</p>', 'ba-lede'),
                  T('<p>Every engagement starts with a discovery conversation — an opportunity for me to understand your current situation and your goals. If we determine that I am the right guide for your journey, I will outline a clear, simple path forward.</p>', 'ba-contact-intro'),
                  B('Book a Time with Brian', f'mailto:{EMAIL}?subject=Discovery%20conversation', 'ba-btn'),
                  T(f'<p><strong>Alternative contact:</strong> <a href="mailto:{EMAIL}">{EMAIL}</a></p>', 'ba-alt'),
                  IMG('lakeside-dock-chairs.jpg', 'ba-dock')),
                C('ba-formcard', form)))]

# ---------- legal ----------
def legal():
    return [C('ba-sec',
              C('ba-wrap ba-narrow ba-legal',
                H('Legal &amp; Compliance', 'ba-h1', 'h1'),
                T(f'<p>{DISCLOSURE_1}</p><p>{DISCLOSURE_2}</p>', 'ba-legal-copy')))]

# ---------- signup landing (canvas, own mini header/footer) ----------
def signup():
    return [
        C('ba-sec ba-lp-header',
          C('ba-wrap ba-lp-header-in', X(logo_html(), 'ba-logo')), tag='header'),
        C('ba-sec ba-navy',
          C('ba-wrap ba-lp',
            C('ba-lp-head',
              H('Two free resources for your retirement', 'ba-h1 ba-center', 'h1'),
              T('<p>Pick one — or take both. No cost, no obligation.</p>')),
            C('ba-lp-grid',
              C('ba-lp-card',
                T('<p>The Audiobook</p>', 'ba-eyebrow'),
                H('Get Your Complimentary Copy of My Audiobook', 'ba-h2'),
                T('<p>Download my audiobook, <em>Coordinating Social Security Strategies</em>, to learn valuable insights on Social Security and tax strategies. Enter your email address below to receive your complimentary copy.</p>'),
                book_form(''), _element_id='book'),
              C('ba-lp-card ba-lp-card-navy',
                T('<p>Monthly Webinars</p>', 'ba-eyebrow'),
                H('Join My Retirement Strategy Webinars', 'ba-h2'),
                T('<p>Each month, I host live, interactive webinars where I break down complex topics like Social Security and tax-efficient withdrawal strategies. Sign up to be the first to know about upcoming dates and exclusive educational content.</p>'),
                webinar_form('ba-form-navy'), _element_id='webinar')))),
        C('ba-sec ba-lp-footer',
          C('ba-wrap ba-lp-footer-in',
            T(f'<p>{DISCLOSURE_1}</p><p>{DISCLOSURE_2}</p>', 'ba-disclosure'),
            T(f'<p>{COPY}</p>', 'ba-copy')), tag='footer'),
    ]

BUILDERS = {'home': (home, 'elementor_header_footer'), 'services': (services, 'elementor_header_footer'),
            'about': (about, 'elementor_header_footer'), 'faq': (faq, 'elementor_header_footer'),
            'contact': (contact, 'elementor_header_footer'), 'legal': (legal, 'elementor_header_footer'),
            'signup': (signup, 'elementor_canvas')}

def build(key):
    global _seq, _ns
    _seq, _ns = itertools.count(), key
    if key in ('header', 'footer'):
        return (header if key == 'header' else footer)()
    return BUILDERS[key][0]()

if __name__ == '__main__':
    s = wp.session()
    tpl = json.load(open(f'{D}/templates.json')) if os.path.exists(f'{D}/templates.json') else {}
    for key in sys.argv[1:]:
        els = build(key)
        if key in ('header', 'footer'):
            wp.save_builder(s, tpl[key], els, {})
            print('saved', key, tpl[key])
        else:
            pid = PAGES[key]['id']
            wp.save_builder(s, pid, els, {'template': BUILDERS[key][1], 'hide_title': 'yes'})
            print('saved', key, pid)
