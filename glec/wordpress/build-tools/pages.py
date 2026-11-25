# GLEC interior pages. Copy source of truth: "1_Website_Home_Page_Verbiage_Content.docx" (Nov 1, 2026).
# Garrison's green-text notes are instructions only and never appear here.
# Sentence case per the design rules; testimonials quoted verbatim.
import json, os, sys
BASE = sys.argv[1]
_src = open(os.path.join(BASE, 'gen/build.py')).read().split('# ---------------- HOMEPAGE ----------------')[0]
exec(_src)

BOOKS = 'https://sebookstore.com/glec.html'
U = lambda p: SITE + p
CLS = {
    'R':    dict(code='HLG-DD-R-OL', name='Residential Design Class', url=U('/license-classes/residential-design/'), pid=538),
    'C':    dict(code='HLG-DD-C-OL', name='Commercial Design Class', url=U('/license-classes/commercial-design/'), pid=539),
    'OL':   dict(code='CA-OL', name='Exam Prep Review Class', url=U('/license-classes/exam-prep-review/'), pid=540),
    'TABS': dict(code='CA-TABs', name='Permanent Reference TABs', url=U('/license-classes/reference-tabs/'), pid=541),
    'SOS':  dict(code='SOS-APP', name='Application Overview videos', url=U('/license-classes/application-overview/'), pid=542),
}
I['book'] = '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'
I['cal'] = '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
I['truck'] = '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'
I['file'] = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>'
I['info'] = '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'

def hero(eyebrow, h1, lead, crumbs=None, extra=None):
    kids = []
    if crumbs:
        kids.append(HTML('<nav class="g-crumbs" aria-label="Breadcrumb"><ol>%s</ol></nav>' % ''.join(
            ('<li><a href="%s">%s</a></li>' % (u, t)) if u else ('<li aria-current="page">%s</li>' % t) for t, u in crumbs)))
    kids += [H(eyebrow, 'div', 'eyebrow', 'line', 'g-eyebrow g-eyebrow-light'),
             H(h1, 'h1', None, 'white', 'g-ph1', size=56, size_m=36)]
    if lead: kids.append(TX('<p>%s</p>' % lead, 'lead', 'line', 'g-plead'))
    if extra: kids += extra
    return C([C(kids, 'g-phero__in', gap=16, gap_m=12)], 'g-phero g-tex-navy g-on-navy', boxed=True, bg='navy',
             pad=(72, 64, 80, 64), pad_t=(56, 40, 64, 40), pad_m=(40, 20, 48, 20), html_tag='section')

def section(kids, bg=None, cls='', pad=SECT, el_id=None):
    return C(kids, cls, boxed=True, bg=bg, pad=pad, pad_t=SECT_T, pad_m=SECT_M, el_id=el_id, html_tag='section', gap=40, gap_m=28)

def prose(html, cls=''): return TX(html, 'body', 'ink', 'g-prose ' + cls)
def h2(t, cls=''): return H(t, 'h2', 'h2', 'navy', cls)
def ul(items, cls='g-list'): return '<ul class="%s">%s</ul>' % (cls, ''.join('<li>%s</li>' % i for i in items))
def checks(items): return '<ul class="g-tick">%s</ul>' % ''.join('<li>%s%s</li>' % (ic(I['check'], 20), i) for i in items)
def callout(title, body, kind='info'):
    return HTML('<div class="g-callout g-callout--%s"><span class="g-callout__ico">%s</span><div><p class="g-callout__t">%s</p>%s</div></div>' % (kind, ic(I['info'], 22), title, body))
def facts(rows): return HTML('<ul class="g-facts">%s</ul>' % ''.join('<li><span class="g-facts__ico">%s</span><span><b>%s</b>%s</span></li>' % (ic(I[i], 22), a, b) for i, a, b in rows))

def buybox(k, price_note, includes, extra_links=None):
    c = CLS[k]
    links = ''.join('<li><a href="%s"%s>%s</a></li>' % (u, ' target="_blank" rel="noopener"' if u.startswith('http') and 'staging158' not in u else '', t) for t, u in (extra_links or []))
    return C([
        HTML('<span class="g-code">%s</span>' % c['code']),
        PRICE(c['pid'], 'g-pricebig g-buy__price'),
        TX('<p class="g-buy__note">%s</p>' % price_note, None, None),
        ATC(c['pid'], 'g-atc-primary g-buy__atc'),
        HTML(checks(includes)),
        HTML('<ul class="g-buy__links">%s</ul>' % links) if links else HTML(''),
    ], 'g-buy', gap=16, pad=(28, 28, 28, 28), pad_m=(22, 20, 22, 20))

def class_page(k, lead, facts_rows, body, price_note, includes, links, nextstep):
    c = CLS[k]
    page = [hero('License class · ' + c['code'], c['name'], lead,
                 crumbs=[('Home', U('/')), ('License classes', U('/license-classes/')), (c['name'], None)],
                 extra=[facts(facts_rows)])]
    page.append(section([C([C(body, 'g-main', gap=40, gap_m=32), C([buybox(k, price_note, includes, links)], 'g-aside')],
                           'g-twocol', gap=64, gap_t=40, gap_m=32)]))
    t, u, txt = nextstep
    page.append(section([C([H('Next step', 'div', 'eyebrow', 'blue', 'g-eyebrow'), H(t, 'h2', 'h2', 'navy', size=32, size_m=26),
                            TX('<p>%s</p>' % txt, 'body', 'slate'), BTN('Continue', u, 'g-btn')], 'g-next', gap=14)], bg='mist', pad=(72, 64, 80, 64)))
    return page

ACCESS = 'Available on demand, 24/7, as many times as you like: up to one year after the date you buy the class, or until you pass your exam, whichever comes first. Access can be extended if needed for a fair fee, based on how long it has been since you bought it.'

pages = {}

