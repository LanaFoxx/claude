#!/usr/bin/env python3
"""Inner pages for the Top Notch Painting staging site (Elementor JSON, same system as the homepage).

Run after build_templates.py's helpers load:  python3 tools/build_pages.py
Writes output/pages/<slug>.json, one per page.

Copy is drawn from the client's current sites (topnotch-painting.com and topnotch-logworks.com)
and the homepage. Anything the client still has to confirm is listed in output/CLIENT-CHECKLIST.md.
"""
import copy
import json
import os

import build_templates as bt
from build_templates import (AMBER, BARK, BONE, CHARRED, DRIFT, EST_BROWN, NIGHT, PHONE, SPRUCE,
                             SPRUCE_TEXT, TEL, SIDE, container, dims, eid, grid, h2, heading, index_list,
                             pads, photo_slot, pill, px, section, svg, text, text_link, typo, widget)

OUT = os.path.join(bt.OUT, "pages")
SERIF = bt.SERIF
H1_INNER = (64, 60, 48, 40)             # before SERIF_SCALE: ~55/52/41/34px
H2_INNER = (52, 48, 40, 34)             # ~45/41/34/29px
TOP_PAD = (200, 200, 176, 152)          # clears the overlaid header

# ------------------------------------------------------------------ shared blocks
TICKS_CSS = ("selector ul{list-style:none;margin:0;padding:0;display:grid;gap:12px;}"
             "selector li{position:relative;padding-left:26px;}"
             "selector li::before{content:'';position:absolute;left:0;top:.72em;width:12px;height:2px;"
             "background:#C68B4E;}")


def h1(name, html_):
    return heading(name + " / Title (H1)", html_, tag="h1", color=BONE,
                   typ=bt.typo(family=SERIF, size=H1_INNER, weight=500, lh=1.04, ls=-0.6),
                   custom_css="selector{max-width:760px !important;}"
                              "selector .elementor-heading-title{text-wrap:balance;}")


def eyebrow(name, label, color=AMBER):
    return heading(name + " / Eyebrow", label, tag="div", color=color,
                   typ=typo(size=13, weight=600, lh=1.4, ls=1.2))


def actions(name, light=False):
    return container(name + " / Actions", [
        pill(name + " / Request an Estimate", "Request an Estimate", "/request-an-estimate/"),
        text_link(name + " / Call", "Call " + PHONE, TEL, icon="phone", classes="tn-call",
                  color=CHARRED if light else BONE)],
        direction="row", gap=(28, 12), flex_wrap="wrap", flex_align_items="center")


def page_hero(name, crumb, title_html, intro, photo=None):
    """Dark page header: eyebrow, bold/thin H1, intro, actions; photo slot on the right."""
    left = container(name + " / Text", [
        eyebrow(name, crumb), h1(name, title_html),
        text(name + " / Intro", "<p>%s</p>" % intro, color=bt.HERO_TEXT, size=(19, 18, 18, 17),
             lh=1.65, max_w=600),
        actions(name)], gap=24, flex_justify_content="center")
    kids = [left]
    if photo:
        color, label, image = photo
        kids.append(photo_slot(name + " / Photo", color, (480, 440, 360, 280), label, image=image))
    body = grid(name + " / Layout", kids, cols=(("minmax(0,1.1fr) minmax(0,1fr)",) * 2 + ("1fr", "1fr"))
                if photo else (1, 1, 1, 1), gap_col=(72, 64, 48, 40), gap_row=(48, 48, 48, 40),
                grid_align_items="center")
    return section(name, [body], bg=CHARRED, pad_top=TOP_PAD, pad_bottom=(104, 96, 80, 64))


def prose(name, h2_html, paras, bullets=None, photo=None, bg=BONE, flip=False):
    """Text column (H2, paragraphs, amber-dash list) beside an optional photo slot."""
    dark = bg != BONE
    tcol, hcol = (DRIFT, BONE) if dark else (BARK, CHARRED)
    body = "".join("<p>%s</p>" % p for p in paras)
    kids = [h2(name + " / Title (H2)", h2_html, color=hcol, sizes=H2_INNER, max_w=640),
            text(name + " / Text", body, color=tcol, size=17, lh=1.75, para_gap=18, max_w=620)]
    blist = None
    if bullets:
        blist = text(name + " / List", "<ul>%s</ul>" % "".join("<li>%s</li>" % b for b in bullets),
                     color=BONE if dark else CHARRED, size=16, lh=1.55, weight=500, max_w=620,
                     pretty=False, custom_css=TICKS_CSS)
        if photo:
            kids.append(blist)
    col = container(name + " / Text column", kids, gap=24)
    if bullets and not photo:
        # No photo: the list becomes a "What's included" column so the right half isn't empty
        box = container(name + " / Included", [eyebrow(name + " / Included", "What's included",
                                                       AMBER if dark else bt.DEEP), blist],
                        gap=20, padding=pads((40, 36, 32, 28), (40, 36, 32, 28), (40, 36, 32, 28), (40, 36, 32, 28)),
                        border_border="solid", border_width=dims(1),
                        border_color="#F2ECE31F" if dark else "#DCD2C4", border_radius=dims(6))
        lay = grid(name + " / Layout", [col, box], cols=("minmax(0,1.3fr) minmax(0,1fr)",) * 2 + ("1fr", "1fr"),
                   gap_col=(96, 72, 48, 40), gap_row=40, grid_align_items="center")
        return section(name, [lay], bg=bg)
    if photo:
        color, label, image = photo
        ph = photo_slot(name + " / Photo", color, (520, 480, 380, 300), label, image=image)
        cells = [ph, col] if flip else [col, ph]
        lay = grid(name + " / Layout", cells, cols=(2, 2, 1, 1), gap_col=(96, 80, 56, 40),
                   gap_row=(48, 48, 48, 40), grid_align_items="center")
    else:
        lay = col
    return section(name, [lay], bg=bg)


def steps(name, h2_html, items, bg=SPRUCE):
    """Numbered steps on the bordered grid used by the homepage 'Why' section."""
    cells = []
    for i, (t, b) in enumerate(items, 1):
        cells.append(container("%s / Step %d" % (name, i), [
            heading("%s / Step %d / Number" % (name, i), "%02d" % i, tag="div", color=AMBER,
                    typ=typo(family=SERIF, size=34, weight=500, lh=1)),
            heading("%s / Step %d / Title (H3)" % (name, i), t, tag="h3", color=BONE,
                    typ=typo(family=SERIF, size=28, weight=500, lh=1.15)),
            text("%s / Step %d / Text" % (name, i), "<p>%s</p>" % b, color=SPRUCE_TEXT, size=15,
                 lh=1.75, max_w=360, pretty=False)], gap=16))
    n = len(items)
    cols = (5, 3, 2, 1) if n == 5 else ((4, 4, 2, 1) if n == 4 else (3, 3, 2, 1))
    return section(name, [
        h2(name + " / Title (H2)", h2_html, sizes=H2_INNER, max_w=720),
        grid(name + " / Grid", cells, cols=cols, gap_col=0, gap_row=0,
             css=bt.WHY_GRID_LINES + ("@media (min-width:1360px){selector > .e-con{padding:48px 32px 52px !important;}}"
                                      if n == 5 else ""))],
        bg=bg, gap=(64, 60, 52, 44))


def quote(name, q, cite, bg=BONE):
    return section(name, [container(name + " / Content", [
        heading(name + " / Quote", "“%s”" % q, tag="blockquote", color=CHARRED,
                typ=typo(family=SERIF, size=(34, 32, 28, 24), weight=400, lh=1.3),
                align="center", custom_css="selector{max-width:880px !important;margin:0 auto;}"
                                           "selector .elementor-heading-title{text-wrap:balance;}"),
        heading(name + " / Cite", cite, tag="div", color=BARK, typ=typo(size=14, weight=600, lh=1.5),
                align="center")], gap=24, flex_align_items="center")], bg=bg)


