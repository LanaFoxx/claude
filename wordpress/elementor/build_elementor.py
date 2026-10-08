"""Generate Elementor JSON (pages, header, footer, kit) for Magnolia Property Care.

Content and styling come from the Claude Design project "Magnolia Property Care".
Placeholders resolved by the importer plugin at import time:
  %%URL:<screen>%%       page permalink (home, about, services, projects, contact)
  %%IMG:<asset>%%        Media Library URL of a bundled asset
  %%IMGID:<asset>%%      Media Library attachment ID (replaced with an integer)
  %%PLACEHOLDER%%        Elementor's placeholder image

Usage: python3 build_elementor.py <output_dir>
"""
import json
import os
import random
import sys

OUT = sys.argv[1]
random.seed(7)
_used = set()

# ---- Palette (from the design) ---------------------------------------------------
FOREST = '#283A33'
DEEP = '#1D2B26'
OLIVE = '#738238'
OLIVE_DARK = '#5E6B2D'
MOSS = '#A9B86A'
SAND = '#D5D4BE'
STONE = '#E9E7DA'
IVORY = '#F4F2EA'
INK = '#1F2A25'
BODY = '#3F4A44'
MUTED = '#5B655F'
GREY = '#8A918C'
WHITE = '#FFFFFF'
SERIF = 'Marcellus'
SANS = 'Jost'
PHONE = '(336) 583-9398'
SIDE = 40  # minimum left/right padding at every breakpoint
MAX = 1300  # maximum content width
TEL = 'tel:3365839398'
EMAIL = 'heys@magnoliaproperty.care'


def eid():
    while True:
        i = '%07x' % random.getrandbits(28)
        if i not in _used:
            _used.add(i)
            return i


# ---- Value helpers ----------------------------------------------------------------
def px(n, unit='px'):
    return {'unit': unit, 'size': n, 'sizes': []}


def box(t, r=None, b=None, l=None, unit='px'):
    r = t if r is None else r
    b = t if b is None else b
    l = r if l is None else l
    return {'unit': unit, 'top': str(t), 'right': str(r), 'bottom': str(b), 'left': str(l),
            'isLinked': len({t, r, b, l}) == 1}


def gaps(col, row=None):
    row = col if row is None else row
    return {'column': str(col), 'row': str(row), 'isLinked': col == row, 'unit': 'px', 'size': col}


def resp(key, d=None, t=None, m=None):
    """Responsive setting: desktop / tablet / mobile."""
    s = {}
    if d is not None:
        s[key] = d
    if t is not None:
        s[key + '_tablet'] = t
    if m is not None:
        s[key + '_mobile'] = m
    return s


def typo(prefix='typography', family=SANS, size=None, t=None, m=None, weight=None, lh=None,
         ls=None, transform=None):
    s = {prefix + '_typography': 'custom', prefix + '_font_family': family}
    if size is not None:
        s.update(resp(prefix + '_font_size', px(size), px(t) if t else None, px(m) if m else None))
    if weight is not None:
        s[prefix + '_font_weight'] = str(weight)
    if lh is not None:
        s[prefix + '_line_height'] = px(lh, 'em')
    if ls is not None:
        s[prefix + '_letter_spacing'] = px(ls, 'em')
    if transform:
        s[prefix + '_text_transform'] = transform
    return s


# ---- Elements ---------------------------------------------------------------------
def container(children, inner=True, **s):
    if '_css_classes' in s:  # containers call this control 'css_classes'
        s['css_classes'] = s.pop('_css_classes')
    return {'id': eid(), 'elType': 'container', 'isInner': inner, 'settings': s, 'elements': children}


def section(children, bg=None, pad=(110, 90), pad_t=(80, 70), pad_m=(64, 56), width=1300,
            direction='column', gap=None, element_id=None, extra=None):
    """Full-width band: content max 1300px wide, at least 40px side padding."""
    s = {
        'content_width': 'boxed',
        'boxed_width': px(width),
        'flex_direction': direction,
        'padding': box(pad[0], SIDE, pad[1], SIDE),
        'padding_tablet': box(pad_t[0], SIDE, pad_t[1], SIDE),
        'padding_mobile': box(pad_m[0], SIDE, pad_m[1], SIDE),
        'overflow': 'hidden',
    }
    if gap is not None:
        s['flex_gap'] = gaps(gap)
    if bg:
        s['background_background'] = 'classic'
        s['background_color'] = bg
    if element_id:
        s['_element_id'] = element_id
    if extra:
        s.update(extra)
    return container(children, inner=False, **s)


def stack(children, gap=20, **s):
    base = {'content_width': 'full', 'flex_direction': 'column', 'flex_gap': gaps(gap),
            'padding': box(0)}
    base.update(s)
    return container(children, **base)


def row(children, gap=20, justify='space-between', align='center', wrap='wrap', **s):
    base = {'content_width': 'full', 'flex_direction': 'row', 'flex_gap': gaps(gap),
            'flex_justify_content': justify, 'flex_align_items': align, 'flex_wrap': wrap,
            'padding': box(0)}
    base.update(s)
    return container(children, **base)


def grid(children, cols=(2, 1, 1), gap=(80, 56), gap_t=None, gap_m=None, **s):
    gap_t = gap_t or gap
    gap_m = gap_m or (min(gap[0], 28), min(gap[1], 40))
    base = {
        'content_width': 'full', 'container_type': 'grid', 'padding': box(0),
        'grid_columns_grid': px(cols[0], 'fr'),
        'grid_columns_grid_tablet': px(cols[1], 'fr'),
        'grid_columns_grid_mobile': px(cols[2], 'fr'),
        'grid_rows_grid': px('auto', 'custom'),
        'grid_rows_grid_tablet': px('auto', 'custom'),
        'grid_rows_grid_mobile': px('auto', 'custom'),
        'grid_gaps': gaps(*gap), 'grid_gaps_tablet': gaps(*gap_t), 'grid_gaps_mobile': gaps(*gap_m),
    }
    base.update(s)
    return container(children, **base)


def widget(kind, s, glob=()):
    s = dict(s)
    s['__globals__'] = {k: '' for k in glob}
    return {'id': eid(), 'elType': 'widget', 'widgetType': kind, 'isInner': False, 'settings': s,
            'elements': []}


def heading(text, tag='h2', color=FOREST, align=None, align_m=None, link=None, **t):
    s = {'title': text, 'header_size': tag, 'title_color': color}
    s.update(typo(**t))
    if align:
        s['align'] = align
    if align_m:
        s['align_mobile'] = align_m
    if link:
        s['link'] = {'url': link, 'is_external': '', 'nofollow': ''}
    return widget('heading', s, ('title_color', 'typography_typography'))


def eyebrow(text, color=OLIVE, align=None):
    return heading(text, 'p', color, align, size=12, weight=500, ls=0.22, transform='uppercase', lh=1.4)


def display(text, tag='h2', color=FOREST, size=50, t=40, m=34, align=None, lh=1.1):
    return heading(text, tag, color, align, family=SERIF, size=size, t=t, m=m, weight=400, lh=lh)


