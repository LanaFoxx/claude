# Top Notch Painting: Homepage Build (Elementor)

## The job

Build the approved homepage concept for topnotch-painting.com as Elementor templates that import cleanly into WordPress (Hello Elementor theme, Elementor Pro, Flexbox Containers enabled).

Top Notch Painting is the painting and log-home staining division of Top Notch Logworks (Gypsum, CO; Vail to Aspen; building since 1999). This homepage is the first piece of a ~26-page rebuild. The header, footer and mobile call bar you build here will be reused on every page, and the same look carries over to topnotch-logworks.com later, so build them cleanly.

**The look is minimal and editorial.** Big photos, generous space, serif headlines, short copy. There are **no bordered panels, no outlined buttons, no chip/tag buttons and no all-caps section labels**. The only icons beyond arrows and the phone glyph are the six Phosphor Light icons in Why Top Notch and the two social icons in the top bar. Only one card exists on the page: the estimate form card (light, borderless, 4px radius). If anything else in your build looks like a box around content, it's wrong.

## Files in this folder

- `top-notch-homepage-reference.html`: the approved design and the source of truth for layout, copy, colors, type, spacing and responsive behavior. Open it in a browser at 1440, 1360, 980, 600 and 390px wide before you start, and match it exactly.
- `Top_Notch_Painting_Website_Build_Scope_Final.docx` (if present): the client's full brief. Use it for context only. On design, the reference file wins.

### Section files (these override the descriptions further down)

Three sections have been redesigned since the main description was written. Each has its own standalone reference file with build notes in a comment at the top. **Where a section file exists, build that section from the file, not from the description below.**

| Section | File | Layout |
|---|---|---|
| What We Do (under the hero) | `what-we-do-option-e.html` | Giant words: two lined-up columns inside the content width, a huge "Painting" / "Staining" word overlapping the bottom of each photo. Not full width. Replaces the earlier split screen (`what-we-do-option-a.html`, delete it if present) |
| Featured Projects | `featured-projects-option-c.html` | Project index: list of names on the left, one photo on the right that swaps |
| Estimate / winter offer | `estimate-option-d.html` | One split panel on the fixed wood background, filled form fields |

`top-notch-homepage-reference.html` already shows the new What We Do and Estimate sections in place. Its Featured Projects section is still the old three-photo row, so use `featured-projects-option-c.html` for that one.

**Standing layout rule:** when two blocks sit side by side, their headings must run the same number of lines. Never let one heading wrap to 2 lines while its neighbor is 1 line. Shrink both together or keep both on one line.

## Deliverables (save to `/output`)

1. `tn-header.json`: Theme Builder **Header** template.
2. `tn-footer.json`: Theme Builder **Footer** template (footer + mobile sticky call bar).
3. `tn-homepage.json`: **Page** template with every section between header and footer.
4. `IMPORT-NOTES.md`: import order, display conditions, breakpoint settings, the WordPress menu to create, Global Colors/Fonts to add, and any difference from the reference you couldn't avoid.

Goal for each JSON: Templates → Import → Insert → Publish, with no rebuilding, resizing, reassigning or responsive fixes afterward.

## Elementor rules (non-negotiable)

- **Flexbox Containers only.** No Sections, Inner Sections, Columns or legacy containers.
- Each page section is one top-level container: full-width background, **Boxed** content width 1280px, side padding 48px desktop / 32px tablet / 20px mobile. **Every nested container inside is Full Width, never Boxed.**
- Native widgets anywhere the client will edit content: Heading, Text Editor, Button, Icon List, Nav Menu, Form (Pro). Use an HTML widget only when no native widget can match the design.
- No redundant wrapper containers. Name every container in the Navigator (`Hero`, `Hero / Content`, `What We Do / Painting`, and so on).
- Breakpoints: **Mobile 600px, Tablet 980px**, plus Elementor's **Laptop breakpoint at 1359px** (used only for the header nav swap). Set desktop, laptop, tablet and mobile values for type size, padding, gaps, direction and widths so nothing needs fixing by hand.
- Custom CSS only where native controls can't do it, scoped under a wrapper ID (`#tn-header`, `#tn-home`, `#tn-footer`) with `!important` where Elementor would override.
- Write real values (hex, font family, px) in widget settings. Don't reference Global Color/Font IDs, because they break on import. List the tokens in IMPORT-NOTES so they can be added as Globals.
- Valid Elementor export format: `{"version":"0.4","title":"…","type":"header|footer|page","content":[…],"page_settings":[]}`. Every element has a unique 7–8 character hex `id`, `elType` is `container` or `widget` (widgets carry `widgetType`), and nested containers have `"isInner": true`.

## Brand tokens