# ---------- Residential Design ----------
pages['residential-design'] = ('Residential Design Class', class_page('R',
    'Also known as the Residential Heat Loss/Gain &amp; Duct Design Class. Required for every Conditioned Air license.',
    [('award', 'Required for', 'Restricted (Class 1) and Non-Restricted (Class 2)'), ('clock', 'About 16 hours', 'of video, plus time to highlight and calculate'), ('cal', 'Up to 1 year', 'of access, or until you pass')],
    [C([h2('Why you should buy this class'), prose('<p>A Board rule from 2005 requires you to submit this Residential Design Class Certificate of Completion with your Conditioned Air license application. The License Board will not process your application without it.</p><p>The certificate is required to apply for the Restricted (Class 1) license or the Non-Restricted (Class 2) license.</p>')], gap=16),
     C([h2('What it covers'), prose('<p>The Certificate of Completion requires 16 hours of class time, covering the ACCA design manuals J and D.</p>' + ul(['<b>ACCA Manual J:</b> residential heat loss/gain load calculation', '<b>ACCA Manual D:</b> residential duct design calculation']) + '<p>This class is very important for passing the exam. When people fail, it is almost always in the design category, mostly Manual D (duct design).</p>')], gap=16),
     C([h2('How the class works'), prose(ul([
         'I do not give the answers, I give you the solutions. The videos show every step I take to solve the equations.',
         'A GLEC Residential Design Study Guide is included, with exam-type questions from each design book and full solutions, so you can follow how each equation is solved.',
         'Class length is about 16 hours of video. Add 4 to 6 hours online to highlight the books, and about 8 to 12 more hours for the calculations.',
         'Print your Certificate of Completion online after watching all the videos. Print 3 copies and save one as a PDF for your application.',
         'This class has been online since April 2018. We have sold 1,740 online classes through October 2026, with an exam pass rate of about 82%.']))], gap=16),
     C([h2('Before you apply'), prose(ul([
         'EPA-608 technician certification, Type 2 or higher, is required in your application package. <a href="%s">See technician certifications</a>.' % U('/technician-certifications/'),
         'You are responsible for buying the required Reference Books for the classes you purchase. <a href="%s" target="_blank" rel="noopener">Order the Reference Books</a>.' % BOOKS,
         'This Certificate of Completion can also be used for NATE CEHs. Submit a copy to NATE at your renewal.']))], gap=16),
     HTML('<details class="g-more"><summary>See More <span aria-hidden="true">+</span></summary><div class="g-more__body"><p>This class is also known as &ldquo;The Residential Heat Loss/Gain &amp; Duct Design Class&rdquo;.</p><p>Board Rule from the year 2005 requires you to submit this Residential Design Class Certificate of Completion with your &ldquo;CA&rdquo; Conditioned Air License Application. The License Board will NOT process your Application without it!</p><p>This Certificate of Completion is required to APPLY for the Restricted (Class 1) License or the Non-Restricted (Class 2) License applicants.</p><p>Certificate of Completion requires 16 hours of class time, covering ACCA Design Manuals J and D.</p><ul><li>ACCA Manual J = Residential Heat Loss/Gain Load Calculation</li><li>ACCA Manual D = Residential Duct Design Calculation</li></ul><p>EPA-608 Technician Certification of Type 2 or Higher is Required to be in your Application submittal package. If you need to get this, go to <a href="/technician-certifications/">Technician Certifications</a>.</p><p>A GLEC Residential Design Study Guide is included with Exam type questions from each design book, with solutions (not just the answers) so you can follow in solving the equation or solution.</p><p>You are responsible for Purchasing all the required Reference Books for the classes you purchased. Go to Quick Links to find the Reference Book list, and to also Purchase Order the Books.</p><p>This Residential Design class is very important in passing the Exam to get your License. When people fail, it is almost always in the &ldquo;Design&rdquo; category, mostly Manual D (Duct Design).</p><p>Note: this Certificate of Completion can be used for NATE CEH&rsquo;s. You would have to submit a copy of your Certificate of Completion to NATE at your Renewal.</p><p>Class length is about 16 hours of Videos, add 4&ndash;6 hours Online to Highlight the Books. Add about 8&ndash;12 more hours for doing the calculations.</p><p>You would Print your Certificate of Completion Online, after watching all the videos. Print 3 copies and one as a PDF for your Application.</p><h3>More Class Details</h3><ol><li>Available On-Demand 24/7 As many times, through your Exam, up to one year after your date of purchase of the class, or until you pass your Exam, whichever comes first. Can be extended if needed, for a fair fee, based on length of time from purchase date.</li><li>I do not give the answers, I give you the SOLUTIONS. The Videos show every little step I take to solve the equations.</li><li>This class has been Online since April 2018.</li><li>We have sold 1740 Online classes through October 2026.</li><li>Exam passing rate has been more successful, about 82%.</li></ol></div></details>'),
     callout('Access', '<p>%s</p>' % ACCESS)],
    'Restricted and Non-Restricted',
    ['Residential Design Study Guide', 'SOS-APP application videos, free', 'Certificate of Completion'],
    [('Order the Reference Books', BOOKS), ('See the step-by-step process', U('/how-to-get-licensed/'))],
    ('Commercial Design Class', CLS['C']['url'], 'Going for the Non-Restricted (Class 2) license? You also need the Commercial Design Class. Restricted applicants can skip ahead to the application.')))

