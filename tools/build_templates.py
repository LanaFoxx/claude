#!/usr/bin/env python3
"""Generate the Top Notch Painting Elementor templates (header, footer, homepage).

Run:  python3 tools/build_templates.py   ->  writes output/tn-*.json
All values are literal (hex, px, font names); no Global Color/Font references.
"""
import json
import os
import random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output")

# ---------------------------------------------------------------- tokens
CHARRED = "#14110E"
SMOKE = "#1E1A16"
NIGHT = "#0F0D0B"
HAIR = "#2A241F"
CHIP = "#352E27"
SPRUCE = "#24302A"
AMBER = "#C68B4E"
AMBER_HOVER = "#D9A66B"
DEEP = "#8A5A2B"
BONE = "#F2ECE3"
DRIFT = "#B3A99C"
BARK = "#5B5046"
INPUT = "#6B6259"
OUTLINE_32 = "#F2ECE352"  # rgba(242,236,227,0.32)
OUTLINE_40 = "#F2ECE366"  # rgba(242,236,227,0.40)
TRANSPARENT = "#00000000"
SERIF = "Cormorant Garamond"
SANS = "Manrope"

TEL = "tel:+19705247323"
PHONE = "(970) 524-7323"

DEVICES = ("", "_laptop", "_tablet", "_mobile")

# responsive tuples: (desktop, laptop, tablet, mobile)
SIDE = (48, 48, 32, 20)
SECV = (128, 112, 96, 72)
H1 = (80, 68, 52, 40)
H2 = (56, 48, 40, 36)
CARD_H3 = (42, 36, 32, 32)
BUILDER_H2 = (38, 32, 30, 30)
SPLIT_GAP = (86, 72, 40, 40)  # clamp(40px, 6vw, 96px)

# ---------------------------------------------------------------- ids
_rng = random.Random(1999)
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


def resp(key, values, fn=lambda v: v):
    """values: scalar (desktop only) or 4-tuple (desktop, laptop, tablet, mobile)."""
    if not isinstance(values, tuple):
        return {key: fn(values)}
    out = {}
    for dev, v in zip(DEVICES, values):
        if v is not None:
            out[key + dev] = fn(v)
    return out


def typo(prefix="typography", family=SANS, size=None, weight=None, lh=None,
         ls=None, transform=None, style=None):
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
    if style:
        s[prefix + "_font_style"] = style
    return s


def side_pad(top, bottom, sides=SIDE):
    """Responsive padding dicts: top/bottom may be scalars or 4-tuples."""
    out = {}
    for i, dev in enumerate(DEVICES):
        t = top[i] if isinstance(top, tuple) else top
        b = bottom[i] if isinstance(bottom, tuple) else bottom
        sd = sides[i] if isinstance(sides, tuple) else sides
        out["padding" + dev] = dims(t, sd, b, sd)
    return out


def link(url, attrs=None):
    d = {"url": url, "is_external": "", "nofollow": ""}
    if attrs:
        d["custom_attributes"] = attrs
    return d


HIDE_SM = {"hide_mobile": "hidden-mobile"}
SHOW_SM_ONLY = {"hide_desktop": "hidden-desktop", "hide_laptop": "hidden-laptop",
                "hide_tablet": "hidden-tablet"}


# ---------------------------------------------------------------- element builders
def container(title, children, top=False, boxed=False, direction="column",
              gap=0, padding=None, **s):
    st = {
        "_title": title,
        "content_width": "boxed" if boxed else "full",
        "flex_direction": direction,
        "flex_gap": gaps(*gap) if isinstance(gap, tuple) else gaps(gap),
    }
    if boxed:
        st["boxed_width"] = px(1280)
    else:
        st["width"] = px(100, "%")
    if padding is None:
        st["padding"] = dims(0)
    elif isinstance(padding, dict) and "padding" in padding:
        st.update(padding)
    else:
        st["padding"] = padding
    st.update(s)
    return {"id": eid(), "elType": "container", "isInner": not top,
            "settings": st, "elements": children}


def grid(title, children, cols, gap_col, gap_row=None, top=False, boxed=False,
         padding=None, rows=None, **s):
    """cols: int / custom string, or 4-tuple of those (desktop, laptop, tablet, mobile)."""
    def colval(v):
        return px(v, "fr") if isinstance(v, int) else {"unit": "custom", "size": v, "sizes": []}
    st = {"container_type": "grid", "grid_auto_flow": "row",
          "grid_rows_grid": rows or {"unit": "custom", "size": "auto", "sizes": []}}
    st.update(resp("grid_columns_grid", cols, colval))
    # gaps: allow responsive tuples
    gc = gap_col if isinstance(gap_col, tuple) else (gap_col,) * 4
    gr = gap_row if isinstance(gap_row, tuple) else ((gap_row,) * 4 if gap_row is not None else gc)
    for i, dev in enumerate(DEVICES):
        st["grid_gaps" + dev] = gaps(gc[i], gr[i])
        st["flex_gap" + dev] = gaps(gc[i], gr[i])
    st.update(s)
    c = container(title, children, top=top, boxed=boxed, padding=padding, **st)
    return c


def widget(wtype, nav_title, /, **s):
    s = dict(s)
    s["_title"] = nav_title
    return {"id": eid(), "elType": "widget", "widgetType": wtype, "isInner": False,
            "settings": s, "elements": []}


def heading(title, text, /, tag="h2", color=BONE, typ=None, nav=None, **s):
    st = {"title": text, "header_size": tag, "title_color": color}
    st.update(typ or {})
    st.update(s)
    return widget("heading", nav or title, **st)


def eyebrow(text, color=AMBER, **s):
    return heading("Eyebrow", text, tag="p", color=color,
                   typ=typo(size=12, weight=600, lh=1.4, ls=2.64, transform="uppercase"), **s)


def h2(text, color=BONE, balance=True, sizes=H2, **s):
    st = {}
    if balance:
        st["custom_css"] = "selector .elementor-heading-title{text-wrap:balance;}"
    st.update(s)
    return heading("Section title (H2)", text, tag="h2", color=color,
                   typ=typo(family=SERIF, size=sizes, weight=500, lh=1.06), **st)


def text(title, html, color=DRIFT, size=17, lh=1.75, weight=None, para_gap=0, **s):
    st = {"editor": html, "text_color": color, "paragraph_spacing": px(para_gap)}
    st.update(typo(size=size, weight=weight, lh=lh))
    st.update(s)
    return widget("text-editor", title, **st)


