import json, random, sys, urllib.parse, os
random.seed(1440)
BASE = sys.argv[1]
M = json.load(open(os.path.join(BASE, 'build/media.json')))
P = {"R":538,"C":539,"OL":540,"TABS":541,"SOS":542}
SITE = 'https://staging158.dreamweb.digital'
def rid(): return '%07x' % random.getrandbits(28)
def px(v): return {"unit":"px","size":v,"sizes":[]}
def dims(t,r,b,l): return {"unit":"px","top":str(t),"right":str(r),"bottom":str(b),"left":str(l),"isLinked":False}
def G(c): return "globals/colors?id="+c
def T(t): return "globals/typography?id="+t

def C(children, cls='', direction='column', gap=0, pad=None, pad_t=None, pad_m=None, gap_m=None, gap_t=None, boxed=False, bg=None, extra=None, align=None, justify=None, dir_t=None, dir_m=None, el_id=None, grow=False, bgimg=None, html_tag=None, wrap=False):
    s = {"content_width": "boxed" if boxed else "full", "flex_direction": direction,
         "flex_gap": {"column":str(gap),"row":str(gap),"isLinked":True,"unit":"px","size":gap},
         "padding": dims(*(pad or (0,0,0,0)))}
    if boxed: s["boxed_width"] = px(1312)
    if gap_t is not None: s["flex_gap_tablet"] = {"column":str(gap_t),"row":str(gap_t),"isLinked":True,"unit":"px","size":gap_t}
    if gap_m is not None: s["flex_gap_mobile"] = {"column":str(gap_m),"row":str(gap_m),"isLinked":True,"unit":"px","size":gap_m}
    if pad_t: s["padding_tablet"] = dims(*pad_t)
    if pad_m: s["padding_mobile"] = dims(*pad_m)
    if cls: s["css_classes"] = cls
    if bg: s["background_background"]="classic"; s["__globals__"]={"background_color":G(bg)}
    if bgimg:
        s["background_background"]="classic"; s["background_image"]={"url":M[bgimg]["url"],"id":M[bgimg]["id"],"size":"","alt":"","source":"library"}
        s["background_size"]="cover"; s["background_position"]="center center"; s["background_repeat"]="no-repeat"
    if align: s["flex_align_items"]=align
    if justify: s["flex_justify_content"]=justify
    if dir_t: s["flex_direction_tablet"]=dir_t
    if dir_m: s["flex_direction_mobile"]=dir_m
    if el_id: s["_element_id"]=el_id
    if grow: s["_flex_grow"]=1; s["_flex_size"]="grow"
    if html_tag: s["html_tag"]=html_tag
    if wrap: s["flex_wrap"]="wrap"
    if extra: s.update(extra)
    return {"id":rid(),"elType":"container","isInner":False,"settings":s,"elements":children}

def W(wtype, settings, cls=''):
    if cls: settings["_css_classes"] = cls
    return {"id":rid(),"elType":"widget","widgetType":wtype,"isInner":False,"settings":settings,"elements":[]}

def H(text, tag='h2', typo=None, color='navy', cls='', link=None, size=None, size_m=None, dyn=None, align=None):
    s = {"title": text, "header_size": tag, "__globals__": {}}
    if color: s["__globals__"]["title_color"] = G(color)
    if typo: s["__globals__"]["typography_typography"] = T(typo)
    if size:
        s["typography_typography"]="custom"; s["typography_font_size"]=px(size)
        if size_m: s["typography_font_size_mobile"]=px(size_m)
    if link: s["link"]={"url":link,"is_external":"","nofollow":""}
    if dyn: s["__dynamic__"]={"title":dyn}
    if align: s["align"]=align
    return W("heading", s, cls)

def TX(html, typo='body', color='slate', cls=''):
    s={"editor":html,"__globals__":{}}
    if typo: s["__globals__"]["typography_typography"]=T(typo)
    if color: s["__globals__"]["text_color"]=G(color)
    return W("text-editor", s, cls)

def BTN(text, url, cls='g-btn'):
    return W("button", {"text":text,"link":{"url":url,"is_external":"","nofollow":""},"align":"left"}, cls)

