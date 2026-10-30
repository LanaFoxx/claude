"""Brand pass, applied to every published HTML fragment (pages, header/footer, plugin templates).

The design files keep the original navy/olive palette; this pass maps them onto the active theme:
1. Structure: photo heroes become a light hero surface; accents inside dark bands use the theme's on-dark
   accent; coupon/offer chips use the coral chip; buttons follow the theme's action colour.
2. Palette and fonts: old colour values and font families map onto theme tokens everywhere (CSS and JS too).

Switch the live look by changing THEME below and republishing (content, hf, plugin templates).
"""
import re

UP = 'https://taxcoursefinder.com/wp-content/uploads/2026/10/'

THEMES = {
    'cobalt': dict(
        ink='#0B1540', dark_hover='#050C30', action='#1A3DFF', action_hover='#1430CC', on_action='#fff',
        accent_dark='#B9C5EE', heading_accent='#1A3DFF', accent_italic=False,
        secondary='#4A5680', muted='#5A6690', faint='#5A6690', hero='#F3F6FF', soft='#F3F6FF', tint='#F3F6FF',
        tint_strong='#DCE3FF', tint_soft='#E8EDFF', border='#D6DEF5', border_strong='#B9C5EE', outline='#0B1540',
        coral='#FF5A5F', coral_text='#C93338', coral_tint='#FFF1F1',
        shadow='11,21,64', shadow_float='rgba(11,21,64,.14)', accent_rgb='26,61,255',
        serif=('Outfit,sans-serif', 600), sans='Geist', sans_max=800,
        logo='california-tax-course-finder-logo-hd-cobalt.png', logo_white='california-tax-course-finder-logo-white-hd-cobalt.png',
        check='check-cobalt.png', check_dark='check-periwinkle.png', cta='Compare Courses',
        fonts_url='https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap',
        css=('.tcf-scope h1,.tcf-scope h2,.tcf-scope h3,.tcf-scope h4{font-family:Outfit,sans-serif!important;letter-spacing:-.035em}'
             '.tcf-scope h1{font-weight:600}.tcf-scope h3,.tcf-scope h4{letter-spacing:-.02em}'
             '.tcf-home-h1>span{font-weight:700}'
             '.tcf-footer{border-top:3px solid #1A3DFF}'
             '.tcf-topbar-left{background:rgba(26,61,255,.28)!important;color:#fff!important;border-color:rgba(185,197,238,.45)!important}'
             '.tcf-header nav.tcf-nav>a.tcf-nav-cta:hover{background:#1430CC!important;border-color:#1430CC!important}'),
    ),
    'studio': dict(
        ink='#23272A', dark_hover='#15181A', action='#23272A', action_hover='#15181A', on_action='#FAF7F2',
        accent_dark='#FF6B57', heading_accent='#FF6B57', accent_italic=True,
        secondary='#4B4F54', muted='#4B4F54', faint='#8B8F94', hero='#FAF7F2', soft='#FAF7F2', tint='#FFF1EE',
        tint_strong='#FFE3DD', tint_soft='#FFF1EE', border='#D9D4CC', border_strong='#D9D4CC', outline='#D9D4CC',
        coral='#FF6B57', coral_text='#C2452F', coral_tint='#FFF1EE',
        shadow='0,0,0', shadow_float='rgba(0,0,0,.18)', accent_rgb='255,107,87',
        serif=("'Instrument Serif',serif", 400), sans="'Instrument Sans'", sans_max=700,
        logo='california-tax-course-finder-logo-hd-studio.png', logo_white='california-tax-course-finder-logo-white-hd-studio.png',
        check='check-charcoal.png', check_dark='check-coral.png', cta='Find a course',
        fonts_url='https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap',
        css=(  # sections alternate white and off-white (#FAF7F2): old grey sections and heroes become off-white
             '.tcf-scope h1,.tcf-scope h2{font-family:\'Instrument Serif\',serif!important;font-weight:400!important;letter-spacing:-.02em}'
             '@media (min-width:768px){.tcf-home-h1{font-size:clamp(40px,6.2vw,88px)!important;line-height:.98!important}}'
             '.tcf-scope h1{line-height:1!important}.tcf-scope h1:not(.tcf-home-h1){font-size:clamp(44px,5.6vw,80px)!important}'
             '.tcf-scope h3,.tcf-scope h4{font-family:\'Instrument Sans\',sans-serif!important;letter-spacing:-.01em}'
             '.tcf-scope h1 em,.tcf-scope h2 em,.tcf-accent{font-style:italic}'
             '.tcf-eyebrow::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:#FF6B57;margin-right:10px;vertical-align:1px;flex:none}'
             '.tcf-scope p a:not([style*="background"]),.tcf-scope li a:not([style*="background"]){text-decoration:underline;text-underline-offset:3px}'
             '.tcf-scope p a:not([style*="background"]):hover,.tcf-scope li a:not([style*="background"]):hover{color:#C2452F!important}'
             '.tcf-footer{border-top:3px solid #FF6B57}.tcf-footer a{color:rgba(250,247,242,.8)!important}.tcf-footer a:hover{color:#FAF7F2!important}'
             '.tcf-topbar-left{background:rgba(255,107,87,.16)!important;color:#FAF7F2!important;border-color:rgba(255,107,87,.55)!important}'
             '.tcf-topbar-link{color:#FF6B57!important}'
             '.tcf-header nav.tcf-nav>.dd>div:first-child:not(.tcf-nav-btn){font:500 16px \'Instrument Sans\',sans-serif!important}'
             '.tcf-header nav.tcf-nav .dd>div.tcf-nav-btn{background:#fff!important;border-color:#D9D4CC!important;color:#23272A!important}'
             '.tcf-header nav.tcf-nav .dd>div.tcf-nav-btn:hover{border-color:#23272A!important;background:#fff!important;color:#23272A!important}'
             '.tcf-header nav.tcf-nav>a.tcf-nav-cta{color:#FAF7F2!important}'
             '.tcf-header nav.tcf-nav>a.tcf-nav-cta::after{content:"\\2192"!important;color:#FF6B57;margin-left:4px}'
             '.tcf-header nav.tcf-nav>a.tcf-nav-cta:hover{background:#15181A!important;border-color:#15181A!important}'
             '.tcf-thead{color:#FAF7F2!important}'
             '.tcf-course-cards{position:relative;display:flex;flex-direction:column;gap:10px;width:100%;max-width:620px;margin-bottom:22px}'
             '.tcf-cc{cursor:pointer;display:flex;align-items:center;gap:14px;border:1.5px solid;border-radius:12px;padding:20px 24px;text-align:left;font:600 19px \'Instrument Sans\',sans-serif;transition:background .15s,border-color .15s}'
             '.tcf-cc-s{font-weight:500;margin-left:2px}.tcf-cc svg{margin-left:auto;flex:none}'),
    ),
}
THEME = 'studio'
T = THEMES[THEME]
INK, COBALT, COBALT_HOVER = T['ink'], T['action'], T['action_hover']  # names kept for callers
SECONDARY, MUTED, SOFT, BORDER, BORDER_STRONG = T['secondary'], T['muted'], T['soft'], T['border'], T['border_strong']
CORAL, CORAL_TEXT, CORAL_TINT = T['coral'], T['coral_text'], T['coral_tint']
STUDIO = THEME == 'studio'

