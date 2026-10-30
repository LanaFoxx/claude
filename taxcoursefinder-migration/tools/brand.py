"""Cobalt / Coral brand pass, applied to every published HTML fragment (pages, header/footer, plugin templates).

1. Structure: photo heroes become the light hero surface (#F3F6FF, ink text); text accents inside dark (ink)
   bands use the light periwinkle instead of cobalt; coupon/offer chips become coral.
2. Palette and fonts: old navy/olive values and font families map onto the new tokens everywhere (CSS and JS too).
"""
import re

INK, COBALT, COBALT_HOVER = '#0B1540', '#1A3DFF', '#1430CC'
SECONDARY, MUTED, SOFT, BORDER, BORDER_STRONG = '#4A5680', '#5A6690', '#F3F6FF', '#D6DEF5', '#B9C5EE'
CORAL, CORAL_TEXT, CORAL_TINT = '#FF5A5F', '#C93338', '#FFF1F1'

COLORS = {
    '#0B2E40': INK, '#2F4652': INK, '#22365E': INK, '#082433': '#050C30',
    '#95AB3B': COBALT, '#7E9330': COBALT, '#5E6F22': COBALT_HOVER,
    '#AEC25A': BORDER_STRONG, '#D4E09B': BORDER_STRONG, '#DDE3B6': BORDER_STRONG, '#C9D58F': BORDER_STRONG, '#C5D0DE': BORDER_STRONG, '#B5BECB': MUTED,
    '#5A6E78': SECONDARY, '#8A9AA3': MUTED,
    '#D7DFE2': BORDER, '#E3E9EB': BORDER,
    '#F3F5E6': SOFT, '#D7EDC8': '#DCE3FF', '#E4F3DC': '#E8EDFF', '#F4F6F7': SOFT, '#F7F9FA': SOFT, '#F9FBFD': SOFT, '#E9EFF6': SOFT,
}
ICONS = 'https://taxcoursefinder.com/wp-content/uploads/2026/10/'
RGBA = {'rgba(0,0,0,.35)': 'rgba(11,21,64,.14)', 'rgba(11,46,64,': 'rgba(11,21,64,', 'rgba(149,171,59,': 'rgba(26,61,255,', 'rgba(108,190,69,': 'rgba(26,61,255,'}