def text_link(title, label, url, color=AMBER, hover=AMBER_HOVER, size=15, **s):
    return heading(title, label, tag="div", color=color,
                   typ=typo(size=size, weight=700, lh=1.5), link=link(url),
                   title_hover_color=hover, **s)


def button(title, label, url, kind="primary", size=15, height=54, pad_x=30,
           icon=None, classes="", attrs=None, align=None, weight=None, border_color=None, **s):
    """kind: primary (amber fill) | outline. Height reproduces the reference box (content-box)."""
    lh = 1
    v = (height - size * lh) / 2
    v = int(v) if v == int(v) else v
    st = {
        "text": label, "link": link(url, attrs),
        "border_radius": dims(2),
        "text_padding": dims(v, pad_x, v, pad_x),
    }
    st.update(typo(size=size, weight=weight or (700 if kind == "primary" else 600), lh=lh))
    if kind == "primary":
        st.update({"background_background": "classic", "background_color": AMBER,
                   "button_text_color": CHARRED, "hover_color": CHARRED,
                   "button_background_hover_background": "classic",
                   "button_background_hover_color": AMBER_HOVER})
    else:
        bc = border_color or OUTLINE_40
        st.update({"background_background": "classic", "background_color": TRANSPARENT,
                   "button_text_color": BONE, "hover_color": BONE,
                   "button_background_hover_background": "classic",
                   "button_background_hover_color": TRANSPARENT,
                   "border_border": "solid", "border_width": dims(1), "border_color": bc,
                   "button_hover_border_color": AMBER})
    if icon:
        st["selected_icon"] = {"value": icon, "library": "fa-solid"}
        st["icon_indent"] = px(10 if size >= 15 else 8)
    if classes:
        st["_css_classes"] = classes
    if align:
        st["align"] = align
    st.update(s)
    return widget("button", title, **st)


def photo_label(text_, flow=True, **s):
    st = {
        "icon_list": [{"_id": eid(), "text": text_,
                       "selected_icon": {"value": "fas fa-camera", "library": "fa-solid"}}],
        "icon_color": DRIFT, "text_color": DRIFT, "icon_size": px(14), "text_indent": px(8),
        "space_between": px(0),
    }
    st.update(typo(prefix="icon_typography", size=11, weight=600, lh=1.4, ls=1.54,
                   transform="uppercase"))
    st.update(s)
    return widget("icon-list", "Photo label (delete when photo added)", **st)


def photo_slot(title, color, min_h, label, pad=20, extra_children=None, **s):
    st = {"background_background": "classic", "background_color": color,
          "background_position": "center center", "background_size": "cover",
          "background_repeat": "no-repeat", "css_classes": "tn-photo"}
    st.update(resp("min_height", min_h, px))
    st.update(s)
    kids = [photo_label(label)] + (extra_children or [])
    return container(title, kids, padding=dims(pad), **st)


def stars(title, color, size=14, gap_=2):
    return widget("rating", title, rating_scale=px(5), rating_value=5,
                  rating_icon={"value": "fas fa-star", "library": "fa-solid"},
                  icon_size=px(size), icon_gap=px(gap_), icon_marked_color=color,
                  icon_unmarked_color=color)


def wordmark(title, size=28, url="/"):
    return container(
        title,
        [heading("Wordmark / Name", "TOP NOTCH", tag="span", color=BONE,
                 typ=typo(family=SERIF, size=size, weight=600, lh=1, ls=round(size * 0.08, 2))),
         heading("Wordmark / Descriptor", "PAINTING &amp; STAINING", tag="span", color=AMBER,
                 typ=typo(size=10, weight=700, lh=1.2, ls=3.6))],
        gap=5, html_tag="a", link=link(url), _attributes="aria-label|Top Notch Painting home",
        flex_align_items="flex-start",
    )


def section(title, children, bg, pad_top=SECV, pad_bottom=SECV, gap=0, boxed=True, **s):
    st = {"background_background": "classic", "background_color": bg,
          "html_tag": "section", "css_classes": "tn-section"}
    st.update(s)
    return container(title, children, top=True, boxed=boxed, gap=gap,
                     padding=side_pad(pad_top, pad_bottom), **st)


def svg_icon(title, paths):
    svg = ('<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C68B4E" '
           'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '
           'focusable="false" style="display:block">' + paths + "</svg>")
    return widget("html", title, html=svg)