COLORS = {
    '#0B2E40': INK, '#2F4652': INK, '#22365E': INK, '#082433': T['dark_hover'],
    '#95AB3B': T['action'], '#7E9330': T['action'], '#5E6F22': T['action_hover'],
    '#AEC25A': T['accent_dark'], '#D4E09B': T['accent_dark'], '#DDE3B6': BORDER_STRONG, '#C9D58F': BORDER_STRONG, '#C5D0DE': BORDER_STRONG,
    '#B5BECB': T['faint'], '#5A6E78': SECONDARY, '#8A9AA3': MUTED,
    '#D7DFE2': BORDER, '#E3E9EB': BORDER,
    '#F3F5E6': T['tint'], '#D7EDC8': T['tint_strong'], '#E4F3DC': T['tint_soft'],
    '#F4F6F7': SOFT, '#F7F9FA': SOFT, '#F9FBFD': SOFT, '#E9EFF6': SOFT,
}
RGBA = {'rgba(0,0,0,.35)': T['shadow_float'], 'rgba(11,46,64,': 'rgba(%s,' % T['shadow'],
        'rgba(149,171,59,': 'rgba(%s,' % T['accent_rgb'], 'rgba(108,190,69,': 'rgba(%s,' % T['accent_rgb']}
OLIVE_TEXT = ('#95AB3B', '#7E9330', '#AEC25A', '#C9D58F')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
TOKEN = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][\w:-]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)(/?)>', re.S)
STYLE = re.compile(r'(\sstyle=")([^"]*)(")')
OLIVE_COLOR = re.compile(r'(?<![-\w])color:(#95AB3B|#7E9330|#AEC25A|#C9D58F)\b', re.I)