def HTML(html, cls=''): return W("html", {"html":html}, cls)
def IMG(key, cls='g-img', link=None):
    s={"image":{"url":M[key]["url"],"id":M[key]["id"],"size":"","alt":"","source":"library"},"image_size":"full","align":"left"}
    if link: s["link_to"]="custom"; s["link"]={"url":link,"is_external":"","nofollow":""}
    return W("image", s, cls)
def SC(code, cls=''): return W("shortcode", {"shortcode":code}, cls)
def ATC(pid, cls):
    return W("wc-add-to-cart", {"product_id":str(pid),"text":"Add to cart","show_quantity":"","align":"left","selected_icon":{"value":"","library":""},"icon":""}, 'g-atc '+cls)
def PRICE(pid, cls):
    tag = '[elementor-tag id="%s" name="woocommerce-product-price-tag" settings="%s"]' % (rid(), urllib.parse.quote(json.dumps({"product_id":str(pid),"format":"original"})))
    return H("$", 'span', None, None, 'g-num '+cls, dyn=tag)

# Lucide icons (1.5px stroke)
def ic(path, size=24): return '<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>' % (size,size,path)
I = {
 'arrow':'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
 'ext':'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
 'clip':'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
 'play':'<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
 'award':'<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
 'listc':'<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
 'target':'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
 'clock':'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 'pkg':'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
 'check':'<path d="M20 6 9 17l-5-5"/>',
 'checkc':'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
 'mail':'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
 'phone':'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
 'left':'<path d="m15 18-6-6 6-6"/>','right':'<path d="m9 18 6-6-6-6"/>',
}
def LINK(text, url, icon='arrow', cls='g-link', ext=False):
    t = ' target="_blank" rel="noopener"' if ext else ''
    lbl = '<span class="screen-reader-text"> (opens in a new tab)</span>' if ext else ''
    return HTML('<a href="%s"%s>%s%s %s</a>' % (url, t, text, lbl, ic(I[icon],20)), cls)

PHONE = '[CONFIRM: phone number]'
START = SITE + '/how-to-get-licensed/'
SECT = (104,64,104,64); SECT_T=(80,40,80,40); SECT_M=(64,20,64,20)

def head_row(eyebrow, h2, link=None, intro=None, light=False, cls=''):
    left = [H(eyebrow,'div','eyebrow','line' if light else 'blue','g-eyebrow'+(' g-eyebrow-light' if light else '')),
            H(h2,'h2','h2','white' if light else 'navy')]
    if intro: left.append(TX('<p>%s</p>' % intro,'lead','slate'))
    kids=[C(left, 'g-head-left', gap=14, extra={"width":px(720) if intro else None} if False else None)]
    if link: kids.append(link)
    return C(kids, 'g-head '+cls, direction='row', gap=40, justify='space-between', align='flex-end', extra={"margin":dims(0,0,48,0),"margin_mobile":dims(0,0,32,0)}, gap_m=20)

# ---------------- HOMEPAGE ----------------
home = []
# Hero
hero_card = ('<div class="g-pcard" aria-hidden="true"><div class="g-pcard__top"><span class="g-pcard__code">CA-OL</span><span class="g-pcard__done">%s8 of 20 complete</span></div>'
  '<div class="g-pcard__title">Exam Prep Review Class</div><div class="g-pcard__bar"><span></span></div>'
  '<div class="g-pcard__foot"><span>Lesson 9 · Gas pipe sizing</span><b>Continue →</b></div></div>'
  '<div class="g-cpill" aria-hidden="true"><i>%s</i>Certificate prints instantly</div>') % (ic(I['checkc'],14), ic('<path d="M20 6 9 17l-5-5" stroke="#fff" stroke-width="2.5"/>',16))