def text(html, color=BODY, size=18, t=None, m=17, weight=300, lh=1.65, align=None, **extra):
    s = {'editor': html, 'text_color': color}
    s.update(typo(size=size, t=t, m=m, weight=weight, lh=lh))
    if align:
        s['align'] = align
    s.update(extra)
    return widget('text-editor', s, ('text_color', 'typography_typography'))


def button(label, url, bg=OLIVE, color=IVORY, hover_bg=OLIVE_DARK, hover_color=WHITE, border=None,
           pad=(17, 30), full_mobile=False, **extra):
    s = {
        'text': label, 'link': {'url': url, 'is_external': '', 'nofollow': ''},
        'background_background': 'classic', 'background_color': bg,
        'button_background_hover_background': 'classic', 'button_background_hover_color': hover_bg,
        'button_text_color': color, 'hover_color': hover_color,
        'border_radius': box(0), 'text_padding': box(pad[0], pad[1]),
    }
    if border:
        s.update({'border_border': 'solid', 'border_width': box(1), 'border_color': border})
    s.update(typo(size=13, weight=500, ls=0.16, transform='uppercase', lh=1.2))
    if full_mobile:
        s['align_mobile'] = 'justify'
    s.update(extra)
    return widget('button', s, ('background_color', 'button_text_color', 'typography_typography'))


def arrow_link(label, url, color=FOREST, hover=OLIVE, underline=True, align=None):
    """Small uppercase text link with an arrow (e.g. "Meet the Owner →")."""
    w = heading(label + ' &nbsp;→', 'p', color, align, link=url, size=13, weight=500, ls=0.16,
                transform='uppercase', lh=1.4)
    w['settings']['title_hover_color'] = hover
    w['settings']['_css_classes'] = 'mpc-link' + (' mpc-underline' if underline else '')
    return w


def image(asset, alt='', ratio=None, width=None, link=None, extra_classes='', **extra):
    if asset == 'PLACEHOLDER':
        img = {'url': '%%PLACEHOLDER%%', 'id': '', 'alt': alt, 'source': 'library'}
    else:
        img = {'url': '%%IMG:' + asset + '%%', 'id': '%%IMGID:' + asset + '%%', 'alt': alt,
               'source': 'library'}
    s = {'image': img, 'image_size': 'full', 'align': 'start'}
    classes = []
    if ratio:
        classes.append('mpc-ratio-' + ratio)
        s['width'] = px(100, '%')
    if width:
        s.update(width)
    if extra_classes:
        classes.append(extra_classes)
    if classes:
        s['_css_classes'] = ' '.join(classes)
    if link:
        s['link_to'] = 'custom'
        s['link'] = {'url': link, 'is_external': '', 'nofollow': ''}
    s.update(extra)
    return widget('image', s)


def watermark(width=(42, 46, 70), opacity=0.38, h='end', x=-6, v='end', y=-14, center=False):
    """Large faded magnolia icon pinned to a corner of a band."""
    s = {
        'image': {'url': '%%IMG:icon-olive.png%%', 'id': '%%IMGID:icon-olive.png%%', 'alt': '',
                  'source': 'library'},
        'image_size': 'full', 'opacity': px(opacity),
        '_position': 'absolute', '_z_index': 0, '_css_classes': 'mpc-watermark',
        '_element_width': 'initial',
        '_element_custom_width': px(width[0], 'vw'),
        '_element_custom_width_tablet': px(width[1], 'vw'),
        '_element_custom_width_mobile': px(width[2], 'vw'),
        '_offset_orientation_h': h, '_offset_orientation_v': v,
    }
    s['_offset_x_end' if h == 'end' else '_offset_x'] = px(x, '%')
    s['_offset_y_end' if v == 'end' else '_offset_y'] = px(y, '%')
    if center:
        s['_css_classes'] += ' mpc-watermark-center'
    return widget('image', s)


def bullets(items, color=FOREST, icon_color=OLIVE, cols=True):
    s = {
        'view': 'traditional',
        'icon_list': [{'_id': eid(), 'text': t,
                       'selected_icon': {'value': 'fas fa-square-full', 'library': 'fa-solid'}}
                      for t in items],
        'icon_color': icon_color, 'icon_size': px(7), 'text_color': color,
        'text_indent': px(12), 'space_between': px(12),
        '_css_classes': 'mpc-bullets' + (' mpc-bullets-2col' if cols else ''),
    }
    s.update(typo('icon_typography', size=16, m=16, weight=400, lh=1.5))
    return widget('icon-list', s, ('icon_color', 'text_color', 'icon_typography_typography'))


def link_list(items, color=SAND, hover=WHITE, size=15):
    s = {
        'view': 'traditional',
        'icon_list': [{'_id': eid(), 'text': label, 'link': {'url': url, 'is_external': '', 'nofollow': ''},
                       'selected_icon': {'value': '', 'library': ''}} for label, url in items],
        'text_color': color, 'text_color_hover': hover, 'space_between': px(8),
    }
    s.update(typo('icon_typography', size=size, weight=400, lh=1.5))
    return widget('icon-list', s, ('text_color', 'icon_typography_typography'))


def spacer(h):
    return widget('spacer', {'space': px(h)})


def html_widget(code):
    return widget('html', {'html': code})


# ---- Shared blocks ----------------------------------------------------------------
def page_hero(label, title, intro=None, after=None):
    kids = [watermark((34, 44, 70), 0.12, 'end', -4, 'start', -6),
            stack([eyebrow(label, MOSS),
                   display(title, 'h1', IVORY, 68, 52, 40, lh=1.05)] +
                  ([text(intro, SAND, 19, 18, 17, lh=1.6)] if intro else []),
                  gap=22, _css_classes='mpc-above', **resp('width', px(900), px(100, '%'), px(100, '%')))]
    hero = section(kids, FOREST, pad=(110, 90 if not after else 70), pad_t=(90, 70), pad_m=(72, 56),
                   gap=22)
    hero['settings']['css_classes'] = 'mpc-band'
    return [hero] + ([after] if after else [])


def cta_band():
    left = stack([display('Ready to make one call?', 'h2', IVORY, 46, 38, 32),
                  text('Tell us about your property and we will schedule a site visit and estimate.',
                       '#EEF0DC', 18, m=17, lh=1.55)], gap=12, _flex_size='grow',
                 **resp('width', px(640), px(100, '%'), px(100, '%')))
    right = row([button('Request an Estimate', '%%URL:contact%%', FOREST, IVORY, DEEP, WHITE),
                 heading(PHONE, 'p', IVORY, link=TEL, size=17, weight=500, lh=1.2)],
                gap=22, justify='flex-start', _flex_size='none',
                **resp('width', px('auto', 'custom'), px(100, '%'), px(100, '%')))
    s = section([left, right], None, pad=(80, 80), pad_t=(70, 70), pad_m=(56, 56), direction='row',
                extra={'flex_direction_tablet': 'column', 'flex_justify_content': 'space-between',
                       'flex_align_items': 'center', 'flex_align_items_tablet': 'flex-start',
                       'flex_gap': gaps(32),
                       'background_background': 'gradient', 'background_color': '#8A9A48',
                       'background_color_stop': px(0, '%'), 'background_color_b': OLIVE_DARK,
                       'background_color_b_stop': px(100, '%'), 'background_gradient_type': 'linear',
                       'background_gradient_angle': px(120, 'deg')})
    return s