def related(name, h2_html, items, bg=CHARRED):
    return section(name, [
        grid(name + " / Layout", [
            container(name + " / Heading", [
                h2(name + " / Title (H2)", h2_html, sizes=H2_INNER, max_w=480)], gap=0),
            index_list(name + " / Links", items)],
            cols=("minmax(0,1fr) minmax(0,1.4fr)",) * 2 + ("1fr", "1fr"), gap_col=(96, 80, 48, 40),
            gap_row=32, grid_align_items="start")], bg=bg)


def cta(name="Closing CTA", title_html="<b>Ready to talk</b> about your project?",
        body="Free written estimates across the Vail, Roaring Fork and Eagle valleys. We'll call within one "
             "business day to set up a walkthrough."):
    return section(name, [container(name + " / Content", [
        h2(name + " / Title (H2)", title_html, sizes=H2_INNER, max_w=760, align="center"),
        text(name + " / Text", "<p>%s</p>" % body, color=bt.HERO_TEXT, size=18, lh=1.65, max_w=600,
             align="center", custom_css="selector{margin:0 auto;}"),
        container(name + " / Actions", [
            pill(name + " / Request an Estimate", "Request an Estimate", "/request-an-estimate/"),
            text_link(name + " / Call", "Call " + PHONE, TEL, icon="phone", classes="tn-call")],
            direction="row", gap=(28, 12), flex_wrap="wrap", flex_align_items="center",
            flex_justify_content="center")],
        gap=28, flex_align_items="center")],
        bg=EST_BROWN, **(dict(bt.wood_texture(EST_BROWN, 0.65), background_attachment="fixed")
                         if bt.TEXTURE else {}))


def page(title, sections):
    return {"version": "0.4", "title": title, "type": "page", "content": sections, "page_settings": []}


PAINTING = [("Interior Painting", "/interior-painting/"), ("Exterior Painting", "/exterior-painting/"),
            ("Specialty Finishes &amp; Interior Wood", "/specialty-finishes-interior-wood/"),
            ("Commercial &amp; HOA", "/commercial-hoa/")]
STAINING = [("Log Home Staining &amp; Restoration", "/log-home-staining-restoration/"),
            ("Chinking &amp; Check Sealing", "/chinking-check-sealing/"),
            ("Rot Repair &amp; Prevention", "/rot-repair-prevention/"), ("Deck Staining", "/deck-staining/"),
            ("Media Blasting", "/media-blasting/")]

PREP_STEPS = [
    ("Walkthrough &amp; written estimate", "We look at the work in person, talk through colors and products, "
     "and give you a clear written estimate with no hidden charges."),
    ("Protect &amp; prepare", "Floors, furnishings, fixtures and landscaping are covered. Surfaces are cleaned, "
     "repaired and prepped to the manufacturer's specifications."),
    ("Apply the finish", "Premium coatings applied the right way, with enough coats for our dry, high-altitude "
     "climate. When we spray, we back-brush for a proper bond."),
    ("Clean up &amp; walk through", "We clean up every day, then walk the finished job with you before we call "
     "it done. Your project lead is your contact the whole way."),
]


def service(slug, crumb, title_html, intro, photo, about_h2, about, bullets, quote_=None, steps_=None,
            steps_h2="<b>How we</b> work", more=None):
    others = [x for x in (PAINTING if crumb == "Fine Painting" else STAINING) if x[1] != "/%s/" % slug]
    blocks = [page_hero("Page Header", crumb, title_html, intro, photo),
              prose("About", about_h2, about, bullets),
              steps("Process", steps_h2, steps_ or PREP_STEPS)]
    if more:
        blocks.append(more)
    if quote_:
        blocks.append(quote("Client Quote", *quote_))
    blocks += [related("Related Services", "<b>More</b> %s" % ("painting services" if crumb == "Fine Painting"
                                                              else "log &amp; timber services"), others),
               cta()]
    return page("TN " + slug, blocks)


# ------------------------------------------------------------------ v2 service-page blocks
def img(title, key, height=None, contain=False, **s):
    """Image widget from tools/photos.json. height=None keeps the natural aspect (no crop)."""
    ph = bt.PHOTOS[key]
    css = "selector img{width:100%;display:block;border-radius:4px;"
    if height:
        css += "height:%dpx;object-fit:cover;}" % height[0]
        css += "@media (max-width:980px){selector img{height:%dpx;}}" % height[1]
        css += "@media (max-width:600px){selector img{height:%dpx;}}" % height[2]
    else:
        css += "height:auto;}"
    return widget("image", title, image={"id": int(ph["id"]), "url": ph["url"], "alt": ph.get("alt", ""),
                                         "source": "library"}, image_size="full", custom_css=css, **s)


def cards(name, h2_html, items, intro=None, bg=CHARRED):
    """Six icon cards (icon, title, one line)."""
    dark = bg != BONE
    cells = [container("%s / Card %d" % (name, i + 1), [
        widget("icon", "%s / Card %d / Icon" % (name, i + 1), selected_icon=svg(ic), primary_color=AMBER,
               size=px(40), align="left", custom_css="selector .elementor-icon{display:block;line-height:0;}"
                                                    "selector .elementor-icon svg{width:40px;height:40px;}"),
        heading("%s / Card %d / Title (H3)" % (name, i + 1), t, tag="h3", color=BONE if dark else CHARRED,
                typ=typo(family=SERIF, size=26, weight=500, lh=1.15)),
        text("%s / Card %d / Text" % (name, i + 1), "<p>%s</p>" % b, color=DRIFT if dark else BARK, size=15,
             lh=1.7, pretty=False)],
        gap=14, padding=pads((36, 32, 28, 24), (32, 28, 28, 24), (36, 32, 28, 24), (32, 28, 28, 24)),
        background_background="classic", background_color="#1C1814" if dark else "#FBF8F3",
        border_border="solid", border_width=dims(1), border_color="#F2ECE31A" if dark else "#E2D9CC",
        border_radius=dims(6)) for i, (ic, t, b) in enumerate(items)]
    head = [h2(name + " / Title (H2)", h2_html, color=BONE if dark else CHARRED, sizes=H2_INNER, max_w=720)]
    if intro:
        head.append(text(name + " / Intro", "<p>%s</p>" % intro, color=DRIFT if dark else BARK, max_w=620))
    return section(name, [container(name + " / Heading", head, gap=20),
                          grid(name + " / Grid", cells, cols=(3, 3, 2, 1), gap_col=20, gap_row=20,
                               grid_align_items="stretch")], bg=bg, gap=(56, 52, 44, 36))


def photo_strip(name, h2_html, items, bg=BONE, natural=False, cols=None):
    """Grid of captioned photos. natural=True keeps each photo's full frame (before/after composites)."""
    dark = bg != BONE
    n = len(items)
    cells = [container("%s / Photo %d" % (name, i + 1), [
        img("%s / Photo %d / Image" % (name, i + 1), key, None if natural else (300, 280, 200 if n == 4 else 260)),
        text("%s / Photo %d / Caption" % (name, i + 1), "<p>%s</p>" % cap, color=DRIFT if dark else BARK,
             size=14, lh=1.5, pretty=False)], gap=12) for i, (key, cap) in enumerate(items)]
    cols = cols or ((4, 4, 2, 2) if n == 4 else (3, 3, 2, 1) if n == 3 else (2, 2, 2, 1))
    return section(name, [
        h2(name + " / Title (H2)", h2_html, color=BONE if dark else CHARRED, sizes=H2_INNER, max_w=720),
        grid(name + " / Grid", cells, cols=cols, gap_col=20, gap_row=28, grid_align_items="start")],
        bg=bg, gap=(48, 44, 40, 32))