# =================================================================== HEADER
def build_header():
    utility = container(
        "Header / Utility Bar",
        [container(
            "Header / Utility Bar / Inner",
            [
                text("Utility / Tagline",
                     '<p>A Top Notch Logworks company<span aria-hidden="true" style="margin: 0 12px; '
                     'color: #4A4037;">|</span>Building and finishing mountain homes since 1999</p>',
                     color=DRIFT, size=12, lh=1.5,
                     _flex_size="grow", **typo(size=12, lh=1.5, ls=0.96)),
                widget("icon-list", "Utility / Links",
                       view="inline", space_between=px(28), text_color=DRIFT,
                       text_color_hover=BONE,
                       icon_list=[
                           {"_id": eid(), "text": "Areas We Serve", "link": link("/areas-we-serve/"),
                            "selected_icon": {"value": "", "library": ""}},
                           {"_id": eid(), "text": "Financing", "link": link("/financing/"),
                            "selected_icon": {"value": "", "library": ""}},
                       ],
                       **typo(prefix="icon_typography", size=12, weight=400, lh=1.5, ls=0.96)),
                widget("icon-list", "Utility / Phone",
                       view="inline", _css_classes="tn-call",
                       icon_color=BONE, text_color=BONE, text_color_hover=AMBER_HOVER,
                       icon_size=px(13), text_indent=px(8),
                       icon_list=[{"_id": eid(), "text": PHONE, "link": link(TEL),
                                   "selected_icon": {"value": "fas fa-phone-alt",
                                                     "library": "fa-solid"}}],
                       **typo(prefix="icon_typography", size=12, weight=600, lh=1.5, ls=0.96)),
            ],
            direction="row", gap=(28, 4),
            width=px(1280), flex_justify_content="space-between", flex_align_items="center",
            flex_wrap="wrap", min_height=px(40),
            _flex_align_self="center",
        )],
        padding=side_pad(0, 0),
        background_background="classic", background_color=NIGHT,
        css_classes="tn-hide-sm", flex_align_items="center", **HIDE_SM,
    )

    nav_common = dict(
        color_menu_item=BONE, color_menu_item_hover=AMBER_HOVER,
        color_menu_item_active=BONE,
        color_dropdown_item=BONE, background_color_dropdown_item=SMOKE,
        color_dropdown_item_hover=BONE, background_color_dropdown_item_hover=HAIR,
        color_dropdown_item_active=AMBER, background_color_dropdown_item_active=SMOKE,
        dropdown_border_border="solid", dropdown_border_width=dims(1),
        dropdown_border_color=HAIR,
        padding_horizontal_dropdown_item=px(20), padding_vertical_dropdown_item=px(14),
        dropdown_divider_border="solid", dropdown_divider_width=px(1),
        dropdown_divider_color=HAIR,
        **typo(prefix="dropdown_typography", size=14, weight=500, lh=1.4),
    )

    main_nav = widget(
        "nav-menu", "Header / Main Nav (1360px and wider)",
        menu="main-menu", menu_name="Main", layout="horizontal", align_items="center",
        pointer="none", dropdown="none",
        submenu_icon={"value": "fas fa-chevron-down", "library": "fa-solid"},
        menu_space_between=px(22), padding_horizontal_menu_item=px(0),
        padding_vertical_menu_item=px(12), dropdown_top_distance=px(18),
        hide_laptop="hidden-laptop", hide_tablet="hidden-tablet", hide_mobile="hidden-mobile",
        **typo(prefix="menu_typography", size=14, weight=500, lh=1.4),
        **nav_common,
    )

    burger = widget(
        "nav-menu", "Header / Menu Toggle (1359px and below)",
        menu="mobile-menu", menu_name="Main", layout="dropdown", toggle="burger",
        toggle_align="right", full_width="stretch", text_align="aside",
        submenu_icon={"value": "fas fa-chevron-down", "library": "fa-solid"},
        toggle_color=BONE, toggle_color_hover=BONE, toggle_background_color=TRANSPARENT,
        toggle_size=px(20), dropdown_top_distance=px(23),
        hide_desktop="hidden-desktop",
        **nav_common,
    )

    actions = container(
        "Header / Actions",
        [
            button("Builders: Request a Bid", "Builders: Request a Bid", "/for-builders/#bid",
                   kind="outline", size=13, height=44, pad_x=16, border_color=OUTLINE_32,
                   classes="tn-hide-sm", **HIDE_SM),
            button("Request an Estimate", "Request an Estimate", "/request-an-estimate/",
                   size=14, height=48, pad_x=22, classes="tn-hide-sm", **HIDE_SM),
            button("Call icon (mobile)", "", TEL, kind="outline", size=18, height=44, pad_x=13,
                   icon="fas fa-phone-alt", border_color=OUTLINE_32, classes="tn-call tn-show-sm",
                   attrs="aria-label|Call (970) 524-7323", icon_indent=px(0), **SHOW_SM_ONLY),
            burger,
        ],
        direction="row", gap=12, flex_align_items="center", flex_justify_content="flex-end",
    )

    main_bar = container(
        "Header / Main Bar",
        [grid(
            "Header / Main Bar / Inner",
            [wordmark("Header / Wordmark"), main_nav, actions],
            cols=("auto 1fr auto", "1fr auto", "1fr auto", "1fr auto"),
            gap_col=28, gap_row=0,
            width=px(1280), min_height=px(88), flex_align_items="center",
            grid_align_items="center", grid_justify_items="stretch",
            _flex_align_self="center",
        )],
        padding=side_pad(0, 0), flex_align_items="center",
    )

    header_css = """
#tn-header .elementor-nav-menu--main .elementor-nav-menu{flex-wrap:nowrap;white-space:nowrap;justify-content:center;}
#tn-header .elementor-nav-menu--main .elementor-item.has-submenu{gap:6px;}
#tn-header .elementor-nav-menu--main .sub-arrow{padding:0 0 0 6px;font-size:10px;}
#tn-header .elementor-nav-menu--main .sub-arrow svg{width:10px;height:10px;}
#tn-header .elementor-nav-menu--main > .elementor-nav-menu > li > .sub-menu{min-width:260px !important;}
#tn-header .elementor-menu-toggle{width:44px;height:44px;box-sizing:content-box;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid rgba(242,236,227,0.32);border-radius:2px;}
#tn-header .elementor-nav-menu--dropdown.elementor-nav-menu__container{margin-top:23px;border-top:1px solid #2A241F;}
#tn-header .elementor-nav-menu--dropdown .elementor-item{justify-content:space-between;}
#tn-header .tn-call .elementor-button-icon{font-size:18px;}
#tn-header .tn-call .elementor-button-text:empty{display:none;}
@media (max-width:760px){
  #tn-header .tn-hide-sm{display:none !important;}
  #tn-header .elementor-widget.tn-show-sm{display:block !important;}
}
"""
    header = container(
        "Header",
        [utility, main_bar],
        top=True, html_tag="header", _element_id="tn-header",
        background_background="classic", background_color=CHARRED,
        border_border="solid", border_width=dims(0, 0, 1, 0), border_color=HAIR,
        custom_css=header_css.strip(),
        z_index=50,
    )
    return {"version": "0.4", "title": "TN Header", "type": "header",
            "content": [header], "page_settings": []}


# =================================================================== FOOTER
def footer_links(title, heading_text, items, aria):
    return container(
        title,
        [heading(title + " / Heading", heading_text, tag="p", color=BONE,
                 typ=typo(size=12, weight=700, lh=1.4, ls=2.4, transform="uppercase")),
         widget("icon-list", title + " / Links", space_between=px(12), text_color=DRIFT,
                text_color_hover=BONE,
                icon_list=[{"_id": eid(), "text": t, "link": link(u),
                            "selected_icon": {"value": "", "library": ""}} for t, u in items],
                **typo(prefix="icon_typography", size=14, weight=400, lh=1.5))],
        gap=16, html_tag="nav", _attributes="aria-label|" + aria,
    )