# ---- Home -------------------------------------------------------------------------
def home():
    hero_content = stack([
        eyebrow('White Glove Outdoor &amp; Exterior Care · North Carolina &amp; Virginia', SAND),
        display('Care for Every Corner.', 'h1', IVORY, 84, 64, 44, lh=1.02),
        text('From land clearing and site development to tree care and ongoing property upkeep, one team '
             'handles the entire scope of your property. One call. One standard.', '#E6E4D4', 21, 19, 17,
             lh=1.55, **resp('_element_width', 'initial'), _element_custom_width=px(600)),
        row([button('Request an Estimate', '%%URL:contact%%'),
             button('Explore Services', '%%URL:services%%', 'rgba(0,0,0,0)', IVORY,
                    'rgba(244,242,234,0.12)', WHITE, border='rgba(244,242,234,0.6)')],
            gap=14, justify='flex-start'),
    ], gap=26, _css_classes='mpc-above', **resp('width', px(760), px(100, '%'), px(100, '%')))
    hero = section([watermark((42, 50, 80), 0.38), hero_content], None, pad=(140, 72), pad_t=(120, 64),
                   pad_m=(96, 48), extra={
                       'min_height': px(820), 'min_height_tablet': px(680), 'min_height_mobile': px(600),
                       'flex_justify_content': 'flex-end',
                       'background_background': 'classic',
                       'background_image': {'url': '%%IMG:photos/gravel-drive.jpg%%',
                                            'id': '%%IMGID:photos/gravel-drive.jpg%%', 'source': 'library'},
                       'background_position': 'center center', 'background_size': 'cover',
                       'background_color': FOREST,
                       'background_overlay_background': 'gradient',
                       'background_overlay_color': 'rgba(40,58,51,0.94)',
                       'background_overlay_color_stop': px(0, '%'),
                       'background_overlay_color_b': 'rgba(40,58,51,0.4)',
                       'background_overlay_color_b_stop': px(100, '%'),
                       'background_overlay_gradient_type': 'linear',
                       'background_overlay_gradient_angle': px(35, 'deg'),
                       'background_overlay_gradient_angle_mobile': px(0, 'deg'),
                       'background_overlay_opacity': px(1),
                       '_css_classes': 'mpc-band'})

    def trust(t):
        return widget('icon-list', dict(
            view='inline',
            icon_list=[{'_id': eid(), 'text': t, 'selected_icon': {'value': 'fas fa-square-full', 'library': 'fa-solid'}}],
            icon_color=OLIVE, icon_size=px(8), text_color=FOREST, text_indent=px(14),
            _css_classes='mpc-bullets', **typo('icon_typography', size=13, weight=500, ls=0.1,
                                               transform='uppercase')),
            ('icon_color', 'text_color', 'icon_typography_typography'))
    trust_bar = section([row([trust('Licensed &amp; Insured'), trust('One Point of Contact'),
                              trust('Serving NC &amp; Southside VA')], gap=56, justify='center',
                             flex_gap_mobile=gaps(28, 12), flex_direction_mobile='column',
                             flex_align_items_mobile='flex-start')],
                        SAND, pad=(22, 22), pad_t=(22, 22), pad_m=(22, 22))

    why = section([grid([
        stack([eyebrow('Why Magnolia'),
               display('One property. One call. The whole job done right.'),
               text('Most outdoor projects mean calling a grading contractor, a tree service, a landscaper and a '
                    'handyman, then spending weeks coordinating all four. Magnolia Property Care was built to '
                    'remove that burden. We handle the full scope under one contract, one schedule and one '
                    'standard of care.'),
               text('Whether you are developing a new homesite, restoring an overgrown property or simply want '
                    'someone dependable to look after a second home, you deal with one person who knows your '
                    'property.'),
               arrow_link('Meet the Owner', '%%URL:about%%')], gap=24),
        image('photos/landscape-bed.jpg', 'Finished landscape bed with stone edging and lighting', '43'),
    ], (2, 1, 1), (80, 56), flex_align_items='center', grid_align_items='center')], IVORY)

    def card(img, alt, title, body, label=None, big=False, bg=DEEP, anchor=''):
        kids = []
        if label:
            kids.append(heading(label, 'span', MOSS, size=11, weight=500, ls=0.2, transform='uppercase'))
        kids.append(display(title, 'h3', IVORY, 38 if big else 26, 32 if big else 26, 26, lh=1.12))
        kids.append(text(body, SAND, 16 if big else 15, m=15, lh=1.55))
        return container(kids, content_width='full', html_tag='a',
                         link={'url': '%%URL:services%%' + anchor, 'is_external': '', 'nofollow': ''},
                         flex_direction='column', flex_justify_content='flex-end', flex_gap=gaps(12),
                         padding=box(36 if big else 32), padding_mobile=box(26),
                         min_height=px(420), min_height_tablet=px(380), min_height_mobile=px(340),
                         background_background='classic', background_color=bg,
                         background_image={'url': '%%IMG:' + img + '%%', 'id': '%%IMGID:' + img + '%%',
                                           'source': 'library'},
                         background_position='center center', background_size='cover',
                         background_overlay_background='gradient',
                         background_overlay_color='rgba(29,43,38,0)', background_overlay_color_stop=px(30, '%'),
                         background_overlay_color_b='rgba(29,43,38,0.92)', background_overlay_color_b_stop=px(100, '%'),
                         background_overlay_gradient_angle=px(180, 'deg'),
                         background_overlay_opacity=px(1),
                         _css_classes='mpc-card')

    services = section([
        watermark((36, 44, 80), 0.07, 'start', -10, 'start', -6),
        row([stack([eyebrow('What We Do', MOSS), display('Everything outside the front door.', 'h2', IVORY)],
                   gap=18, _css_classes='mpc-above', **resp('width', px(640), px(100, '%'), px(100, '%'))),
             arrow_link('All Services', '%%URL:services%%', SAND, WHITE)],
            gap=24, align='flex-end', _css_classes='mpc-above'),
        grid([card('photos/forestry-mulcher.jpg', 'Forestry mulcher clearing a wooded lot',
                   'Landscape Development &amp; Site Preparation',
                   'Forestry mulching, land clearing, grading, drainage, retaining walls, hardscaping, gravel '
                   'driveways and more. Raw land to finished grounds.', 'Our Specialty', True,
                   anchor='#services-development'),
              card('photos/tree-removal.jpg', 'Tree removal with a compact loader', 'Tree Care',
                   'Removal, pruning, storm cleanup and brush removal.', anchor='#services-tree'),
              card('photos/power-wash-1.jpg', 'Commercial power washing a brick facade', 'Commercial Power Washing',
                   'Buildings, hardscapes, lots and storefronts.', anchor='#services-washing'),
              card('photos/sod-install.jpg', 'Laying fresh sod', 'Property Care Subscription',
                   'Scheduled visits, seasonal upkeep and handyman repairs from one trusted contact, so your '
                   'property is ready whenever you are.', 'For Second Home Owners &amp; Property Managers', True,
                   OLIVE, anchor='#services-care')],
             (2, 2, 1), (20, 20), (16, 16), (16, 16), _css_classes='mpc-above'),
    ], FOREST, pad=(100, 100), pad_t=(80, 80), pad_m=(64, 64), gap=56,
        extra={'flex_gap_mobile': gaps(36), '_css_classes': 'mpc-band'})

    def project(img, place, title, body):
        return container([image(img, title, '43'),
                          stack([heading(place, 'span', OLIVE, size=11, weight=500, ls=0.2, transform='uppercase'),
                                 display(title, 'h3', FOREST, 24, 22, 22, lh=1.2),
                                 text(body, MUTED, 15, m=15, weight=400, lh=1.5)], gap=6)],
                         content_width='full', html_tag='a',
                         link={'url': '%%URL:projects%%', 'is_external': '', 'nofollow': ''},
                         flex_direction='column', flex_gap=gaps(16), padding=box(0),
                         _css_classes='mpc-project-card')

    recent = section([
        row([stack([eyebrow('Past Projects'), display('Recent work across the region.')], gap=18,
                   **resp('width', px(640), px(100, '%'), px(100, '%'))),
             arrow_link('View All Projects', '%%URL:projects%%')], gap=24, align='flex-end'),
        grid([project('photos/forestry-mulcher.jpg', 'Person County, NC', 'Wooded Lot to Build-Ready Homesite',
                      'Forestry mulching, land clearing, rough and finish grading, culvert and gravel drive installation.'),
              project('photos/drainage.jpg', 'Orange County, NC', 'Hillside Drainage &amp; Retaining Wall',
                      'French drain system, segmental retaining wall, regrading and sod installation.'),
              project('photos/tree-removal.jpg', 'Halifax County, VA', 'Lake Property Treeline Clearing',
                      'Selective tree removal for a water view, brush removal, stump grinding and hydroseeding.')],
             (3, 2, 1), (28, 28), (24, 36), (24, 36)),
    ], IVORY, gap=48, extra={'flex_gap_mobile': gaps(36)})

    about = section([
        watermark((30, 40, 70), 0.1, center=True),
        stack([eyebrow('About Us', align='center'),
               display('Owner-led. Every job, every time.', align='center'),
               text('Magnolia Property Care is owned and operated by Heys McMath, who left a ten-year career in '
                    'logistics and financial services to build the outdoor company he always wanted to run. That '
                    'background shows up in how we work: clear communication, tight scheduling and a finished '
                    'product you will be proud of. We are fully licensed and insured and can provide a '
                    'certificate of insurance on request.', align='center'),
               arrow_link('Our Story', '%%URL:about%%', align='center')],
              gap=24, flex_align_items='center', _css_classes='mpc-above'),
    ], STONE, pad=(100, 100), pad_t=(80, 80), pad_m=(64, 64), width=764, extra={'_css_classes': 'mpc-band'})

    return [hero, trust_bar, why, services, recent, about, cta_band()]