# ---------- Commercial Design ----------
pages['commercial-design'] = ('Commercial Design Class', class_page('C',
    'Also known as the Commercial Heat Loss/Gain &amp; Duct Design Class. Required for the Non-Restricted (Class 2) license.',
    [('award', 'Required for', 'Non-Restricted (Class 2) only'), ('clock', 'About 8 hours', 'covering Carrier System Design Manuals 1, 2 and 3'), ('cal', 'Up to 1 year', 'of access, or until you pass')],
    [C([h2('Why you should buy this class'), prose('<p>A Board rule from 2005 requires you to submit this Commercial Design Class Certificate of Completion with your Conditioned Air license application. The License Board will not process your application without it.</p><p>This Certificate of Completion is required for Non-Restricted (Class 2) license applicants only.</p>')], gap=16),
     C([h2('What it covers'), prose('<p>The Certificate of Completion requires 8 hours of class time, covering the Carrier System Design Manuals 1, 2 and 3. These books cover the commercial heat loss/gain and duct design calculations.</p>')], gap=16),
     C([h2('Good to know'), prose(ul([
         'You are responsible for buying the required Reference Books for the classes you purchase. <a href="%s" target="_blank" rel="noopener">Order the Reference Books</a>.' % BOOKS,
         'Print your Certificate of Completion online after watching all the videos. Print 3 copies and save one as a PDF for your application.',
         'This class can be used for your NATE CEHs. Submit a copy of your certificate to NATE at your renewal.']))], gap=16),
     HTML('<details class="g-more"><summary>See More <span aria-hidden="true">+</span></summary><div class="g-more__body"><p>This class is also known as &ldquo;The Commercial Heat Loss/Gain &amp; Duct Design Class&rdquo;.</p><p>Board Rule from the year 2005 requires you to submit this Commercial Design Class Certificate of Completion with your &ldquo;CA&rdquo; Conditioned Air License Application. The License Board will NOT process your Application without it!</p><p>This Certificate of Completion is required to APPLY for the Non-Restricted (Class 2) License applicants only.</p><p>Certificate of Completion requires 8 hours of class time, covering the Carrier System Design Manuals 1, 2, 3. These Books are to cover the Commercial Heat Loss/Gain &amp; Duct Design calculations.</p><p>You are responsible for Purchasing all the required Reference Books for the classes you purchased. Go to Quick Links to find the Reference Book list, and to also Purchase Order the Books.</p><p>You would Print your Certificate of Completion Online, after watching all the videos. Print 3 copies and one as a PDF for your Application.</p><p>NATE: This class could be used for your NATE CEH&rsquo;s. You would have to submit a copy of your Certificate to NATE at your Renewal.</p><p>Available On-Demand 24/7 As many times, through your Exam, up to one year after your date of purchase of the class, or until you pass your Exam, whichever comes first. Can be extended if needed, for a fair fee, based on length of time from purchase date.</p></div></details>'),
     callout('Access', '<p>%s</p>' % ACCESS)],
    'Non-Restricted only',
    ['Carrier System Design Manuals 1, 2 and 3', 'SOS-APP application videos, free', 'Certificate of Completion'],
    [('Order the Reference Books', BOOKS), ('See the step-by-step process', U('/how-to-get-licensed/'))],
    ('Application Overview videos', CLS['SOS']['url'], 'With your Design Classes done, the next step is the Board application. The SOS-APP videos walk you through it, and they are free with the Design Classes.')))

# ---------- Reference TABs ----------
pages['reference-tabs'] = ('Permanent Reference TABs', class_page('TABS',
    'Pre-printed Permanent TABs for the Conditioned Air Reference Books. Usually bought together with the Exam Prep Review Class.',
    [('book', 'Every Reference Book', 'including Manuals D &amp; J and the Carrier books'), ('truck', 'Shipped', 'to the address on your order'), ('file', 'Placement charts', 'for each Reference Book')],
    [C([h2('Why Permanent TABs'), prose('<p>Permanent TABs are required. A permanent tab would tear the paper page if you tried to remove it. Repositionable tabs are not acceptable.</p><p>The permanent tab set covers all the Reference Books, including the design manuals D and J and the Carrier books. They are not sold separately; only when the Board changes Reference Books do we provide them separately. You can tab the design books later, once you have all the books.</p>')], gap=16),
     C([h2('What you get'), prose(ul(['About 14 tab sheets', 'About 317 pre-printed tabs', 'About 33 blank tabs you can write on if you need to',
         'About 14 Excel spreadsheets listing the tabs for each Reference Book, showing the tab name, book edition or version, book page number, code number for code books, and for some a longer description']))], gap=16)],
    'Restricted and Non-Restricted',
    ['Tabs for every Reference Book', 'Placement charts', 'Shipped to you'],
    [('Exam Prep Review Class', CLS['OL']['url'])],
    ('Exam Prep Review Class', CLS['OL']['url'], 'The tabs go hand in hand with the Exam Prep Review Class, which shows you how to tab and highlight every book.')))

# ---------- Exam Prep Review ----------
pages['exam-prep-review'] = ('Exam Prep Review Class', class_page('OL',
    'The traditional Conditioned Air license Exam Prep Review Class, designed to help you pass the exam on your first attempt.',
    [('award', 'After Board approval', 'buy this once you are approved to sit for the exam'), ('book', 'All Reference Books', 'except Manuals D &amp; J, covered in Residential Design'), ('truck', 'Printed Study Guide', 'shipped to you by UPS')],
    [callout('Before you buy', '<p>You should already be approved by the Conditioned Air Licensing Board before you purchase this class. If you have not already, buy the <a href="%s">Permanent Reference TABs</a> for the Conditioned Air Reference Books.</p>' % CLS['TABS']['url'], 'warn'),
     C([h2('Who it is for'), prose('<p>You should already have taken the Residential Design Class, which is a good portion of the exam. If you did not, because you went to a vocational tech school (where the class is not taught as exam prep) and submitted your diploma or transcripts, consider taking the <a href="%s">Residential Design Class</a> as well.</p>' % CLS['R']['url'] +
         ul(['This class covers both Restricted and Non-Restricted applicants.', 'It is required if you fail the exam twice, and highly recommended before that:']) +
         ul(['To save personal study time by knowing what to study, and how to tab and highlight your books.', 'To be better prepared and confident, reducing the fear of taking the exam.', 'To save the expense and time of re-applying and studying again to re-take the exam.'], 'g-list g-list--sub'))], gap=16),
     C([h2('GLEC Exam Prep Study Guide'), prose('<p>When you buy this class, we ship you the complete Exam Prep Study Guide by UPS. It has 10 tabs and about 150 pages, with exam-type questions from each non-design book and full solutions, not just the answers.</p>' + ul([
         'Sample practice test questions and working examples for gas pipe and flue vent sizing, conduit and wire sizing, psychrometrics, and accounting principles', 'Study skills, test-taking skills and question tracking', 'The significance and importance of each Reference Book']))], gap=16),
     C([h2('The three parts of the class'),
        HTML('<div class="g-parts">'
             '<div class="g-part"><span class="g-part__k">Part A</span><h3>Highlighting and tabbing videos</h3>' + ul(['12.6 hours for Non-Restricted students (you already did the Carrier books)', '15.6 hours for Restricted students (includes the Carrier design books)', 'The tabbing, overview and highlighting of the Reference Books, at home or work, at your own pace', 'A visual and audio explanation of the materials, charts, tables and equations', 'Optional Certificate of Completion once you highlight all the non-design Reference Books']) + '</div>'
             '<div class="g-part"><span class="g-part__k">Part B</span><h3>Working examples, about 7.5 hours</h3>' + ul(['IFGC: gas pipe and flue vent sizing', 'IMC: book examples that calculate fresh air intake CFM', 'NEC: conduit and wire sizing, and calculating amps to size disconnects and fuses', 'Psychrometrics, with a psych chart in the back sleeve of the binder', 'NASCLA: accounting principles', 'Study skills, test-taking skills and question tracking', 'Worksheets are in the Study Guide']) + '<p class="g-part__note">You can print a certificate after completing all the calculations. Only print it if you have failed the exam twice: you would send it to the Board to take the exam a third time.</p></div>'
             '<div class="g-part"><span class="g-part__k">Part C</span><h3>Online quizzes</h3>' + ul(['A quiz for each non-design book', 'Retake each quiz until you score high enough, consistently, to feel confident', 'Simple questions only, not calculation examples', 'Go through them the last week before the exam']) + '</div></div>')], gap=20),
     C([h2('Good to know'), prose(ul(['Can be used for NATE CEHs. Submit your certificate to NATE upon renewal.', 'For the online portions, print your certificate online after you finish watching all the videos.']))], gap=16),
     callout('Access', '<p>%s</p>' % ACCESS)],
    'Restricted and Non-Restricted',
    ['Printed Exam Prep Study Guide, shipped', 'Highlighting and tabbing videos', 'Working examples and online quizzes'],
    [('Permanent Reference TABs', CLS['TABS']['url']), ('Order the Reference Books', BOOKS)],
    ('Board application and meeting dates', U('/board-application/'), 'Once you pass, check GOALS online to find your license number, and print your license from the Secretary of State website.')))