def build_footer():
    brand = container(
        "Footer / Brand",
        [wordmark("Footer / Wordmark", size=26),
         text("Footer / Tagline",
              "<p>Fine painting and log home staining for mountain homes.</p>"
              "<p>A division of Top Notch Logworks, Inc., building in the Vail and Roaring Fork "
              "Valleys since 1999.</p>",
              color=DRIFT, size=14, lh=1.7, para_gap=18),
         text_link("Footer / Logworks link", "Visit Top Notch Logworks →",
                   "https://topnotch-logworks.com/", size=14)],
        gap=18,
    )
    fine = footer_links("Footer / Fine Painting", "Fine Painting", [
        ("Interior Painting", "/interior-painting/"),
        ("Exterior Painting", "/exterior-painting/"),
        ("Specialty Finishes &amp; Interior Wood", "/specialty-finishes-interior-wood/"),
        ("Commercial &amp; HOA", "/commercial-hoa/")], "Fine Painting")
    log = footer_links("Footer / Log & Timber Staining", "Log &amp; Timber Staining", [
        ("Log Home Staining &amp; Restoration", "/log-home-staining-restoration/"),
        ("Chinking &amp; Check Sealing", "/chinking-check-sealing/"),
        ("Rot Repair &amp; Prevention", "/rot-repair-prevention/"),
        ("Deck Staining", "/deck-staining/")], "Log and Timber Staining")
    company = footer_links("Footer / Company", "Company", [
        ("Our Work", "/our-work/"), ("Project Stories", "/project-stories/"),
        ("For Builders", "/for-builders/"), ("Our Story", "/our-story/"),
        ("Core Values", "/core-values/"), ("Reviews", "/reviews/"),
        ("Areas We Serve", "/areas-we-serve/"), ("Financing", "/financing/")], "Company")
    contact = container(
        "Footer / Contact",
        [heading("Footer / Contact / Heading", "Contact", tag="p", color=BONE,
                 typ=typo(size=12, weight=700, lh=1.4, ls=2.4, transform="uppercase")),
         text("Footer / Contact / Details",
              "<p>4722 Hwy US-6<br>Gypsum, CO 81637</p>"
              '<p><a class="tn-call" href="tel:+19705247323">(970) 524-7323</a></p>'
              "<p>[painting email address]</p>"
              "<p>Hours: [Monday to Friday, X to X]</p>",
              color=DRIFT, size=14, lh=1.6, para_gap=12,
              custom_css="selector a.tn-call{color:#F2ECE3;font-weight:600;text-decoration:none;}"
                         "selector a.tn-call:hover{color:#D9A66B;}")],
        gap=16,
    )
    columns = grid("Footer / Columns", [brand, fine, log, company, contact],
                   cols=(5, 5, 2, 1), gap_col=40, gap_row=48)

    service_line = text(
        "Footer / Service Area",
        "<p>Serving Aspen, Snowmass, Basalt, Carbondale, Glenwood Springs, Vail, Beaver Creek, "
        "Avon, Edwards, Eagle, Gypsum, and Breckenridge.</p>",
        color=DRIFT, size=13, lh=1.7,
        _padding=dims(32, 0, 0, 0), _border_border="solid", _border_width=dims(1, 0, 0, 0),
        _border_color=HAIR)

    year = heading("Footer / Copyright (auto year)", "© 2026 Top Notch Painting", tag="p",
                   color=DRIFT, typ=typo(size=13, weight=400, lh=1.7))
    tag_settings = ("%7B%22date_format%22%3A%22custom%22%2C%22custom_format%22%3A%22Y%22%2C"
                    "%22before%22%3A%22%C2%A9%20%22%2C%22after%22%3A%22%20Top%20Notch%20Painting%22%7D")
    year["settings"]["__dynamic__"] = {
        "title": '[elementor-tag id="%s" name="current-date-time" settings="%s"]' % (eid(), tag_settings)}

    bottom = container(
        "Footer / Bottom Bar",
        [year,
         heading("Footer / Parent company", "A Top Notch Logworks company", tag="p", color=DRIFT,
                 typ=typo(size=13, weight=400, lh=1.7))],
        direction="row", gap=16, flex_wrap="wrap", flex_justify_content="space-between",
        padding=dims(24, 0, 40, 0),
        border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR,
    )

    footer_css = """
#tn-footer a{text-decoration:none;}
@media (max-width:760px){ #tn-footer{padding-bottom:76px !important;} }
"""
    footer = container(
        "Footer", [columns, service_line, bottom], top=True, boxed=True, gap=56,
        padding=side_pad(88, (0, 0, 0, 76)),
        html_tag="footer", _element_id="tn-footer",
        background_background="classic", background_color=NIGHT,
        custom_css=footer_css.strip(),
    )

    mobile_bar = container(
        "Mobile Call Bar",
        [button("Mobile Bar / Call Now", "Call Now", TEL, kind="outline", height=52, pad_x=16,
                icon="fas fa-phone-alt", classes="tn-call", weight=700, align="justify",
                _flex_size="grow", icon_indent=px(8)),
         button("Mobile Bar / Free Estimate", "Free Estimate", "/request-an-estimate/",
                height=52, pad_x=16, align="justify", _flex_size="grow")],
        top=True, direction="row", gap=10, padding=dims(12, 16),
        background_background="classic", background_color="#0F0D0BF7",
        border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR,
        position="fixed", _offset_orientation_h="start", _offset_x=px(0),
        _offset_orientation_v="end", _offset_y_end=px(0), z_index=100,
        css_classes="tn-mobilebar tn-show-sm", **SHOW_SM_ONLY,
        custom_css="@media (min-width:601px) and (max-width:760px){selector.tn-show-sm{display:flex !important;}}",
    )
    return {"version": "0.4", "title": "TN Footer", "type": "footer",
            "content": [footer, mobile_bar], "page_settings": []}


# =================================================================== HOMEPAGE
def chip(label, url):
    return button("Chip / " + label.replace("&amp;", "&"), label, url, kind="outline", size=13,
                  height=44, pad_x=16, weight=500, border_color=CHIP)


def path_card(title, photo_color, photo_label_text, h3, body, chips, link_label, link_url):
    return container(
        title,
        [photo_slot(title + " / Photo", photo_color, 440, photo_label_text),
         container(
             title + " / Content",
             [heading(title + " / Title", h3, tag="h3", color=BONE,
                      typ=typo(family=SERIF, size=CARD_H3, weight=500, lh=1.08)),
              text(title + " / Text", "<p>%s</p>" % body, color=DRIFT, size=16, lh=1.7),
              container(title + " / Services", [chip(l, u) for l, u in chips],
                        direction="row", gap=8, flex_wrap="wrap",
                        flex_align_content="flex-start", margin=dims(4, 0, 0, 0)),
              text_link(title + " / Link", link_label, link_url,
                        _padding=dims(12, 0, 0, 0),
                        custom_css="selector{margin-top:auto;}")],
             gap=20, _flex_size="grow",
             **{("padding" + d): dims(44, s, 48, s) for d, s in zip(DEVICES, (43, 40, 30, 24))}),
        ],
        html_tag="article", background_background="classic", background_color=SMOKE,
        border_border="solid", border_width=dims(1), border_color=HAIR,
    )