# ---- About ------------------------------------------------------------------------
def about():
    story = section([grid([
        stack([image('PLACEHOLDER', 'Portrait of Heys McMath', '45'),
               stack([display('Heys McMath', 'p', FOREST, 26, 26, 24, lh=1.2),
                      heading('Owner &amp; Operator', 'p', OLIVE, size=13, weight=500, ls=0.16, transform='uppercase')],
                     gap=4)], gap=20, **resp('width', None, None, None)),
        stack([eyebrow('From the Owner'),
               display('I left the corporate world to do the work I love, the way I believe it should be done.',
                       'h2', FOREST, 42, 36, 30, lh=1.15),
               text('I spent ten years in the logistics and financial services industry before deciding to chase my '
                    'dream of owning my own business doing something I am passionate about. My early years through '
                    'college were spent running a small lawn care business during the summers in my hometown, and I '
                    'never lost the satisfaction of standing back at the end of a day and seeing a property '
                    'transformed.', lh=1.7),
               text('Magnolia Property Care brings those two worlds together. The discipline of logistics, meaning '
                    'schedules that hold, clear communication and no surprises, applied to landscape development, '
                    'site preparation, tree care and property upkeep.', lh=1.7),
               text('We are fully licensed and insured and can provide a certificate of insurance upon request.', lh=1.7),
               stack([display('“Our clients are busy people with high standards. They want one person who knows '
                              'their property and gets it right. That is the whole business.”', 'p', FOREST, 22, 22,
                              20, lh=1.35),
                      heading('Heys McMath', 'p', OLIVE, size=13, weight=500, ls=0.16, transform='uppercase')],
                     gap=10, padding=box(28, 32), padding_mobile=box(24, 22),
                     background_background='classic', background_color=STONE)],
              gap=26),
    ], (2, 1, 1), (80, 56), grid_columns_grid=px('5fr 7fr', 'custom'))], IVORY, pad=(100, 100))

    def standard(n, title, body):
        return stack([display(n, 'span', OLIVE, 14, 14, 14, lh=1.2),
                      display(title, 'h3', FOREST, 24, 22, 22, lh=1.2),
                      text(body, BODY, 16, m=16, lh=1.6)],
                     gap=14, padding=box(40, 32), padding_mobile=box(30, 24),
                     background_background='classic', background_color=IVORY)
    standards = section([
        stack([eyebrow('The Magnolia Standard'), display('What white glove means to us.')], gap=18,
              **resp('width', px(700), px(100, '%'), px(100, '%'))),
        grid([standard('01', 'Full scope, one contract',
                       'Clearing, grading, drainage, hardscape, trees, washing and repairs. You sign once and we '
                       'coordinate the rest.'),
              standard('02', 'Owner on every job',
                       'You will not be handed off. Heys walks the site, writes the estimate and is on the property '
                       'when the work happens.'),
              standard('03', 'Clean site, clear updates',
                       'We leave the property cleaner than we found it and keep you informed without you having to ask.'),
              standard('04', 'Licensed and insured',
                       'Fully licensed and insured, with a certificate of insurance available to homeowners, '
                       'contractors and property managers on request.')],
             (4, 2, 1), (1, 1), (1, 1), (1, 1), background_background='classic',
             background_color='rgba(40,58,51,0.15)', border_border='solid', border_width=box(1),
             border_color='rgba(40,58,51,0.15)'),
    ], STONE, pad=(100, 100), gap=48)

    def step(n, title, body):
        return stack([display(n, 'span', OLIVE, 36, 36, 32, lh=1),
                      display(title, 'h3', FOREST, 22, 22, 21, lh=1.25),
                      text(body, BODY, 16, m=16, lh=1.6)], gap=14)
    steps = section([
        stack([eyebrow('How We Work'), display('Four steps from first call to finished property.')], gap=18,
              **resp('width', px(700), px(100, '%'), px(100, '%'))),
        grid([step('1', 'Reach out', 'Call, text or send the estimate request form. Tell us what you have and what '
                   'you want it to become.'),
              step('2', 'Site walk &amp; estimate', 'Heys walks the property with you, talks through options and '
                   'sends a clear, itemized estimate.'),
              step('3', 'One crew, one schedule', 'We handle every phase of the scope in sequence, so nothing waits '
                   'on another company.'),
              step('4', 'Walkthrough &amp; ongoing care', 'A final walkthrough together, then the option to keep us on '
                   'for seasonal and property care.')],
             (4, 2, 1), (40, 40), (40, 40), (28, 36)),
    ], IVORY, pad=(100, 100), gap=48)

    return page_hero('About Us', 'A premier outdoor service built on one idea: you should only have to make one '
                     'call.') + [story, standards, steps, cta_band()]