| Name | Hex | Use |
|---|---|---|
| Charred Timber | #14110E | Main dark background, text on amber buttons |
| Night | #0F0D0B | Footer, mobile call bar (90% opacity + 12px backdrop blur) |
| Spruce | #24302A | "Why Top Notch" and "Away for the season" sections |
| Bone | #F2ECE3 | Light section background, main text on dark |
| Stain Amber | #C68B4E | Primary pill buttons, arrows, wordmark sub-line (hover #D9A66B) |
| Deep Amber | #8A5A2B | Links and stars on light sections |
| Driftwood | #B3A99C | Secondary text on dark |
| Bark | #5B5046 | Secondary text on light |
| Hero text | #D7CFC4 | Subline and utility text over the hero photo |
| Spruce text | #C9D1C4 | Body text on Spruce |
| Hairline | rgba(242,236,227,0.10–0.16) | The only lines used: list rows, hero credentials rule, footer rule |
| Field line | #857A6E | Form field underline on the Bone form card (#14110E on focus) |

- **Fonts (Google):** Cormorant Garamond 500 for headings and quotes, 600 for the wordmark. Manrope 400/500/600 for body, nav, buttons and captions.
- **Type, desktop → mobile:** H1 88 → 44px (line-height 1.0, letter-spacing -0.015em). Section H2 60 → 36px (1.04). "What We Do" giant words 148 → 72px, with 17px amber titles under them. Why-list H3 27px. Quotes 32 → 26px. Body 17px (1.75) and 16px in What We Do. Captions 13–14px.
- **No all-caps text except the wordmark.** All labels and captions are sentence case.
- **Buttons:**
  - Primary is a pill: radius 999px, amber background, #14110E text, 15px/600, height 54px, padding 0 30px. The header pill is 46px tall at 14px.
  - Secondary actions are text links: 15px/600, underline 1px, offset 7px, underline color rgba(242,236,227,0.4) on dark (Deep Amber on light).
  - There are no outlined or boxed buttons anywhere.
- **Section vertical padding:** clamp(80px, 9vw, 128px).

## Header (`tn-header.json`)

The header has two parts: a solid top bar, then a main row that is **transparent and overlays the hero photo** (position absolute, full width, z-index above the hero, no background, no borders). Every page will start with a dark photo hero.