def _light_style(st):
    """Restyle one element inside a hero that moved from the dark photo to the light surface."""
    st = re.sub(r'(?<![-\w])color:#AEC25A\b', 'color:' + T['heading_accent'], st, flags=re.I)  # headline accent
    filled = re.search(r'background:(#95AB3B|#7E9330|#0B2E40|#fff\b|#FFF\b|#ffffff|\{\{)', st)
    if not filled:
        st = re.sub(r'(?<![-\w])color:#fff\b', 'color:' + INK, st)
        st = re.sub(r'(?<![-\w])color:rgba\(255,255,255,(\.\d+|1|0)\)',
                    lambda m: 'color:' + (SECONDARY if float(m.group(1)) >= .7 else T['faint'] if STUDIO else MUTED), st)
    button = 'border-radius:999px' in st and 'padding:14px' in st
    st = re.sub(r'((?:border(?:-\w+)?):[^;]*?)rgba\(255,255,255,[.\d]+\)',
                lambda m: m.group(1) + (T['outline'] if button else BORDER_STRONG), st)
    if button and STUDIO and 'background:transparent' in st:
        st = st.replace('background:transparent', 'background:#fff')
    st = st.replace('border:1px solid rgba(108,190,69,.5)', 'border:1px solid ' + BORDER_STRONG)
    st = re.sub(r'background(-color)?:rgba\(255,255,255,(\.[0-3]\d*|0)\)', 'background:#fff', st)
    st = re.sub(r'background-image:linear-gradient\(135deg,rgba\(255,255,255,\.07\)[^;]*\);?', '', st)
    st = re.sub(r'text-shadow:[^;]+;?', '', st)
    return st


def _dark_style(st):
    st = OLIVE_COLOR.sub('color:' + T['accent_dark'], st)
    if STUDIO and re.search(r'background:(#95AB3B|#7E9330)\b', st) and 'border-radius:999px' in st:
        # charcoal buttons would vanish on a charcoal band: invert them
        st = re.sub(r'background:(#95AB3B|#7E9330)\b', 'background:#FAF7F2', st)
        st = re.sub(r'border:1\.5px solid (#95AB3B|#7E9330)', 'border:1.5px solid #FAF7F2', st)
        st = re.sub(r'(?<![-\w])color:[^;]+;?', '', st).rstrip(';') + ';color:' + INK
    return st


def _is_hero(st, rest):
    if st.startswith('position:relative;overflow:hidden;color:#fff;padding:') and 'object-fit:cover' in rest[:600]:
        return 'photo'
    if st.startswith('background:#0B2E40;background-image:linear-gradient(135deg') and 'padding:50px 16px' in st:
        return 'mobile'
    if re.match(r'position:relative;background:#0B(2E|15)40;padding:72px 56px 80px;color:#fff;overflow:hidden', st):
        return 'school'
    return None