home.append(C([
    C([], 'g-hero-photo', bgimg='hero-home-study.webp', extra={"background_position":"center center"}),
    HTML('<div class="s1"></div><div class="s2"></div><div class="gr"></div>', 'g-hero-decor'),
    C([
        H('Georgia Conditioned Air (HVAC) contractor license','div',None,None,'g-eyebrow-stripe'),
        H('Get your Georgia HVAC license. We’ll show you every step.','h1','h1','white'),
        TX('<p>Online classes taught by Garrison Michael, with full step-by-step solutions. Unlimited 24/7 access for up to a year or until you pass.</p>', None, 'line', 'g-hero-sub'),
        C([BTN('Start here', START, 'g-btn g-btn-shadow'), BTN('See classes and prices', '#classes', 'g-btn-ghost')], 'g-hero-btns', direction='row', gap=16, dir_m='column', gap_m=12, extra={"margin":dims(6,0,0,0)}),
    ], 'g-hero-content g-on-navy', gap=26, pad=(92,64,0,64), pad_t=(64,40,48,40), pad_m=(40,20,40,20), gap_m=20, extra={"width":px(760),"width_tablet":{"unit":"%","size":100},"_flex_size":"none"}),
    HTML(hero_card, 'g-hero-float'),
], 'g-hero', bg='navy', extra={"min_height":px(700),"min_height_tablet":px(0),"overflow":"hidden"}, html_tag='section'))
# subtitle typography (20px)
home[-1]["elements"][2]["elements"][2]["settings"].update({"typography_typography":"custom","typography_font_family":"Inter","typography_font_size":px(20),"typography_font_size_mobile":px(17),"typography_line_height":{"unit":"em","size":1.6}})

# Proof strip
def proof(num, a, b):
    return C([H(num,'span',None,None,'g-num'), TX('<p class="g-proof__lbl">%s<strong>%s</strong></p>' % (a,b), None, None)], 'g-proof__cell', direction='row', gap=18, align='center', pad=(30,40,30,40), pad_t=(24,24,24,24))
home.append(C([proof('20','years in business','since 2006'), proof('82%','exam pass rate','Georgia CA exam'), proof('5,400+','student members','GA, SC, AL, TN and beyond')], 'g-proof', direction='row'))

# Steps
def step(n, icon, h3, body):
    return C([C([H(n,'span',None,None,'g-num'), HTML('<span class="g-ico g-ico--navy">%s</span>' % ic(I[icon],26))], direction='row', justify='space-between', align='center'),
              H(h3,'h3','h3','navy'), TX('<p>%s</p>' % body,'body','slate')], 'g-step', gap=16, pad=(32,32,36,32), pad_m=(24,20,28,20))
home.append(C([
    head_row('Start here','How to get licensed, in three steps', LINK('See all 10 steps', SITE+'/how-to-get-licensed/')),
    C([step('01','clip','Check which license fits','Restricted (Class 1) for units up to 5 tons, or Non-Restricted (Class 2) for all sizes. Our chart shows which one matches your experience.'),
       step('02','play','Take the design classes','Residential Design is required for every license. Non-Restricted adds Commercial Design. Then apply to the Board online through GOALS.'),
       step('03','award','Prep for the exam and pass','After Board approval, take the Exam Prep Review Class, tab your books and schedule your PSI exam.')], 'g-g3 g-steps-grid', gap=24, gap_m=16),
], 'g-tex-mist', boxed=True, pad=(144,64,104,64), pad_t=(112,40,80,40), pad_m=(64,20,64,20), extra={"margin":dims(-40,0,0,0),"margin_mobile":dims(-24,0,0,0)}, html_tag='section'))

# Classes
def pcard(code, qual, h3, body, pid, free=False):
    q = '<span class="g-qual%s">%s</span>' % (' g-qual--free' if free else '', qual)
    return C([HTML('<div class="g-pills"><span class="g-code">%s</span>%s</div>' % (code,q)),
              H(h3,'h3','h3_card','navy'), TX('<p>%s</p>' % body, None, None, 'g-grow'),
              C([PRICE(pid,'g-price'), ATC(pid,'g-atc-sec')], direction='row', justify='space-between', align='center', gap=16, extra={"padding":dims(8,0,0,0)})],
             'g-card', gap=12, pad=(28,28,28,28), pad_m=(22,20,22,20))