# ---------- SOS-APP ----------
pages['application-overview'] = ('Application Overview videos', class_page('SOS',
    'An online video walkthrough of the whole Conditioned Air license application, from documents to approval.',
    [('award', 'Free', 'with the Residential and Commercial Design Classes'), ('file', 'Two checklists', 'for submitting and for approval'), ('clock', 'On demand', 'watch online, at your own pace')],
    [C([h2('Why it helps'), prose('<p>The Secretary of State Professional Licensing Board requires you to submit an application for the Conditioned Air Contractor license, and to get approval from the Board, before you can sit for the Conditioned Air license exam.</p><p>This online video presentation will save you a lot of time and effort working out the details of the whole application process. Below are some of the things we have learned over the years about what to do and, perhaps more importantly, what not to do.</p>')], gap=16),
     C([h2('What it covers'), HTML(checks([
         'The exam schedule, deadline dates and how to pay for the exam', 'All the application documents, and what is required and what is not', 'Other documents you need that are not in the application',
         'Each section in detail, including key words to use and some not to use', 'Which personal IDs you need and how to present them', 'Contact information for forms, books, background checks and other sources',
         'Checklist, part 1 (application submittal): 21 items to check off', 'Checklist, part 2 (approval process): 15 items to check off', 'The sequence of the whole application process',
         'How to check on your application status', 'Sample approval letters', 'When to pay and schedule the exam, and the preferred location']))], gap=16),
     callout('Included free', '<p>This class is included free with the <a href="%s">Residential Design</a> and <a href="%s">Commercial Design</a> classes.</p>' % (CLS['R']['url'], CLS['C']['url']), 'ok')],
    'Free with the Design Classes',
    ['Full application walkthrough', 'Two checklists', 'Sample approval letters'],
    [('Board application and meeting dates', U('/board-application/'))],
    ('Board application and meeting dates', U('/board-application/'), 'See how the Board currently processes applications, and when it meets.')))

# ---------- License classes overview ----------
def lc_card(k, blurb, req):
    c = CLS[k]
    return C([HTML('<div class="g-pills"><span class="g-code">%s</span><span class="g-qual">%s</span></div>' % (c['code'], req)),
              H(c['name'], 'h3', 'h3_card', 'navy', 'g-cardlink', link=c['url']), TX('<p>%s</p>' % blurb, None, None, 'g-grow'),
              C([PRICE(c['pid'], 'g-price'), ATC(c['pid'], 'g-atc-sec')], direction='row', justify='space-between', align='center', gap=16)],
             'g-card', gap=12, pad=(28, 28, 28, 28), pad_m=(22, 20, 22, 20))
pages['license-classes'] = ('License classes', [
    hero('Conditioned Air (HVAC) contractor licensing', 'License classes', 'All design and exam prep classes are online only. Prices are subject to change.', crumbs=[('Home', U('/')), ('License classes', None)]),
    section([C([
        lc_card('R', 'Required for Restricted and Non-Restricted licensing. ACCA Manuals J &amp; D, about 16 hours online.', 'Required in both licenses'),
        lc_card('C', 'Required for Non-Restricted. Carrier System Design Manuals 1, 2 and 3, about 8 hours online.', 'Non-Restricted only'),
        lc_card('OL', 'The Conditioned Air license Exam Prep Review Class. Ships a printed Study Guide.', 'After Board approval'),
        lc_card('TABS', 'Laser-printed Permanent TABs with placement charts, for all the Reference Books, Restricted and Non-Restricted.', 'Shipped'),
        lc_card('SOS', 'The Conditioned Air license application overview, as online videos.', 'Free with Design Classes')], 'g-g3 g-lcgrid', gap=24, gap_m=16),
        callout('All design and exam prep classes', '<p>%s</p>' % ACCESS)]),
    section([C([C([h2('Which license is right for you?'), TX('<p>Restricted (Class 1) covers units up to 5 tons cooling. Non-Restricted (Class 2) covers all unit sizes. Compare the experience, reference and document requirements side by side.</p>', 'body', 'slate')], gap=14),
                C([BTN('See the step-by-step process', U('/how-to-get-licensed/'), 'g-btn'), BTN('Compare the requirements', U('/how-to-get-licensed/#chart'), 'g-btn-sec')], 'g-auto', gap=12)],
               'g-band', direction='row', justify='space-between', align='center', gap=40, dir_t='column')], bg='mist', pad=(72, 64, 80, 64)),
])