def _is_dark(st):
    return bool(re.search(r'background(?:-color)?:(#0B2E40|#082433|rgba\(11,46,64,\.9)', st)) or \
        bool(re.search(r'background(?:-image)?:linear-gradient\([^;]*(#0B2E40|rgba\(11,46,64,\.9)', st))


def _is_light(st):
    return bool(re.search(r'background(?:-color)?:(#fff\b|#FFF\b|#ffffff|#F4F6F7|#F3F5E6|#F7F9FA|#F9FBFD)', st))


def _add_class(attrs, cls):
    if re.search(r'\sclass="', attrs):
        return re.sub(r'(\sclass=")', r'\1' + cls + ' ', attrs, count=1)
    return ' class="%s"' % cls + attrs


def structure(h):
    # stack entries: (tag, ctx, button); ctx: none | dark | hero | skip
    out, i, stack = [], 0, [('#root', 'none', False)]
    for m in TOKEN.finditer(h):
        if m.start() < i:
            continue
        skipping = stack[-1][1] == 'skip'
        if not skipping:
            out.append(h[i:m.start()])
        i = m.end()
        tok = m.group(0)
        if tok.startswith('<!--'):
            if not skipping:
                out.append(tok)
            continue
        close, name, attrs, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        tag = name.lower()
        if not close and tag in ('script', 'style'):
            j = h.lower().find('</' + tag, i)
            j = len(h) if j < 0 else h.index('>', j) + 1
            if not skipping:
                out.append(tok + h[i:j])
            i = j
            continue
        if close:
            k = next((n for n in range(len(stack) - 1, 0, -1) if stack[n][0] == tag), None)
            if k is not None:
                del stack[k:]
            if not skipping:
                out.append(tok)
            continue
        parent, in_button = stack[-1][1], stack[-1][2]
        sm = STYLE.search(attrs)
        st = sm.group(2) if sm else ''
        ctx = parent
        if parent == 'skip':
            pass
        elif parent == 'hero' and st.startswith('position:absolute;inset:0'):
            ctx = 'skip'  # photo, navy overlay and sheen behind the old hero
        else:
            kind = _is_hero(st, h[i:])
            if kind:
                ctx = 'hero'
                if kind == 'photo':
                    st = st.replace('color:#fff', 'color:%s;background:%s' % (INK, T['hero']), 1)
                elif kind == 'school':
                    st = re.sub(r'background:#0B(2E|15)40;', 'background:%s;' % T['hero'], st).replace('color:#fff', 'color:' + INK)
                else:
                    st = re.sub(r'^background:#0B2E40;background-image:linear-gradient\(135deg[^;]*\);color:#fff',
                                'background:%s;color:%s' % (T['hero'], INK), st)
                attrs = attrs.replace('class="tcf-hero-fixed" ', '').replace(' class="tcf-hero-fixed"', '').replace('class="tcf-hero-fixed"', '')
            else:
                if _is_dark(st):
                    ctx = 'dark'
                elif _is_light(st):
                    ctx = 'none'
                if ctx == 'hero':
                    st = _light_style(st)
                elif ctx == 'dark':
                    st = _dark_style(st)
            if ctx == 'hero':
                attrs = re.sub(r'(stroke|fill)="(#fff|white)"', r'\1="%s"' % INK, attrs)
                # hover styles made for the dark photo (white text / borders) -> light-surface equivalents
                attrs = re.sub(r'data-hv="(13|5|17|14|15)"', lambda m: 'data-hv="%s"' % {'13': '9', '5': '23', '17': '12', '14': '23', '15': '9'}[m.group(1)], attrs)
            elif ctx == 'dark':
                attrs = re.sub(r'(stroke|fill)="(#95AB3B|#7E9330|#AEC25A)"', r'\1="%s"' % T['accent_dark'], attrs, flags=re.I)
                if STUDIO and 'background:#FAF7F2' in st and 'border-radius:999px' in st:
                    attrs = re.sub(r'data-hv="\d+"', 'data-hv="16"', attrs)
        heading = any(t in ('h1', 'h2') for t, _, _ in stack)
        if ctx not in ('skip', 'dark') and heading and tag == 'span' and OLIVE_COLOR.search(st):
            st = OLIVE_COLOR.sub('color:' + T['heading_accent'], st)  # accent word in a headline
            if T['accent_italic']:
                attrs = _add_class(attrs, 'tcf-accent')
        elif STUDIO and ctx not in ('skip', 'dark') and 'text-transform:uppercase' in st and OLIVE_COLOR.search(st) and 'letter-spacing' in st:
            st = OLIVE_COLOR.sub('color:' + INK, st)  # eyebrow: charcoal label with a coral dot
            attrs = _add_class(attrs, 'tcf-eyebrow')
        if 'border-radius:999px' in st and re.search(r'background:#0B2E40\b', st) and 'color:#fff' in st and ctx != 'dark':
            # navy-filled pill buttons use the call-to-action colour
            st = st.replace('background:#0B2E40', 'background:' + T['action']).replace('border:1.5px solid #0B2E40', 'border:1.5px solid ' + T['action'])
            attrs = re.sub(r'data-hv="\d+"', 'data-hv="4"', attrs)
        if STUDIO and ctx not in ('skip', 'dark') and 'border-radius:999px' in st and re.search(r'border:1\.5px solid #0B2E40', st) and re.search(r'background:(transparent|#fff)', st):
            # secondary buttons: white with a warm grey border; border turns charcoal on hover
            st = st.replace('border:1.5px solid #0B2E40', 'border:1.5px solid ' + BORDER).replace('background:transparent', 'background:#fff')
            attrs = re.sub(r'data-hv="\d+"', 'data-hv="12"', attrs)
        button = in_button or (re.search(r'background:(#95AB3B|#7E9330|#0B2E40)\b', st) is not None and 'border-radius:999px' in st and ctx != 'dark')
        if STUDIO and in_button and tag == 'svg':
            st = (st + ';' if st and not st.endswith(';') else st) + 'color:' + CORAL  # coral arrow on charcoal buttons
            if not sm:
                attrs += ' style="%s"' % st
        if tag == 'img' and 'check-green.png' in attrs:
            attrs = re.sub(r'(src=")[^"]*check-green\.png', r'\1' + UP + (T['check_dark'] if ctx == 'dark' else T['check']), attrs)
        if sm:
            sm = STYLE.search(attrs)
            attrs = attrs[:sm.start(2)] + st + attrs[sm.end(2):]
        if ctx != 'skip':
            out.append('<' + name + attrs + selfclose + '>')
        if tag not in VOID and not selfclose:
            stack.append((tag, ctx, button))
    if stack[-1][1] != 'skip':
        out.append(h[i:])
    return ''.join(out)