# ---- Services ---------------------------------------------------------------------
def services():
    def jump(label, anchor):
        w = heading(label, 'p', SAND, link='#' + anchor, size=13, weight=500, ls=0.16, transform='uppercase')
        w['settings']['title_hover_color'] = WHITE
        w['settings']['_padding'] = box(20, 0)
        w['settings']['_padding_mobile'] = box(10, 0)
        return w
    jumps = section([row([jump('Landscape Development', 'services-development'), jump('Tree Care', 'services-tree'),
                          jump('Power Washing', 'services-washing'),
                          jump('Property Care Subscription', 'services-care')],
                         gap=40, justify='flex-start', flex_gap_mobile=gaps(24, 0))],
                    FOREST, pad=(0, 0), pad_t=(0, 0), pad_m=(10, 10),
                    extra={'border_border': 'solid', 'border_width': box(1, 0, 0, 0),
                           'border_color': 'rgba(213,212,190,0.12)'})

    dev_items = [
        ('Forestry Mulching', 'Clear underbrush and small trees in place, leaving a clean mulched surface with no burn piles or haul-off.'),
        ('Land Clearing', 'Full clearing of lots and acreage for homesites, pasture, access roads and views.'),
        ('Brush Removal', 'Overgrowth cut, chipped and hauled so the property is usable again.'),
        ('Landscape Design', 'Planting, bed and hardscape plans that fit the property and the way you use it.'),
        ('Grading', 'Rough and finish grading for building pads, lawns and proper water flow away from structures.'),
        ('Drainage Solutions', 'French drains, swales, catch basins and downspout tie-ins that solve wet areas for good.'),
        ('Retaining Walls', 'Segmental block, timber and boulder walls engineered for slopes and terraces.'),
        ('Hardscaping', 'Patios, walkways, fire pits and steps in pavers and natural stone.'),
        ('Gravel Driveway Installation &amp; Repair', 'New drives, crowning, regrading and fresh stone for long rural approaches.'),
        ('Culvert Installation', 'Properly sized and set culverts for driveways, crossings and ditch lines.'),
        ('Sod Installation', 'Prepared soil and fresh sod for an instant, established lawn.'),
        ('Hydroseeding', 'Fast, even coverage for large cleared areas, slopes and erosion control.'),
        ('Trenching', 'Clean trenches for utilities, irrigation, drainage and electrical runs.'),
    ]
    dev_cards = [stack([display(n, 'h3', FOREST, 21, 21, 20, lh=1.25), text(d, MUTED, 15, m=15, lh=1.55)],
                       gap=10, padding=box(30, 28), padding_mobile=box(24, 22),
                       background_background='classic', background_color=IVORY,
                       background_hover_background='classic', background_hover_color=WHITE)
                 for n, d in dev_items]
    # 13 cards leave the last row short: stretch the final card across it.
    dev_cards[-1]['settings'].update(grid_column='4', grid_column_tablet='2', grid_column_mobile='1')
    dev = section([
        grid([stack([eyebrow('01 · Our Specialty'),
                     display('Landscape Development &amp; Site Preparation'),
                     text('This is the heart of what we do. New homesites, acreage reclaimed from overgrowth, drainage '
                          'problems solved for good, driveways and walls built to last. We bring the equipment and the '
                          'planning to take a property from where it is to where you want it, without a parade of '
                          'subcontractors.'),
                     text('Ideal for homeowners building or expanding, general contractors who need a reliable site '
                          'partner, and real estate professionals preparing land for sale.'),
                     button('Request a Site Visit', '%%URL:contact%%', FOREST, IVORY, OLIVE, WHITE, pad=(16, 28))],
                    gap=22),
              image('photos/gravel-spread.jpg', 'Spreading gravel on a new driveway', '43')],
             (2, 1, 1), (80, 48), grid_align_items='center'),
        grid(dev_cards, (4, 2, 1), (1, 1), (1, 1), (1, 1), background_background='classic',
             background_color='rgba(40,58,51,0.15)', border_border='solid', border_width=box(1),
             border_color='rgba(40,58,51,0.15)'),
    ], IVORY, gap=64, element_id='services-development', extra={'flex_gap_mobile': gaps(44)})

    tree = section([grid([
        image('photos/tree-removal.jpg', 'Tree and brush removal', '43'),
        stack([eyebrow('02'), display('Tree Care'),
               text('Safe, clean tree work that respects the rest of your property. From a single hazardous tree over '
                    'the house to clearing a treeline for a view, we handle it with the same care as the landscape '
                    'around it.'),
               bullets(['Tree removal', 'Pruning &amp; trimming', 'Storm damage cleanup', 'Brush removal &amp; haul-off',
                        'Treeline &amp; view clearing', 'Stump grinding'])], gap=22),
    ], (2, 1, 1), (80, 48), grid_align_items='center')], STONE, pad=(100, 100), element_id='services-tree')

    wash = section([grid([
        stack([eyebrow('03'), display('Commercial Power Washing'),
               text('First impressions for storefronts, offices, rental properties and HOA common areas. We use the '
                    'right pressure and solutions for each surface, scheduled around your hours of operation.'),
               bullets(['Building exteriors', 'Sidewalks &amp; entryways', 'Parking areas &amp; drive-thrus',
                        'Patios, decks &amp; hardscape', 'Dumpster pads &amp; loading areas',
                        'Recurring maintenance schedules'])], gap=22),
        image('photos/power-wash-2.jpg', 'Power washing a commercial brick building', '43'),
    ], (2, 1, 1), (80, 48), grid_align_items='center')], IVORY, pad=(100, 100), element_id='services-washing')

    care = section([
        watermark((32, 44, 80), 0.08, 'start', -8, 'end', -12),
        grid([image('photos/firepit-home.jpg', 'Well-kept home with paver patio', '43'),
              stack([eyebrow('04 · For Second Home Owners &amp; Property Managers', MOSS),
                     display('Property Care Subscription', 'h2', IVORY),
                     text('A standing arrangement for owners who are not always on site. We visit on a schedule, handle '
                          'the seasonal and handyman work that comes up, and send you a short report so you always know '
                          'the state of your property. One trusted contact, instead of a list of numbers to call when '
                          'something breaks.', SAND),
                     bullets(['Scheduled property check-ins', 'Exterior &amp; grounds upkeep',
                              'Handyman repairs &amp; small projects', 'Seasonal prep &amp; storm follow-up',
                              'Arrival-ready visits before you come in', 'Photo report after each visit'],
                             IVORY, MOSS),
                     button('Ask About a Plan', '%%URL:contact%%', pad=(16, 28))], gap=22)],
             (2, 1, 1), (80, 48), grid_align_items='center', _css_classes='mpc-above'),
    ], FOREST, pad=(100, 100), element_id='services-care', extra={'_css_classes': 'mpc-band'})

    return page_hero('Services', 'From raw land to a property that takes care of itself.',
                     'Four service lines, one team. Most clients start with a development or clearing project and '
                     'stay with us for everything that follows.', jumps) + [dev, tree, wash, care, cta_band()]