# ---------- CEU classes ----------
CEU = [
    ('CARRIER-CEU', 'Carrier Commercial Design: examples', '4', '$50', ['Covers many of the examples in the Carrier manuals: 1, Load Estimating; 2, Air Distribution; 3, Piping Design.', 'You should have these manuals to follow along with the videos.', '18 videos, usually 5 to 8 minutes long.']),
    ('EPA-MOLD-CEU', 'EPA Mold Remediation: an HVAC perspective', '4', '$50', ['Mold in schools and commercial buildings, from an HVAC perspective: an overview of mold prevention and mold remediation, based on the EPA&rsquo;s voluntary guidance document <i>Mold Remediation in Schools and Commercial Buildings</i>.', 'For building managers, custodians, remediators, contractors and other professionals who respond to mold problems.', 'Covers mold types and growth, humidity and moisture, moisture migration, permeance, odor and ventilation, how and where to locate mold, response time, and remedial techniques.']),
    ('HELIX-SIZING-CEU', 'Wire Helix Trunk &amp; Branch Duct Sizing', '4', '$50', ['Figure 9-1 from ACCA Manual D, 3rd edition (version 2.50).', 'Learn more about duct sizing, especially wire helix flex duct: comparing flex duct sizes to sheet metal duct sizes, and other considerations, so you feel comfortable designing for it.', 'The book is not required to follow along. 17 videos.']),
    ('FLEX-DUCT-CEU', 'ADC Flex Duct Performance &amp; Installation Standards', '1', '$15', ['For installers, service techs and others: styles, material characteristics, listing requirements, performance, testing methods, product certification, marking and packaging, installation requirements and limitations, duct sizing, duct leakage, and safety.', 'For those who need just one CEU hour to reach the 4 hours a year needed to renew.', 'Reference: ADC Flexible Duct Performance &amp; Installation Standards, 5th edition (2010). Not required to follow along. 6 videos, monitored online for the one hour.']),
    ('2018-CODE-CHANGES-CEU', '2018 Code Changes: IFGC &amp; IMC', '4', '$50', ['Reviews the 2015 and 2018 changes in the 2018 International Fuel Gas Code and International Mechanical Code, shown directly in the code books with yellow highlighting, and red tags marking the 2015 changes.', 'Also reviews the State of Georgia 2020 amendments for the 2018 IFGC and IMC. After payment, download the Georgia amendments from our website.', 'Code books are not required to follow along. 14 videos.']),
    ('2021-CODE-CHANGES-CEU', '2021 Code Changes: IFGC &amp; IMC', '4', '$50', ['Georgia&rsquo;s Department of Community Affairs updates the code books every 6 years, while the ICC changes them every 3. Code officials in various jurisdictions are already requiring several of the newer changes for safety, health and operation. As a professional contractor, it is best to know what is coming.', 'Reviews a third-party book that explains each code change, with comments, diagrams and reasons. Code books are not required to follow along.', '38 videos, 3 to 8 minutes long.']),
    ('2024-CODE-CHANGES-CEU', '2024 Code Changes: IFGC &amp; IMC', '4', '$50', ['Reviews the 2024 code changes in the IFGC and IMC code books, through a third-party book that explains each change with comments, diagrams and reasons.', 'For contractors needing 4 CEU hours a year to renew. This class does not meet the requirements for a Conditioned Air license application.', 'Code books are not required to follow along. 48 videos, 3 to 8 minutes long.']),
]
CEU_IDS = json.load(open(os.path.join(BASE, 'build/ceu-products.json')))
def ceu_row(code, name, hrs, price, items):
    pid = CEU_IDS[code]
    atc = '<a href="?add-to-cart=%d" data-quantity="1" data-product_id="%d" class="button add_to_cart_button ajax_add_to_cart g-ceu__atc" aria-label="Add %s to your cart" rel="nofollow">Add to cart</a>' % (pid, pid, code)
    return ('<article class="g-ceu g-ceu--open"><div class="g-ceu__head"><span class="g-ceu__code">%s (2027)</span><h3 class="g-ceu__name">%s</h3><span class="g-ceu__hrs">%s hour%s</span><span class="g-ceu__price">%s</span></div>'
        '<div class="g-ceu__body">%s<div class="g-ceu__buy">%s</div></div></article>'
        % (code, name, hrs, '' if hrs == '1' else 's', price, ul(items), atc))
pages['ceu-classes'] = ('CEU classes', [
    hero('Continuing education units', 'CEU classes', 'Board-approved CEU classes for Georgia Conditioned Air contractors. All CEU classes are online only.', crumbs=[('Home', U('/')), ('CEU classes', None)]),
    section([C([C([h2('What the Board requires'), prose(ul([
            'The Conditioned Air Contractors Licensing Board requires four (4) CEUs per year, due by December 31 of odd-numbered years, for example 2027, 2029 and 2031. That equals 8 hours every two years.',
            'You must keep your certificates on file for 5 years plus the last renewal period. Just keep them 7 years.']))], gap=16),
        C([h2('How every CEU class works'), HTML(checks([
            'The CEU classes GLEC offers are approved by the Conditioned Air Licensing Board.', 'Older CEU videos are about 10 to 15 minutes long; recent ones are about 3 to 8 minutes.', 'There are no formal quizzes to take and pass.',
            'You are monitored online for the required four (4) hours, to make sure you watch every minute of each video.', 'Do not fast-forward or skip any part of a video, or you will have to watch it again until you have watched every second.',
            'You must complete the whole class to print your Certificate of Completion.', 'Print your certificate as soon as you finish all the class videos. We suggest printing 2 or 3 copies.',
            'Also save the certificate as a PDF on your computer or a memory device: you will need to upload it with your application to the Board.']))], gap=16)],
        'g-g2 g-ceuintro', gap=64, gap_m=32),
        callout('Access', '<p>Online CEU classes are available 24/7, as many times as you like, through your completion. You have 4 months to complete each class.</p>')]),
    section([C([h2('Choose a CEU class'), TX('<p>Every class is online only, with 4 months to complete it.</p>', 'body', 'slate')], gap=8),
             HTML('<div class="g-ceulist">%s</div>' % ''.join(ceu_row(*r) for r in CEU))], bg='mist'),
])