COUPON_OLD = 'border:1.5px dashed #95AB3B;color:#7E9330;font:700 15px ui-monospace,Menlo,monospace;'
COUPON_NEW = 'border:1.5px dashed %s;color:%s;font:700 14px ui-monospace,Menlo,monospace;' % (CORAL, CORAL_TEXT)
SALE_OLD = 'color:#5E6F22;background:#F3F5E6;border:1px solid #C9D58F'
SALE_NEW = 'color:%s;background:%s;border:1px solid %s' % (CORAL_TEXT, CORAL_TINT, CORAL)


def chips(h):
    h = re.sub(re.escape(COUPON_OLD) + r'([^"]*?)background:#F3F5E6', lambda m: COUPON_NEW + m.group(1) + 'background:' + CORAL_TINT, h)
    h = h.replace(COUPON_OLD, COUPON_NEW).replace(SALE_OLD, SALE_NEW)
    # example coupon chip on How We Compare
    h = h.replace('border:1.5px dashed #95AB3B;border-radius:6px;padding:4px 9px', 'border:1.5px dashed %s;border-radius:6px;padding:4px 9px;color:%s;background:%s' % (CORAL, CORAL_TEXT, CORAL_TINT))
    return h


ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:%s"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>'
CARD_ON = dict(bg=INK, color='#FAF7F2', border=INK, sub='rgba(250,247,242,.72)', arrow=CORAL)
CARD_OFF = dict(bg='#fff', color=INK, border=BORDER, sub=T['faint'], arrow=INK)