DARK_TEXT_ACCENTS = ('#95AB3B', '#7E9330', '#AEC25A', '#C9D58F')  # cobalt text is never placed on ink
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
TOKEN = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][\w:-]*)((?:[^>"\']|"[^"]*"|\'[^\']*\')*?)(/?)>', re.S)
STYLE = re.compile(r'(\sstyle=")([^"]*)(")')


def _alpha(m):
    return float(m.group(1))


def _light_style(st):
    """Restyle one element inside a hero that moved from the dark photo to the light surface."""
    st = re.sub(r'(?<![-\w])color:#AEC25A\b', 'color:' + COBALT, st, flags=re.I)  # headline accent
    filled = re.search(r'background:(#95AB3B|#7E9330|#0B2E40|#fff\b|#FFF\b|#ffffff|\{\{)', st)
    if not filled:
        st = re.sub(r'(?<![-\w])color:#fff\b', 'color:' + INK, st)
        st = re.sub(r'(?<![-\w])color:rgba\(255,255,255,(\.\d+|1|0)\)',
                    lambda m: 'color:' + (SECONDARY if float(m.group(1)) >= .7 else MUTED), st)
    button = 'border-radius:999px' in st and 'padding:14px' in st
    st = re.sub(r'((?:border(?:-\w+)?):[^;]*?)rgba\(255,255,255,[.\d]+\)',
                lambda m: m.group(1) + (INK if button else BORDER_STRONG), st)
    st = st.replace('border:1px solid rgba(108,190,69,.5)', 'border:1px solid ' + BORDER_STRONG)
    st = re.sub(r'background(-color)?:rgba\(255,255,255,(\.[0-3]\d*|0)\)', 'background:#fff', st)
    st = re.sub(r'background-image:linear-gradient\(135deg,rgba\(255,255,255,\.07\)[^;]*\);?', '', st)
    st = re.sub(r'text-shadow:[^;]+;?', '', st)
    return st


def _dark_style(st):
    for c in DARK_TEXT_ACCENTS:
        st = re.sub(r'(?<![-\w])color:' + c + r'\b', 'color:' + BORDER_STRONG, st, flags=re.I)
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


def structure(h):
    out, i, stack = [], 0, [('#root', 'none')]  # (tag, ctx); ctx: none | dark | hero | skip
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
        parent = stack[-1][1]
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
                    st = st.replace('color:#fff', 'color:%s;background:%s' % (INK, SOFT), 1)
                elif kind == 'school':
                    st = re.sub(r'background:#0B(2E|15)40;', 'background:%s;' % SOFT, st).replace('color:#fff', 'color:' + INK)
                else:
                    st = re.sub(r'^background:#0B2E40;background-image:linear-gradient\(135deg[^;]*\);color:#fff',
                                'background:%s;color:%s' % (SOFT, INK), st)
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
                attrs = re.sub(r'(stroke|fill)="(#95AB3B|#7E9330|#AEC25A)"', r'\1="%s"' % BORDER_STRONG, attrs, flags=re.I)
        if 'border-radius:999px' in st and re.search(r'background:#0B2E40\b', st) and 'color:#fff' in st:
            # navy-filled pill buttons become the one call-to-action colour
            st = st.replace('background:#0B2E40', 'background:' + COBALT).replace('border:1.5px solid #0B2E40', 'border:1.5px solid ' + COBALT)
            attrs = re.sub(r'data-hv="\d+"', 'data-hv="4"', attrs)
        if tag == 'img' and 'check-green.png' in attrs:
            icon = 'check-periwinkle.png' if ctx == 'dark' else 'check-cobalt.png'
            attrs = re.sub(r'(src=")[^"]*check-green\.png', r'\1' + ICONS + icon, attrs)
        if sm:
            sm = STYLE.search(attrs)
            attrs = attrs[:sm.start(2)] + st + attrs[sm.end(2):]
        if ctx != 'skip':
            out.append('<' + name + attrs + selfclose + '>')
        if tag not in VOID and not selfclose:
            stack.append((tag, ctx))
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


def scripts(h):
    """Colour values computed in component code (home course toggle, mobile course cards)."""
    h = h.replace("const on = { bg: '#fff', color: '#0B2E40' }, off = { bg: 'transparent', color: '#fff' }",
                  "const on = { bg: '%s', color: '#fff' }, off = { bg: 'transparent', color: '%s' }" % (COBALT, INK))
    inactive = lambda p: ("%sBoxBg: '#fff', %sBoxColor: '%s', %sBoxBorder: '%s', %sBoxShadow: 'none', %sBadgeBg: '%s', %sArrow: '%s'"
                          % (p, p, INK, p, BORDER, p, p, MUTED, p, MUTED))
    for p in ('ce', 'qe'):
        h = h.replace("%sBoxBg: 'rgba(255,255,255,.08)', %sBoxColor: '#fff', %sBoxBorder: 'rgba(255,255,255,.18)', %sBoxShadow: 'none', %sBadgeBg: 'rgba(255,255,255,.14)', %sArrow: 'rgba(255,255,255,.6)'"
                      % ((p,) * 6), inactive(p))
    h = h.replace("'0 20px 50px rgba(0,0,0,.35)'", "'0 20px 50px rgba(11,21,64,.14)'")
    h = h.replace("heroCeBg: qe ? 'transparent' : '#fff', heroCeColor: qe ? '#fff' : '#0B2E40', heroQeBg: qe ? '#fff' : 'transparent', heroQeColor: qe ? '#0B2E40' : '#fff'",
                  "heroCeBg: qe ? 'transparent' : '%s', heroCeColor: qe ? '%s' : '#fff', heroQeBg: qe ? '%s' : 'transparent', heroQeColor: qe ? '#fff' : '%s'" % (COBALT, INK, COBALT, INK))
    h = h.replace("heroBg: feat[k] ? '#fff' : 'rgba(255,255,255,.14)', heroBorder: feat[k] ? '#fff' : 'rgba(255,255,255,.25)', heroColor: feat[k] ? '#0B2E40' : '#fff'",
                  "heroBg: feat[k] ? '%s' : '#fff', heroBorder: feat[k] ? '%s' : '%s', heroColor: feat[k] ? '#fff' : '%s'" % (COBALT, COBALT, BORDER_STRONG, INK))
    return h


def fonts(h):
    def serif(m):
        return 'font:600 ' + m.group(1) + 'Outfit,sans-serif'
    h = re.sub(r"font:\d00 ([^;\"]*?)\\?'Source Serif 4\\?',\s*Georgia,\s*serif", serif, h)
    h = re.sub(r"\\?'Source Serif 4\\?',\s*Georgia,\s*serif", 'Outfit,sans-serif', h)
    h = h.replace("'Source Serif 4'", 'Outfit')
    h = re.sub(r"\\?'Plus Jakarta Sans\\?'", 'Outfit', h)
    h = re.sub(r"\\?'DM Sans\\?',\s*Manrope", 'Geist', h)
    h = re.sub(r"\\?'(DM Sans|Source Sans 3)\\?'", 'Geist', h)
    h = h.replace('"Source Sans 3"', 'Geist')
    h = h.replace('Manrope', 'Geist')
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
    return palette(fonts(scripts(chips(structure(tidy(h))))))


FONTS_URL = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap'

# Site-wide rules for the new brand (appended after site.css).
CSS = (
    '.tcf-scope h1,.tcf-scope h2,.tcf-scope h3,.tcf-scope h4{font-family:Outfit,sans-serif!important;letter-spacing:-.035em}'
    '.tcf-scope h1{font-weight:600}.tcf-scope h3,.tcf-scope h4{letter-spacing:-.02em}'
    '.tcf-home-h1>span{font-weight:700}'
    '.tcf-footer{border-top:3px solid #1A3DFF}'
    '.tcf-topbar-left{background:rgba(26,61,255,.28)!important;color:#fff!important;border-color:rgba(185,197,238,.45)!important}'
    '.tcf-header nav.tcf-nav>a.tcf-nav-cta:hover{background:#1430CC!important;border-color:#1430CC!important}'
)