# ---------- About ----------
TIMELINE = [
    ('2006', 'GLEC is founded', 'Garrison Michael founded Georgia License Exam Company in late 2006, starting with Conditioned Air license exam prep review classes and heat loss/gain and duct Design Classes. GLEC grew quickly through referrals.'),
    ('2009', 'Atlanta, Buckhead', 'Classes move to a larger hotel in Atlanta, Buckhead.'),
    ('2010', 'Middle Georgia', 'GLEC expands to Middle Georgia in February 2010 at a hotel in Warner Robins, moving to Macon a year later. We had 16 students in our first class.'),
    ('2011', 'Augusta and LaGrange', 'Classes start in Augusta in June 2011, bringing students from across the border in South Carolina, and in LaGrange, bringing students from Eastern Alabama.'),
    ('2013', 'Savannah', 'Our first Savannah class begins in January 2013, with more students from South Carolina.'),
    ('2015', 'Hybrid and online classes', 'The Conditioned Air Exam Prep Review Class becomes a hybrid class in January 2015, and the Commercial Design class moves fully online in February 2015.'),
    ('2016', 'CEU classes', 'In March 2016 we begin teaching continuing education (CEU) classes for HVAC licensed contractors, online only from the start.'),
    ('2018', 'Residential Design online', 'In March 2018 we start offering the Residential Design class as a hybrid class (HLG-DD-R-HY) and fully online (HLG-DD-R-OL), as more students join from other states and nationwide companies.'),
    ('2020', 'Fully online exam prep', 'Classes keep going through Covid, with most students choosing online. The CA-OL Exam Prep Review Class goes fully online in May 2020.'),
    ('2024', 'Online becomes the norm', 'With classroom attendance down to 2 or 3 students, we close the physical classroom classes after July 2024. Our exam pass rate is still 82%.'),
    ('2026', '20th anniversary', 'October 2026 marks our 20th anniversary.'),
]
LICS = ['Conditioned Air Contractors Non-Restricted License, State of Georgia', 'Heating &amp; Air Conditioning Contractor, State of Alabama', 'Commercial Mechanical Contractor License, State of Tennessee',
        'Conditioned Air Contractor &ldquo;Air B&rdquo; License, State of Florida', 'Mechanical, Air Conditioning License, State of South Carolina', 'Air Conditioning License &ldquo;A&rdquo;, State of Texas',
        'Low Voltage Contractors Universal License, State of Georgia', 'EPA Sections 608 and 609 Technician Certification for refrigerant handling', 'R410A Refrigerant Safety Certification',
        'Green Building: LEED&reg; 2.0 Accredited Professional', 'EPA Renovator Certification', 'DET (Duct &amp; Envelope Tightness) Certification']
pages['about'] = ('About', [
    hero('About GLEC', 'Our mission is to help you pass on the first attempt', 'First and foremost, our mission is to help you pass the State of Georgia license exam for the Conditioned Air license (formerly the Warm Air or HVAC license) on the first attempt.', crumbs=[('Home', U('/')), ('About', None)]),
    section([C([C([h2('What sets us apart'), HTML(checks([
        'Garrison Michael, our instructor, is uniquely qualified by his knowledge and experience.', 'Our detailed presentation of the materials.', 'Our ability to take complicated subjects and present them in a simplified way.',
        'Our diligence in making sure you understand the concepts presented.', 'Our desire to keep our approach simple and easy to navigate.', 'Our open door policy: we want to hear your suggestions and evaluations.',
        'Our desire to be available when you have questions or need support.', 'To be the best we can be for our online HVAC design and exam prep review classes.']))], gap=20),
        C([IMG('garrison.webp', 'g-img'), HTML('<div class="g-badge20" aria-hidden="true"><b>20</b><span>years<br>2006–2026</span></div>', 'g-media-deco')], 'g-instr-media g-about-photo')],
        'g-instr g-about-top', gap=80, gap_t=48, gap_m=40)]),
    section([C([H('Company history', 'div', 'eyebrow', 'blue', 'g-eyebrow'), h2('Twenty years of Georgia HVAC licensing')], gap=14),
             HTML('<ol class="g-timeline">%s</ol>' % ''.join('<li><span class="g-timeline__y">%s</span><div><h3>%s</h3><p>%s</p></div></li>' % t for t in TIMELINE))], bg='mist'),
    section([C([C([H('Meet your instructor', 'div', 'eyebrow', 'blue', 'g-eyebrow'), h2('Garrison Michael'), prose(
        '<p>Garrison Michael was born and raised in Chicago, Illinois. He has over 34 years of experience in HVAC, and in the last 11 years, experience with low voltage systems for the large commercial and industrial markets.</p>'
        '<p>He graduated in 1981 from the Milwaukee School of Engineering with a B.S. in Building Construction Engineering. He started at MCC Powers (now Siemens Building Technologies) as an application engineer designing building automation system layouts. In 1986 he joined Johnson Controls as a project engineer, working on large projects like the new Fulton County Jail and the new Coca-Cola USA Tower and Reception Center. He was project manager on three new state prisons and two county jails, with fire alarm, security, card access, public address, intercom, closed circuit TV, television signal distribution, and programmable logic controller systems for the cell doors.</p>'
        '<p>In 1992 Garrison began a 14-plus year career at Georgia Trane as a sales engineer for the service company, selling service agreements to building owners to maintain and expand their BAS and HVAC systems, and delivering turnkey HVAC systems. In 2003 he also began teaching at the Georgia Trane Training Center. He created the Low Voltage license Exam Prep Review Class, and two years later began teaching Conditioned Air (HVAC) classes, including the Design Classes and the Conditioned Air license exam prep review classes.</p>'
        '<p>When Garrison resigned in 2006, he started Georgia License Exam Company.</p>')], gap=16),
        HTML('<figure class="g-bigquote"><span class="g-qmark" aria-hidden="true">“</span><blockquote>I love to help others succeed in achieving their life vision, which in turn should help one attain their own dreams. I believe with my analytical engineering background, my real onsite construction experience, and my years at Trane, that I have this unique ability to take a complex analytical concept, re-shuffle it, and present it in a practical useful way, to help students feel confident about themselves and reach their goal of passing the state exams.</blockquote><figcaption>Garrison Michael</figcaption></figure>')],
        'g-twocol g-twocol--even', gap=64, gap_t=40, gap_m=32)]),
    section([C([
        C([H('Licenses and certifications', 'h3', None, 'navy', size=24), HTML(ul(LICS, 'g-list g-list--cols'))], 'g-card g-card--flat', gap=16, pad=(32, 32, 32, 32), pad_m=(24, 20, 24, 20)),
        C([C([H('Education', 'h3', None, 'navy', size=24), HTML(ul(['B.S. in Building Construction Engineering, Milwaukee School of Engineering', 'One year in the M.B.A. program, Georgia College, Milledgeville, Georgia', 'LifeWorks&reg; School of Coaching: Certified Life Coach']))], 'g-card g-card--flat', gap=16, pad=(32, 32, 32, 32), pad_m=(24, 20, 24, 20)),
           C([H('Trane training', 'h3', None, 'navy', size=24), HTML(ul(['Trane Counselor Sales Training 1 and 2, LaCrosse, WI', 'Trane Performance Contracting Training (PACT), St. Paul, WI', 'Trane: Sandler Sales Training', 'National Association of Trane Franchise Convention, attendee for several years']))], 'g-card g-card--flat', gap=16, pad=(32, 32, 32, 32), pad_m=(24, 20, 24, 20))], gap=24)],
        'g-twocol g-twocol--even', gap=24, gap_m=16)], bg='mist'),
])