def course_cards(h):
    """Studio: the home course choice is two stacked cards (active = charcoal with a coral arrow)."""
    if not STUDIO:
        return h
    def card(click, label, sub, key, state):
        if state is None:  # template: bound to component state
            b = lambda f: '{{ hero%s%s }}' % (key, f)
            return ('<div onclick="{{ %s }}" class="tcf-cc" style="background:%s;color:%s;border-color:%s"><span>%s</span><span class="tcf-cc-s" style="color:%s">%s</span>%s</div>'
                    % (click, b('Bg'), b('Color'), b('Border'), label, b('Sub'), sub, ARROW % b('Arrow')))
        return ('<div class="tcf-cc" style="background:%s;color:%s;border-color:%s"><span>%s</span><span class="tcf-cc-s" style="color:%s">%s</span>%s</div>'
                % (state['bg'], state['color'], state['border'], label, state['sub'], sub, ARROW % state['arrow']))
    pat = re.compile(r'<div style="position:relative;display:inline-flex;background:rgba\(255,255,255,\.08\)[^"]*">\s*<div[^>]*>20-Hour CE · Renewing</div>\s*<div[^>]*>60-Hour QE · Getting started</div>\s*</div>')
    parts = re.split(r'(<template\b.*?</template>)', h, flags=re.S)
    for n, part in enumerate(parts):
        tpl = part.startswith('<template')
        parts[n] = pat.sub(lambda m: '<div class="tcf-course-cards">' + (
            card('pickCE', '20-Hour CE', 'Renewing', 'Ce', None) + card('pickQE', '60-Hour QE', 'Getting started', 'Qe', None) if tpl else
            card('', '20-Hour CE', 'Renewing', 'Ce', CARD_ON) + card('', '60-Hour QE', 'Getting started', 'Qe', CARD_OFF)) + '</div>', part)
    return ''.join(parts)


def scripts(h):
    """Colour values computed in component code (home course choice, filter chips, mobile course cards)."""
    act, on_act = T['action'], T['on_action']
    h = h.replace("const on = { bg: '#fff', color: '#0B2E40' }, off = { bg: 'transparent', color: '#fff' }",
                  "const on = { bg: '%s', color: '%s' }, off = { bg: 'transparent', color: '%s' }" % (act, on_act, INK))
    old_hero = "heroCeBg: qe ? 'transparent' : '#fff', heroCeColor: qe ? '#fff' : '#0B2E40', heroQeBg: qe ? '#fff' : 'transparent', heroQeColor: qe ? '#0B2E40' : '#fff'"
    if STUDIO:
        def props(key, active):
            return ', '.join("hero%s%s: %s ? '%s' : '%s'" % (key, f.capitalize() if f != 'bg' else 'Bg', active, CARD_ON[f], CARD_OFF[f])
                             for f in ('bg', 'color', 'border', 'sub', 'arrow'))
        h = h.replace(old_hero, props('Ce', '!qe') + ', ' + props('Qe', 'qe'))
    else:
        h = h.replace(old_hero, "heroCeBg: qe ? 'transparent' : '%s', heroCeColor: qe ? '%s' : '#fff', heroQeBg: qe ? '%s' : 'transparent', heroQeColor: qe ? '#fff' : '%s'" % (act, INK, act, INK))
    h = h.replace("heroBg: feat[k] ? '#fff' : 'rgba(255,255,255,.14)', heroBorder: feat[k] ? '#fff' : 'rgba(255,255,255,.25)', heroColor: feat[k] ? '#0B2E40' : '#fff'",
                  "heroBg: feat[k] ? '%s' : '#fff', heroBorder: feat[k] ? '%s' : '%s', heroColor: feat[k] ? '%s' : '%s'" % (act, act, BORDER_STRONG, on_act, INK))
    if STUDIO:
        box_on = lambda p: ("%sBoxBg: '%s', %sBoxColor: '#FAF7F2', %sBoxBorder: '%s', %sBoxShadow: 'none', %sBadgeBg: 'rgba(250,247,242,.14)', %sArrow: '%s'"
                            % (p, INK, p, p, INK, p, p, p, CORAL))
        box_off = lambda p: ("%sBoxBg: '#fff', %sBoxColor: '%s', %sBoxBorder: '%s', %sBoxShadow: 'none', %sBadgeBg: '%s', %sArrow: '%s'"
                             % (p, p, INK, p, BORDER, p, p, INK, p, INK))
        for p in ('ce', 'qe'):
            h = h.replace("%sBoxBg: '#fff', %sBoxColor: '#0B2E40', %sBoxBorder: '#95AB3B', %sBoxShadow: '0 20px 50px rgba(0,0,0,.35)', %sBadgeBg: '#95AB3B', %sArrow: '#95AB3B'" % ((p,) * 6), box_on(p))
    else:
        box_off = lambda p: ("%sBoxBg: '#fff', %sBoxColor: '%s', %sBoxBorder: '%s', %sBoxShadow: 'none', %sBadgeBg: '%s', %sArrow: '%s'"
                             % (p, p, INK, p, BORDER, p, p, MUTED, p, MUTED))
    for p in ('ce', 'qe'):
        h = h.replace("%sBoxBg: 'rgba(255,255,255,.08)', %sBoxColor: '#fff', %sBoxBorder: 'rgba(255,255,255,.18)', %sBoxShadow: 'none', %sBadgeBg: 'rgba(255,255,255,.14)', %sArrow: 'rgba(255,255,255,.6)'"
                      % ((p,) * 6), box_off(p))
    h = h.replace("'0 20px 50px rgba(0,0,0,.35)'", "'0 20px 50px %s'" % T['shadow_float'])
    return h