# ---- Past Projects ----------------------------------------------------------------
PROJECTS = [
    ('photos/forestry-mulcher.jpg', 'Wooded Lot to Build-Ready Homesite', 'Person County, NC', 'Site Preparation',
     'Forestry mulching, land clearing, rough and finish grading, culvert and gravel drive installation.'),
    ('photos/drainage.jpg', 'Hillside Drainage &amp; Retaining Wall', 'Orange County, NC', 'Landscape Development',
     'French drain system, segmental retaining wall, regrading and sod installation.'),
    ('photos/tree-removal.jpg', 'Lake Property Treeline Clearing', 'Halifax County, VA', 'Tree Care',
     'Selective tree removal for a water view, brush removal, stump grinding and hydroseeding.'),
    ('photos/gravel-drive.jpg', 'Farm Driveway Rebuild', 'Caswell County, NC', 'Site Preparation',
     'Quarter-mile gravel drive repair, crowning, new culverts and ditch trenching.'),
    ('photos/power-wash-1.jpg', 'Retail Center Exterior Refresh', 'Guilford County, NC', 'Power Washing',
     'Storefront facades, sidewalks and parking areas on a recurring quarterly schedule.'),
    ('photos/landscape-bed.jpg', 'Second Home Seasonal Care', 'Granville County, NC', 'Property Care',
     'Monthly visits, deck repairs, gutter and grounds upkeep, arrival-ready prep before each stay.'),
]
CATEGORIES = ['Site Preparation', 'Landscape Development', 'Tree Care', 'Power Washing', 'Property Care']


def slug(s):
    return s.lower().replace(' ', '-')


FILTER_HTML = '''<div class="mpc-filters" role="group" aria-label="Filter projects">
%s
</div>
<script>
(function () {
  var wrap = document.currentScript.previousElementSibling;
  var buttons = wrap.querySelectorAll('button');
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var cat = b.getAttribute('data-filter');
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('.mpc-project').forEach(function (p) {
        p.style.display = (cat === 'all' || p.classList.contains('mpc-cat-' + cat)) ? '' : 'none';
      });
    });
  });
})();
</script>''' % '\n'.join(
    '  <button type="button" data-filter="%s" aria-pressed="%s">%s</button>' % (k, 'true' if k == 'all' else 'false', v)
    for k, v in [('all', 'All')] + [(slug(c), c) for c in CATEGORIES])


def projects():
    cards = []
    for img, title, place, cat, body in PROJECTS:
        cards.append(stack([
            image(img, title.replace('&amp;', '&'), '43'),
            stack([row([heading(place, 'span', OLIVE, size=11, weight=500, ls=0.2, transform='uppercase'),
                        heading(cat, 'span', GREY, size=11, weight=500, ls=0.2, transform='uppercase')],
                       gap=16, wrap='wrap'),
                   display(title, 'h3', FOREST, 24, 22, 22, lh=1.2),
                   text(body, MUTED, 15, m=15, weight=400, lh=1.55)], gap=8)],
            gap=18, _css_classes='mpc-project mpc-cat-' + slug(cat)))
    body = section([html_widget(FILTER_HTML), grid(cards, (3, 2, 1), (28, 36), (24, 36), (24, 40))],
                   IVORY, pad=(90, 90), gap=40)
    return page_hero('Past Projects', 'The work speaks for itself.',
                     'A selection of recent projects across our service area, from full site development to ongoing '
                     'property care.') + [body, cta_band()]


# ---- Contact ----------------------------------------------------------------------
def form_widget():
    def field(cid, ftype, label, width='50', required=False, placeholder='', **extra):
        f = {'_id': eid(), 'custom_id': cid, 'field_type': ftype, 'field_label': label, 'placeholder': placeholder,
             'required': 'true' if required else '', 'width': width, 'width_tablet': width, 'width_mobile': '100'}
        f.update(extra)
        return f
    fields = [
        field('name', 'text', 'Full Name', required=True, placeholder='Your name'),
        field('phone', 'tel', 'Phone', required=True, placeholder='(336) 000-0000'),
        field('email', 'email', 'Email', required=True, placeholder='you@example.com'),
        field('address', 'text', 'Property Address', placeholder='Street, town, county'),
        field('role', 'select', 'I Am A', field_options='\n'.join(
            ['Homeowner', 'Second home owner', 'Property manager', 'General contractor', 'Real estate professional',
             'Business owner'])),
        field('timeline', 'select', 'Timeline', field_options='\n'.join(
            ['As soon as possible', 'Within 1–3 months', '3–6 months', 'Planning ahead'])),
        field('services', 'checkbox', 'Services Needed', '100', field_options='\n'.join(
            ['Land clearing / forestry mulching', 'Grading & drainage', 'Retaining walls & hardscape',
             'Gravel driveway / culvert', 'Landscape design & install', 'Tree care', 'Commercial power washing',
             'Property care subscription']), inline_list='elementor-subgroup-inline'),
        field('details', 'textarea', 'Tell Us About the Project', '100', rows=5,
              placeholder="Acreage, current condition, what you'd like the finished property to look like, access notes…"),
    ]
    s = {
        'form_name': 'Estimate Request', 'form_fields': fields, 'input_size': 'md', 'show_labels': 'yes',
        'mark_required': 'yes', 'button_text': 'Send Request', 'button_size': 'md', 'button_width': '100',
        'button_align': 'start', 'button_width_mobile': '100',
        'submit_actions': ['email'],
        'email_to': '%%ESTIMATE_EMAIL%%',
        'email_subject': 'Estimate request from [field id="name"]',
        'email_content': '[all-fields]',
        'email_from_name': 'Magnolia Property Care website',
        'email_reply_to': 'email',
        'email_content_type': 'html',
        'success_message': 'Thank you. Your request is in. Heys will reach out within one business day to talk '
                           'through the project and set up a site visit.',
        'error_message': 'Sorry, your request could not be sent. Please call ' + PHONE + '.',
        'required_field_message': 'This field is required.',
        'invalid_message': "There's something wrong. The form is invalid.",
        'column_gap': px(22), 'row_gap': px(22), 'label_spacing': px(8),
        'label_color': FOREST, 'mark_required_color': OLIVE, 'html_color': BODY,
        'field_text_color': INK, 'field_background_color': '#FBFAF6', 'field_border_color': '#C4C6B8',
        'field_border_width': box(1), 'field_border_radius': box(0),
        'button_background_color': OLIVE, 'button_text_color': IVORY, 'button_background_hover_color': OLIVE_DARK,
        'button_hover_color': WHITE, 'button_border_radius': box(0), 'button_text_padding': box(18, 34),
        'message_color': FOREST,
        '_css_classes': 'mpc-form',
    }
    s.update(typo('label_typography', size=12, weight=500, ls=0.14, transform='uppercase', lh=1.4))
    s.update(typo('field_typography', size=16, weight=400, lh=1.4))
    s.update(typo('html_typography', size=15, weight=400))
    s.update(typo('button_typography', size=13, weight=500, ls=0.16, transform='uppercase'))
    return widget('form', s, ('label_color', 'field_text_color', 'button_background_color', 'button_text_color',
                              'label_typography_typography', 'field_typography_typography',
                              'button_typography_typography'))