def before_after(name, h2_html, before, after, note, bg=CHARRED):
    """Two photos side by side, labelled Before and After."""
    dark = bg != BONE
    lab = ("selector{position:relative;}selector::after{content:attr(data-label);position:absolute;left:14px;top:14px;"
           "background:rgba(20,17,14,.82);color:#F2ECE3;font:600 13px/1 Manrope,sans-serif;padding:8px 12px;"
           "border-radius:999px;}")
    cells = [img(name + " / " + lbl, key, (460, 380, 300), _attributes="data-label|" + lbl)
             for lbl, key in (("Before", before), ("After", after))]
    for c in cells:
        c["settings"]["custom_css"] = lab + c["settings"]["custom_css"]
    return section(name, [
        container(name + " / Heading", [
            h2(name + " / Title (H2)", h2_html, color=BONE if dark else CHARRED, sizes=H2_INNER, max_w=720),
            text(name + " / Note", "<p>%s</p>" % note, color=DRIFT if dark else BARK, max_w=620)], gap=20),
        grid(name + " / Grid", cells, cols=(2, 2, 2, 1), gap_col=20, gap_row=20)], bg=bg, gap=(48, 44, 40, 32))


def reviews_pair(name, keys, bg=BONE):
    return section(name, [
        h2(name + " / Title (H2)", "<b>What</b> clients say", color=CHARRED if bg == BONE else BONE,
           sizes=H2_INNER, max_w=720),
        grid(name + " / Grid", [bt.review_card("%s / Card %d" % (name, i + 1), k, dark=bg != BONE)
                                for i, k in enumerate(keys)],
             cols=(2, 2, 2, 1), gap_col=24, gap_row=24, grid_align_items="stretch")], bg=bg, gap=(48, 44, 40, 32))


FAQ_CSS = ("<style>.tn-faq{border-top:1px solid #DCD2C4;}"
           ".tn-faq details{border-bottom:1px solid #DCD2C4;}"
           ".tn-faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
           "gap:24px;padding:24px 0;font:500 22px/1.3 Fraunces,Georgia,serif;color:#14110E;}"
           ".tn-faq summary::-webkit-details-marker{display:none;}"
           ".tn-faq summary::after{content:'+';flex:0 0 auto;width:36px;height:36px;border-radius:50%;border:1px solid #C9BFB1;"
           "display:flex;align-items:center;justify-content:center;font:400 22px/1 Manrope,sans-serif;color:#8A5A2B;"
           "transition:transform .25s ease;}"
           ".tn-faq details[open] summary::after{transform:rotate(45deg);}"
           ".tn-faq summary:hover{color:#8A5A2B;}"
           ".tn-faq summary:focus-visible{outline:2px solid #C68B4E;outline-offset:4px;}"
           ".tn-faq .a{padding:0 60px 26px 0;font:400 17px/1.75 Manrope,sans-serif;color:#5B5046;max-width:760px;}"
           ".tn-faq .a a{color:#8A5A2B;text-decoration:underline;text-underline-offset:3px;}"
           "@media (max-width:600px){.tn-faq summary{font-size:19px;padding:20px 0;}.tn-faq .a{padding-right:0;}}</style>")


def faq(name, items, h2_html="<b>Common</b> questions"):
    """Click-to-open questions (native details/summary, keyboard accessible) plus FAQPage schema."""
    import html as _h, re as _re
    body = "".join("<details><summary>%s</summary><div class=\"a\">%s</div></details>" % (q, a) for q, a in items)
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": _h.unescape(q),
         "acceptedAnswer": {"@type": "Answer", "text": _h.unescape(_re.sub("<[^>]+>", "", a))}} for q, a in items]}
    html = (FAQ_CSS + '<div class="tn-faq">' + body + "</div>"
            '<script type="application/ld+json">' + json.dumps(schema) + "</script>")
    return section(name, [grid(name + " / Layout", [
        container(name + " / Heading", [h2(name + " / Title (H2)", h2_html, color=CHARRED, sizes=H2_INNER,
                                           max_w=420)]),
        widget("html", name + " / Questions", html=html)],
        cols=("minmax(0,1fr) minmax(0,1.8fr)",) * 2 + ("1fr", "1fr"), gap_col=(96, 72, 48, 40), gap_row=32,
        grid_align_items="start")], bg=BONE)


def winter_banner(name="Winter Offer"):
    return section(name, [container(name + " / Banner", [
        container(name + " / Text", [
            heading(name + " / Title", "<b>Now scheduling</b> winter interior projects", tag="div", color=BONE,
                    typ=typo(family=SERIF, size=(40, 38, 34, 30), weight=500, lh=1.1)),
            text(name + " / Body", "<p>Book between November 1 and March 31 and receive 10% off interior "
                 "projects.</p>", color=bt.HERO_TEXT, size=17, lh=1.6, max_w=520)], gap=10,
                  css="selector{--width:auto;width:auto;flex:1 1 420px;}"),
        pill(name + " / Button", "Book Your Winter Project", "/request-an-estimate/")],
        direction="row", gap=32, flex_wrap="wrap", flex_align_items="center", flex_justify_content="space-between",
        padding=pads((40, 36, 32, 28), (48, 44, 32, 24), (40, 36, 32, 28), (48, 44, 32, 24)),
        background_background="classic", background_color=SPRUCE, border_radius=dims(8),
        border_border="solid", border_width=dims(1, 1, 1, 6), border_color=AMBER)],
        bg=BONE, pad_top=0, pad_bottom=(96, 88, 72, 64))


def service_v2(slug, crumb, title_html, intro, photo, about_h2, about, bullets=None, about_photo=None,
               cards_=None, steps_=None, strip=None, ba=None, ba_composites=None, reviews=None, faqs=None,
               winter=False):
    """Interior / exterior / log page layout requested by Blake (Markup #17–#22)."""
    others = [x for x in (PAINTING if crumb == "Fine Painting" else STAINING) if x[1] != "/%s/" % slug]
    blocks = [page_hero("Page Header", crumb, title_html, intro, photo),
              prose("About", about_h2, about, bullets, photo=about_photo)]
    if cards_:
        blocks.append(cards(*cards_))
    blocks.append(steps("Process", "<b>How we</b> work", steps_))
    if ba:
        blocks.append(before_after("Before After", *ba))
    if ba_composites:
        blocks.append(photo_strip("Before After", *ba_composites, bg=CHARRED, natural=True))
    if strip:
        blocks.append(photo_strip("Photo Strip", *strip))
    if reviews:
        blocks.append(reviews_pair("Reviews", reviews, bg=CHARRED))
    if faqs:
        blocks.append(faq("FAQ", faqs))
    if winter:
        blocks.append(winter_banner())
    blocks += [related("Related Services", "<b>More</b> %s" % ("painting services" if crumb == "Fine Painting"
                                                              else "log &amp; timber services"), others),
               cta()]
    return page("TN " + slug, blocks)