def fonts(h):
    serif, weight = T['serif']
    sans = T['sans']
    h = re.sub(r"font:\d00 ([^;\"]*?)\\?'Source Serif 4\\?',\s*Georgia,\s*serif", lambda m: 'font:%d %s%s' % (weight, m.group(1), serif), h)
    h = re.sub(r"\\?'Source Serif 4\\?',\s*Georgia,\s*serif", serif, h)
    h = h.replace("'Source Serif 4'", serif.split(',')[0])
    h = re.sub(r"\\?'Plus Jakarta Sans\\?'", sans if STUDIO else 'Outfit', h)
    h = re.sub(r"\\?'DM Sans\\?',\s*Manrope", sans, h)
    h = re.sub(r"\\?'(DM Sans|Source Sans 3)\\?'", sans, h)
    h = h.replace('"Source Sans 3"', sans).replace('Manrope', sans)
    if T['sans_max'] < 800:
        h = re.sub(r'font:800 ', 'font:700 ', h)
        h = re.sub(r'font-weight:\s*800\b', 'font-weight:700', h)
    h = re.sub(r'font-weight:\s*[23]00\b', 'font-weight:inherit', h)
    return h


def palette(h):
    for old, new in COLORS.items():
        h = re.sub(re.escape(old) + r'(?![0-9A-Fa-f])', new, h, flags=re.I)
    for old, new in RGBA.items():
        h = h.replace(old, new)
    return h


def tidy(h):
    h = re.sub(r'<div style="height:6px;background:linear-gradient\(90deg,#95AB3B,#7E9330\)"></div>', '', h)  # olive stripe under the old photo heroes
    h = h.replace('Verify and list your school here →<svg', 'Verify and list your school here<svg')  # arrows were doubled (text + icon)
    h = re.sub(r'(Verify on CTEC\.org ↗)<svg[^>]*>.*?</svg>', r'\1', h, flags=re.S)
    return h


def brand(h):
    return palette(fonts(scripts(chips(structure(course_cards(tidy(h)))))))


FONTS_URL = T['fonts_url']
CSS = T['css']
LOGO, LOGO_WHITE, CTA = UP + T['logo'], UP + T['logo_white'], T['cta']
