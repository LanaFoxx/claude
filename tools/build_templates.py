#!/usr/bin/env python3
"""Generate the Top Notch Painting Elementor templates ("Timberline", minimal editorial version).

Run:  python3 tools/build_templates.py   ->  writes output/tn-*.json
All values are literal (hex, px, font names); no Global Color/Font references.
SVG icons (Phosphor Light + a few line glyphs) are referenced from the Media Library;
their IDs/URLs come from tools/icon_map.json (see output/IMPORT-NOTES.md).
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "output")
ICONS = json.load(open(os.path.join(HERE, "icon_map.json")))
# Subtle wood texture behind the Charred Timber sections (Media Library image), or None.
_TEX = os.path.join(HERE, "texture.json")
TEXTURE = json.load(open(_TEX)) if os.path.exists(_TEX) else None
TEXTURE_OPACITY = 0.88  # Charred overlay strength over the texture (higher = subtler)

# ---------------------------------------------------------------- tokens
CHARRED = "#14110E"
NIGHT = "#0F0D0B"
SPRUCE = "#24302A"
EST_BROWN = "#2A1F17"      # lighter warm brown for the estimate section (client request)
BONE = "#F2ECE3"
AMBER = "#C68B4E"
AMBER_HOVER = "#D9A66B"
DEEP = "#8A5A2B"
DRIFT = "#B3A99C"
BARK = "#5B5046"
HERO_TEXT = "#D7CFC4"
SPRUCE_TEXT = "#C9D1C4"
FIELD_LINE = "#857A6E"
HAIR_10 = "#F2ECE31A"      # rgba(242,236,227,0.10)
HAIR_16 = "#F2ECE329"      # rgba(242,236,227,0.16)
FILL_12 = "#F2ECE31F"      # rgba(242,236,227,0.12)
LABEL_60 = "#F2ECE399"     # rgba(242,236,227,0.6)
TRANSPARENT = "#00000000"
SERIF = "Cormorant Garamond"
SANS = "Manrope"

TEL = "tel:+19705247323"
PHONE = "(970) 524-7323"

DEVICES = ("", "_laptop", "_tablet", "_mobile")

# Responsive tuples (desktop, laptop, tablet, mobile), read off the reference's clamp()
# formulas at 1440 / ~1300 / 980 / mobile.
SIDE = (48, 48, 32, 20)                  # clamp(20px, 4vw, 48px)
SECV = (128, 117, 88, 80)                # clamp(80px, 9vw, 128px)
SECV_TALL = (151, 137, 103, 96)          # clamp(96px, 10.5vw, 152px)
H1 = (86, 78, 59, 44)                    # clamp(44px, 6vw, 88px)
H2 = (60, 55, 41, 36)                    # clamp(36px, 4.2vw, 60px)
H2_PATH = (43, 39, 32, 32)               # clamp(32px, 3vw, 44px)
QUOTE = (40, 36, 30, 26)                 # smaller than the reference at Mike's request

# ---------------------------------------------------------------- ids
_rng = random.Random(2026)
_used = set()


def eid():
    while True:
        v = "%07x" % _rng.randrange(16 ** 6, 16 ** 7)
        if v not in _used:
            _used.add(v)
            return v


# ---------------------------------------------------------------- value helpers
def px(n, unit="px"):
    return {"unit": unit, "size": n, "sizes": []}


def em(n):
    return {"unit": "em", "size": n, "sizes": []}


def dims(t, r=None, b=None, l=None, unit="px"):
    r = t if r is None else r
    b = t if b is None else b
    l = r if l is None else l
    vals = [str(v) for v in (t, r, b, l)]
    return {"unit": unit, "top": vals[0], "right": vals[1], "bottom": vals[2],
            "left": vals[3], "isLinked": len(set(vals)) == 1}


def gaps(col, row=None):
    row = col if row is None else row
    return {"column": str(col), "row": str(row), "isLinked": col == row,
            "unit": "px", "size": col}


def tup(v):
    return v if isinstance(v, tuple) and len(v) == 4 else (v,) * 4


def resp(key, values, fn=lambda v: v):
    if not (isinstance(values, tuple) and len(values) == 4):
        return {key: fn(values)}
    return {key + dev: fn(v) for dev, v in zip(DEVICES, values) if v is not None}


def typo(prefix="typography", family=SANS, size=None, weight=None, lh=None,
         ls=None, transform=None):
    s = {prefix + "_typography": "custom", prefix + "_font_family": family}
    if size is not None:
        s.update(resp(prefix + "_font_size", size, px))
    if weight is not None:
        s[prefix + "_font_weight"] = str(weight)
    if lh is not None:
        s.update(resp(prefix + "_line_height", lh, em))
    if ls is not None:
        s[prefix + "_letter_spacing"] = px(ls)
    if transform:
        s[prefix + "_text_transform"] = transform
    return s


def pads(top, right, bottom, left):
    """Responsive padding from scalars or 4-tuples."""
    t, r, b, l = tup(top), tup(right), tup(bottom), tup(left)
    return {"padding" + d: dims(t[i], r[i], b[i], l[i]) for i, d in enumerate(DEVICES)}


def link(url, attrs=None):
    d = {"url": url, "is_external": "", "nofollow": ""}
    if attrs:
        d["custom_attributes"] = attrs
    return d


def svg(name):
    i = ICONS[name]
    return {"value": {"url": i["url"], "id": int(i["id"])}, "library": "svg"}


# Nav Menu's submenu indicator must be a font icon: an uploaded SVG there crashes the
# Pro Nav Menu render (tested on Elementor Pro 3.35.1).
FA_CHEVRON = {"value": "fas fa-chevron-down", "library": "fa-solid"}
HIDE_MOBILE = {"hide_mobile": "hidden-mobile"}
MOBILE_ONLY = {"hide_desktop": "hidden-desktop", "hide_laptop": "hidden-laptop",
               "hide_tablet": "hidden-tablet"}
AUTO_W = "selector{--width:auto;width:auto;min-width:0;}"


# ---------------------------------------------------------------- element builders
def container(title, children, top=False, boxed=False, direction="column", gap=0,
              padding=None, auto_width=False, css="", **s):
    """gap: int, (col,row) pair, or 4-tuple of those per device."""
    st = {"_title": title, "content_width": "boxed" if boxed else "full",
          "flex_direction": direction}
    g = gap if (isinstance(gap, tuple) and len(gap) == 4) else (gap,) * 4
    for i, d in enumerate(DEVICES):
        v = g[i]
        st["flex_gap" + d] = gaps(*v) if isinstance(v, tuple) else gaps(v)
    if boxed:
        st["boxed_width"] = px(1280)
    else:
        st["width"] = px(100, "%")
    if padding is None:
        st["padding"] = dims(0)
    elif "padding" in padding:
        st.update(padding)
    else:
        st["padding"] = padding
    st.update(s)
    custom = (AUTO_W if auto_width else "") + css + st.pop("custom_css", "")
    if custom:
        st["custom_css"] = custom
    return {"id": eid(), "elType": "container", "isInner": not top, "settings": st,
            "elements": children}


def grid(title, children, cols, gap_col, gap_row=None, **s):
    def colval(v):
        return px(v, "fr") if isinstance(v, int) else {"unit": "custom", "size": v, "sizes": []}
    st = {"container_type": "grid", "grid_auto_flow": "row",
          "grid_rows_grid": s.pop("rows", {"unit": "custom", "size": "auto", "sizes": []})}
    st.update(resp("grid_columns_grid", cols, colval))
    gc = tup(gap_col)
    gr = tup(gap_row) if gap_row is not None else gc
    for i, d in enumerate(DEVICES):
        st["grid_gaps" + d] = gaps(gc[i], gr[i])
    st.update(s)
    return container(title, children, gap=tuple((gc[i], gr[i]) for i in range(4)), **st)


def widget(wtype, nav_title, /, **s):
    s = dict(s)
    s["_title"] = nav_title
    return {"id": eid(), "elType": "widget", "widgetType": wtype, "isInner": False,
            "settings": s, "elements": []}


def heading(title, text_, /, tag="h2", color=BONE, typ=None, **s):
    st = {"title": text_, "header_size": tag, "title_color": color}
    st.update(typ or {})
    st.update(s)
    return widget("heading", title, **st)


def h2(title, text_, color=BONE, sizes=H2, balance=True, max_w=None, **s):
    css = ""
    if balance:
        css += "selector .elementor-heading-title{text-wrap:balance;}"
    if max_w:
        css += "selector{max-width:%dpx !important;}" % max_w
    st = dict(s)
    if css:
        st["custom_css"] = css + st.get("custom_css", "")
    return heading(title, text_, tag="h2", color=color,
                   typ=typo(family=SERIF, size=sizes, weight=500, lh=1.04, ls=-0.6), **st)


def text(title, html, color=DRIFT, size=17, lh=1.75, weight=None, para_gap=0, max_w=None,
         pretty=True, **s):
    st = {"editor": html, "text_color": color, "paragraph_spacing": px(para_gap)}
    st.update(typo(size=size, weight=weight, lh=lh))
    st.update(s)
    css = "selector p:last-child{margin-block-end:0;}"
    # (line balancing is site-wide; see NO_WIDOWS in the header)
    if max_w:
        css += "selector{max-width:%dpx !important;}" % max_w
    st["custom_css"] = css + st.get("custom_css", "")
    return widget("text-editor", title, **st)


def pill(title, label, url, height=54, size=15, pad_x=30, classes="", **s):
    v = (height - size) / 2
    v = int(v) if v == int(v) else v
    st = {"text": label, "link": link(url), "border_radius": dims(999),
          "text_padding": dims(v, pad_x, v, pad_x),
          "background_background": "classic", "background_color": AMBER,
          "button_text_color": CHARRED, "hover_color": CHARRED,
          "button_background_hover_background": "classic",
          "button_background_hover_color": AMBER_HOVER}
    st.update(typo(size=size, weight=600, lh=1))
    css = "selector .elementor-button{white-space:nowrap;}"
    if classes:
        st["_css_classes"] = classes
    st.update(s)
    st["custom_css"] = css + st.get("custom_css", "")
    return widget("button", title, **st)


def text_link(title, label, url, color=BONE, underline=None, size=15, offset=7, icon=None,
              classes="", hover=AMBER_HOVER, plain=False, **s):
    """Secondary action: underlined text link built from the native Button widget (44px tap target)."""
    st = {"text": label, "link": link(url), "text_padding": dims(14.5 if size >= 15 else 15, 0),
          "background_background": "classic", "background_color": TRANSPARENT,
          "button_background_hover_background": "classic",
          "button_background_hover_color": TRANSPARENT,
          "button_text_color": color, "hover_color": hover, "border_radius": dims(0)}
    st.update(typo(size=size, weight=600, lh=1))
    css = "selector .elementor-button{white-space:nowrap;}"
    if not plain:
        css += ("selector .elementor-button-text{text-decoration:underline;"
                "text-decoration-thickness:1px;text-underline-offset:%dpx;"
                "text-decoration-color:%s;}" % (offset, underline or "rgba(242,236,227,0.4)"))
    if icon:
        st["selected_icon"] = svg(icon)
        st["icon_indent"] = px(10)
        css += "selector .elementor-button-icon svg{width:16px;height:16px;}"
    if classes:
        st["_css_classes"] = classes
    st.update(s)
    st["custom_css"] = css + st.get("custom_css", "")
    return widget("button", title, **st)


def icon_button(title, url, icon, aria, w=44, h=44, icon_px=18, fill=FILL_12, color=BONE,
                classes="", **s):
    """Icon-only round button (call, social)."""
    st = {"text": "", "link": link(url, "aria-label|" + aria), "selected_icon": svg(icon),
          "icon_indent": px(0), "border_radius": dims(999), "text_padding": dims(0),
          "background_background": "classic", "background_color": fill,
          "button_background_hover_background": "classic", "button_background_hover_color": fill,
          "button_text_color": color, "hover_color": AMBER_HOVER,
          "custom_css": ("selector .elementor-button{width:%dpx;height:%dpx;display:inline-flex;"
                         "align-items:center;justify-content:center;}"
                         "selector .elementor-button-icon svg{width:%dpx;height:%dpx;}"
                         "selector .elementor-button-text:empty{display:none;}"
                         % (w, h, icon_px, icon_px))}
    st.update(typo(size=icon_px, weight=600, lh=1))
    if classes:
        st["_css_classes"] = classes
    st.update(s)
    return widget("button", title, **st)


def photo_label(text_, **s):
    st = {"icon_list": [{"_id": eid(), "text": text_, "selected_icon": svg("camera")}],
          "icon_color": LABEL_60, "text_color": LABEL_60, "icon_size": px(14),
          "text_indent": px(8), "space_between": px(0)}
    st.update(typo(prefix="icon_typography", size=12, weight=400, lh=1.4))
    st.update(s)
    return widget("icon-list", "Photo label (delete when photo added)", **st)


PHOTOS = {x["key"]: x for x in json.load(open(os.path.join(HERE, "photos.json")))} \
    if os.path.exists(os.path.join(HERE, "photos.json")) else {}


def photo_slot(title, color, heights, label, image=None, **s):
    """Photo slot: colored container ready for a background image. With `image` (a key in
    tools/photos.json) the photo is set and the placeholder label is left out."""
    img = PHOTOS.get(image) if image else None
    st = {"background_background": "classic", "background_color": color,
          "background_position": "center center", "background_size": "cover",
          "background_repeat": "no-repeat", "flex_justify_content": "flex-end",
          "css_classes": "tn-photo"}
    st.update(resp("min_height", heights, px))
    if img:
        st["background_image"] = {"url": img["url"], "id": int(img["id"]), "size": "", "alt": img.get("alt", ""),
                                  "source": "library"}
    st.update(s)
    return container(title, [] if img else [photo_label(label)], padding=dims(0, 20, 18, 20), **st)


def _with(el, **extra):
    """Return a widget/container with extra settings merged in."""
    el["settings"].update(extra)
    return el


def stars(title, color, size, gap_):
    return widget("rating", title, rating_scale=px(5), rating_value=5,
                  rating_icon={"value": "fas fa-star", "library": "fa-solid"},
                  icon_size=px(size), icon_gap=px(gap_), icon_marked_color=color,
                  icon_unmarked_color=color)


def wordmark(title, size=28):
    return container(
        title,
        [heading(title + " / Name", "TOP NOTCH", tag="div", color=BONE,
                 typ=typo(family=SERIF, size=size, weight=600, lh=1, ls=round(size * 0.08, 2))),
         heading(title + " / Descriptor", "PAINTING &amp; STAINING", tag="div", color=AMBER,
                 typ=typo(size=10, weight=700, lh=1.2, ls=3.6))],
        gap=5, html_tag="a", link=link("/"), _attributes="aria-label|Top Notch Painting home",
        flex_align_items="flex-start", auto_width=True)


def section(title, children, bg, pad_top=SECV, pad_bottom=SECV, gap=0, **s):
    st = {"background_background": "classic", "background_color": bg, "html_tag": "section"}
    st.update(s)
    return container(title, children, top=True, boxed=True, gap=gap,
                     padding=pads(pad_top, SIDE, pad_bottom, SIDE), **st)


def wood_texture(overlay=CHARRED, opacity=None):
    """Wood-plank texture under a solid color overlay: reads as a faint grain, not a photo."""
    return {"background_image": {"url": TEXTURE["url"], "id": int(TEXTURE["id"]), "size": "",
                                 "alt": "", "source": "library"},
            "background_position": "center center", "background_size": "cover",
            "background_repeat": "no-repeat",
            "background_overlay_background": "classic", "background_overlay_color": overlay,
            "background_overlay_opacity": {"unit": "px", "size": opacity or TEXTURE_OPACITY, "sizes": []}}


def index_list(title, items):
    """Service index: 2-column list of 54px rows, hairline under each, amber arrow on the right."""
    css = (
        "selector .elementor-icon-list-items{display:grid !important;"
        "grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px;}"
        "selector .elementor-icon-list-item{margin:0 !important;padding:0 !important;}"
        "selector .elementor-icon-list-item::after{display:none !important;}"
        "selector .elementor-icon-list-item > a{display:flex;align-items:center;"
        "justify-content:space-between;gap:12px;min-height:54px;width:100%;"
        "border-bottom:1px solid rgba(242,236,227,0.1);}"
        "selector .elementor-icon-list-item > a::after{content:'→';color:#C68B4E;}"
        "@media (max-width:511px){selector .elementor-icon-list-items{grid-template-columns:1fr;}}"
    )
    return widget("icon-list", title, space_between=px(0), text_color=BONE,
                  text_color_hover=AMBER_HOVER,
                  icon_list=[{"_id": eid(), "text": t, "link": link(u),
                              "selected_icon": {"value": "", "library": ""}} for t, u in items],
                  custom_css=css, _margin=dims(8, 0, 0, 0),
                  **typo(prefix="icon_typography", size=15, weight=400, lh=1.4))


# Glues the last three words of every paragraph (and review quote) with non-breaking spaces,
# so a line never ends with just one or two words. Complements CSS text-wrap:balance, which
# browsers skip on paragraphs longer than ~6 lines. Runs on the rendered page only.
NO_WIDOWS_JS = """<script>
(function(){
  function glue(el){
    if (el.dataset.tnGlued) return; el.dataset.tnGlued = '1';
    var w = el.textContent.trim().split(/\\s+/); if (w.length < 6) return;
    var nodes = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = tw.nextNode())) nodes.push(n);
    var need = 2;
    for (var i = nodes.length - 1; i >= 0 && need > 0; i--) {
      var t = nodes[i].nodeValue.replace(/\\s+$/, '');
      for (var j = t.length - 1; j >= 0 && need > 0; j--) {
        if (t[j] === ' ') { t = t.slice(0, j) + '\\u00a0' + t.slice(j + 1); need--; }
      }
      nodes[i].nodeValue = t + nodes[i].nodeValue.slice(t.length);
    }
  }
  function lineWidths(el){
    var r = document.createRange(); r.selectNodeContents(el); var rows = {};
    [].forEach.call(r.getClientRects(), function(x){ if (x.width < 1) return; var k = Math.round(x.top / 4);
      rows[k] = rows[k] || [1e9, -1e9]; rows[k][0] = Math.min(rows[k][0], x.left); rows[k][1] = Math.max(rows[k][1], x.right); });
    return Object.keys(rows).sort(function(a, b){ return a - b; }).map(function(k){ return rows[k][1] - rows[k][0]; });
  }
  /* Long paragraphs (which browsers won't balance): narrow to the tightest width that keeps
     the same line count, so the last line isn't left short. */
  function balance(el){
    el.style.maxWidth = '';
    var L = lineWidths(el); if (L.length < 3) return;
    if (L[L.length - 1] / Math.max.apply(null, L) >= 0.5) return;
    var n = L.length, hi = el.getBoundingClientRect().width, lo = hi * 0.6;
    while (hi - lo > 2) { var mid = (lo + hi) / 2; el.style.maxWidth = mid + 'px';
      if (lineWidths(el).length > n) lo = mid; else hi = mid; }
    el.style.maxWidth = Math.ceil(hi) + 'px';
  }
  /* Side-by-side paragraphs in a .tn-match-lines group get the same line count: the shorter
     one is narrowed until it wraps to as many lines as the longest. */
  function matchLines(g){
    var ps = [].slice.call(g.querySelectorAll('.elementor-widget-text-editor p'));
    if (ps.length < 2) return;
    var tops = ps.map(function(p){ return Math.round(p.getBoundingClientRect().top); });
    if (Math.max.apply(null, tops) - Math.min.apply(null, tops) > 4) return; /* stacked: nothing to match */
    var counts = ps.map(function(p){ return lineWidths(p).length; }), target = Math.max.apply(null, counts);
    ps.forEach(function(p, i){
      if (counts[i] >= target) return;
      var hi = p.getBoundingClientRect().width, lo = hi * 0.5;
      while (hi - lo > 2) { var mid = (lo + hi) / 2; p.style.maxWidth = mid + 'px';
        if (lineWidths(p).length >= target) lo = mid; else hi = mid; }
      p.style.maxWidth = Math.floor(lo) + 'px';
    });
  }
  function run(){
    document.querySelectorAll('.elementor-widget-text-editor p, .elementor-testimonial__text').forEach(glue);
    document.querySelectorAll('.elementor-widget-text-editor p').forEach(balance);
    document.querySelectorAll('.tn-match-lines').forEach(matchLines);
  }
  var t; window.addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(run, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function(){ clearTimeout(t); t = setTimeout(run, 50); });
  window.addEventListener('load', function(){ run(); setTimeout(run, 1000); });
  if (document.readyState !== 'loading') run(); else document.addEventListener('DOMContentLoaded', run);
})();
</script>"""


# =================================================================== HEADER
def build_header():
    social = container(
        "Header / Social",
        [icon_button("Social / Facebook", "#", "facebook-logo-light", "Top Notch Painting on Facebook",
                     w=40, fill=TRANSPARENT, color=HERO_TEXT),
         icon_button("Social / Instagram", "#", "instagram-logo-light", "Top Notch Painting on Instagram",
                     w=40, fill=TRANSPARENT, color=HERO_TEXT)],
        direction="row", gap=4, flex_align_items="center", auto_width=True,
        margin=dims(0, 0, 0, -11))
    utility = container(
        "Header / Utility Links",
        [widget("icon-list", "Utility / Links", view="inline", space_between=px(32),
                text_color=HERO_TEXT, text_color_hover=BONE,
                icon_list=[{"_id": eid(), "text": "Areas We Serve", "link": link("/areas-we-serve/"),
                            "selected_icon": {"value": "", "library": ""}},
                           {"_id": eid(), "text": "Financing", "link": link("/financing/"),
                            "selected_icon": {"value": "", "library": ""}}],
                **typo(prefix="icon_typography", size=13, weight=400, lh=1.4)),
         heading("Utility / Phone", PHONE, tag="div", color=BONE, typ=typo(size=13, weight=600, lh=1.4),
                 link=link(TEL), title_hover_color=AMBER_HOVER, _css_classes="tn-call")],
        direction="row", gap=32, flex_align_items="center", auto_width=True)
    top_bar = container(
        "Header / Top Bar",
        [container("Header / Top Bar / Inner", [social, utility],
                   direction="row", gap=32, flex_justify_content="space-between",
                   flex_align_items="center", min_height=px(44), _flex_align_self="center",
                   css="selector{max-width:1280px;}")],
        padding=pads(0, SIDE, 0, SIDE), background_background="classic", background_color=NIGHT,
        flex_align_items="center", css_classes="tn-hide-sm", **HIDE_MOBILE)

    dropdown_style = dict(
        color_dropdown_item=BONE, background_color_dropdown_item=CHARRED,
        color_dropdown_item_hover=AMBER_HOVER, background_color_dropdown_item_hover=CHARRED,
        color_dropdown_item_active=AMBER_HOVER, background_color_dropdown_item_active=CHARRED,
        padding_horizontal_dropdown_item=px(20), padding_vertical_dropdown_item=px(12),
        **typo(prefix="dropdown_typography", size=14, weight=500, lh=1.4))

    main_nav = widget(
        "nav-menu", "Header / Main Nav (981px and wider)",
        menu="main-menu", menu_name="Main", layout="horizontal", align_items="center",
        pointer="none", dropdown="none", submenu_icon=FA_CHEVRON,
        menu_space_between=px(22), padding_horizontal_menu_item=px(0),
        padding_vertical_menu_item=px(12), dropdown_top_distance=px(14),
        color_menu_item=BONE, color_menu_item_hover=AMBER_HOVER, color_menu_item_active=BONE,
        hide_tablet="hidden-tablet", hide_mobile="hidden-mobile",
        **typo(prefix="menu_typography", size=14, weight=500, lh=1.4), **dropdown_style)

    menu_button = widget(
        "nav-menu", "Header / Menu Button (980px and below)",
        menu="mobile-menu", menu_name="Main", layout="dropdown", toggle="burger",
        toggle_icon_normal=svg("menu"), toggle_align="right", full_width="stretch",
        text_align="aside", submenu_icon=FA_CHEVRON,
        toggle_color=BONE, toggle_color_hover=BONE, toggle_background_color=FILL_12,
        toggle_size=px(20), dropdown_top_distance=px(26), hide_desktop="hidden-desktop",
        hide_laptop="hidden-laptop",
        **dropdown_style)

    actions = container(
        "Header / Actions",
        [pill("Header / Builder Bids", "Builder Bids", "/for-builders/#bid", height=46, size=14, pad_x=22,
              classes="tn-hide-sm", background_color=TRANSPARENT, button_text_color="#FFFFFF",
              hover_color="#14110E", button_background_hover_color="#FFFFFF",
              border_border="solid", border_width=dims(1), border_color="#FFFFFF",
              button_hover_border_color="#FFFFFF", text_padding=dims(15, 22), **HIDE_MOBILE),
         pill("Header / Request an Estimate", "Request an Estimate", "/request-an-estimate/",
              height=46, size=14, pad_x=22, classes="tn-hide-sm", **HIDE_MOBILE),
         icon_button("Header / Call (mobile)", TEL, "phone", "Call (970) 524-7323",
                     classes="tn-call tn-show-sm", **MOBILE_ONLY),
         menu_button],
        direction="row", gap=12, flex_align_items="center", flex_justify_content="flex-end",
        auto_width=True)

    main_row = container(
        "Header / Main Row",
        [grid("Header / Main Row / Inner", [wordmark("Header / Wordmark"), main_nav, actions],
              cols=("auto 1fr auto", "auto 1fr auto", "1fr auto", "1fr auto"), gap_col=28, gap_row=0,
              min_height=px(96), rows=px(1, "fr"), grid_align_items="center",
              flex_align_items="center", _flex_align_self="center",
              css="selector{max-width:1280px;}")],
        padding=pads(0, SIDE, 0, SIDE), flex_align_items="center",
        position="absolute", _offset_orientation_h="start", _offset_x=px(0),
        _offset_orientation_v="start", _offset_y=px(100, "%"), z_index=20,
        # Sticky main row (top bar scrolls away). Gets a solid blurred background once scrolled.
        sticky="top", sticky_on=["desktop", "laptop", "tablet", "mobile"], sticky_offset=0,
        sticky_effects_offset=60,
        custom_css="selector{transition:background-color .3s ease, backdrop-filter .3s ease;}"
                   "selector.elementor-sticky--effects{background-color:rgba(15,13,11,0.92);"
                   "-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);"
                   "box-shadow:0 1px 0 rgba(242,236,227,0.08);}"
                   "selector > .e-con{transition:min-height .3s ease;}"
                   "selector.elementor-sticky--effects > .e-con{--min-height:76px;min-height:76px;}")

    header_css = """