# ------------------------------------------------------------------ pages
def pages():
    P = {}
    P["interior-painting"] = service_v2(
        "interior-painting", "Fine Painting", "<b>Interior</b> painting",
        "Walls, ceilings, trim and doors painted with careful preparation, two full coats and clean lines, "
        "in homes from Vail to Aspen.",
        ("#33261C", "Photo: finished interior", "tn-stock-vaulted-great-room-painted"),
        "<b>Preparation</b> before a brush is lifted",
        ["Interior painting starts long before the first coat. Furniture and floors are covered and protected. "
         "Walls and ceilings are inspected, and nail holes and cracks are filled and repaired. Baseboards, "
         "windows and frames are taped and caulked.",
         "We prime new drywall and texture, then apply two coats of high-quality paint. In our dry mountain "
         "climate, a single coat can crack, so two coats is our standard."],
        about_photo=("#33261C", "Photo: masked room", "tn-masking-interior"),
        cards_=("What We Paint", "<b>What</b> we paint", [
            ("paint-roller-light", "Walls &amp; vaulted ceilings",
             "Great rooms, high ceilings, two-story foyers and stairwells, finished with even coverage and clean lines."),
            ("door-light", "Trim, doors &amp; millwork", "Baseboards, door casings, crown molding, sills and doors."),
            ("tree-light", "Interior wood &amp; timber",
             "Beams, log accent walls, tongue-and-groove ceilings and clear-coated timber."),
            ("swatches-light", "Accent walls &amp; specialty finishes",
             "Texture, glazes and accent walls that add depth to a room."),
            ("dresser-light", "Cabinets &amp; built-ins",
             "Kitchen cabinets, vanities and shelving, refinished to a smooth, durable surface."),
            ("wall-light", "Drywall repair &amp; texture matching",
             "Patches and settling cracks repaired and blended so they disappear under the new finish.")]),
        steps_=[("Walkthrough &amp; estimate", "We look at the rooms with you, talk through colors and products, and give "
                 "you a clear written estimate."),
                ("Protect", "Floors, furniture and fixtures are covered and masked off, and work areas are sealed with "
                 "plastic where needed."),
                ("Prepare", "Nail holes and cracks are filled, surfaces sanded and caulked, and new drywall primed."),
                ("Apply the finish", "Two coats of premium paint, cut in by hand for crisp lines at ceilings and trim."),
                ("Clean up &amp; walk through", "Rooms are put back the way we found them, and we walk the finished work "
                 "with you.")],
        ba=("<b>Popcorn ceiling</b> to smooth finish",
            "tn-ceiling-during", "tn-ceiling-smooth-beams",
            "The room is fully masked while the old texture comes off. The ceiling is skimmed smooth, primed and "
            "painted, and the beams are left crisp and clean."),
        strip=("<b>Recent</b> interior work", [
            ("tn-doors", "Painted interior doors"),
            ("tn-accent-wall", "Deep plum accent wall"),
            ("tn-stairwell", "Stairwell walls and trim"),
            ("tn-stock-gray-kitchen-cabinets", "Sprayed gray cabinets")]),
        reviews=("cathy", "karen"),
        faqs=[
            ("How long does an interior painting project take?",
             "It depends on the size of the space, ceiling heights and how much repair is needed. A single room is "
             "often a day or two, and a whole home can take a few weeks. Your written estimate includes a schedule."),
            ("Do we need to move out while you paint?",
             "Usually not. We work room by room, keep paths clear and clean up at the end of every day. We use low-odor "
             "paints, and for whole-home projects some clients choose to be away for a few days."),
            ("Do you move the furniture?",
             "Yes. We move and cover furniture and put it back when we're done. We ask you to put away small valuables, "
             "artwork and anything fragile before we start."),
            ("Can you help us choose colors?",
             "Yes. We can talk through options with you and put samples on your walls, so you see them in your own light "
             "before you decide."),
            ("What paint do you use?",
             "Premium coatings from manufacturers including Sherwin-Williams and Benjamin Moore, chosen for the surface "
             "and the room. Two full coats is our standard."),
            ("Is the work guaranteed?",
             "Yes. Our work is backed by a two-year written warranty."),
            ("Do you offer financing?",
             'Yes. We offer financing through Hearth. <a href="/financing/">See financing options</a>.'),
            ("When is the best time for interior painting?",
             "Any time of year works, but winter is ideal: schedules are flexible and many homes are quiet. Book between "
             "November 1 and March 31 and receive 10% off interior projects.")],
        winter=True)

    P["exterior-painting"] = service_v2(
        "exterior-painting", "Fine Painting", "<b>Exterior</b> painting",
        "Exterior painting and staining built for intense sun, dry air and hard winters, through the Vail, "
        "Roaring Fork and Grand valleys.",
        ("#222B25", "Photo: finished exterior", "tn-ext-gray-repaint"),
        "<b>A finish</b> that holds up at altitude",
        ["Mountain sun breaks down coatings faster than almost anywhere else. We don't skimp on materials or "
         "surface preparation, and we follow each manufacturer's recommendations so your finish looks good "
         "and lasts.",
         "Not sure about color? We'll help you choose, taking the light, the setting and the weather into "
         "account. A dedicated project lead oversees the work from start to finish."],
        bullets=["Siding, trim, fascia, doors and garage doors", "Masking and protection of everything around the work",
                 "Spraying with back-brushing for a proper bond", "Color consultation",
                 "Daily cleanup, with nothing left behind"],
        cards_=("What We Paint", "<b>What</b> we paint", [
            ("house-line-light", "Siding &amp; trim", "Lap, board-and-batten and shingle siding, with crisp trim lines."),
            ("garage-light", "Doors &amp; garage doors", "Entry doors, garage doors and shutters, finished to stand up to sun and snow."),
            ("ruler-light", "Fascia, soffits &amp; eaves", "The high, hard-to-reach details that frame the whole house."),
            ("drop-light", "Stain &amp; clear coats", "Solid and semi-transparent stains for wood siding, beams and accents."),
            ("palette-light", "Color consultation", "Help choosing colors that suit the home, the light and the setting."),
            ("shield-check-light", "Prep &amp; protection", "Washing, scraping, caulking and priming, with windows, roofs and plants masked off.")]),
        steps_=[("Walkthrough &amp; estimate", "We look at the whole exterior with you and give you a clear written estimate."),
                ("Protect", "Windows, doors, roofs, decks and landscaping are masked and covered before any spraying."),
                ("Prepare", "Surfaces are washed, scraped, sanded, caulked and primed to the manufacturer's specifications."),
                ("Apply the finish", "Premium coatings sprayed and back-brushed, or brushed and rolled, for a proper bond."),
                ("Clean up &amp; walk through", "Masking comes off, the site is cleaned and we walk the finished work with you.")],
        ba=("<b>Before</b> &amp; after", "tn-ext-before", "tn-ext-after",
            "A dated exterior refreshed with clean white siding, navy shutters and a matching garage door."),
        strip=("<b>Recent</b> exterior work", [
            ("tn-ext-gray-garage", "Dark gray repaint with black garage doors"),
            ("tn-ext-after-front", "White and navy front elevation"),
            ("tn-masking-railing", "Railings masked before spraying")]),
        reviews=("kathy", "clifford"),
        faqs=[
            ("When is the best time of year for exterior painting?",
             "Late spring through early fall, when temperatures stay within the paint manufacturer's range. We schedule "
             "around the weather and keep you updated if a storm moves in."),
            ("How long will an exterior paint job last up here?",
             "It depends on exposure. South- and west-facing walls take the most sun and wear fastest. Good preparation "
             "and premium products make the biggest difference, and we'll tell you honestly what to expect."),
            ("Do you protect landscaping and outdoor surfaces?",
             "Yes. Plants, decks, roofs, windows and anything else near the work are covered and masked before we spray, "
             "and we clean up every day."),
            ("Do I need to be home during the work?",
             "No. Many of our clients are away. We coordinate access with you or your property manager and send progress "
             "photos along the way.")])

    P["specialty-finishes-interior-wood"] = service(
        "specialty-finishes-interior-wood", "Fine Painting", "<b>Specialty finishes</b> &amp; interior wood",
        "Trim, doors, stairs, accent walls and interior wood, finished with the patience detailed work needs.",
        ("#3A281B", "Photo: stained interior wood", "tn-timber-ceiling-interior"),
        "<b>Detail</b> work, done carefully",
        ["The details are what people notice: crisp lines on an accent wall, custom colors on a staircase, "
         "an even, lasting finish on beams, ceilings and paneling. We take the same care with preparation "
         "here as we do on a whole house.",
         "Our background is log and timber, so we know how wood takes stain and clear coats, and how to "
         "keep a finish consistent across a room."],
        ["Trim, doors and built-ins", "Stairs and railings in custom colors", "Accent walls",
         "Staining and clear finishes on beams, ceilings and paneling", "Interior log walls"],
        quote_=("Excellent job! They were on time, professional, clean and did an excellent job on my accent "
                "wall. Very clean lines.", "Karen H. · Gypsum"))

    P["commercial-hoa"] = service(
        "commercial-hoa", "Fine Painting", "<b>Commercial</b> &amp; HOA",
        "Interior and exterior painting and staining for commercial buildings, lodging and homeowner "
        "associations, scheduled around the people who use them.",
        ("#222B25", "Photo: commercial or HOA building", None),
        "<b>Planned</b> around your residents and guests",
        ["Commercial and association work comes with schedules, budgets and boards to answer to. We give you "
         "a clear written scope and estimate, realistic timelines, and one point of contact who keeps you "
         "updated.",
         "Our parent company has built some of the largest log and timber resorts in the Vail and Aspen "
         "valleys, so we're at home on big, complex buildings."],
        ["Exterior repaints and restains", "Common areas, hallways and lobbies",
         "Log and timber buildings and resorts", "Work phased to keep buildings open",
         "Written scope and estimate for board approval"])

    P["log-home-staining-restoration"] = service_v2(
        "log-home-staining-restoration", "Log &amp; Timber Staining",
        "<b>Log home staining</b> &amp; restoration",
        "Top Notch Painting is a division of Top Notch Logworks, which has built log and timber homes and "
        "resorts here since 1999. We know what it takes to make a log finish last.",
        ("#3A281B", "Photo: stained log home", "tn-log-home-stained-exterior"),
        "<b>It's all about</b> the prep",
        ["If you want your home to look its best and get the longest life from a finish, everything depends "
         "on how the logs are prepared before any stain goes on. Skipping prep cuts the life of a finish "
         "short, and you end up paying to refinish sooner.",
         "Colorado's dry climate doesn't protect logs. Intense UV breaks down finishes and wood, letting "
         "moisture in. We use products from Sashco and Perma-Chink, made specifically for log and timber "
         "homes, and we're trained and certified to apply them."],
        bullets=["Media blasting to remove old, failing finishes", "Chemical cleaning and brightening",
                 "Sanding and stripping where needed", "Color samples on your own logs before you choose",
                 "Preservatives, stains and topcoats from Sashco and Perma-Chink"],
        cards_=("What We Do", "<b>What</b> we do", [
            ("spray-bottle-light", "Media blasting", "Old, failing finishes stripped back to clean wood so new stain can soak in."),
            ("sparkle-light", "Cleaning &amp; brightening", "Graying and mildew removed so the wood's natural color comes back."),
            ("paint-brush-light", "Stain &amp; topcoat", "Preservative, stain and topcoat applied to the manufacturer's specifications."),
            ("wall-light", "Chinking &amp; sealing", "Gaps and checks sealed against drafts, moisture and pests."),
            ("hammer-light", "Rot repair", "Damaged log ends and beams cut out, replaced and treated."),
            ("calendar-check-light", "Maintenance coats", "Regular touch-up coats that keep a finish strong, so small jobs stay small.")]),
        steps_=[("Inspect", "We look at the whole home: finish condition, checks, chinking and any signs of rot."),
                ("Protect", "Windows, doors, roofs and landscaping are masked and covered before blasting or staining."),
                ("Prepare", "Media blasting, cleaning, brightening and sanding take the logs back to clean wood."),
                ("Stain &amp; seal", "Preservative, stain and topcoat applied to the manufacturer's specifications."),
                ("Maintain", "We tell you honestly when the next maintenance coat is due.")],
        ba_composites=("<b>Before</b> &amp; after", [
            ("tn-log-before-after-1", "Weathered logs brought back to a rich, even finish"),
            ("tn-log-before-after-2", "Gray, faded logs restained and sealed")]),
        strip=("<b>Recent</b> log &amp; timber work", [
            ("tn-log-home-restained", "Large log home after restaining"),
            ("tn-log-cabin-chinked", "Restored cabin with new chinking"),
            ("tn-masking-log-windows", "Windows masked before staining"),
            ("tn-crew-log-wall", "Crew staining and sealing a log wall")]),
        reviews=("lee", "hervey"),
        faqs=[
            ("How often should a log home be restained?",
             "It depends on sun exposure and the product used. South- and west-facing walls need attention first. "
             "Regular maintenance coats extend the life of a finish and cost far less than a full restoration."),
            ("Why do you media blast?",
             "A new finish only lasts if it bonds to clean wood. Blasting removes old, failing stain and weathered wood "
             "fibers without soaking the logs, so the new finish soaks in properly."),
            ("Can you match our current color?",
             "Yes. We apply samples on your own logs so you can see the color in place before you choose."),
            ("Do you check on the home after the work is done?",
             "Yes. We'll tell you when maintenance is due, and we're happy to come back and look at the home so small "
             "problems never become big ones.")])

    P["chinking-check-sealing"] = service(
        "chinking-check-sealing", "Log &amp; Timber Staining", "<b>Chinking</b> &amp; check sealing",
        "Seal out drafts, moisture and pests. Top Notch is one of the leading chinking applicators in the "
        "Vail and Aspen valleys.",
        ("#33261C", "Photo: chinking detail", "tn-log-home-stained-windows"),
        "<b>A tighter,</b> more comfortable home",
        ["Many log homes were never built tightly, or have opened up as they settled. The result is drafts "
         "and pests: bugs, bats and mice. We find where air is getting in and seal it, using rodent-proofing "
         "copper wool and synthetic chinking.",
         "We use Perma-Chink and Sashco Log Jam, two of the best chinking products made, and apply them to "
         "the manufacturer's specifications. Our goal is zero failures. Upward-facing checks (cracks in the "
         "logs) are sealed too, so water can't collect and start rot."],
        ["Finding air leaks, including with thermal imaging", "Rodent-proofing with copper wool",
         "New chinking and repair of failed chinking", "Sealing upward-facing checks",
         "Perma-Chink and Sashco Log Jam products"])

    P["rot-repair-prevention"] = service(
        "rot-repair-prevention", "Log &amp; Timber Staining", "<b>Rot repair</b> &amp; prevention",
        "Left alone, rot can spread into framing and cause major structural damage. We find it, repair it "
        "and stop it coming back.",
        ("#3A281B", "Photo: rot repair on a log end", "tn-log-home-deck"),
        "<b>Stop rot</b> at the source",
        ["Wood rot is caused by decay fungi, which need oxygen, heat, food and moisture. We can't change the "
         "first two, so we take away the other two. Borate preservatives treat the wood so the fungi can't "
         "feed on it.",
         "Borates wash out over time, so we keep the wood dry as well: copper caps on exposed log ends and "
         "post tops, and flashing on beams. When wood is too far gone, we replace it. Our parent company "
         "builds log homes, so structural log and beam replacement is part of what we do."],
        ["Inspection for hidden rot", "Borate preservative treatment",
         "Copper caps on log ends and post tops, flashing on beams",
         "Replacement of rotted logs, beams and deck framing"],
        steps_=[("Find it", "Rot often hides under a sound-looking surface. We probe and inspect the areas most at risk."),
                ("Repair it", "Damaged wood is cut out and replaced, from a single log end to a structural beam."),
                ("Treat it", "Borate preservatives protect the surrounding wood from decay."),
                ("Keep it dry", "Copper caps, flashing and a good finish keep water out, so the borates stay put.")],
        more=before_after("Before After", "<b>Found</b> and fixed", "tn-rot-before", "tn-rot-after",
                          "Rot hidden inside a log, cut out and replaced with sound wood before the home was restained."),
        quote_=("They took an old, rotting deck and restored it so beautifully that we will be able to enjoy it "
                "for decades to come.", "Hervey L., architect · Grand Lake"))

    P["deck-staining"] = service(
        "deck-staining", "Log &amp; Timber Staining", "<b>Deck</b> staining",
        "Decks take more sun, snow and foot traffic than any other part of the house. We restore them and "
        "keep them looking good.",
        ("#3A281B", "Photo: stained deck", "tn-stained-deck-rail"),
        "<b>Restore,</b> then protect",
        ["A deck finish only lasts if the wood underneath is sound and clean. We repair what needs it, take "
         "off old, failing stain, and prepare the boards so the new finish soaks in properly.",
         "Then we apply a penetrating stain suited to the wood and the exposure, and tell you when it'll need "
         "a maintenance coat."],
        ["Cleaning and stripping old finishes", "Sanding and board replacement",
         "Rot repair on boards, beams and posts", "Penetrating stain on decks, railings and stairs",
         "Maintenance coats to keep it looking new"])

    P["media-blasting"] = service(
        "media-blasting", "Log &amp; Timber Staining", "<b>Media</b> blasting",
        "The best way to take a log home back to clean, bright wood before it's restained.",
        ("#33261C", "Photo: media blasting a log wall", "tn-media-blasting-log-wall"),
        "<b>Back to</b> clean wood",
        ["Old, damaged finishes have to come off before a new one can last. Media blasting strips them away "
         "and opens up the wood so new stain penetrates and bonds.",
         "It's messy work, so we protect your home thoroughly. Interiors stay sealed off and protected, and "
         "we clean up completely when we're done."],
        ["Removing failed stains and finishes", "Opening up weathered wood before restaining",
         "Full protection of windows, doors and interiors", "Followed by staining and sealing"],
        quote_=("We knew that blasting the old finish would be a messy task. Your team was efficient and detail "
                "oriented in making sure the interior living space was not affected.", "Lee F. · Gypsum"))

    # ----- Our Work
    # Painting (finished exteriors first, then interiors) alternating with log & timber staining.
    painting = [("tn-ext-after", "Exterior repaint, white with navy shutters"),
                ("tn-ext-gray-repaint", "Dark gray exterior repaint"),
                ("tn-ext-gray-garage", "Gray repaint with black garage doors"),
                ("tn-ext-after-front", "Front elevation after repaint"),
                ("tn-ceiling-smooth-beams", "Popcorn ceiling to smooth finish"),
                ("tn-accent-wall", "Deep plum accent wall"),
                ("tn-stairwell", "Stairwell walls and trim"),
                ("tn-gray-cabinets", "Sprayed gray cabinets"),
                ("tn-ceiling-smooth-3", "Smooth ceiling with stained beams"),
                ("tn-ceiling-smooth-2", "Smooth ceiling and fresh walls"),
                ("tn-masking-interior", "Room masked before painting"),
                ("tn-doors", "Painted interior doors")]
    staining = [("tn-log-home-winter", "Log home restain"),
                ("tn-log-home-restained", "Large log home after restaining"),
                ("tn-log-home-stained-exterior", "Log home and wraparound deck"),
                ("tn-covered-deck-log-rail", "Covered deck and log railing"),
                ("tn-log-home-stained-windows", "Log and timber home"),
                ("tn-timber-ceiling-interior", "Stained timber ceiling"),
                ("tn-log-cabin-chinked", "Restored cabin with new chinking"),
                ("tn-log-stair-interior", "Log staircase"),
                ("tn-stained-deck-rail", "Deck and rail restain"),
                ("tn-log-home-garage", "Stained log home and garage"),
                ("tn-media-blasting-log-wall", "Media blasting"),
                ("tn-log-wall-long", "Long log wall, freshly stained")]
    order = [x for pair in zip(painting, staining) for x in pair]
    tiles = [container("Gallery / Photo %d" % (i + 1), [
        img("Gallery / Photo %d / Image" % (i + 1), key, (320, 280, 170)),
        text("Gallery / Photo %d / Caption" % (i + 1), "<p>%s</p>" % cap, color=DRIFT, size=13, lh=1.4,
             pretty=False)], gap=10) for i, (key, cap) in enumerate(order)]
    P["our-work"] = page("TN our-work", [
        page_hero("Page Header", "Our Work", "<b>Our</b> work",
                  "Painting, staining and restoration on homes across the Vail and Roaring Fork valleys."),
        section("Gallery", [grid("Gallery / Grid", tiles, cols=(3, 3, 2, 2), gap_col=(16, 16, 16, 10),
                                  gap_row=(16, 16, 16, 10))],
                bg=CHARRED, pad_top=0),
        related("Project Stories Link", "<b>Project</b> stories",
                [("Read the stories behind our projects", "/project-stories/"),
                 ("See what clients say", "/reviews/")]),
        cta()])

    stories = [
        ("Log home refinish", "Log &amp; timber staining · Gypsum", "#3A281B",
         "The owners bought their log home knowing it would need refinishing. We media blasted the old finish, "
         "applied a few colors to the logs so they could choose, and finished inside the schedule their "
         "home-based business needed. The interior was protected throughout.",
         "We never imagined our home could look as beautiful and transformed as it does today.", "Lee F."),
        ("Deck restoration and rot repair", "Rot repair · Grand Lake", "#222B25",
         "An old deck with rot in the structure. We replaced the damaged wood, treated what remained and "
         "restored the finish. The project came in under the original estimate.",
         "They took an old, rotting deck and restored it so beautifully that we will be able to enjoy it for "
         "decades to come.", "Hervey L., architect"),
        ("Interior repaint", "Interior painting · Eagle", "#33261C",
         "A whole-home interior repaint, run to a budget and finished on schedule by a tidy, efficient crew.",
         "Oto and his crew were wonderful. They were efficient, professional and very conscious of our budget.",
         "Cathy D."),
    ]
    story_blocks = []
    for i, (t, meta, col, body, q, who) in enumerate(stories):
        story_blocks.append(section("Story %d" % (i + 1), [grid("Story %d / Layout" % (i + 1), [
            photo_slot("Story %d / Photo" % (i + 1), col, (460, 420, 340, 280), "Photo: " + t.lower()),
            container("Story %d / Text" % (i + 1), [
                eyebrow("Story %d" % (i + 1), meta, AMBER if i % 2 == 0 else bt.DEEP),
                h2("Story %d / Title (H2)" % (i + 1), t, color=BONE if i % 2 == 0 else CHARRED,
                   sizes=H2_INNER, max_w=560),
                text("Story %d / Text" % (i + 1), "<p>%s</p>" % body, color=DRIFT if i % 2 == 0 else BARK,
                     max_w=560),
                text("Story %d / Quote" % (i + 1), "<p>“%s”</p><p><strong>%s</strong></p>" % (q, who),
                     color=BONE if i % 2 == 0 else CHARRED, size=(22, 21, 20, 19), lh=1.45, para_gap=12,
                     max_w=560, typography_font_family=SERIF,
                     custom_css="selector strong{font-family:Manrope,sans-serif;font-size:14px;font-weight:600;}")],
                gap=20)], cols=(2, 2, 1, 1), gap_col=(96, 80, 56, 40), gap_row=40,
            grid_align_items="center")], bg=CHARRED if i % 2 == 0 else BONE))
    P["project-stories"] = page("TN project-stories", [
        page_hero("Page Header", "Our Work", "<b>Project</b> stories",
                  "A closer look at a few recent jobs: what the home needed, how we approached it, and what the "
                  "owners thought.")] + story_blocks + [cta()])

    # ----- For Builders (with bid form)
    est = bt.estimate_section("estimate-page")
    form = None
    for el, _ in bt.walk(est):
        if el.get("widgetType") == "form":
            form = copy.deepcopy(el)
    form["id"] = eid()
    fs = form["settings"]
    f = lambda cid, typ, label, req="true", w="50", **x: dict({"_id": eid(), "custom_id": cid, "field_type": typ,
                                                               "field_label": label, "required": req, "width": w,
                                                               "width_mobile": w}, **x)
    fs.update(form_name="Builder Bid - For Builders page", form_id="tn-bid-form",
              button_text="Request a Bid", email_subject="New builder bid request (For Builders page)",
              form_fields=[f("company", "text", "Company"), f("name", "text", "Name"),
                           f("phone", "tel", "Phone"), f("email", "email", "Email"),
                           f("location", "text", "Project location"),
                           f("start", "select", "Expected start", field_options="Choose one|\nWithin 3 months\n"
                             "3 to 6 months\n6 to 12 months\nMore than a year"),
                           f("scope", "select", "Scope", w="100", field_options="Choose one|\nInterior painting\n"
                             "Exterior painting and staining\nLog and timber staining\nChinking and sealing\n"
                             "Specialty finishes\nMultiple / full scope"),
                           f("details", "textarea", "Project details or a link to plans", req="", w="100", rows=4)])
    bid = section("Bid", [grid("Bid / Panel", [
        container("Bid / Text", [
            h2("Bid / Title (H2)", "<b>Request</b> a bid", sizes=H2_INNER, max_w=480),
            text("Bid / Text", "<p>Send us the basics and we'll be in touch within one business day. Plans, "
                 "specs and finish schedules help us price accurately.</p>", color=bt.HERO_TEXT, max_w=460),
            container("Bid / Call", [
                heading("Bid / Call / Label", "Prefer to talk?", tag="div", color=DRIFT,
                        typ=typo(size=14, weight=400, lh=1.5)),
                heading("Bid / Call / Phone", PHONE, tag="div", color=BONE,
                        typ=typo(family=SERIF, size=40, weight=500, lh=1.2), link=bt.link(TEL),
                        title_hover_color=bt.AMBER_HOVER, _css_classes="tn-call")], gap=6)],
            gap=28, padding=pads((72, 65, 49, 40), (64, 58, 44, 28), (72, 65, 49, 40), (64, 58, 44, 28)),
            background_background="classic", background_color=CHARRED),
        container("Bid / Form Half", [form], background_background="classic", background_color=BONE,
                  padding=pads((72, 65, 49, 40), (64, 58, 44, 28), (72, 65, 49, 40), (64, 58, 44, 28)))],
        cols=(2, 2, 1, 1), gap_col=0, gap_row=0,
        css="selector{border-radius:6px;overflow:hidden;box-shadow:0 48px 96px -48px rgba(0,0,0,0.7);}")],
        bg=EST_BROWN, _element_id="bid",
        **(dict(bt.wood_texture(EST_BROWN, 0.65), background_attachment="fixed") if bt.TEXTURE else {}))
    P["for-builders"] = page("TN for-builders", [
        page_hero("Page Header", "For Builders", "<b>Built</b> by builders",
                  "Our parent company, Top Notch Logworks, builds log and timber homes. We understand construction "
                  "schedules, and we finish new work the way it should be finished.",
                  ("#3A281B", "Photo: new log home under construction", "tn-timber-frame-construction")),
        prose("Why Builders", "<b>A finishing partner</b> who speaks your language",
              ["We work in partnership with architects, builders and general contractors on new homes and "
               "remodels. Painting, staining, preservative treatment and chinking on new log and timber work "
               "is exactly what our team does every day.",
               "You get a clear written bid, a crew that shows up when scheduled, and one point of contact who "
               "coordinates with your superintendent."],
              ["Interior and exterior painting on new construction", "Log and timber staining and preservatives",
               "Chinking and sealing on new log homes", "Specialty finishes and interior wood",
               "Work sequenced around other trades"]),
        quote("Builder Quote", "They have performed in an expedient manner and have produced an exceptional "
              "product at a fair price.", "David M., project manager · Aspen Construction"),
        bid])

    # ----- About pages
    P["our-story"] = page("TN our-story", [
        page_hero("Page Header", "About", "<b>Our</b> story",
                  "Top Notch Painting is the painting and finishing division of Top Notch Logworks, employee "
                  "owned and based in Gypsum, Colorado.",
                  ("#33261C", "Photo: the Top Notch crew", "tn-crew-staining-log-home")),
        prose("Since 1999", "<b>Builders</b> first",
              ["Top Notch Logworks has been building some of the largest log and timber homes and resorts in "
               "the Aspen and Vail valleys since 1999. That experience gave us a deep understanding of how "
               "mountain homes are built, how they move, and what high altitude, dry air and intense sun do to "
               "a finish.",
               "Top Notch Painting grew out of that work. Our management team has more than 100 years of "
               "combined experience in the log and timber industry, and our office and production yard are in "
               "Gypsum, at 4722 Hwy US-6."],
              photo=("#3A281B", "Photo: the Gypsum yard", None)),
        prose("Employee Owned", "<b>Employee</b> owned",
              ["We're an employee-owned company. That helps us keep skilled people, the ones with the know-how "
               "to make a finish last, and it means the person working on your home has a stake in doing it "
               "right.",
               "Our goal is to transform the experience of everyone who deals with us: clients, employees and "
               "vendors alike. We believe ethical practice and strong partnerships matter as much as quality "
               "work."], bg=CHARRED, photo=("#222B25", "Photo: crew at work", "tn-media-blasting-log-wall"), flip=True),
        prose("Giving Back", "<b>Improving</b> where we live",
              ["We match employee donations to charities up to $500 per employee each year. Through our Dollars "
               "for Doers program, when an employee or their family gives 30 or more volunteer hours to a "
               "nonprofit in a year, we donate $500 to that organization. We encourage local causes that make "
               "our own communities better."]),
        related("About Links", "<b>Learn</b> more", [("Core Values", "/core-values/"), ("Reviews", "/reviews/"),
                                                     ("Service Area", "/areas-we-serve/"),
                                                     ("For Builders", "/for-builders/")]),
        cta()])

    values = [
        ("Ethical practice", "We started on the principle of “do the right thing.” Paying vendors promptly, being "
         "clear with clients about value, and treating others how we want to be treated."),
        ("Team development", "Making each other better. Leaders lead by example, and everyone, from the office "
         "to the crew, is a teammate whose role matters."),
        ("Long-lasting partnerships", "We've worked with many of the same clients and vendors for decades. "
         "A good reputation goes a long way, and we keep it by acting with integrity."),
        ("Community enhancement", "Improve where we live. We favor local and small businesses as vendors and "
         "support employees who give back to their communities."),
        ("Positive outcomes", "Our goal is a good outcome for everyone. When that isn't possible, we work toward "
         "the best result available for all parties."),
        ("Better life quality", "We care about our people's long-term wellbeing. As an employee-owned company we "
         "invest in retirement plans and share in the success of profitable jobs."),
    ]
    icons = ["shield-check-light", "user-circle-check-light", "certificate-light", "hammer-light",
             "paint-roller-light", "paint-bucket-light"]
    cells = []
    for (t, b), ic in zip(values, icons):
        cells.append(container("Values / %s" % t, [
            widget("icon", "Values / %s / Icon" % t, selected_icon=svg(ic), primary_color=AMBER, size=px(44),
                   align="left", custom_css="selector .elementor-icon{display:block;line-height:0;}"
                                            "selector .elementor-icon svg{width:44px;height:44px;}"),
            heading("Values / %s / Title (H3)" % t, t, tag="h3", color=BONE,
                    typ=typo(family=SERIF, size=28, weight=500, lh=1.15)),
            text("Values / %s / Text" % t, "<p>%s</p>" % b, color=SPRUCE_TEXT, size=15, lh=1.75, max_w=360,
                 pretty=False)], gap=18))
    P["core-values"] = page("TN core-values", [
        page_hero("Page Header", "About", "<b>Core</b> values",
                  "We hire people who already live these values. They shape how we treat clients, vendors and "
                  "each other."),
        section("Values", [grid("Values / Grid", cells, cols=(3, 3, 2, 1), gap_col=0, gap_row=0,
                                css=bt.WHY_GRID_LINES)], bg=SPRUCE),
        related("About Links", "<b>Learn</b> more", [("Our Story", "/our-story/"), ("Reviews", "/reviews/")]),
        cta()])

    reviews = [
        ("Very reliable. They came on time and finished in the agreed time. They were very professional. The "
         "customer service was great. Hire these guys, you will not be disappointed!", "Kathy A.", "Gypsum",
         "Exterior painting"),
        ("The crew did a thorough job with the entire project, from the estimate, work and follow-up. They went "
         "above my expectations and gave me great information on options and things I could do myself.",
         "Clifford G.", "Morrison", "Exterior painting"),
        ("Excellent job! They were on time, professional, clean and did an excellent job on my accent wall. "
         "Very clean lines.", "Karen H.", "Gypsum", "Accent wall"),
        ("Oto and his crew were wonderful. They were efficient, professional and very conscious of our budget. "
         "We would absolutely use them again.", "Cathy D.", "Eagle", "Interior painting"),
        ("As promised, the work done on our house not only met and exceeded our expectations in quality and "
         "appearance but it was completed within the time frame that was proposed.", "Lee F.", "Gypsum",
         "Log home refinishing"),
        ("Reliable, honest, resourceful and efficient. The total project came in $1,300 under their original "
         "estimate!", "Hervey L., architect", "Grand Lake", "Deck restoration and rot repair"),
    ]
    rcells = []
    for i, (q, who, town, job) in enumerate(reviews, 1):
        rcells.append(container("Reviews / Review %d" % i, [
            bt.stars("Reviews / Review %d / Stars" % i, AMBER, 14, 2),
            text("Reviews / Review %d / Quote" % i, "<p>“%s”</p>" % q, color=CHARRED, size=(20, 19, 19, 18),
                 lh=1.5, typography_font_family=SERIF, pretty=False),
            text("Reviews / Review %d / Who" % i, "<p><strong>%s</strong> · %s<br>%s</p>" % (who, town, job),
                 color=BARK, size=14, lh=1.6, pretty=False,
                 custom_css="selector strong{color:#14110E;font-weight:600;}")],
            gap=18, padding=pads((40, 36, 32, 28), (36, 32, 28, 24), (40, 36, 32, 28), (36, 32, 28, 24)),
            background_background="classic", background_color="#FBF8F3",
            border_border="solid", border_width=dims(1), border_color="#E2D9CC", border_radius=dims(6)))
    P["reviews"] = page("TN reviews", [
        page_hero("Page Header", "About", "<b>What our</b> clients say",
                  "4.9 stars from 19 reviews on HomeAdvisor, 5.0 on Google, and an A+ with the BBB."),
        section("Reviews", [grid("Reviews / Grid", rcells, cols=(3, 3, 2, 1), gap_col=24, gap_row=24)],
                bg=BONE),
        cta(title_html="<b>Join</b> our happy clients")])

    areas = [
        ("Vail Valley", ["Vail", "Beaver Creek", "Avon", "Edwards", "Eagle", "Gypsum"]),
        ("Roaring Fork Valley", ["Aspen", "Snowmass", "Basalt", "Carbondale", "Glenwood Springs"]),
        ("Summit County &amp; beyond", ["Breckenridge", "Telluride", "and the Grand Valley"]),
    ]
    acells = [container("Areas / %s" % a, [
        heading("Areas / %s / Title (H3)" % a, a, tag="h3", color=BONE,
                typ=typo(family=SERIF, size=30, weight=500, lh=1.15)),
        text("Areas / %s / Towns" % a, "<ul>%s</ul>" % "".join("<li>%s</li>" % t for t in towns), color=BONE,
             size=16, lh=1.55, weight=500, pretty=False, custom_css=TICKS_CSS)], gap=20) for a, towns in areas]
    P["areas-we-serve"] = page("TN areas-we-serve", [
        page_hero("Page Header", "Service Area", "<b>Where</b> we work",
                  "From our yard in Gypsum we serve homes and businesses across the Vail, Roaring Fork and Grand "
                  "valleys."),
        section("Areas", [grid("Areas / Grid", acells, cols=(3, 3, 3, 1), gap_col=(64, 56, 40, 0),
                               gap_row=48)], bg=SPRUCE),
        prose("Not Listed", "<b>Don't see</b> your town?",
              ["If you're nearby, give us a call. We often travel for the right project, especially log home "
               "restoration."]),
        cta()])

    P["financing"] = page("TN financing", [
        page_hero("Page Header", "Financing", "<b>Financing</b> options",
                  "We work with Hearth to offer financing on painting and staining projects, so you can do the "
                  "work now and pay over time."),
        section("Financing", [container("Financing / Content", [
            h2("Financing / Title (H2)", "<b>Check your</b> rates", color=CHARRED, sizes=H2_INNER, max_w=640),
            text("Financing / Text", "<p>See loan options from Hearth's lending partners in a few minutes. Checking "
                 "your rates won't affect your credit score. We also accept checks and credit cards.</p>",
                 color=BARK, max_w=600),
            pill("Financing / Get my rates", "Get My Rates",
                 "https://app.gethearth.com/partners/top-notch-logworks-inc?utm_campaign=18157&utm_content="
                 "darkblue&utm_medium=contractor-website&utm_source=contractor&utm_term=700x110",
                 link=dict(bt.link("https://app.gethearth.com/partners/top-notch-logworks-inc?utm_campaign="
                                   "18157&utm_content=darkblue&utm_medium=contractor-website&utm_source="
                                   "contractor&utm_term=700x110"), is_external="on", nofollow="on"))],
            gap=24)], bg=BONE),
        cta()])
    return P