checks = '<ul class="g-checks">' + ''.join('<li>%s%s</li>' % (ic(I['check'],20), t) for t in ['Residential Design Study Guide included','SOS-APP application videos included free','Certificate prints when you finish the videos']) + '</ul>'
feature = C([
    HTML('<div class="g-pills"><span class="g-code g-code--dark">HLG-DD-R-OL</span><span class="g-badge">Required for every CA license</span></div>'),
    H('Residential Design Class','h3',None,'white', size=32, size_m=26),
    TX('<p>ACCA Manual J &amp; D: heat loss and gain, duct design. About 16 hours online.</p>', None, 'light_slate'),
    HTML(checks),
    C([C([TX('<p class="g-small-light">Restricted and Non-Restricted</p>',None,None), PRICE(P['R'],'g-pricebig')], 'g-auto'),
       ATC(P['R'],'g-atc-primary')], 'g-feature-foot', direction='row', justify='space-between', align='flex-end', gap=20, extra={"padding":dims(20,0,0,0)}, wrap=True),
], 'g-feature g-tex-navy g-on-navy', gap=20, pad=(40,40,40,40), pad_m=(28,22,28,22), bg='navy')
feature["elements"][1]["settings"].update({"typography_font_family":"Inter Tight","typography_font_weight":"600","typography_line_height":{"unit":"em","size":1.15},"typography_letter_spacing":{"unit":"em","size":-0.02}})
feature["elements"][2]["settings"].update({"typography_typography":"custom","typography_font_size":px(17)})
home.append(C([
    head_row('Prices up front','Conditioned Air license classes', LINK('Order the books','https://sebookstore.com/glec.html','ext',ext=True),
             intro='All online. Unlimited 24/7 access for up to a year or until you pass. You buy the reference books separately.'),
    C([feature,
       pcard('HLG-DD-C-OL','Non-Restricted only','Commercial Design Class','Carrier System Design Manuals 1, 2 and 3. About 8 hours online.',P['C']),
       pcard('CA-OL','After Board approval','Exam Prep Review Class','Every reference book except Manuals J &amp; D, plus quizzes. Ships a printed study guide.',P['OL']),
       pcard('CA-TABs','Shipped','Permanent reference tabs','317+ laser-printed tabs with placement charts. Best bought with CA-OL. [CONFIRM: 317 or 328]',P['TABS']),
       pcard('SOS-APP','Free with design classes','Application Overview videos','How to complete the Board application in GOALS, with checklists.',P['SOS'],free=True)],
      'g-classgrid', gap=24, gap_m=16),
], '', boxed=True, pad=SECT, pad_t=SECT_T, pad_m=SECT_M, el_id='classes', html_tag='section'))

# Why GLEC
def wcard(icon, h3, body):
    return C([HTML('<span class="g-ico g-ico--white">%s</span>' % ic(I[icon],22)),
              C([H(h3,'h3',None,'navy', size=21, size_m=19), TX('<p>%s</p>' % body, None, None)], 'g-wtext', gap=12)], 'g-wcard', gap=12, pad=(24,24,24,24))
for w in []: pass
why_left = C([
    C([H('Why GLEC','div','eyebrow','blue','g-eyebrow'), H('Taught the way the exam is written','h2','h2','navy')], gap=14),
    C([wcard('listc','Solutions, not answers','Every example shows the chart lookup, the equation and the calculator keys.'),
       wcard('target','Only the Georgia CA exam','One exam, one Board, one application. We know exactly what is on the test.'),
       wcard('clock','24/7 for up to a year','Watch from home or the job, as many times as you need, until you pass.'),
       wcard('pkg','Tabs, guide, application','Permanent tabs, a printed study guide and application help, ready before exam day.')], 'g-g2', gap=20, gap_m=12),
], gap=36, gap_m=28)
for c in why_left["elements"][1]["elements"]:
    h=c["elements"][1]["elements"][0]["settings"]; h.update({"typography_font_family":"Inter Tight","typography_font_weight":"600","typography_line_height":{"unit":"em","size":1.3}})
why_media = C([HTML('<div class="g-back"></div>','g-media-deco g-under'), IMG('practice-exam.webp'),
               HTML('<div class="g-chip"><b class="g-tab">1,740+</b><span>online design<br>classes sold</span></div>','g-media-deco')], 'g-why-media')