def contact():
    def info(label, kids):
        return stack([heading(label, 'h3', OLIVE, size=12, weight=600, ls=0.2, transform='uppercase')] + kids, gap=14)
    left = stack([
        info('Call or Text', [heading(PHONE, 'p', FOREST, link=TEL, family=SERIF, size=30, t=28, m=26, lh=1.2)]),
        info('Email', [heading(EMAIL, 'p', FOREST, link='mailto:' + EMAIL, size=19, m=17, weight=400, lh=1.4)]),
        info('Hours', [text('Monday – Saturday<br>7 AM – 5 PM', BODY, 17, m=17, weight=400, lh=1.6)]),
        info('Service Area', [
            text('<strong style="font-weight:500;color:%s">North Carolina:</strong> Person, Caswell, Rockingham, '
                 'Guilford, Alamance, Orange, Durham and Granville counties.' % FOREST, BODY, 16, m=16, weight=400),
            text('<strong style="font-weight:500;color:%s">Virginia:</strong> Pittsylvania, Halifax and Henry '
                 'counties.' % FOREST, BODY, 16, m=16, weight=400)]),
        stack([heading('Licensed &amp; Insured', 'p', FOREST, size=12, weight=600, ls=0.2, transform='uppercase'),
               text('A certificate of insurance is available on request for contractors, property managers and HOAs.',
                    BODY, 15, m=15, weight=400, lh=1.6)],
              gap=8, padding=box(24, 28), padding_mobile=box(20, 22),
              background_background='classic', background_color=STONE),
    ], gap=36)
    right = stack([
        stack([display('Request an Estimate', 'h2', FOREST, 32, 30, 28, lh=1.15),
               text('Fields marked * are required.', MUTED, 15, m=15, weight=400)], gap=8),
        form_widget(),
        text('Or call <a href="%s" style="color:%s;font-weight:500">%s</a>' % (TEL, FOREST, PHONE), MUTED, 15, m=15,
             weight=400),
    ], gap=28, padding=box(52), padding_tablet=box(40), padding_mobile=box(26, 20),
        background_background='classic', background_color=WHITE,
        border_border='solid', border_width=box(1), border_color='rgba(40,58,51,0.12)')
    body = section([grid([left, right], (2, 1, 1), (80, 56), grid_columns_grid=px('4fr 7fr', 'custom'))],
                   IVORY, pad=(90, 90))
    return page_hero('Contact Us', 'Tell us about your property.',
                     'Share a few details and Heys will reach out within one business day to talk through the '
                     'project and schedule a site visit.') + [body]


# ---- Header & footer (Elementor Pro Theme Builder) --------------------------------
def header():
    nav = {
        'menu': '%%MENU%%', 'layout': 'horizontal', 'align_items': 'center', 'pointer': 'underline',
        'animation_line': 'fade', 'submenu_icon': {'value': 'fas fa-caret-down', 'library': 'fa-solid'},
        'dropdown': 'tablet', 'full_width': 'stretch', 'text_align': 'aside',
        'toggle': 'burger', 'toggle_align': 'right',
        'color_menu_item': SAND, 'color_menu_item_hover': WHITE, 'pointer_color_menu_item_hover': OLIVE,
        'color_menu_item_active': WHITE, 'pointer_color_menu_item_active': OLIVE,
        'pointer_width': px(2), 'padding_horizontal_menu_item': px(0), 'padding_vertical_menu_item': px(8),
        'menu_space_between': px(34),
        'color_dropdown_item': SAND, 'background_color_dropdown_item': FOREST,
        'color_dropdown_item_hover': WHITE, 'background_color_dropdown_item_hover': DEEP,
        'color_dropdown_item_active': WHITE, 'background_color_dropdown_item_active': DEEP,
        'padding_horizontal_dropdown_item': px(SIDE), 'padding_vertical_dropdown_item': px(16),
        'dropdown_divider_border': 'solid', 'dropdown_divider_color': 'rgba(213,212,190,0.1)',
        'dropdown_divider_width': px(1), 'dropdown_top_distance': px(20),
        'toggle_color': SAND, 'toggle_background_color': 'rgba(0,0,0,0)', 'toggle_size': px(22),
        'toggle_border_width': px(1), 'toggle_border_radius': px(0),
        '_flex_order_tablet': 'end', '_flex_order_mobile': 'end',
    }
    nav.update(typo('menu_typography', size=13, weight=400, ls=0.16, transform='uppercase'))
    nav.update(typo('dropdown_typography', size=15, weight=400, ls=0.14, transform='uppercase'))
    right = row([heading(PHONE, 'p', SAND, link=TEL, size=15, weight=500, lh=1.2, align=None),
                 button('Request an Estimate', '%%URL:contact%%', pad=(13, 22))],
                gap=22, justify='flex-end', wrap='nowrap', width=px('auto', 'custom'),
                width_tablet=px('auto', 'custom'), _flex_size='none', _flex_size_tablet='grow',
                hide_mobile='hidden-mobile')
    right['elements'][0]['settings']['hide_tablet'] = 'hidden-tablet'
    right['elements'][0]['settings']['title_hover_color'] = WHITE
    logo = image('logo-h-olive-ivory.png', 'Magnolia Property Care', link='%%URL:home%%',
                 width={'width': px(191), 'width_tablet': px(170), 'width_mobile': px(150)},
                 _flex_size='none')
    bar = container([logo, widget('nav-menu', nav, ('menu_typography_typography', 'dropdown_typography_typography',
                                                    'color_menu_item', 'color_menu_item_hover')), right],
                    inner=False, content_width='boxed', boxed_width=px(MAX),
                    flex_direction='row', flex_justify_content='space-between', flex_align_items='center',
                    flex_wrap='nowrap', flex_gap=gaps(24), flex_gap_mobile=gaps(12),
                    min_height=px(84), min_height_mobile=px(72),
                    padding=box(0, SIDE), padding_tablet=box(0, SIDE), padding_mobile=box(0, SIDE),
                    background_background='classic', background_color=FOREST,
                    border_border='solid', border_width=box(0, 0, 1, 0), border_color='rgba(213,212,190,0.12)',
                    sticky='top', sticky_on=['desktop', 'tablet', 'mobile'], sticky_offset=0, z_index=50,
                    _css_classes='mpc-header')
    return [bar]