# ---------- Testimonials ----------
TESTI = [
    ('Hi, just wanted to thank you for the class. Really like your method of delivery. You have inspired me to further my engineering and design knowledge, I am working on the (STATE License) Application right now and (I am) looking forward to seeing you in the Exam Prep. Review Class. Thanks again!! Oh and thanks for the (car) jump by the way!', 'Kevin L.'),
    ('I’m not in the field on a daily basis and that Exam was very difficult for me, I wouldn’t have passed that Exam in a million years without these courses! Especially Manual “J” and Manual “D”. Thanks for all you did for me!', 'Denolphus E.'),
    ('WOW!! Many questions on the exam was covered and tabbed for future reference. That really made the exam a breeze. Thank you, keep up the good work.', 'Clay P.'),
    ('I just got an email confirmation that I passed my exam and was approved by the board. Thanks for all your help. I don’t think that your classes could have been any better. Your Manual J &amp; D, and the Exam Prep Review Class had me way over prepared to the point that the test was no sweat. Thanks again.', 'Brett R.'),
    ('Thank you so much for sharing your gift of teaching and preparing me for the condition air exam. Your insight is remarkable, I have learned a lot from your class and felt very prepared while taking the test. I passed the Non-restricted portion of the test. God Bless', 'Freeman S.'),
    ('Thanks again for your patience and teaching technique. I really finally grasp the way to take this exam. Thanks again!', 'Mike C.'),
    ('Thanks, a million! I am very appreciative of your help during class, and your study guides approach to learning. Don’t think it would have been so easy without your help. Thanks again.', 'Joshua J.'),
    ('I really enjoyed the classes, great class, great format, and great atmosphere.', 'Lance D.'),
    ('Thanks for all your help!! I would not have passed without taking your classes.', 'Eric G.'),
    ('I took the Exam for the 1st time and PASSED!!!! Couldn’t have done it without this class, it is a must!', 'Keith D.'),
    ('I passed my exam with an adjusted score of 93. I could not have done this without your courses. With 21 years of experience I still could not have passed this exam without your exam prep review course.', 'James O.'),
    ('I would have never passed the CA License Exam without your help. Your classes even helped me tremendously in passing the Tennessee exams. I have been doing HVAC for over 40 years and I learned a lot. Thanks so much.', 'Marroll Sargent'),
    ('Mr. Garrison Michael is very professional, smart and does a great job explaining the testing process. I personally recommend taking his courses before attempting to apply for state licenses. It surely will save you lots of time and heartache. Classroom settings were comfortable easy to find from any location. The class had a relaxed atmosphere, snacks, and several breaks. The students were also encouraged to help one another. Garrison accepts feedback from students to tweak any necessary future improvements. In closing, my opinion this class is absolutely needed to pass this exam the first time!!!', 'R. Fulton Svcs'),
    ('Garrison, I took your Manual J and Manual D classes back in February. I also took your “CA” exam prep class back on September 20-21. I went and took my exam on October 10 and man it was a hard test. One of the hardest I have ever taken. There were a few questions that I had never seen, but for the most part there were a lot that we did go over. I’m writing you to let you know the results of my test; License # CN###### Conditioned Air Non-Restricted. I don’t know my test scores but I found my license on the Georgia Secretary of State website. I just want to say thanks for all your help. It really helped me pass this test. I don’t think I could have passed it without taking this exam prep class. God bless and take care.', 'Ricky McDowell'),
]
def initials(n): return ''.join(w[0] for w in n.replace('.', ' ').split()[:2]).upper()
pages['testimonials'] = ('Testimonials', [
    hero('Student stories', 'What students say', 'In their own words. 82% exam pass rate, 5,400+ student members.', crumbs=[('Home', U('/')), ('Testimonials', None)]),
    section([HTML('<div class="g-masonry">%s</div>' % ''.join('<figure class="g-tcard"><span class="g-qmark" aria-hidden="true">“</span><blockquote>%s</blockquote><figcaption class="g-who"><i aria-hidden="true">%s</i><span><b>%s</b>Student</span></figcaption></figure>' % (q, initials(n), n) for q, n in TESTI))], bg='mist'),
])