home.append(C([C([why_left, why_media], 'g-why', gap=80, gap_t=48, gap_m=40)], '', boxed=True, pad=(40,64,104,64), pad_t=(24,40,80,40), pad_m=(24,20,64,20), html_tag='section'))

# Stats
def stat(num, lbl):
    return C([H(num,'span',None,None,'g-num'), TX('<p>%s</p>' % lbl, None, None)], 'g-stat', gap=8, pad=(0,0,0,28))
slides = [('82%','exam pass rate','On the Georgia Conditioned Air exam.'),('5,400+','student members','From Georgia, SC, AL, TN and nationwide companies.'),('1,740+','online design classes sold','Residential and Commercial Design, online since 2018.'),('20','years in business','Founded 2006. 20th anniversary October 2026.')]
slider = ('<div class="g-sl" role="region" aria-roledescription="carousel" aria-label="GLEC by the numbers">'
  '<button type="button" class="g-sl__btn g-sl__btn--prev" aria-label="Previous stat">%s</button>'
  '<div class="g-sl__track">%s</div>'
  '<button type="button" class="g-sl__btn g-sl__btn--next" aria-label="Next stat">%s</button>'
  '<div class="g-sl__dots">%s</div><div class="g-sl__live screen-reader-text" aria-live="polite"></div></div>') % (
  ic(I['left'],22), ''.join('<div class="g-sl__slide" role="group" aria-roledescription="slide" aria-label="%d of 4"><b>%s</b><span>%s</span><small>%s</small></div>' % (i+1,a,b,c) for i,(a,b,c) in enumerate(slides)),
  ic(I['right'],22), ''.join('<button type="button" aria-label="Show stat %d"></button>' % (i+1) for i in range(4)))
home.append(C([C([stat('82%','exam pass rate'), stat('5,400+','student members'), stat('1,740+','online design classes sold'), stat('20','years in business, since 2006')], 'g-g4', gap=40, gap_t=32),
               HTML(slider,'g-slider')], 'g-stats g-tex-navy g-on-navy', boxed=True, bg='navy', pad=(72,64,72,64), pad_t=(64,40,64,40), pad_m=(48,20,40,20), html_tag='section'))

# Instructor
def tile(num, lbl): return C([H(num,'span',None,None,'g-num'), TX('<p>%s</p>' % lbl, None, None)], 'g-tile', gap=6, pad=(20,20,20,20))
instr_media = C([HTML('<div class="g-hatch"></div>','g-media-deco g-under'), IMG('garrison.webp'),
                 HTML('<div class="g-badge20" aria-hidden="true"><b>20</b><span>years<br>2006–2026</span></div>','g-media-deco')], 'g-instr-media')
instr_txt = C([H('Meet your instructor','div','eyebrow','blue','g-eyebrow'), H('Garrison Michael','h2','h2','navy'),
    TX('<p>Owner and instructor. Founded GLEC in 2006 after teaching the Conditioned Air review classes at the Georgia Trane Training Center.</p>', None, 'slate'),
    C([tile('34+','years in HVAC'), tile('6','states licensed'), tile('B.S.','Building Construction Engineering')], 'g-g3', gap=16, gap_m=8, extra={"margin":dims(8,0,0,0)}),
    TX('<p>Formerly with Trane and Johnson Controls. GA Conditioned Air Non-Restricted, GA Low Voltage Universal, EPA 608/609, LEED AP, DET.</p>', None, 'slate'),
    LINK('About GLEC', SITE+'/about/')], gap=20)
instr_txt["elements"][2]["settings"].update({"typography_typography":"custom","typography_font_size":px(20),"typography_font_size_mobile":px(17),"typography_line_height":{"unit":"em","size":1.6}})
instr_txt["elements"][4]["settings"].update({"typography_typography":"custom","typography_font_size":px(17),"typography_font_size_mobile":px(15),"typography_line_height":{"unit":"em","size":1.6}})
home.append(C([C([instr_media, instr_txt], 'g-instr', gap=96, gap_t=56, gap_m=48)], 'g-tex-none', boxed=True, bg='mist', pad=SECT, pad_t=SECT_T, pad_m=SECT_M, html_tag='section'))