def why_point(title, svg_paths, h3, body):
    return container(
        "Why / " + title,
        [svg_icon("Why / %s / Icon" % title, svg_paths),
         heading("Why / %s / Title" % title, h3, tag="h3", color=BONE,
                 typ=typo(family=SERIF, size=27, weight=500, lh=1.15)),
         text("Why / %s / Text" % title, "<p>%s</p>" % body, color=DRIFT, size=15, lh=1.7)],
        gap=14, padding=dims(36, 0, 40, 0),
        border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR,
    )


def project_card(n, color, cat, caption):
    t = "Projects / Card %d" % n
    return container(
        t,
        [photo_slot(t + " / Photo", color, 440, "Our project photo", pad=16),
         container(t + " / Caption",
                   [heading(t + " / Category", cat, tag="p", color=AMBER,
                            typ=typo(size=11, weight=700, lh=1.4, ls=2.2, transform="uppercase")),
                    heading(t + " / Title", caption, tag="p", color=BONE,
                            typ=typo(size=17, weight=500, lh=1.45))],
                   gap=8)],
        gap=18, html_tag="a", link=link("/our-work/"),
    )


def review_card(n, quote, name, town):
    t = "Reviews / Card %d" % n
    return container(
        t,
        [stars(t + " / Stars", DEEP, size=16, gap_=3),
         text(t + " / Quote", "<blockquote>%s</blockquote>" % quote, color=CHARRED, size=27,
              lh=1.35, custom_css="selector blockquote{margin:0;padding:0;border:0;font:inherit;color:inherit;text-wrap:pretty;}",
              **typo(family=SERIF, size=27, weight=500, lh=1.35)),
         text(t + " / Attribution", "<p><strong>%s</strong> · %s</p>" % (name, town),
              color=BARK, size=14, lh=1.6,
              custom_css="selector{margin-top:auto;}selector strong{color:#14110E;font-weight:700;}")],
        gap=24, background_background="classic", background_color="#FBF8F3",
        border_border="solid", border_width=dims(1), border_color="#E2D9CC",
        **{("padding" + d): dims(v) for d, v in zip(DEVICES, (48, 48, 39, 32))},
    )