#tn-header{position:relative;z-index:20;}
#tn-header > .e-con:last-child{left:0;right:0;}
#tn-header .elementor-nav-menu--main .elementor-nav-menu{flex-wrap:nowrap;white-space:nowrap;justify-content:center;}
#tn-header .elementor-nav-menu--main .sub-arrow{padding:0 0 0 6px;opacity:0.6;}
#tn-header .elementor-nav-menu--main .sub-arrow svg{width:10px;height:10px;}
#tn-header .elementor-nav-menu--main .sub-menu{min-width:240px !important;padding:8px 0;}
#tn-header .elementor-nav-menu--dropdown .sub-arrow svg{width:12px;height:12px;}
#tn-header .elementor-menu-toggle{width:44px;height:44px;padding:0;border:0;border-radius:999px;display:flex;align-items:center;justify-content:center;}
#tn-header .elementor-menu-toggle svg{width:20px;height:20px;}
#tn-header .elementor-nav-menu--dropdown.elementor-nav-menu__container{border-top:1px solid rgba(242,236,227,0.1);}
/* Full-screen menu (980px and below): fills the screen under the header bar */
@media (max-width:980px){
  #tn-header > .e-con.elementor-sticky:not(.elementor-sticky__spacer), #tn-header > .e-con:last-child{transform:translateZ(0);}
  #tn-header .elementor-menu-toggle + .elementor-nav-menu__container{position:fixed !important;top:100% !important;left:0 !important;
    width:100% !important;height:100dvh;background:#14110E;padding:12px 0 160px;overflow-y:auto;margin-top:0 !important;}
  #tn-header:has(.elementor-menu-toggle.elementor-active) > .e-con{background-color:#14110E !important;}
  #tn-header .elementor-menu-toggle.elementor-active + .elementor-nav-menu__container{max-height:none !important;}
  #tn-header .elementor-nav-menu--dropdown .elementor-item{font-size:18px !important;padding:18px 32px !important;}
  #tn-header .elementor-nav-menu--dropdown .elementor-sub-item{font-size:16px !important;padding:12px 32px 12px 48px !important;}
  html:has(#tn-header .elementor-menu-toggle.elementor-active){overflow:hidden;}
}
@media (max-width:600px){
  #tn-header .elementor-nav-menu--dropdown .elementor-item{padding:18px 20px !important;}
  #tn-header .elementor-nav-menu--dropdown .elementor-sub-item{padding:12px 20px 12px 36px !important;}
}
/* Site-wide: even line lengths, no 1-2 word last lines */
.elementor-widget-text-editor p,.elementor-widget-heading .elementor-heading-title,.elementor-testimonial__text{text-wrap:balance;}
#tn-header > .elementor-widget-html{position:absolute;width:0;height:0;overflow:hidden;}
@media (max-width:760px){
  #tn-header .tn-hide-sm{display:none !important;}
  #tn-header .elementor-widget.tn-show-sm{display:block !important;}
}
"""
    no_widows = widget("html", "Header / Typography helper (no short last lines)", html=NO_WIDOWS_JS)
    header = container("Header", [no_widows, top_bar, main_row], top=True, html_tag="header",
                       _element_id="tn-header", custom_css=header_css.strip())
    return {"version": "0.4", "title": "TN Header", "type": "header",
            "content": [header], "page_settings": []}


# =================================================================== FOOTER
def build_footer():
    """Minimal two-row footer: wordmark | main links | phone + social, then a fine-print line."""
    links = widget(
        "icon-list", "Footer / Links", view="inline", space_between=px(28), text_color=DRIFT,
        text_color_hover=BONE,
        icon_list=[{"_id": eid(), "text": t, "link": link(u), "selected_icon": {"value": "", "library": ""}}
                   for t, u in [("Fine Painting", "/interior-painting/"),
                                ("Log &amp; Timber Staining", "/log-home-staining-restoration/"),
                                ("Our Work", "/our-work/"), ("For Builders", "/for-builders/"),
                                ("About", "/our-story/"), ("Reviews", "/reviews/")]],
        custom_css="selector .elementor-icon-list-items{justify-content:center;row-gap:10px;}"
                   "@media (max-width:980px){selector .elementor-icon-list-items{justify-content:flex-start;}}",
        **typo(prefix="icon_typography", size=14, weight=500, lh=1.5))
    contact = container("Footer / Contact", [
        heading("Footer / Phone", PHONE, tag="div", color=BONE, typ=typo(size=15, weight=600, lh=1.4),
                link=link(TEL), title_hover_color=AMBER_HOVER, _css_classes="tn-call"),
        container("Footer / Social", [
            icon_button("Footer / Facebook", "#", "facebook-logo-light", "Top Notch Painting on Facebook",
                        w=36, h=44, fill=TRANSPARENT, color=HERO_TEXT),
            icon_button("Footer / Instagram", "#", "instagram-logo-light", "Top Notch Painting on Instagram",
                        w=36, h=44, fill=TRANSPARENT, color=HERO_TEXT)],
            direction="row", gap=0, flex_align_items="center", auto_width=True)],
        direction="row", gap=20, flex_align_items="center", auto_width=True)
    top_row = grid("Footer / Top Row", [wordmark("Footer / Wordmark", size=24), links, contact],
                   cols=("auto 1fr auto", "auto 1fr auto", "1fr", "1fr"), gap_col=48, gap_row=28,
                   grid_align_items="center", grid_justify_items="stretch", flex_align_items="center",
                   padding=dims(56, 0, 40, 0))

    year = heading("Footer / Copyright (auto year)", "© 2026 Top Notch Painting · A Top Notch Logworks company",
                   tag="p", color=DRIFT, typ=typo(size=13, weight=400, lh=1.6))
    tag_settings = ("%7B%22date_format%22%3A%22custom%22%2C%22custom_format%22%3A%22Y%22%2C"
                    "%22before%22%3A%22%C2%A9%20%22%2C%22after%22%3A%22%20Top%20Notch%20Painting%20%C2%B7"
                    "%20A%20Top%20Notch%20Logworks%20company%22%7D")
    year["settings"]["__dynamic__"] = {
        "title": '[elementor-tag id="%s" name="current-date-time" settings="%s"]' % (eid(), tag_settings)}
    bottom = container("Footer / Fine Print", [
        year,
        heading("Footer / Address", "4722 Hwy US-6, Gypsum, CO 81637 · info@topnotch-painting.com", tag="p",
                color=DRIFT, typ=typo(size=13, weight=400, lh=1.6))],
        direction="row", gap=(32, 6), flex_wrap="wrap", flex_justify_content="space-between",
        flex_align_items="center", padding=dims(20, 0, 28, 0),
        border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR_10)

    footer = container(
        "Footer", [top_row, bottom], top=True, boxed=True, gap=0,
        padding=pads(0, SIDE, (0, 0, 0, 70), SIDE),
        html_tag="footer", _element_id="tn-footer",
        background_background="classic", background_color=NIGHT,
        custom_css="#tn-footer a{text-decoration:none;}"
                   "@media (max-width:760px){ #tn-footer{--padding-bottom:70px !important;} }")

    mobile_bar = container(
        "Mobile Call Bar",
        [pill("Mobile Bar / Call Now", "Call Now", TEL, height=50, pad_x=16, classes="tn-call",
              background_color=FILL_12, button_text_color=BONE, hover_color=BONE,
              button_background_hover_color="#F2ECE333", selected_icon=svg("phone"),
              icon_indent=px(8), align="justify", _flex_size="grow",
              custom_css="selector .elementor-button-icon svg{width:16px;height:16px;}"),
         pill("Mobile Bar / Free Estimate", "Free Estimate", "/request-an-estimate/", height=50,
              pad_x=16, align="justify", _flex_size="grow")],
        top=True, direction="row", gap=10, padding=dims(10, 12),
        background_background="classic", background_color="#0F0D0BE6",
        position="fixed", _offset_orientation_h="start", _offset_x=px(0),
        _offset_orientation_v="end", _offset_y_end=px(0), z_index=100,
        css_classes="tn-mobilebar tn-show-sm", **MOBILE_ONLY,
        custom_css="selector{-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);}"
                   "@media (min-width:601px) and (max-width:760px){selector.tn-show-sm{display:flex !important;}}")
    return {"version": "0.4", "title": "TN Footer", "type": "footer",
            "content": [footer, mobile_bar], "page_settings": []}


# =================================================================== HOMEPAGE
def hero_slideshow():
    """Rotating hero background (Elementor background slideshow, fade). Falls back to a photo slot."""
    path = os.path.join(HERE, "hero_slides.json")
    if not os.path.exists(path):
        return {"background_position": "center center", "background_size": "cover",
                "background_repeat": "no-repeat"}
    slides = json.load(open(path))
    return {"background_background": "slideshow",
            "background_slideshow_gallery": [{"id": int(x["id"]), "url": x["url"]} for x in slides],
            "background_slideshow_loop": "yes",
            "background_slideshow_slide_duration": 6000,
            "background_slideshow_slide_transition": "fade",
            "background_slideshow_transition_duration": 1200,
            "background_slideshow_background_size": "cover",
            "background_slideshow_background_position": "center center",
            "background_slideshow_lazyload": ""}


def build_hero():
    overlay = ("selector{background-color:#2E231A;}"
               "selector::before,selector > .elementor-background-slideshow::before{background-image:"
               "linear-gradient(90deg, rgba(20,17,14,0.82) 0%, rgba(20,17,14,0.6) 35%, rgba(20,17,14,0.2) 62%, rgba(20,17,14,0) 80%), "
               "linear-gradient(180deg, rgba(20,17,14,0.7) 0%, "
               "rgba(20,17,14,0.05) 28%, rgba(20,17,14,0.3) 55%, rgba(20,17,14,0.95) 100%) !important;"
               "opacity:1 !important;}"
               "selector > .e-con-inner{position:relative;z-index:1;}")
    creds = container(
        "Hero / Credentials",
        [container("Hero / Credentials / HomeAdvisor",
                   [_with(stars("Hero / Credentials / Stars", AMBER, 16, 3),
                                               icon_size_mobile=px(13), icon_gap_mobile=px(2)),
                    text("Hero / Credentials / HomeAdvisor text",
                         "<p><strong>4.9</strong> from 19 reviews on HomeAdvisor</p>",
                         size=(16, 16, 16, 14), lh=1.5, pretty=False)],
                   direction="row", gap=10, flex_align_items="center", auto_width=True),
         text("Hero / Credentials / BBB", "<p><strong>BBB A+</strong> accredited</p>",
              size=(16, 16, 16, 14), lh=1.5, pretty=False),
         text("Hero / Credentials / Since", "<p>Building mountain homes <strong>since 1999</strong></p>",
              size=(16, 16, 16, 14), lh=1.5, pretty=False),
         text("Hero / Credentials / Insured", "<p>Fully insured</p>", size=(16, 16, 16, 14), lh=1.5, pretty=False),
         text("Hero / Credentials / Partners", "<p>Sashco &amp; Perma-Chink partners</p>",
              size=(16, 16, 16, 14), lh=1.5, pretty=False)],
        direction="row", gap=((36, 12), (32, 12), (40, 12), (40, 12)), flex_wrap="wrap", flex_align_items="center",
        padding=dims(28, 0, 36, 0), margin=dims(16, 0, 0, 0),
        border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR_16,
        _attributes="aria-label|Credentials",
        css="selector strong{color:#F2ECE3;font-weight:600;}")
    return section(
        "Hero",
        [heading("Hero / Title (H1)",
                 "Fine painting and log home staining for exceptional mountain homes.", tag="h1",
                 color=BONE, typ=typo(family=SERIF, size=H1, weight=500, lh=1),
                 custom_css="selector{max-width:1000px !important;}"
                            "selector .elementor-heading-title{text-wrap:balance;letter-spacing:-0.015em;}"),
         grid("Hero / Intro Row", [
             text("Hero / Subline",
                  "<p>High-end interior and exterior painting, plus log and timber home staining, "
                  "restoration and chinking, from Vail to Aspen. Backed by a company that has been "
                  "building log homes in these valleys since 1999.</p>",
                  color=HERO_TEXT, size=18, lh=1.65, max_w=560, pretty=False,
                  custom_css="selector p{text-wrap:balance;}"),
             container("Hero / Actions",
                       [pill("Hero / Request an Estimate", "Request an Estimate", "#estimate"),
                        text_link("Hero / Call", "Call " + PHONE, TEL, icon="phone", classes="tn-call")],
                       direction="row", gap=(28, 12), flex_wrap="wrap", flex_align_items="center",
                       auto_width=True)],
             cols=("minmax(0, 560px) auto", "minmax(0, 560px) auto", "1fr", "1fr"),
             gap_col=64, gap_row=32, grid_align_items="end", grid_justify_items="start",
             grid_justify_content="space-between", flex_align_items="flex-end"),
         creds],
        bg="#2E231A", pad_top=200, pad_bottom=80, gap=40, min_height=px(800),
        flex_justify_content="flex-end", overflow="hidden",
        **hero_slideshow(),
        background_overlay_background="gradient",
        background_overlay_color="#14110EB3", background_overlay_color_stop=px(0, "%"),
        background_overlay_color_b="#14110EF2", background_overlay_color_b_stop=px(100, "%"),
        background_overlay_gradient_type="linear",
        background_overlay_gradient_angle={"unit": "deg", "size": 180, "sizes": []},
        background_overlay_opacity={"unit": "px", "size": 1, "sizes": []},
        custom_css=overlay, css_classes="tn-photo")


def path_column(title, color, label, h2_text, body, items, image=None):
    return container(
        title,
        [photo_slot(title + " / Photo", color, (540, 494, 372, 360), label, image=image),
         container(title + " / Text", [
             heading(title + " / Title (H2)", h2_text, tag="h2", color=BONE,
                     typ=typo(family=SERIF, size=H2_PATH, weight=500, lh=1.08)),
             text(title + " / Text body", "<p>%s</p>" % body, size=16, lh=1.75, max_w=560),
             index_list(title + " / Services", items)], gap=20)],
        gap=36, html_tag="article")


# Faint grid around the six Why points: vertical rules span the grid rows only,
# horizontal rules span the grid only (no extension past the outer columns).
_LINE = "rgba(242,236,227,0.07)"
WHY_GRID_LINES = (
    "selector{position:relative;}"
    "selector > .e-con{position:relative;padding:56px 48px 60px !important;"
    "background-color:rgba(242,236,227,0.03);transition:background-color .35s ease;}"
    "selector > .e-con:hover{background-color:rgba(0,0,0,0.12);}"
    "selector > .e-con::before{content:'' !important;display:block;position:absolute;top:0;bottom:0;"
    "left:0;right:auto;width:1px;height:auto;background:" + _LINE + ";opacity:1;pointer-events:none;border:0;}"
    "selector > .e-con::after{content:'';position:absolute;left:0;right:0;top:0;height:1px;"
    "background:" + _LINE + ";pointer-events:none;}"
    "selector::before{content:'' !important;display:block;position:absolute;top:0;bottom:0;"
    "right:0;left:auto;width:1px;height:auto;background:" + _LINE + ";opacity:1;pointer-events:none;border:0;}"
    "selector::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;"
    "background:" + _LINE + ";pointer-events:none;}"
    "@media (max-width:1359px){selector > .e-con{padding:48px 36px 52px !important;}}"
    "@media (max-width:600px){selector > .e-con{padding:40px 0 44px !important;}"
    "selector > .e-con::before,selector::before{display:none;}}"
)


# ------------------------------------------------------------------ Featured projects (Option C)
FEATURED = [
    ("Great room walls and ceilings", "Interior painting · Snowmass", "#33261C",
     "Our project photo: Snowmass great room"),
    ("Exterior repaint for a returning client", "Exterior painting · Arrowhead", "#222B25",
     "Our project photo: Arrowhead exterior"),
    ("Log wash and restain", "Log &amp; timber staining · Edwards", "#3A281B",
     "Our project photo: Edwards log home"),
]
DIM = "#8F867B"

FEATURED_CSS = """
#tn-featured .tn-f-layout{grid-template-columns:520px minmax(0,1fr) !important;grid-template-rows:auto auto 1fr !important;
  grid-template-areas:"head photo" "list photo" "link photo";column-gap:80px !important;row-gap:52px !important;align-items:start !important;}