# CEU
rows = [('Carrier System Design Manuals 1, 2, 3','4 hours','$50'),('EPA Mold Remediation, an HVAC perspective','4 hours','$50'),('Wire Helix Trunk &amp; Branch Duct Sizing','4 hours','$50'),('2018, 2021 or 2024 Code Changes, IFGC &amp; IMC','4 hours','$50'),('ADC Flex Duct Installation Standards','1 hour','$15')]
ptable = '<div class="g-ptable" role="table" aria-label="CEU classes and prices">' + ''.join('<div class="g-ptable__row" role="row"><span role="cell">%s</span><span role="cell">%s</span><span role="cell">%s</span></div>' % r for r in rows) + '</div>'
ceu_media = C([IMG('workshop-mentorship.webp'), HTML('<div class="g-approved"><i>%s</i><span><strong>Board-approved</strong><span>Georgia Conditioned Air Licensing Board</span></span></div>' % ic(I['award'],22),'g-media-deco')], 'g-ceu-media')
ceu_txt = C([H('License renewal','div','eyebrow','blue','g-eyebrow'), H('Renewing your license? Board-approved CEU classes.','h2','h2','navy'),
    TX('<p>Licensed CA contractors need 4 CEU hours a year. All online, 4 months of access, certificate prints the moment you finish the videos.</p>','lead','slate'),
    HTML(ptable), BTN('See CEU classes', SITE+'/#ceu', 'g-btn')], gap=20)
home.append(C([C([ceu_media, ceu_txt], 'g-ceu', gap=80, gap_t=48, gap_m=32)], '', boxed=True, pad=SECT, pad_t=SECT_T, pad_m=SECT_M, el_id='ceu', html_tag='section'))

# Testimonials
def quote(q, ini, name):
    return C([HTML('<span class="g-qmark" aria-hidden="true">“</span>'), TX('<blockquote>%s</blockquote>' % q, None, None, 'g-qtext'),
              HTML('<div class="g-who"><i aria-hidden="true">%s</i><span><b>%s</b>Student</span></div>' % (ini,name))], 'g-quote', gap=18, pad=(32,32,32,32), pad_m=(24,20,24,20), html_tag='figure')
home.append(C([
    head_row('Student stories','What students say', LINK('Read more student stories', SITE+'/#testimonials', cls='g-link g-link-white'), light=True),
    C([quote('I passed my exam with an adjusted score of 93. I could not have done this without your courses. With 21 years of experience I still could not have passed this exam without your exam prep review course.','JO','James O.'),
       quote('I just got an email confirmation that I passed my exam and was approved by the board. Thanks for all your help. I don’t think that your classes could have been any better. Your Manual J &amp; D, and the exam prep review class had me way over prepared to the point that the test was no sweat. Thanks again.','BR','Brett R.'),
       quote('I would have never passed the CA License Exam without your help. Your classes even helped me tremendously in passing the Tennessee exams. I have been doing HVAC for over 40 years and I learned a lot. Thanks so much.','MS','Marroll S.')], 'g-g3', gap=24, gap_m=16),
], 'g-testi g-on-navy', boxed=True, bgimg='classroom.webp', pad=SECT, pad_t=SECT_T, pad_m=SECT_M, el_id='testimonials', html_tag='section'))

# CTA
contact_row = '<div class="g-contactrow"><a href="mailto:Info@GeorgiaLicenseExam.com">%sInfo@GeorgiaLicenseExam.com</a><span>%s%s</span></div>' % (ic(I['mail'],20), ic(I['phone'],20), PHONE)
home.append(C([C([
    C([H('Not sure where to start?','h2','h2','navy'), TX('<p>The 10-step guide walks you from your first question to your license. Or ask us directly.</p>','lead','slate'), HTML(contact_row)], 'g-cta-copy', gap=16, extra={"_flex_size":"grow"}),
    C([BTN('Start here', START, 'g-btn g-btn-56'), BTN('Contact us', SITE+'/contact/', 'g-btn-sec g-btn-56')], 'g-cta-btns', gap=12),
], 'g-cta', gap=48, gap_m=24, pad=(64,72,64,72), pad_t=(48,48,48,48), pad_m=(32,24,32,28))], 'g-tex-mist', boxed=True, pad=SECT, pad_t=SECT_T, pad_m=SECT_M, html_tag='section'))