SLUG_TITLES = {
    "interior-painting": "Interior Painting", "exterior-painting": "Exterior Painting",
    "specialty-finishes-interior-wood": "Specialty Finishes & Interior Wood", "commercial-hoa": "Commercial & HOA",
    "log-home-staining-restoration": "Log Home Staining & Restoration",
    "chinking-check-sealing": "Chinking & Check Sealing", "rot-repair-prevention": "Rot Repair & Prevention",
    "deck-staining": "Deck Staining", "media-blasting": "Media Blasting", "our-work": "Our Work",
    "project-stories": "Project Stories", "for-builders": "For Builders", "our-story": "Our Story",
    "core-values": "Core Values", "reviews": "Reviews", "areas-we-serve": "Service Area", "financing": "Financing",
}


def main():
    bt.main()                      # rebuild header/footer/home first so element ids never collide
    os.makedirs(OUT, exist_ok=True)
    P = pages()
    assert set(P) == set(SLUG_TITLES)
    for slug, doc in P.items():
        bt.validate(doc)
        with open(os.path.join(OUT, slug + ".json"), "w") as fh:
            json.dump(doc, fh, indent=1, ensure_ascii=False)
        print("wrote pages/%s.json" % slug, sum(1 for t in doc["content"] for _ in bt.walk(t)), "elements")


if __name__ == "__main__":
    main()