def build_home():
    # 1 HERO --------------------------------------------------------------
    hero_css = (
        "selector::before{background-image:linear-gradient(90deg, rgba(20,17,14,0.94) 0%, "
        "rgba(20,17,14,0.72) 44%, rgba(20,17,14,0.12) 100%) !important;opacity:1 !important;}"
        "selector > .e-con-inner{position:relative;z-index:1;}"
    )
    hero = section(
        "Hero",
        [
            photo_label("Hero photo: high-end great room or log home at dusk",
                        _position="absolute", _element_width="auto",
                        _offset_orientation_h="end",
                        **resp("_offset_x_end", SIDE, px), _offset_y=px(28), _z_index=2,
                        _css_classes="tn-hide-sm",
                        hide_mobile="hidden-mobile",
                        custom_css="@media (max-width:760px){selector{display:none !important;}}"),
            eyebrow("Vail · Beaver Creek · Edwards · Aspen · Snowmass"),
            heading("Hero / Title (H1)",
                    "Fine painting and log home staining for exceptional mountain homes.",
                    tag="h1", color=BONE,
                    typ=typo(family=SERIF, size=H1, weight=500, lh=1.02, ls=-0.8),
                    custom_css="selector{max-width:900px;}selector .elementor-heading-title{text-wrap:balance;letter-spacing:-0.01em;}"),
            text("Hero / Subline",
                 "<p>High-end interior and exterior painting, plus log and timber home staining, "
                 "restoration and chinking, from Vail to Aspen. Backed by a company that has been "
                 "building log homes in these valleys since 1999.</p>",
                 color="#D7CFC4", size=19, lh=1.65,
                 custom_css="selector{max-width:620px;}selector p{text-wrap:pretty;}"),
            container("Hero / Buttons",
                      [button("Hero / Request an Estimate", "Request an Estimate", "#estimate"),
                       button("Hero / Call", "Call " + PHONE, TEL, kind="outline", pad_x=26,
                              icon="fas fa-phone-alt", classes="tn-call")],
                      direction="row", gap=14, flex_wrap="wrap", padding=dims(8, 0, 0, 0)),
        ],
        bg="#2E231A", pad_top=96, pad_bottom=96, gap=28,
        min_height=px(780), flex_justify_content="center", overflow="hidden",
        background_position="center center", background_size="cover",
        background_repeat="no-repeat",
        background_overlay_background="gradient",
        background_overlay_color="#14110EF0", background_overlay_color_stop=px(0, "%"),
        background_overlay_color_b="#14110E1F", background_overlay_color_b_stop=px(100, "%"),
        background_overlay_gradient_type="linear",
        background_overlay_gradient_angle={"unit": "deg", "size": 90, "sizes": []},
        background_overlay_opacity={"unit": "px", "size": 1, "sizes": []},
        custom_css=hero_css,
    )
    hero["settings"]["css_classes"] = "tn-section tn-photo"

    # 2 TRUST BAR -----------------------------------------------------------
    def trust_item(title, figure, caption, with_stars=False):
        fig = heading(title + " / Figure", figure, tag="span", color=BONE,
                      typ=typo(family=SERIF, size=26, weight=600, lh=1))
        top_el = fig
        if with_stars:
            top_el = container(title + " / Rating", [stars(title + " / Stars", AMBER), fig],
                               direction="row", gap=10, flex_align_items="center",
                               flex_justify_content="flex-start")
        return container(title, [top_el,
                                 heading(title + " / Caption", caption, tag="p", color=DRIFT,
                                         typ=typo(size=13, weight=400, lh=1.5))], gap=6)

    trust = section(
        "Trust Bar",
        [],
        bg=SMOKE, pad_top=32, pad_bottom=32,
        border_border="solid", border_width=dims(0, 0, 1, 0), border_color=HAIR,
        _attributes="aria-label|Credentials",
    )
    trust_grid = grid("Trust Bar / Items", [
        trust_item("Trust / Reviews", "4.9", "19 reviews on HomeAdvisor", with_stars=True),
        trust_item("Trust / BBB", "BBB A+", "Accredited business"),
        trust_item("Trust / Since 1999", "Since 1999", "Building and finishing mountain homes"),
        trust_item("Trust / Insured", "Fully insured", "Certificate of insurance on request"),
        trust_item("Trust / Partners", "Sashco &amp; Perma-Chink", "Log and timber product partners"),
    ], cols=(5, 5, 3, 1), gap_col=32, gap_row=24)
    trust["elements"] = [trust_grid]

    # 3 WHAT WE DO ------------------------------------------------------------
    painting = path_card(
        "What We Do / Painting Card", "#33261C", "Photo: finished interior, beams and stone",
        "Fine Interior &amp; Exterior Painting",
        "Walls, ceilings, trim, doors, and specialty finishes, completed with the preparation, "
        "protection, and clean lines a high-end home demands. We work in occupied and unoccupied "
        "homes, coordinate with property managers, and keep you updated even when you're out of town.",
        [("Interior Painting", "/interior-painting/"), ("Exterior Painting", "/exterior-painting/"),
         ("Specialty Finishes &amp; Interior Wood", "/specialty-finishes-interior-wood/"),
         ("Commercial &amp; HOA", "/commercial-hoa/")],
        "Explore Fine Painting →", "/interior-painting/")
    staining = path_card(
        "What We Do / Staining Card", "#3A281B", "Photo: freshly stained log home exterior",
        "Log &amp; Timber Staining",
        "Log home staining is where we started and what we're known for. We prepare the wood "
        "properly, apply premium stains and sealers, and handle the chinking, check sealing, and "
        "rot repair that keep a log home tight and protected. We build log homes, so we know what "
        "makes a finish last.",
        [("Log Home Staining &amp; Restoration", "/log-home-staining-restoration/"),
         ("Chinking &amp; Check Sealing", "/chinking-check-sealing/"),
         ("Rot Repair &amp; Prevention", "/rot-repair-prevention/"),
         ("Deck Staining", "/deck-staining/")],
        "Explore Log &amp; Timber Staining →", "/log-home-staining-restoration/")
    what = section(
        "What We Do",
        [container("What We Do / Eyebrow",
                   [eyebrow("What we do", custom_css="selector{white-space:nowrap;}"),
                    widget("divider", "What We Do / Rule", style="solid", weight=px(1),
                           color=HAIR, width=px(100, "%"), gap=px(0), _flex_size="grow")],
                   direction="row", gap=20, flex_align_items="center"),
         grid("What We Do / Cards", [painting, staining], cols=(2, 2, 1, 1), gap_col=32)],
        bg=CHARRED, gap=48,
    )

    # 4 WHO WE ARE --------------------------------------------------------------
    badge = container(
        "Who We Are / Photo / 1999 Badge",
        [heading("Badge / Year", "1999", tag="span", color=BONE,
                 typ=typo(family=SERIF, size=56, weight=500, lh=1)),
         heading("Badge / Caption", "Top Notch Logworks founded", tag="span", color=DRIFT,
                 typ=typo(size=11, weight=600, lh=1.4, ls=1.98, transform="uppercase"))],
        gap=8, padding=dims(28, 36), background_background="classic", background_color=CHARRED,
        position="absolute", _offset_orientation_h="start", _offset_x=px(0),
        _offset_orientation_v="end", _offset_y_end=px(0),
        custom_css="selector{--width:auto;width:auto;max-width:100%;}",
    )
    who = section(
        "Who We Are",
        [grid("Who We Are / Layout", [
            container("Who We Are / Text", [
                eyebrow("Who we are", color=DEEP),
                h2("Craftsmanship rooted in how mountain homes are built", color=CHARRED),
                text("Who We Are / Text body",
                     "<p>Top Notch Painting is the painting and finishing division of Top Notch "
                     "Logworks, which has been building log and timber homes and resorts across the "
                     "Vail and Roaring Fork Valleys since 1999. That background shapes everything "
                     "we do. We understand how mountain homes are built, how they move, and what "
                     "high altitude, dry air, and intense sun do to a finish.</p>",
                     color=BARK, size=17, lh=1.75),
                text_link("Who We Are / Link", "Read our story →", "/our-story/", color=DEEP,
                          hover=CHARRED)], gap=24),
            photo_slot("Who We Are / Photo", "#3A281B", 560,
                       "Photo: Logworks crew on a log or timber build", extra_children=[badge]),
        ], cols=(2, 2, 1, 1), gap_col=SPLIT_GAP, grid_align_items="center",
            flex_align_items="center")],
        bg=BONE,
    )

    # 5 WHY TOP NOTCH -----------------------------------------------------------
    ICONS = {
        "house": '<path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
        "brush": '<path d="M4 20l6-6"></path><path d="M9 9l6 6 5-5-6-6z"></path>',
        "shield": '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"></path><path d="M8.5 12l2.5 2.5 4.5-5"></path>',
        "person": '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"></path>',
        "drop": '<path d="M12 3c3 4 6 7.2 6 10.5A6 6 0 0 1 6 13.5C6 10.2 9 7 12 3z"></path>',
        "doc": '<path d="M7 3h7l5 5v13H7z"></path><path d="M14 3v5h5"></path><path d="M10 14l2 2 4-4"></path>',
    }
    why = section(
        "Why Top Notch",
        [grid("Why / Header", [
            container("Why / Header / Title", [eyebrow("Why Top Notch"),
                                               h2("Your home is in experienced hands")], gap=20),
            text("Why / Header / Text",
                 "<p>Our crews are trained to our own preparation and finishing standards and led "
                 "on site by a dedicated project lead. We don't consider a job finished until you've "
                 "walked it with us and are happy with every room.</p>", color=DRIFT)],
            cols=(2, 2, 1, 1), gap_col=(96, 72, 28, 28), gap_row=28, grid_align_items="end",
            flex_align_items="flex-end"),
         grid("Why / Points", [
             why_point("Builders first", ICONS["house"], "Builders first",
                       "Our parent company has been building log and timber homes in these valleys "
                       "since 1999. We understand your home from the framing out."),
             why_point("Preparation", ICONS["brush"], "Preparation is the job",
                       "Patching, sanding, caulking, priming, and masking done right is what makes a "
                       "finish look flawless and last. We never rush it."),
             why_point("Protected", ICONS["shield"], "Your home, protected",
                       "Floors, furnishings, fixtures, and landscaping are covered and protected. Work "
                       "areas are cleaned at the end of every day."),
             why_point("One contact", ICONS["person"], "One point of contact",
                       "A dedicated project lead manages your job from your first call to your final "
                       "walkthrough, with regular updates and photos if you're away."),
             why_point("Products", ICONS["drop"], "Premium products",
                       "We use top-tier coatings, including [paint brands], and Sashco and Perma-Chink "
                       "systems on log and timber homes."),
             why_point("Warranty", ICONS["doc"], "Backed in writing",
                       "Detailed written estimates, clear schedules, and a [X-year] written warranty "
                       "on our work."),
         ], cols=(3, 3, 2, 1), gap_col=48, gap_row=0)],
        bg=CHARRED, gap=64,
    )

    # 6 FEATURED PROJECTS -------------------------------------------------------
    projects = section(
        "Featured Projects",
        [grid("Projects / Header", [
            container("Projects / Header / Title", [eyebrow("Our work"),
                                                    h2("Featured projects", balance=False)], gap=20),
            button("Projects / See our work", "See our work →", "/our-work/", kind="outline",
                   size=14, height=48, pad_x=22, border_color=OUTLINE_32)],
            cols=("1fr auto", "1fr auto", "1fr auto", "1fr"), gap_col=24, gap_row=24,
            grid_align_items="end", grid_justify_items="start", flex_align_items="flex-end"),
         grid("Projects / Cards", [
             project_card(1, "#33261C", "Interior", "Great room walls and ceilings, Snowmass"),
             project_card(2, "#2F2620", "Interior", "Full interior repaint with trim and doors, Edwards"),
             project_card(3, "#222B25", "Exterior", "Exterior repaint for a returning client, Arrowhead"),
             project_card(4, "#3A281B", "Log &amp; Timber", "Log wash and restain, Edwards"),
         ], cols=(4, 4, 2, 1), gap_col=24)],
        bg=SMOKE, gap=56,
    )

    # 7 AWAY FOR THE SEASON (full-bleed split, no side padding in reference) ----
    away_text = container(
        "Away / Content",
        [eyebrow("Second homes &amp; property managers"),
         h2("Away for the season? We'll take care of it.",
            custom_css="selector{max-width:560px;}selector .elementor-heading-title{text-wrap:balance;}"),
         text("Away / Text",
              "<p>Many of our clients aren't here full-time. We coordinate access with you or your "
              "property manager, send progress photos along the way, and finish the work before you "
              "arrive, with the home cleaned and ready to enjoy.</p>"
              "<p>Winter is an ideal time for interior projects, when the house is quiet and "
              "schedules are flexible.</p>",
              color="#C9D1C4", para_gap=24, custom_css="selector{max-width:560px;}"),
         container("Away / Buttons",
                   [button("Away / Request an Estimate", "Request an Estimate", "#estimate"),
                    button("Away / Call", "Call " + PHONE, TEL, kind="outline", pad_x=26,
                           classes="tn-call")],
                   direction="row", gap=14, flex_wrap="wrap", padding=dims(8, 0, 0, 0))],
        gap=24, flex_justify_content="center",
        **{("padding" + d): dims(v, h) for d, v, h in
           zip(DEVICES, (101, 88, 69, 56), (86, 72, 59, 23))},
    )
    away = container(
        "Away for the Season",
        [grid("Away / Layout", [
            photo_slot("Away / Photo", "#2A3236", 640, "Photo: mountain home in snow, lights on"),
            away_text], cols=(2, 2, 1, 1), gap_col=0)],
        top=True, html_tag="section", css_classes="tn-section",
        background_background="classic", background_color=SPRUCE,
    )

    # 8 REVIEWS ---------------------------------------------------------------
    ratings = container(
        "Reviews / Ratings",
        [container("Reviews / Ratings / HomeAdvisor",
                   [stars("Reviews / Ratings / Stars", DEEP),
                    text("Reviews / Ratings / HomeAdvisor text",
                         "<p><strong>4.9</strong> from 19 reviews on HomeAdvisor</p>",
                         color=BARK, size=14, lh=1.5)],
                   direction="row", gap=10, flex_align_items="center",
                   custom_css="selector{--width:auto;width:auto;}"),
         text("Reviews / Ratings / BBB", "<p><strong>BBB A+</strong> Accredited</p>",
              color=BARK, size=14, lh=1.5),
         text("Reviews / Ratings / Google", "<p>[Google rating and review count]</p>",
              color=BARK, size=14, lh=1.5)],
        direction="row", gap=(36, 12), flex_wrap="wrap", flex_justify_content="center",
        flex_align_items="center", margin=dims(8, 0, 0, 0),
        custom_css="selector strong{color:#14110E;font-weight:700;}",
    )
    reviews = section(
        "Reviews",
        [container("Reviews / Header",
                   [eyebrow("Reviews", color=DEEP, align="center"),
                    h2("What our clients say", color=CHARRED, balance=False, align="center"),
                    ratings],
                   gap=20, flex_align_items="center", text_align="center"),
         grid("Reviews / Cards", [
             review_card(1, "“Oto and his crew were wonderful. They were efficient, professional "
                            "and very conscious of our budget. We would absolutely use them again.”",
                         "Cathy D.", "Eagle"),
             review_card(2, "“Excellent job! Christian and his father were on time, professional, "
                            "clean and did an excellent job on my accent wall. Very clean lines.”",
                         "Karen H.", "Gypsum"),
         ], cols=(2, 2, 1, 1), gap_col=24),
         text_link("Reviews / Read all", "Read all reviews →", "/reviews/", color=DEEP,
                   hover=CHARRED, align="center")],
        bg=BONE, gap=56,
    )

    # 9 BUILDER STRIP -------------------------------------------------------------
    builder = section(
        "Builder Strip",
        [grid("Builder Strip / Layout", [
            container("Builder Strip / Text", [
                eyebrow("For builders"),
                heading("Builder Strip / Title (H2)", "Builders and general contractors", tag="h2",
                        color=BONE, typ=typo(family=SERIF, size=BUILDER_H2, weight=500, lh=1.1)),
                text("Builder Strip / Text body",
                     "<p>We partner with builders on high-end new construction and remodels across "
                     "the valleys. Painting, staining, and finish work on your schedule.</p>",
                     color=DRIFT, size=16, lh=1.7)], gap=12),
            button("Builder Strip / Request a Bid", "Request a Bid →", "/for-builders/#bid",
                   kind="outline", pad_x=28, weight=700, border_color=AMBER)],
            cols=("minmax(0, 760px) auto", "minmax(0, 760px) auto", "1fr", "1fr"),
            gap_col=32, gap_row=32, grid_align_items="center", grid_justify_items="start",
            grid_justify_content="space-between", flex_align_items="center")],
        bg=NIGHT, pad_top=64, pad_bottom=64,
        border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR,
    )

    # 10 SEASONAL OFFER + ESTIMATE FORM --------------------------------------------
    form_fields = [
        {"_id": eid(), "custom_id": "name", "field_type": "text", "field_label": "Name",
         "required": "true", "width": "50", "width_mobile": "100"},
        {"_id": eid(), "custom_id": "phone", "field_type": "tel", "field_label": "Phone",
         "required": "true", "width": "50", "width_mobile": "100"},
        {"_id": eid(), "custom_id": "email", "field_type": "email", "field_label": "Email",
         "required": "true", "width": "50", "width_mobile": "100"},
        {"_id": eid(), "custom_id": "town", "field_type": "select", "field_label": "Town",
         "required": "true", "width": "50", "width_mobile": "100",
         "field_options": "Select a town|\nAspen\nSnowmass\nBasalt\nCarbondale\nGlenwood Springs\n"
                          "Vail\nBeaver Creek\nAvon\nEdwards\nEagle\nGypsum\nBreckenridge\nOther"},
        {"_id": eid(), "custom_id": "need", "field_type": "select",
         "field_label": "What do you need?", "required": "true", "width": "100",
         "field_options": "Choose a service|\nInterior painting\nExterior painting\n"
                          "Cabinets / trim / specialty finish\nLog home staining / restoration\n"
                          "Chinking / check sealing\nRot repair\nDeck staining\nCommercial / HOA"},
    ]
    form_css = (
        "selector .elementor-field-group .elementor-field-textual{height:48px;min-height:48px;"
        "padding:0 14px;font-family:Manrope, 'Helvetica Neue', Arial, sans-serif;}"
        "selector select.elementor-field-textual{padding:0 36px 0 12px;color-scheme:dark;}"
        "selector .elementor-select-wrapper .select-caret-down-wrapper{color:#F2ECE3;}"
        "selector .elementor-field-group .elementor-field-textual:focus{border-color:#C68B4E;"
        "box-shadow:0 0 0 1px #C68B4E;outline:none;}"
        "selector .e-form__buttons{margin-top:4px;}"
        "selector .elementor-button{min-height:54px;}"
    )
    form = widget(
        "form", "Estimate / Form",
        form_name="Homeowner Estimate - Homepage", form_id="tn-estimate-form",
        form_fields=form_fields, input_size="md", show_labels="true", mark_required="true",
        label_position="above", button_text="Request My Estimate", button_size="md",
        button_width="100", button_align="stretch",
        submit_actions=["email", "redirect"],
        email_to="[painting email address]",
        email_subject="New estimate request (Homepage form)",
        email_content="[all-fields]",
        redirect_to="/thank-you/",
        success_message="Thank you. We'll call within one business day.",
        column_gap=px(16), row_gap=px(20), label_spacing=px(8),
        label_color=BONE, mark_required_color=AMBER,
        field_text_color=BONE, field_background_color=CHARRED, field_border_color=INPUT,
        field_border_width=dims(1), field_border_radius=dims(2),
        button_background_color=AMBER, button_text_color=CHARRED,
        button_background_hover_color=AMBER_HOVER, button_hover_color=CHARRED,
        button_border_radius=dims(2), button_text_padding=dims(19.5, 24),
        custom_css=form_css,
        **typo(prefix="label_typography", size=13, weight=600, lh=1.4),
        **typo(prefix="field_typography", size=15, weight=400, lh=1.4),
        **typo(prefix="button_typography", size=15, weight=700, lh=1),
    )
    estimate = section(
        "Estimate",
        [grid("Estimate / Layout", [
            container("Estimate / Text", [
                container("Seasonal Offer", [
                    eyebrow("Seasonal offer"),
                    h2("Now scheduling winter interior projects"),
                    text("Seasonal Offer / Text",
                         "<p>Winter is the best time to refresh your interior. Book your project "
                         "between [dates] and receive [10% off / our winter rate].</p>")], gap=24),
                container("Estimate / Call", [
                    heading("Estimate / Call / Label", "Prefer to talk?", tag="p", color=DRIFT,
                            typ=typo(size=12, weight=600, lh=1.4, ls=2.16, transform="uppercase")),
                    heading("Estimate / Call / Phone", PHONE, tag="p", color=BONE,
                            typ=typo(family=SERIF, size=38, weight=500, lh=1.2),
                            link=link(TEL), title_hover_color=AMBER_HOVER, _css_classes="tn-call")],
                    gap=6, padding=dims(24, 0, 0, 0),
                    border_border="solid", border_width=dims(1, 0, 0, 0), border_color=HAIR),
                text("Estimate / Next steps",
                     "<p>What happens next: we'll call within one business day to schedule a "
                     "walkthrough at a time that works for you.</p>", color=DRIFT, size=14, lh=1.7),
            ], gap=28),
            container("Estimate / Form Card", [
                heading("Estimate / Form title (H3)", "Request your free estimate", tag="h3",
                        color=BONE, typ=typo(family=SERIF, size=32, weight=500, lh=1.1)),
                form,
                text("Estimate / Builder note",
                     '<p>Builder or general contractor? <a href="/for-builders/#bid">Use our bid '
                     'request form →</a></p>', color=DRIFT, size=13, lh=1.6,
                     custom_css="selector a{color:#C68B4E;font-weight:700;text-decoration:none;}"
                                "selector a:hover{color:#D9A66B;}"),
            ], gap=20, background_background="classic", background_color=SMOKE,
                border_border="solid", border_width=dims(1), border_color=HAIR,
                **{("padding" + d): dims(v) for d, v in zip(DEVICES, (44, 42, 34, 28))}),
        ], cols=(2, 2, 1, 1), gap_col=SPLIT_GAP, grid_align_items="center",
            flex_align_items="center")],
        bg=CHARRED, _element_id="estimate",
    )

    content = [hero, trust, what, who, why, projects, away, reviews, builder, estimate]
    return {"version": "0.4", "title": "TN Homepage", "type": "page",
            "content": content, "page_settings": []}


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
            assert el["elType"] in ("container", "widget"), el["elType"]
            if el["elType"] == "container":
                if depth > 0:
                    assert el["isInner"] is True, el["settings"]["_title"]
                    assert el["settings"]["content_width"] == "full", el["settings"]["_title"]
            else:
                assert el.get("widgetType")
    return ids


def main():
    os.makedirs(OUT, exist_ok=True)
    docs = {"tn-header.json": build_header(), "tn-footer.json": build_footer(),
            "tn-homepage.json": build_home()}
    all_ids = []
    for name, doc in docs.items():
        all_ids += validate(doc)
        with open(os.path.join(OUT, name), "w") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
        print("wrote", name, sum(1 for t in doc["content"] for _ in walk(t)), "elements")
    assert len(all_ids) == len(set(all_ids)), "duplicate ids"
    assert all(len(i) in (7, 8) and int(i, 16) >= 0 for i in all_ids)
    print("ids unique:", len(all_ids))


if __name__ == "__main__":
    main()