# ---------------- HEADER ----------------
header = [C([
    IMG('glec-logo.png','g-logo', link=SITE+'/'),
    W('nav-menu', {"menu":"primary","layout":"horizontal","pointer":"none","align_items":"center","dropdown":"none","toggle":"","full_width":""}, 'g-nav'),
    C([H('<a href="%s/my-account/">Log in</a>' % SITE,'div',None,None,'g-loginlink g-hdr-login'), SC('[glec_cart]','g-cartwrap'),
       BTN('Start here', START, 'g-btn g-hdr-btn'), SC('[glec_mobile_menu]','g-burger')], 'g-hdr-right g-auto', direction='row', align='center', gap=24, gap_m=4, extra={"width":{"unit":"%","size":""},"_flex_size":"none"}),
], 'g-header', direction='row', align='center', justify='space-between', gap=32, gap_m=8, boxed=True, bg='white', pad=(0,64,0,64), pad_t=(0,40,0,40), pad_m=(0,20,0,12), extra={"min_height":px(76),"min_height_mobile":px(64)}, html_tag='div')]
# nav menu needs the menu slug; set at runtime
# ---------------- FOOTER ----------------
def fcol(title, items):
    lis = ''.join('<li>%s</li>' % i for i in items)
    return C([H(title,'h2',None,'ink'), HTML('<ul class="g-flinks">%s</ul>' % lis)], 'g-fcol', gap=16)
L = lambda t,u,c='': '<a href="%s"%s>%s</a>' % (u, (' class="%s"' % c) if c else '', t)
footer = [C([
    C([C([IMG('glec-logo.png','g-logo', link=SITE+'/'), TX('<p>Online classes for the Georgia Conditioned Air contractor license and Board-approved CEUs, since 2006.</p>','small','slate')], gap=18, extra={"width":px(300)}),
       fcol('Classes',[L('License classes',SITE+'/#classes'),L('CEU classes',SITE+'/#ceu'),L('Technician certifications','#')]),
       fcol('Help',[L('How to get licensed',SITE+'/how-to-get-licensed/'),L('Quick links','#'),L('Board application and meeting dates','#'),L('Contact',SITE+'/contact/')]),
       fcol('Company',[L('About',SITE+'/about/'),L('Testimonials',SITE+'/#testimonials'),L('Policies',SITE+'/policies/')]),
       fcol('Contact',['2625 Piedmont Road NE<br>UPS Store, Ste 56, PMB-320<br>Atlanta, Georgia 30324-3086<small>Mailing address only</small>', L('Info@GeorgiaLicenseExam.com','mailto:Info@GeorgiaLicenseExam.com','g-blue'), PHONE]),
    ], 'g-fgrid', gap=48, gap_t=32, gap_m=28),
    C([TX('<p>© 2026 Georgia License Exam Company</p>',None,None), HTML('<ul class="g-flinks">%s</ul>' % ''.join('<li>%s</li>' % x for x in [L('Policies',SITE+'/policies/'), L('Hold Harmless policy',SITE+'/policies/#hold-harmless')]))],
      'g-fine', direction='row', justify='space-between', gap=40, gap_m=12, extra={"margin":dims(56,0,0,0),"margin_mobile":dims(40,0,0,0),"padding":dims(24,0,0,0)}),
], 'g-footer', boxed=True, bg='white', pad=(72,64,40,64), pad_t=(56,40,40,40), pad_m=(48,20,32,20), html_tag='div')]
for c in footer[0]["elements"][0]["elements"][1:]:
    c["elements"][0]["settings"]["header_size"]="h2"

out = {"home":home,"header":header,"footer":footer}
json.dump(out, open(os.path.join(BASE,'build/elementor.json'),'w'))
print({k:len(json.dumps(v)) for k,v in out.items()})