def footer():
    def col_head(t):
        return heading(t, 'h3', MOSS, size=11, weight=600, ls=0.2, transform='uppercase')
    brand = stack([image('logo-stacked-olive-ivory.png', 'Magnolia Property Care', link='%%URL:home%%',
                         width={'width': px(200), 'width_mobile': px(180)}),
                   text('White glove outdoor and exterior maintenance for the North Carolina Piedmont and Southside '
                        'Virginia.', '#B8B9A4', 15, m=15, weight=400, lh=1.6),
                   display('Care for Every Corner.', 'p', SAND, 17, 17, 17, lh=1.3)], gap=12)
    pages = stack([col_head('Pages'), link_list([('Home', '%%URL:home%%'), ('About Us', '%%URL:about%%'),
                                                 ('Services', '%%URL:services%%'),
                                                 ('Past Projects', '%%URL:projects%%'),
                                                 ('Contact Us', '%%URL:contact%%')])], gap=8)
    servs = stack([col_head('Services'), link_list([
        ('Landscape Development &amp; Site Prep', '%%URL:services%%#services-development'),
        ('Tree Care', '%%URL:services%%#services-tree'),
        ('Commercial Power Washing', '%%URL:services%%#services-washing'),
        ('Property Care Subscription', '%%URL:services%%#services-care')])], gap=8)
    contact_col = stack([col_head('Contact'), link_list([(PHONE, TEL), (EMAIL, 'mailto:' + EMAIL)]),
                         text('Mon – Sat, 7 AM – 5 PM<br>Person County, North Carolina', '#B8B9A4', 15, m=15,
                              weight=400, lh=1.6)], gap=8)
    main = section([watermark((36, 50, 90), 0.07, 'end', -6, 'end', -25),
                    grid([brand, pages, servs, contact_col], (4, 2, 1), (32, 32), (32, 40), (24, 32),
                         _css_classes='mpc-above')],
                   DEEP, pad=(44, 32), pad_t=(44, 32), pad_m=(40, 28), extra={'_css_classes': 'mpc-band'})
    bottom = section([row([text('© 2026 Magnolia Property Care. All rights reserved.', '#8F9A8F', 13, m=13, weight=400,
                                lh=1.5),
                           text('Fully licensed &amp; insured · COI available on request', '#8F9A8F', 13, m=13,
                                weight=400, lh=1.5)], gap=12, flex_direction_mobile='column',
                          flex_align_items_mobile='flex-start')],
                     DEEP, pad=(16, 16), pad_t=(16, 16), pad_m=(16, 20),
                     extra={'border_border': 'solid', 'border_width': box(1, 0, 0, 0),
                            'border_color': 'rgba(213,212,190,0.12)'})
    return [main, bottom]


# ---- Kit (Site Settings) ------------------------------------------------------------
KIT_CSS = '''/* Magnolia Property Care */
.mpc-ratio-43 img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.mpc-ratio-45 img { width: 100%; max-width: 520px; aspect-ratio: 4 / 5; object-fit: cover; display: block; background: #E9E7DA; }
.mpc-band { position: relative; }
.mpc-above { position: relative; z-index: 1; }
.mpc-watermark { pointer-events: none; user-select: none; }
.elementor-widget.mpc-watermark-center { left: 50% !important; right: auto !important; top: 50% !important; bottom: auto !important; transform: translate(-50%, -50%); }
.mpc-link .elementor-heading-title a { display: inline-block; padding-bottom: 6px; transition: color .2s; }
.mpc-underline .elementor-heading-title a { border-bottom: 1.5px solid #738238; }
.mpc-bullets .elementor-icon-list-icon i, .mpc-bullets .elementor-icon-list-icon svg { transform: rotate(45deg); }
.mpc-bullets-2col .elementor-icon-list-items { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 24px; }
.mpc-bullets-2col .elementor-icon-list-item { margin: 0 !important; padding: 0 !important; }
.mpc-card { transition: transform .3s ease; }
.mpc-card:hover { color: #fff; }
.mpc-card:hover h3 { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; }
.mpc-project-card:hover h3 { color: #738238 !important; }
.mpc-filters { display: flex; flex-wrap: wrap; gap: 10px; }
.mpc-filters button { border: 1px solid #283A33; background: transparent; color: #283A33; padding: 11px 18px; min-height: 44px;
  font: 500 12px/1.2 Jost, sans-serif; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; border-radius: 0; white-space: nowrap; }
.mpc-filters button:hover, .mpc-filters button[aria-pressed="true"] { background: #283A33; color: #F4F2EA; }
.mpc-form .elementor-field-subgroup.elementor-subgroup-inline { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 20px; }
.mpc-form .elementor-field-subgroup .elementor-field-option { margin: 0; text-transform: none; letter-spacing: 0; }
.mpc-form .elementor-field-subgroup label { font-size: 15px; color: #3F4A44; text-transform: none; letter-spacing: 0; }
.mpc-header .elementor-nav-menu--dropdown { border-top: 1px solid rgba(213,212,190,.12); }
.mpc-header .elementor-menu-toggle { border: 1px solid rgba(213,212,190,.4); padding: 10px; }
html { scroll-padding-top: 100px; }
@media (max-width: 767px) {
  .mpc-watermark { opacity: .06 !important; }
  .elementor-button { white-space: normal; }
}
'''


def kit():
    def color(cid, title, value):
        return {'_id': cid, 'title': title, 'color': value}

    def font(cid, title, family, weight):
        return {'_id': cid, 'title': title, 'typography_typography': 'custom', 'typography_font_family': family,
                'typography_font_weight': str(weight)}
    s = {
        'system_colors': [color('primary', 'Forest', FOREST), color('secondary', 'Olive', OLIVE),
                          color('text', 'Body Text', BODY), color('accent', 'Olive', OLIVE)],
        'custom_colors': [color('mpcsand', 'Sand', SAND), color('mpcivory', 'Ivory', IVORY),
                          color('mpcdeep', 'Deep Forest', DEEP), color('mpcstone', 'Stone', STONE),
                          color('mpcmoss', 'Moss', MOSS), color('mpcolivedk', 'Olive Dark', OLIVE_DARK)],
        'system_typography': [font('primary', 'Headings', SERIF, 400), font('secondary', 'Sub Headings', SANS, 500),
                              font('text', 'Body', SANS, 300), font('accent', 'Buttons', SANS, 500)],
        'body_background_background': 'classic', 'body_background_color': IVORY,
        'body_color': INK, 'link_normal_color': OLIVE_DARK, 'link_hover_color': FOREST,
        'container_width': px(MAX), 'container_padding': box(0),
        'space_between_widgets': px(0),
        'custom_css': KIT_CSS,
    }
    s.update(typo('body_typography', size=16, weight=400, lh=1.6))
    for h in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
        s.update(typo(h + '_typography', SERIF, weight=400))
    return s


os.makedirs(OUT, exist_ok=True)
docs = {'page-home': home(), 'page-about': about(), 'page-services': services(), 'page-projects': projects(),
        'page-contact': contact(), 'header': header(), 'footer': footer()}
for name, data in docs.items():
    with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, 'kit.json'), 'w', encoding='utf-8') as f:
    json.dump(kit(), f, ensure_ascii=False, indent=1)
print('wrote', len(docs) + 1, 'files to', OUT)