#tn-featured .tn-f-head{grid-area:head;padding-top:40px;}
#tn-featured .tn-f-list{grid-area:list;border-bottom:1px solid rgba(242,236,227,0.14);}
#tn-featured .tn-f-link{grid-area:link;justify-self:start;}
#tn-featured .tn-f-photos{grid-area:photo;position:relative;height:680px;}
#tn-featured .tn-f-photo{position:absolute !important;inset:0;min-height:0 !important;height:auto;opacity:0;transition:opacity .35s ease;}
#tn-featured .tn-f-photo.is-active{opacity:1;}
#tn-featured .tn-row{cursor:pointer;border-top:1px solid rgba(242,236,227,0.14);padding:26px 0 !important;}
#tn-featured .tn-row:focus-visible{outline:2px solid #C68B4E;outline-offset:4px;}
#tn-featured .tn-row .elementor-heading-title{transition:color .2s ease;}
#tn-featured .tn-row-title .elementor-heading-title,#tn-featured .tn-row-meta .elementor-heading-title{color:#8F867B !important;}
#tn-featured .tn-row[aria-pressed="true"] .tn-row-title .elementor-heading-title{color:#F2ECE3 !important;}
#tn-featured .tn-row[aria-pressed="true"] .tn-row-meta .elementor-heading-title{color:#B3A99C !important;}
#tn-featured .tn-row-arrow{opacity:0;transition:opacity .2s ease;}
#tn-featured .tn-row[aria-pressed="true"] .tn-row-arrow{opacity:1;}
#tn-featured > .elementor-widget-html,#tn-featured .e-con-inner > .elementor-widget-html{position:absolute;width:0;height:0;overflow:hidden;}
@media (max-width:980px){
  #tn-featured .tn-f-layout{grid-template-columns:minmax(0,1fr) !important;grid-template-rows:auto !important;
    grid-template-areas:"head" "photo" "list" "link";row-gap:40px !important;}
  #tn-featured .tn-f-head{padding-top:0;}
  #tn-featured .tn-f-photos{height:520px;}
}
@media (max-width:600px){
  #tn-featured .tn-f-photos{height:360px;}
  #tn-featured .tn-row{padding:22px 0 !important;}
}
@media (prefers-reduced-motion:reduce){
  #tn-featured .tn-f-photo,#tn-featured .tn-row .elementor-heading-title,#tn-featured .tn-row-arrow{transition:none;}
}
""".strip()

FEATURED_JS = """<script>
(function(){
  function init(){
    var root = document.getElementById('tn-featured'); if (!root || root.dataset.tnInit) return; root.dataset.tnInit = '1';
    var rows = root.querySelectorAll('.tn-row'), photos = root.querySelectorAll('.tn-f-photo');
    function select(i){
      rows.forEach(function(r){ r.setAttribute('aria-pressed', r.getAttribute('data-project') === String(i) ? 'true' : 'false'); });
      photos.forEach(function(p){ p.classList.toggle('is-active', p.getAttribute('data-project') === String(i)); });
    }
    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    rows.forEach(function(r){
      var i = r.getAttribute('data-project');
      r.setAttribute('role', 'button'); r.setAttribute('tabindex', '0');
      r.addEventListener('click', function(){ select(i); });
      r.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
      if (canHover) r.addEventListener('mouseenter', function(){ select(i); });
    });
    select(0);
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
</script>"""


def build_featured_projects():
    rows = []
    photos = []
    for i, (title, meta, color, label) in enumerate(FEATURED):
        rows.append(container("Featured / Row %d" % (i + 1), [
            container("Featured / Row %d / Text" % (i + 1), [
                heading("Featured / Row %d / Title" % (i + 1), title, tag="div", color=DIM,
                        typ=typo(family=SERIF, size=(34, 34, 34, 28), weight=500, lh=1.12),
                        _css_classes="tn-row-title"),
                heading("Featured / Row %d / Meta" % (i + 1), meta, tag="div", color=DIM,
                        typ=typo(size=14, weight=400, lh=1.4), _css_classes="tn-row-meta")],
                gap=8, css="selector{--width:auto;width:auto;flex:1 1 0;min-width:0;}"),
            heading("Featured / Row %d / Arrow" % (i + 1), "→", tag="div", color=AMBER,
                    typ=typo(family="Manrope", size=22, weight=400, lh=1),
                    _css_classes="tn-row-arrow", _attributes="aria-hidden|true")],
            direction="row", gap=24, flex_align_items="center", flex_wrap="nowrap",
            flex_justify_content="space-between", css_classes="tn-row",
            _attributes="data-project|%d\naria-pressed|%s" % (i, "true" if i == 0 else "false")))
        photos.append(photo_slot("Featured / Photo %d" % (i + 1), color, 680, label,
                                 css_classes="tn-photo tn-f-photo" + (" is-active" if i == 0 else ""),
                                 _attributes="data-project|%d" % i))
    layout = container("Featured / Layout", [
        h2("Featured / Title (H2)", "Featured projects", balance=False, _css_classes="tn-f-head"),
        container("Featured / List", rows, gap=0, css_classes="tn-f-list"),
        text_link("Featured / See our work", "See our work →", "/our-work/", _css_classes="tn-f-link"),
        container("Featured / Photos", photos, css_classes="tn-f-photos"),
    ], container_type="grid", css_classes="tn-f-layout")
    return section("Featured Projects", [
        widget("html", "Featured / Photo switcher (script)", html=FEATURED_JS), layout],
        bg=CHARRED, _element_id="tn-featured", custom_css=FEATURED_CSS)


# ------------------------------------------------------------------ What We Do (Option A, split screen)
WWD = [
    ("What We Do / Painting", "#33261C", "Photo: finished interior", None,
     "Fine Interior &amp; Exterior Painting",
     "Walls, ceilings, trim, doors, and specialty finishes, completed with the preparation, protection, and "
     "clean lines a high-end home demands. We work in occupied and unoccupied homes, coordinate with property "
     "managers, and keep you updated even when you're out of town.",
     [("Interior Painting", "/interior-painting/"), ("Exterior Painting", "/exterior-painting/"),
      ("Specialty Finishes &amp; Interior Wood", "/specialty-finishes-interior-wood/"),
      ("Commercial &amp; HOA", "/commercial-hoa/")]),
    ("What We Do / Staining", "#3A281B", "Photo: stained log home", "fence",
     "Log &amp; Timber Staining",
     "Log home staining is where we started and what we're known for. We prepare the wood properly, apply "
     "premium stains and sealers, and handle the chinking, check sealing, and rot repair that keep a log home "
     "tight and protected. We build log homes, so we know what makes a finish last.",
     [("Log Home Staining &amp; Restoration", "/log-home-staining-restoration/"),
      ("Chinking &amp; Check Sealing", "/chinking-check-sealing/"),
      ("Rot Repair &amp; Prevention", "/rot-repair-prevention/"), ("Deck Staining", "/deck-staining/")]),
]

WWD_CSS = """
/* Both titles on one line and the same size: they scale together with the viewport. */
#tn-wwd .tn-wwd-title .elementor-heading-title{white-space:nowrap;font-size:min(40px, calc(((min(100vw, 1376px) - 96px) / 2 - 112px) / 16.2)) !important;}
@media (max-width:1359px){#tn-wwd .tn-wwd-title .elementor-heading-title{font-size:min(40px, calc(((100vw - 96px) / 2 - 96px) / 16.2)) !important;}}
@media (max-width:1040px){
  #tn-wwd .tn-wwd-grid{grid-template-columns:minmax(0,1fr) !important;}
  #tn-wwd .tn-wwd-title .elementor-heading-title{font-size:clamp(30px, 4.6vw, 40px) !important;}
}
@media (max-width:760px){#tn-wwd .tn-wwd-title .elementor-heading-title{white-space:normal;}}
#tn-wwd .tn-wwd-links .elementor-icon-list-items{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px;}
#tn-wwd .tn-wwd-links .elementor-icon-list-item{margin:0 !important;padding:0 !important;}
#tn-wwd .tn-wwd-links .elementor-icon-list-item::after{display:none !important;}
#tn-wwd .tn-wwd-links .elementor-icon-list-item > a{display:flex;align-items:center;gap:10px;min-height:44px;}
#tn-wwd .tn-wwd-links .elementor-icon-list-item > a::before{content:'→';color:#C68B4E;font-weight:400;}
@media (max-width:520px){#tn-wwd .tn-wwd-links .elementor-icon-list-items{grid-template-columns:1fr;}}
""".strip()


def build_what_we_do():
    """Two solid dark-brown halves (two shades), each with a large photo above the title."""
    shades = ["#1C1612", "#271D16"]
    halves = []
    for (title, color, label, image, h2_text, body, items), shade in zip(WWD, shades):
        content = container(title + " / Content", [
            heading(title + " / Title (H2)", h2_text, tag="h2", color=BONE,
                    typ=typo(family=SERIF, size=(40, 36, 30, 30), weight=500, lh=1.08, ls=-0.4),
                    _css_classes="tn-wwd-title"),
            text(title + " / Text", "<p>%s</p>" % body, color=HERO_TEXT, size=16, lh=1.7),
            widget("icon-list", title + " / Services", space_between=px(0), text_color=BONE,
                   text_color_hover=AMBER_HOVER, _css_classes="tn-wwd-links", _margin=dims(8, 0, 0, 0),
                   icon_list=[{"_id": eid(), "text": t, "link": link(u),
                               "selected_icon": {"value": "", "library": ""}} for t, u in items],
                   **typo(prefix="icon_typography", size=15, weight=600, lh=1.4))], gap=22)
        photo = photo_slot(title + " / Photo", color, (440, 400, 380, 260), label, image=image)
        halves.append(container(title, [photo, content], html_tag="article", gap=(40, 36, 32, 28),
                                background_background="classic", background_color=shade,
                                padding=pads((56, 48, 44, 40), (56, 48, 44, 20), (56, 48, 44, 48),
                                             (56, 48, 44, 20))))
    return container("What We Do", [grid("What We Do / Halves", halves, cols=(2, 2, 1, 1), gap_col=0,
                                         gap_row=0, css_classes="tn-wwd-grid tn-match-lines")],
                     top=True, boxed=True, html_tag="section", _element_id="tn-wwd",
                     padding=pads(0, SIDE, 0, SIDE),
                     background_background="classic", background_color=CHARRED, custom_css=WWD_CSS)


def build_home():
    what = build_what_we_do()

    who = section("Who We Are", [grid("Who We Are / Layout", [
        container("Who We Are / Text", [
            h2("Who We Are / Title (H2)", "Craftsmanship rooted in how mountain homes are built",
               color=CHARRED),
            text("Who We Are / Text body",
                 "<p>Top Notch Painting is the painting and finishing division of Top Notch Logworks, "
                 "which has been building log and timber homes and resorts across the Vail and Roaring "
                 "Fork Valleys since 1999. That background shapes everything we do. We understand how "
                 "mountain homes are built, how they move, and what high altitude, dry air, and intense "
                 "sun do to a finish.</p>", color=BARK),
            text_link("Who We Are / Read our story", "Read our story →", "/our-story/", color=DEEP,
                      underline=DEEP, hover=CHARRED)], gap=28),
        photo_slot("Who We Are / Photo", "#3A281B", 560, "Photo: Logworks crew on a log or timber build",
                   image="railing"),
    ], cols=(2, 2, 1, 1), gap_col=(101, 91, 69, 48), grid_align_items="center",
        flex_align_items="center")], bg=BONE)

    def point(icon, h3, body):
        return container("Why / " + h3, [
            widget("icon", "Why / %s / Icon" % h3, selected_icon=svg(icon), primary_color=AMBER,
                   size=px(44), align="left",
                   custom_css="selector .elementor-icon{display:block;line-height:0;}"
                              "selector .elementor-icon svg{width:44px;height:44px;}"),
            heading("Why / %s / Title (H3)" % h3, h3, tag="h3", color=BONE,
                    typ=typo(family=SERIF, size=28, weight=500, lh=1.15)),
            text("Why / %s / Text" % h3, "<p>%s</p>" % body, color=SPRUCE_TEXT, size=15, lh=1.75,
                 max_w=360, pretty=False)], gap=18)

    why = section("Why Top Notch", [
        grid("Why / Points", [
            point("hammer-light", "Builders first",
                  "Our parent company has been building log and timber homes in these valleys since "
                  "1999. We understand your home from the framing out."),
            point("paint-roller-light", "Preparation is the job",
                  "Patching, sanding, caulking, priming, and masking done right is what makes a finish "
                  "look flawless and last. We never rush it."),
            point("shield-check-light", "Your home, protected",
                  "Floors, furnishings, fixtures, and landscaping are covered and protected. Work areas "
                  "are cleaned at the end of every day."),
            point("user-circle-check-light", "One point of contact",
                  "A dedicated project lead manages your job from your first call to your final "
                  "walkthrough, with regular updates and photos if you're away."),
            point("paint-bucket-light", "Premium products",
                  "We use top-tier coatings, including Benjamin Moore and Sherwin-Williams, and Sashco and Perma-Chink "
                  "systems on log and timber homes."),
            point("certificate-light", "Backed in writing",
                  "Detailed written estimates, clear schedules, and a two-year written warranty on our "
                  "work."),
        ], cols=(3, 3, 2, 1), gap_col=0, gap_row=0, css=WHY_GRID_LINES)],
        bg=SPRUCE, pad_top=SECV_TALL, pad_bottom=SECV_TALL, gap=(112, 104, 78, 72), overflow="hidden")

    projects = build_featured_projects()

    away_text = container("Away / Text", [
        h2("Away / Title (H2)", "Away for the season? We'll take care of it.", max_w=560),
        text("Away / Text body",
             "<p>Many of our clients aren't here full-time. We coordinate access with you or your "
             "property manager, send progress photos along the way, and finish the work before you "
             "arrive, with the home cleaned and ready to enjoy.</p>"
             "<p>Winter is an ideal time for interior projects, when the house is quiet and schedules "
             "are flexible.</p>", color=SPRUCE_TEXT, para_gap=28, max_w=540),
        container("Away / Actions", [
            pill("Away / Request an Estimate", "Request an Estimate", "#estimate"),
            text_link("Away / Call", "Call " + PHONE, TEL, classes="tn-call")],
            direction="row", gap=(28, 12), flex_wrap="wrap", flex_align_items="center",
            padding=dims(8, 0, 0, 0))],
        gap=28, flex_justify_content="center",
        padding=pads((115, 104, 78, 64), (86, 78, 59, 23), (115, 104, 78, 64), (86, 78, 59, 23)),
        **(dict(wood_texture(SPRUCE, 0.75), background_background="classic", background_color=SPRUCE,
                background_attachment="fixed") if TEXTURE else {}))
    away = container("Away for the Season", [grid("Away / Layout", [
        photo_slot("Away / Photo", "#2A3236", 640, "Photo: mountain home in snow, lights on", image="deck"),
        away_text], cols=(2, 2, 1, 1), gap_col=0)],
        top=True, html_tag="section", background_background="classic", background_color=SPRUCE)

    star_svg = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='18' "
                "viewBox='0 0 22 18'%3E%3Cpath transform='scale(0.75)' fill='%238A5A2B' "
                "d='M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z'/%3E%3C/svg%3E")
    carousel_css = (
        "selector{max-width:1140px !important;width:100%;margin:0 auto;}"
        "selector{position:relative;}"
        "selector .swiper-slide{padding:0 !important;background:transparent;}"
        "selector .elementor-main-swiper{width:auto !important;max-width:900px;margin:0 auto;padding-bottom:0;overflow:hidden;}"
        "selector .elementor-testimonial{display:flex;flex-direction:column;align-items:center;gap:32px;}"
        "selector .elementor-testimonial__content{display:flex;flex-direction:column;align-items:center;}"
        "selector .elementor-testimonial__content::before{content:'';display:block;width:106px;height:18px;"
        "margin-bottom:32px;background:url(\"" + star_svg + "\") repeat-x 0 0/22px 18px;}"
        "selector .elementor-testimonial__text{text-wrap:balance;font-style:normal !important;color:#14110E !important;"
        "font-family:'Cormorant Garamond', Georgia, serif;font-weight:400 !important;}"
        "selector .elementor-testimonial__name{color:#14110E !important;font-style:normal;}"
        "selector .elementor-testimonial__title{color:#5B5046 !important;font-style:normal;}"
        "selector .elementor-testimonial__footer{margin:0;}"
        "selector .elementor-testimonial__cite{display:block;}"
        "selector .elementor-testimonial__name,selector .elementor-testimonial__title{display:inline;}"
        "selector .elementor-testimonial__title::before{content:' · ';}"
        "selector .swiper-pagination{position:static;margin-top:32px;font-size:14px;line-height:1.4;"
        "color:#5B5046;font-family:Manrope, 'Helvetica Neue', Arial, sans-serif;}"
        "selector .elementor-swiper-button{width:56px;height:56px;border:1px solid #8C8174;"
        "border-radius:999px;display:flex;align-items:center;justify-content:center;color:#14110E;"
        "font-size:20px;}"
        "selector .elementor-swiper-button svg{width:20px;height:20px;fill:#14110E;}"
        "selector .elementor-swiper-button-prev{left:0;}selector .elementor-swiper-button-next{right:0;}"
        "@media (max-width:1359px){selector .elementor-main-swiper{margin:0 120px;max-width:none;}}"
        "@media (max-width:980px){selector .elementor-main-swiper{margin:0 95px;}}"
        "@media (max-width:760px){"
        "selector .elementor-main-swiper{display:flex;flex-wrap:wrap;justify-content:center;column-gap:16px;"
        "margin:0;max-width:100%;height:auto !important;overflow-x:clip;overflow-y:visible;}"
        "selector .swiper-wrapper{flex:0 0 100%;}"
        "selector .swiper-pagination{order:2;flex:0 0 100%;}"
        "selector .elementor-swiper-button{order:3;position:static;transform:none;margin:56px 0 0;width:48px;height:48px;}"
        "selector .elementor-swiper-button svg{width:18px;height:18px;}}"
    )
    reviews = section("Reviews", [
        h2("Reviews / Title (H2)", "What our clients say", color=CHARRED, balance=False, align="center"),
        widget("testimonial-carousel", "Reviews / Carousel",
               slides=[
                   {"_id": eid(), "content": "“Oto and his crew were wonderful. They were efficient, "
                    "professional and very conscious of our budget. We would absolutely use them again.”",
                    "image": {"url": "", "id": ""}, "name": "Cathy D.", "title": "Eagle"},
                   {"_id": eid(), "content": "“Excellent job! Christian and his father were on time, "
                    "professional, clean and did an excellent job on my accent wall. Very clean lines.”",
                    "image": {"url": "", "id": ""}, "name": "Karen H.", "title": "Gypsum"}],
               skin="default", layout="image_inline", alignment="center",
               slides_per_view="1", slides_to_scroll="1", show_arrows="yes", pagination="fraction",
               speed=500, autoplay="", loop="yes", pause_on_hover="yes", slide_padding=dims(0),
               slide_background_color=TRANSPARENT,
               space_between=px(40), arrows_size=px(20), arrows_color=CHARRED, pagination_color=BARK,
               content_text_color=CHARRED, name_text_color=CHARRED, title_text_color=BARK,
               custom_css=carousel_css,
               **typo(prefix="content_typography", family=SERIF, size=QUOTE, weight=400, lh=1.25),
               **typo(prefix="name_typography", size=15, weight=600, lh=1.5),
               **typo(prefix="title_typography", size=15, weight=400, lh=1.5)),
    ], bg=BONE, pad_top=(144, 130, 98, 88), pad_bottom=(115, 104, 78, 72), gap=56,
        flex_align_items="center", text_align="center", _element_id="reviews")

    def stat(title, figure, label_widgets):
        return container(title, [
            heading(title + " / Figure", figure, tag="div", color=BONE,
                    typ=typo(family=SERIF, size=60, weight=500, lh=1),
                    custom_css="selector .elementor-heading-title{font-variant-numeric:lining-nums;"
                               "font-feature-settings:'lnum' 1;}"),
            container(title + " / Label", label_widgets, gap=6, auto_width=True)],
            direction="row", gap=18, flex_align_items="center", auto_width=True)

    def stat_label(title, t):
        return heading(title, t, tag="div", color=DRIFT, typ=typo(size=14, weight=400, lh=1.4))

    stats = section("Reviews / Stats Strip", [
        container("Stats / Figures", [
            stat("Stats / HomeAdvisor", "4.9", [stars("Stats / HomeAdvisor / Stars", AMBER, 13, 2),
                                                stat_label("Stats / HomeAdvisor / Label",
                                                           "19 reviews on HomeAdvisor")]),
            stat("Stats / BBB", "A+", [stat_label("Stats / BBB / Label", "BBB accredited")]),
            stat("Stats / Google", "5.0", [stars("Stats / Google / Stars", AMBER, 13, 2),
                                           stat_label("Stats / Google / Label", "24 reviews on Google")])],
            direction="row", gap=tuple((v, 24) for v in (72, 65, 49, 32)), flex_wrap="wrap",
            flex_align_items="center", flex_justify_content="center", auto_width=True)],
        bg=NIGHT, pad_top=32, pad_bottom=32, direction="row", gap=(48, 24),
        flex_wrap="wrap", flex_justify_content="center", flex_align_items="center")

    content = [build_hero(), what, who, why, projects, away, reviews, stats, estimate_section("home")]
    return {"version": "0.4", "title": "TN Homepage", "type": "page",
            "content": content, "page_settings": []}


# ------------------------------------------------------------------ estimate (shared)
def estimate_section(page="home"):
    is_home = page == "home"
    form_fields = [
        {"_id": eid(), "custom_id": "name", "field_type": "text", "field_label": "Name",
         "required": "true", "width": "50", "width_mobile": "50"},
        {"_id": eid(), "custom_id": "phone", "field_type": "tel", "field_label": "Phone",
         "required": "true", "width": "50", "width_mobile": "50"},
        {"_id": eid(), "custom_id": "email", "field_type": "email", "field_label": "Email",
         "required": "true", "width": "50", "width_mobile": "50"},
        {"_id": eid(), "custom_id": "town", "field_type": "select", "field_label": "Town",
         "required": "true", "width": "50", "width_mobile": "50",
         "field_options": "Select a town|\nAspen\nSnowmass\nBasalt\nCarbondale\nGlenwood Springs\n"
                          "Vail\nBeaver Creek\nAvon\nEdwards\nEagle\nGypsum\nBreckenridge\nOther"},
        {"_id": eid(), "custom_id": "need", "field_type": "select", "field_label": "What do you need?",
         "required": "true", "width": "100",
         "field_options": "Choose a service|\nInterior painting\nExterior painting\n"
                          "Cabinets / trim / specialty finish\nLog home staining / restoration\n"
                          "Chinking / check sealing\nRot repair\nDeck staining\nCommercial / HOA"},
    ]
    chevron = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' "
               "viewBox='0 0 24 24' fill='none' stroke='%235B5046' stroke-width='1.8'%3E%3Cpath "
               "d='M6 9l6 6 6-6'/%3E%3C/svg%3E")
    # Option D form: filled fields (#E8E0D4, 62px), label inside top-left, chevron selects.
    form_css = (
        "selector .elementor-field-group{position:relative;}"
        "selector .elementor-field-group:not(.elementor-field-type-submit) > .elementor-field-label{position:absolute;"
        "left:18px;top:10px;z-index:2;margin:0;font-size:12px;font-weight:600;line-height:1.3;color:#5B5046;pointer-events:none;}"
        "selector .elementor-field-group .elementor-field-textual{height:62px;min-height:62px;padding:28px 18px 8px;"
        "background:#E8E0D4;border:0 !important;border-radius:4px;color:#14110E;font-size:16px;box-shadow:none;"
        "font-family:Manrope, 'Helvetica Neue', Arial, sans-serif;}"
        "selector .elementor-field-group .elementor-field-textual:focus{outline:2px solid #14110E;outline-offset:1px;}"
        "selector .elementor-select-wrapper .select-caret-down-wrapper{display:none;}"
        "selector .elementor-field-group .elementor-select-wrapper select.elementor-field-textual{"
        "appearance:none;-webkit-appearance:none;padding:26px 44px 6px 18px;color-scheme:light;cursor:pointer;"
        "background-color:#E8E0D4;background-image:url(\"" + chevron + "\");background-repeat:no-repeat;"
        "background-position:right 18px center;background-size:14px 14px;}"
        "selector .elementor-mark-required .elementor-field-label:after{color:#5B5046;}"
        "selector .e-form__buttons{margin-top:12px;}"
        "selector .e-form__buttons .elementor-button{min-height:60px;}"
        "@media (max-width:535px){selector .elementor-field-group:not(.elementor-field-type-submit){width:100% !important;"
        "flex-basis:100% !important;max-width:100% !important;}}"
    )
    form = widget(
        "form", "Estimate / Form",
        form_name="Homeowner Estimate - Homepage" if is_home else
        "Homeowner Estimate - Request an Estimate page",
        form_id="tn-estimate-form", form_fields=form_fields, input_size="md",
        show_labels="true", mark_required="true", label_position="above",
        button_text="Request My Estimate", button_size="md", button_width="",
        button_align="start", submit_actions=["email", "redirect"],
        email_to="info@topnotch-painting.com",
        email_subject="New estimate request (%s)" % ("Homepage" if is_home else "Request an Estimate page"),
        email_content="[all-fields]", redirect_to="/thank-you/",
        column_gap=px(16), row_gap=px(16), label_spacing=px(0),
        label_color=BARK, mark_required_color=BARK,
        field_text_color=CHARRED, field_background_color="#E8E0D4",
        field_border_color="#E8E0D4", field_border_width=dims(0), field_border_radius=dims(4),
        button_background_color=AMBER, button_text_color=CHARRED,
        button_background_hover_color=AMBER_HOVER, button_hover_color=CHARRED,
        button_border_radius=dims(999), button_text_padding=dims(22.5, 40),
        custom_css=form_css,
        **typo(prefix="label_typography", size=12, weight=600, lh=1.3),
        **typo(prefix="field_typography", size=16, weight=400, lh=1.4),
        **typo(prefix="button_typography", size=15, weight=600, lh=1))

    note = text("Estimate / Builder note",
                '<p>Builder or general contractor? <a href="/for-builders/#bid">Request a bid</a></p>',
                color=BARK, size=13, lh=1.6, pretty=False, _css_classes="tn-est-note",
                custom_css="selector a{color:#8A5A2B;font-weight:600;text-decoration:underline;"
                           "text-decoration-thickness:1px;text-underline-offset:4px;}"
                           "selector a:hover{color:#14110E;}")

    right = container("Estimate / Form Half", [
        container("Estimate / Form Half / Heading", [
            heading("Estimate / Form title", "Request your free estimate",
                    tag="h3" if is_home else "h2", color=CHARRED,
                    typ=typo(family=SERIF, size=34, weight=500, lh=1.1)),
            text("Estimate / Form intro", "<p>We'll call within one business day to set up a walkthrough.</p>",
                 color=BARK, size=14, lh=1.6, pretty=False)], gap=8),
        container("Estimate / Form Half / Body", [form, note], gap=16, css_classes="tn-est-body")],
        gap=28, background_background="classic", background_color=BONE,
        padding=pads((72, 65, 49, 40), (64, 58, 44, 28), (72, 65, 49, 40), (64, 58, 44, 28)))

    if is_home:
        offer = container("Seasonal Offer", [
            h2("Seasonal Offer / Title (H2)", "Now scheduling winter interior projects", sizes=(56, 51, 38, 30)),
            text("Seasonal Offer / Text",
                 "<p>Book between November 1 and March 31 and receive 10% off interior projects.</p>",
                 size=17, lh=1.7)], gap=24)
    else:
        offer = container("Estimate Intro", [
            heading("Estimate Intro / Title (H1)", "Talk to us about your project", tag="h1", color=BONE,
                    typ=typo(family=SERIF, size=(56, 51, 38, 34), weight=500, lh=1.04, ls=-0.6),
                    custom_css="selector .elementor-heading-title{text-wrap:balance;}"),
            text("Estimate Intro / Text",
                 "<p>We'll be in touch within one business day to set up a walkthrough.</p>",
                 size=17, lh=1.7)], gap=24)

    left = container("Estimate / Offer Half", [
        offer,
        container("Estimate / Call", [
            heading("Estimate / Call / Label", "Prefer to talk?", tag="div", color=DRIFT,
                    typ=typo(size=14, weight=400, lh=1.5)),
            heading("Estimate / Call / Phone", PHONE, tag="div", color=BONE,
                    typ=typo(family=SERIF, size=40, weight=500, lh=1.2), link=link(TEL),
                    title_hover_color=AMBER_HOVER, _css_classes="tn-call")],
            gap=6, padding=dims(32, 0, 0, 0),
            border_border="solid", border_width=dims(1, 0, 0, 0), border_color="#F2ECE324")],
        gap=48, flex_justify_content="space-between", background_background="classic",
        background_color=CHARRED,
        padding=pads((72, 65, 49, 40), (64, 58, 44, 28), (72, 65, 49, 40), (64, 58, 44, 28)))

    panel_css = (
        "selector{border-radius:6px;overflow:hidden;box-shadow:0 48px 96px -48px rgba(0,0,0,0.7);"
        "grid-template-columns:repeat(2,minmax(0,1fr)) !important;}"
        "@media (max-width:880px){selector{grid-template-columns:minmax(0,1fr) !important;}}"
        # button with the builder note beside it
        # builder note sits under the button (as the reference's wrapping row does at this width)
    )
    panel = grid("Estimate / Panel", [left, right], cols=(2, 2, 1, 1), gap_col=0, gap_row=0,
                 css=panel_css)

    return section("Estimate", [panel],
                   bg=EST_BROWN, pad_top=SECV if is_home else (200, 200, 176, 152),
                   pad_bottom=SECV, _element_id="estimate",
                   **(dict(wood_texture(EST_BROWN, 0.65), background_attachment="fixed") if TEXTURE else {}))


def build_estimate_page():
    return {"version": "0.4", "title": "TN Request an Estimate", "type": "page",
            "content": [estimate_section("estimate-page")], "page_settings": []}


def build_thank_you_page():
    s = section("Thank You", [container("Thank You / Content", [
        heading("Thank You / Title (H1)", "We've received your request", tag="h1", color=BONE,
                typ=typo(family=SERIF, size=H2, weight=500, lh=1.04, ls=-0.6)),
        text("Thank You / Text",
             "<p>What happens next: we'll call within one business day to schedule a walkthrough at a "
             "time that works for you.</p>", size=18, lh=1.7, max_w=560),
        container("Thank You / Actions", [
            text_link("Thank You / Call", "Or call " + PHONE, TEL, icon="phone", classes="tn-call"),
            text_link("Thank You / Back home", "Back to home →", "/")],
            direction="row", gap=(28, 12), flex_wrap="wrap", flex_align_items="center")],
        gap=28)], bg=CHARRED, pad_top=(200, 200, 176, 152), pad_bottom=SECV_TALL,
        min_height=px(640), flex_justify_content="center")
    return {"version": "0.4", "title": "TN Thank You", "type": "page", "content": [s],
            "page_settings": []}


# =================================================================== checks + write
def walk(el, depth=0):
    yield el, depth
    for c in el.get("elements", []):
        yield from walk(c, depth + 1)


def validate(doc):
    ids = []
    for top in doc["content"]:
        for el, depth in walk(top):
            ids.append(el["id"])
            assert el["elType"] in ("container", "widget")
            if el["elType"] == "container":
                assert el["settings"].get("_title"), "untitled container"
                if depth > 0:
                    assert el["isInner"] is True
                    assert el["settings"]["content_width"] == "full", el["settings"]["_title"]
            else:
                assert el.get("widgetType")
    assert "uppercase" not in json.dumps(doc), "uppercase text found"
    return ids


def main():
    os.makedirs(OUT, exist_ok=True)
    docs = {"tn-header.json": build_header(), "tn-footer.json": build_footer(),
            "tn-homepage.json": build_home(),
            "tn-request-an-estimate.json": build_estimate_page(),
            "tn-thank-you.json": build_thank_you_page()}
    all_ids = []
    for name, doc in docs.items():
        all_ids += validate(doc)
        with open(os.path.join(OUT, name), "w") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
        print("wrote", name, sum(1 for t in doc["content"] for _ in walk(t)), "elements")
    assert len(all_ids) == len(set(all_ids)), "duplicate ids"
    print("ids unique:", len(all_ids))


if __name__ == "__main__":
    main()