# ---------- Policies ----------
pages['policies'] = ('Policies', [
    hero('Policies', 'Policies', None, crumbs=[('Home', U('/')), ('Policies', None)]),
    section([C([C([h2('Cancellation policy', 'g-anchor'), prose('<p><b>Online classes are non-refundable.</b></p>'
        '<p>The design and exam prep classes to achieve your license are available on demand, with unlimited 24/7 access. Watch as many times as you wish, up to one year after the date you buy the class, or until you pass your exam, whichever comes first. Access can be extended if needed, for a fair fee based on how long it has been since you bought it.</p>'
        '<p>The CEU classes are available on demand, with unlimited 24/7 access. Watch as many times as you wish, up to 4 months after the date you buy the CEU class.</p>')], gap=16, el_id='cancellation'),
        C([h2('Terms and Conditions', 'g-anchor'), prose('<p>[CONFIRM: Terms and Conditions text from GLEC]</p>')], gap=16, el_id='terms'),
        C([H('Hold harmless policy', 'h2', None, 'navy', 'g-anchor', size=22), TX('<p class="g-fineprint">This policy is made upon the express condition that Georgia License Exam Company, Garrison Michael, its instructors, agents, employees, third parties shall be free from all liabilities and claims for damages and/or suits for or by reason of any injury, or death to any person or property of the Student, its agents or employees, or third parties, from any cause or causes whatsoever while in or upon said premises or any part thereof during the term of this policy or occasioned by any occupancy or use of said premises or any activity carried on by the Student in connection herewith, and the Student hereby covenants and agrees to indemnify, defend, save and hold harmless the Georgia License Exam Company, Garrison Michael, its instructors, agents, any third parties and employees from all liabilities, charges, expenses and costs on account of or by reason of any such injuries, deaths, liabilities, claims, suits or losses however occurring or damages growing out of the same.</p>', None, None)], 'g-fine-sec', gap=12, el_id='hold-harmless')],
        'g-narrow', gap=56)]),
])

# ---------- Technician certifications ----------
pages['technician-certifications'] = ('Technician certifications', [
    hero('NATE and EPA-608', 'Technician certifications', 'For students who want NATE and/or EPA-608 technician certification. EPA-608 Type 2 or higher is required for your Conditioned Air license application.', crumbs=[('Home', U('/')), ('Technician certifications', None)]),
    section([C([C([h2('Testing online'), prose('<p>GLEC no longer provides testing for EPA-608 and NATE certifications.</p>' + ul([
            'NATE has hired a company to provide remote monitoring of online testing for both NATE and EPA-608.', 'You can take the test from any computer at home or work.', 'It is also cheaper this way.', 'You can schedule a test whenever you like.',
            'NATE has study materials to prep you for the test, and there are other test preps online.']) + '<p><a href="https://www.natex.org" target="_blank" rel="noopener">Go to the NATE website, natex.org</a></p>')], gap=16),
        C([h2('Paper testing for EPA-608 in Atlanta'), prose(ul(['Call Stan Smith at <a href="tel:+14043911159">(404) 391-1159</a>.', 'Mingledorff&rsquo;s, Johnstone Supply and Baker Distributing (HVAC parts stores) may still offer EPA-608 testing.',
            '<a href="https://www.skillcatapp.com" target="_blank" rel="noopener">SkillCat (skillcatapp.com)</a> offers several EPA-608 certifications for the trades.']))], 'g-card g-card--flat', gap=16, pad=(32, 32, 32, 32), pad_m=(24, 20, 24, 20))],
        'g-twocol g-twocol--even', gap=64, gap_m=32)]),
])

# ---------- Board application ----------
pages['board-application'] = ('Board application and meeting dates', [
    hero('Board application', 'Board application process and meeting dates', 'How the Conditioned Air Board currently processes applications, and when it meets.', crumbs=[('Home', U('/')), ('Board application and meeting dates', None)]),
    section([C([C([h2('Continuous testing, year-round'), prose('<p>On 10-17-2022 the Georgia Construction Industry Licensing Board (CILB) and PSI-Exams announced that continuous testing is available, which greatly reduces the time for exam-approved applicants to get an exam appointment.</p>' + ul([
            'The Board sends PSI a list of applicants approved to sit for an exam, and PSI imports it into its system.', 'PSI then emails each candidate a confirmation and instructions for scheduling an exam appointment.',
            'Allow 7 to 10 business days from notice of the Board&rsquo;s approval to receive the email from PSI.', 'Questions: call <a href="tel:+14044249966">404-424-9966</a> or email <a href="mailto:Trades4@sos.ga.gov">Trades4@sos.ga.gov</a> (Georgia Secretary of State, CILB / PLB).']))], gap=16),
        C([h2('How applications are processed'), TX('<p class="g-muted-note">Application processes have changed and may continue to change, but this is basically the current process, as we understand it.</p>', None, None), prose(ul([
            'There are no application deadline dates any more.', 'Board staff typically take a couple of weeks to review applications and make sure they are 100% complete, with no deficiencies.',
            'Staff then tell the Board members which applications are ready for approval. The Board does not always wait for a Board meeting.', 'For questionable applications, the Board may wait for the next meeting to decide on approval or denial together.',
            'Some applications need more detailed review. The Board may email you describing your deficiencies, or on rarer occasions ask for a Zoom meeting or for you to appear at the next Board meeting.']))], gap=16)],
        'g-twocol g-twocol--even', gap=64, gap_m=32)]),
    section([C([C([h2('Board meeting dates for 2026'), TX('<p>All Board meeting dates are on a Wednesday. Dates are subject to change.</p>', 'body', 'slate')], gap=10),
        HTML('<ul class="g-dates">%s</ul>' % ''.join('<li><b>%s</b><span>%s</span></li>' % d for d in [('Feb 4', 'February'), ('Apr 29', 'April'), ('Jul 22', 'July'), ('Sep 21', 'September'), ('Oct 21', 'October')]))],
        'g-band', direction='row', justify='space-between', align='center', gap=40, dir_t='column')], bg='mist', pad=(72, 64, 80, 64)),
])

pages['how-to-get-licensed'] = ('How to get licensed', [
    hero('Step by step', 'How do I attain my Conditioned Air License?', 'We will guide you on the steps to properly complete your application process.', crumbs=[('Home', U('/')), ('How to get licensed', None)]),
    section([SC('[glec_steps]')]),
    section([C([H('Applications considerations chart', 'div', 'eyebrow', 'blue', 'g-eyebrow'), h2('Restricted or Non-Restricted: compare the requirements'), TX('<p>Descriptions of the requirements, classes and certificates for each license. Audio help opens in a new tab; close that tab when the audio is finished.</p>', 'body', 'slate')], gap=14), SC('[glec_license_chart]')], bg='mist', el_id='chart'),
])
json.dump({k: {'title': v[0], 'data': v[1]} for k, v in pages.items()}, open(os.path.join(BASE, 'build/pages.json'), 'w'))
print({k: len(json.dumps(v[1])) for k, v in pages.items()})