1. **Top bar** (solid Night #0F0D0B, 44px tall, full width, sits above the hero in normal flow). Inside the 1280px width. Left: social icons, Facebook and Instagram (Phosphor Light `facebook-logo` and `instagram-logo`, 18px, #D7CFC4, 40×44px tap area, links left as `#` until the client supplies them). Right, 13px, gap 32px: Areas We Serve, Financing (#D7CFC4), and the phone number (Bone, 600). Hidden on mobile. ("A Top Notch Logworks company" appears only in the footer.)
2. **Main row** (96px, overlays the top of the hero):
   - Wordmark built as text until the client's logo files arrive: "TOP NOTCH" (Cormorant Garamond 600, 28px, letter-spacing 0.08em) over "PAINTING & STAINING" (Manrope 700, 10px, letter-spacing 0.36em, amber). Link to home.
   - Nav Menu (horizontal, 14px/500, gap 22px, small chevrons at 60% opacity on dropdown parents). It must never wrap. At 1360px and wider, show the full nav. At 1359px and below, hide it and show the menu button (Nav Menu in Dropdown layout), which also includes Areas We Serve and Financing.
   - Right side: "Builders: Request a Bid" as a plain text link (14px/600, #D7CFC4), then the "Request an Estimate" pill. On mobile, replace both with two 44px circular buttons (call and menu) with a rgba(242,236,227,0.12) fill and no border.

**Main menu** (create it in Appearance → Menus and spell out the exact structure in IMPORT-NOTES):
- Fine Painting → Interior Painting, Exterior Painting, Specialty Finishes & Interior Wood, Commercial & HOA
- Log & Timber Staining → Log Home Staining & Restoration, Chinking & Check Sealing, Rot Repair & Prevention, Deck Staining
- Our Work → Gallery, Project Stories
- For Builders
- About → Our Story, Core Values
- Reviews

**Proposed URLs:** `/interior-painting/`, `/exterior-painting/`, `/specialty-finishes-interior-wood/`, `/commercial-hoa/`, `/log-home-staining-restoration/`, `/chinking-check-sealing/`, `/rot-repair-prevention/`, `/deck-staining/`, `/our-work/`, `/project-stories/`, `/for-builders/`, `/our-story/`, `/core-values/`, `/reviews/`, `/areas-we-serve/`, `/financing/`, `/request-an-estimate/`, `/thank-you/`. Builder links go to `/for-builders/#bid`.

## Homepage sections (`tn-homepage.json`), in order

1. **Hero:** min-height 800px, content pinned to the bottom, top padding 200px to clear the header. Photo slot with a vertical overlay: rgba(20,17,14,0.7) at 0%, 0.05 at 28%, 0.3 at 55%, 0.95 at 100%.
   - H1, max-width 1000px.
   - Below it, one row: the subline on the left (18px, max-width 560px) and on the right the "Request an Estimate" pill plus a "Call (970) 524-7323" text link with a phone icon. The row wraps on smaller screens.
   - The credentials list sits at the bottom of the hero above a single hairline: stars + 4.9 from 19 reviews on HomeAdvisor / BBB A+ accredited / Building mountain homes since 1999 / Fully insured / Sashco & Perma-Chink partners. 14px, in a wrapping row, with the key words in Bone.
2. **What We Do** (Charred Timber, section ID `what-we-do`): **build from `what-we-do-option-e.html`.** Not full width; everything sits inside the 1280px content width. H2 "What we do", then two equal columns (gap 80px) that stack at 980px. No card behind either column. Each column:
   - photo slot, height clamp(340px, 36vw, 520px);
   - a giant decorative word ("Painting" / "Staining", Cormorant Garamond 148px, Bone) overlapping the bottom of the photo;
   - a small amber title (H3, Manrope 600 17px, one line), one short paragraph, and the 4 service links in 2 columns with the amber → before each label.
   - **The two columns must line up exactly**: photos, giant words, titles, paragraphs and link lists all start at the same height. No stagger.
3. **Who We Are** (Bone): a text column (H2, paragraph, "Read our story →" link) beside a 560px photo slot.
4. **Why Top Notch** (Spruce, its own section, vertical padding clamp(96px, 10.5vw, 152px)):
   - H2 "Your home is in experienced hands" (Bone, left-aligned, max-width 720px). No paragraph under or beside it.
   - Then a 3×2 grid of points with lots of space: row gap clamp(64px, 7vw, 96px), column gap clamp(48px, 7vw, 104px). 2 columns on tablet, 1 on mobile.
   - Each point: a **Phosphor Icons "Light" icon** (44px, amber), then an H3 (28px, Bone), then text (15px, #C9D1C4, max-width 360px). No lines or numbers.
   - The six icons, in order: `hammer` (Builders first), `paint-roller` (Preparation is the job), `shield-check` (Your home, protected), `user-circle-check` (One point of contact), `paint-bucket` (Premium products), `certificate` (Backed in writing). Phosphor is open source (MIT). Use the Light weight only, copy the exact SVGs from the reference (or from phosphoricons.com) and upload them to the Media Library for the Icon widget. Don't substitute Font Awesome.
5. **Featured Projects** (Charred Timber): H2 on the left and a "See our work →" text link on the right. 3 projects in one row at a 2 : 1 : 1 width ratio (wraps on tablet, stacks on mobile). Each has a photo slot, height clamp(340px, 36vw, 500px), then the caption (17px, Bone) with the service type underneath (14px, Driftwood).
6. **Away for the Season** (Spruce): 50/50 split, photo slot (min-height 640px) | text with an H2, two paragraphs, the pill, and a call text link. Stacks on tablet.
7. **Reviews** (section ID `reviews`, off-white Bone #F2ECE3 background, no photo):
   - Top padding clamp(88px, 10vw, 144px), bottom padding clamp(72px, 8vw, 120px). Everything centered.
   - H2 "What our clients say" in #14110E.
   - **One review at a time, with no card or box**: just 5 Deep Amber stars (18px), the quote in Cormorant Garamond at 48px (30px mobile, line-height 1.22, #14110E, max-width 900px), then the name in bold #14110E with the town in Bark, then a small "1 / 2" counter in Bark.
   - Previous/next circle buttons (56px, 1px #8C8174 border, #14110E arrow, no fill) sit on the left and right of the quote on desktop and tablet. On mobile they move below the quote as a centered pair (48px).
   - Build it with Elementor's Testimonial Carousel (Pro) or Loop Carousel set to 1 slide, styled to match, not an HTML widget. Reviews: Cathy D., Eagle and Karen H., Gypsum (text in the reference). More get added later.
   - **Stats strip** along the bottom of the section: full width, solid Night #0F0D0B background, padding 32px. Left: three stats in a row, each a figure in Cormorant Garamond at 60px Bone with a 14px Driftwood label beside it: "4.9" (5 amber stars over "19 reviews on HomeAdvisor"), "A+" ("BBB accredited") and "[X.X]" ("[X] reviews on Google"); keep the brackets. Right: a "Read all reviews →" text link. Wraps on small screens.
8. **Estimate** (Charred Timber, section ID `estimate`, vertical padding clamp(96px, 10.5vw, 152px)). **There is no builder strip on the homepage**; builders reach the bid form from the header link and the link under the form. Two columns, vertically centered:
   - Left (max-width 520px): the offer H2 "Now scheduling winter interior projects", one short line "Book between [dates] and receive [10% off / our winter rate]." (18px Driftwood), then an "Or call (970) 524-7323" text link with a phone icon. Nothing else.
   - Right: the Elementor Pro Form in a **Bone card** (#F2ECE3, radius 4px, padding 64px desktop) so it stands clearly apart from the dark background. Form name `Homeowner Estimate - Homepage`, form ID `tn-estimate-form`.
     - Card heading "Request your free estimate" (Cormorant Garamond 34px, #14110E) with "We'll call within one business day to set up a walkthrough." under it (14px Bark).
     - Fields are **underline only**: transparent background, 1px #857A6E bottom border (#14110E on focus), labels 13px Bark above, 16px #14110E input text, laid out 2 per row. Name*, Phone*, Email*, Town* (select: Aspen, Snowmass, Basalt, Carbondale, Glenwood Springs, Vail, Beaver Creek, Avon, Edwards, Eagle, Gypsum, Breckenridge, Other), then What do you need?* full width (select: Interior painting, Exterior painting, Cabinets / trim / specialty finish, Log home staining / restoration, Chinking / check sealing, Rot repair, Deck staining, Commercial / HOA). Selects use a thin chevron instead of the default arrow.
     - Full-width amber pill submit, "Request My Estimate" (56px tall), with a centered 13px line under it: "Builder or general contractor? Request a bid" (link in Deep Amber to `/for-builders/#bid`).
     - Actions after submit: Email (to `[painting email address]`, left as a placeholder) + Redirect to `/thank-you/`.
   - Put the left-column offer copy in its own container named `Seasonal Offer` so the client can edit it. When there's no offer, the copy becomes: H2 "Talk to us about your project", text "We'll be in touch within one business day to set up a walkthrough." Include this in IMPORT-NOTES.

## Footer (`tn-footer.json`)

- Night background. Brand column (wordmark, one paragraph, "Visit Top Notch Logworks" text link) next to 4 link columns: Fine Painting, Log & Timber Staining, Company, Contact.
- Column headings are 14px/600 Bone, in sentence case.
- Then the service-area line, then a bottom row above a single hairline: "© [year] Top Notch Painting" and "A Top Notch Logworks company", with 72px of padding below it.
- The year must update itself. Use the Current Date Time dynamic tag with custom format `Y`.
- **Mobile sticky call bar** (mobile only), stuck to the bottom of the screen:
  - Night background at 90% opacity with a 12px backdrop blur.
  - Two pills: "Call Now" (rgba(242,236,227,0.12) fill, Bone text, phone icon) and "Free Estimate" (amber, goes to `/request-an-estimate/`).
  - Add bottom padding on mobile so the bar never covers footer content.

## Photos

There are no final photos yet. Build every photo slot as a container with the reference's background color, size Cover and position Center, ready for an image to be dropped in. Each slot gets a small label (12px, sentence case, rgba(242,236,227,0.6), camera icon, bottom-left) in a widget named `Photo label (delete when photo added)`. Don't add stock or AI-generated images.

## Copy

- Use the reference copy word for word. Keep every `[bracketed]` placeholder exactly as written; the client fills them in.
- Always write "Top Notch Painting", never "Topnotch" or "Top-Notch".
- Don't add sections, copy, icons or features that aren't in the reference.

## Tracking hooks

These go in now so tracking can be switched on later without rebuilding:
- Every phone link is `tel:+19705247323` with CSS class `tn-call`.
- The form uses ID `tn-estimate-form` and redirects to `/thank-you/`.
- Don't put Google tags in these templates. The Google tag (`AW-18542572239`) will be added site-wide through Elementor Custom Code, and the conversion event will run only on `/thank-you/`.

## Accessibility and SEO

- One H1 (the hero). H2 for section titles, including "What we do". The two amber What We Do titles are H3; the giant "Painting" / "Staining" words are decorative (DIV tag, hidden from screen readers). H3 for the Why points. Why icons are decorative (hidden from screen readers).
- Tap targets are at least 44px. Icon-only buttons get an `aria-label`. Decorative icons are hidden from screen readers.

## Don't

- Put any logins, passwords or API keys in files, or connect to the live sites.
- Add boxes, borders, card backgrounds (beyond the form card), extra icons or uppercase labels to "polish" the design.
- Change colors, spacing or copy.
- Build any other pages.

## Before you hand off

- All 3 JSON files parse. Every element has a unique `id`. There are no Sections or Columns, and every nested container is Full Width.
- Compare against the reference at 1440, 1360, 1359, 980, 600 and 390px, and list any unavoidable difference in IMPORT-NOTES.
- Every phone link has class `tn-call`, and the form ID and redirect are set.
