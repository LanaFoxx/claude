# Page-module brief (for converting Claude Design pages to Elementor JSON)

You are converting a **Claude Design** page (static HTML with inline styles) into an Elementor page
module, using the existing helpers. Read these first, in this order:

1. `lib.cjs` – design tokens (`C`, `HEAD`=Outfit, `BODY`=Manrope, `URL`, `PHONE`) and helpers
   (`band`, `stack`, `row`, `grid`, `linkBox`, `eyebrow`, `heading`, `H2`, `text`, `button`, `ctaCard`,
   `image`, `linkList`, `checkList`, `pill`, `px`, `box`, `gap`, `typo`, `widget`, `container`, `cls`, `wcls`).
2. `chrome.cjs` – the `STYLE` block. These CSS classes already exist and should be reused:
   `ctc-dots-cream` / `ctc-dots-dark` / `ctc-dots-white` (dot backgrounds), `ctc-thin`, `ctc-gold`, `ctc-block`,
   `ctc-checks` (gold circle check list), `ctc-faq` (FAQ toggle), `ctc-pricebar`, `ctc-article`, `ctc-cta`,
   `ctc-badge-slider`, `ctc-deco`, `ctc-nowrap-d`, `ctc-laptop`.
3. `pages/home.cjs` – the finished homepage. **Copy its patterns** (hero, course cards, credentials,
   helpful articles, FAQ toggle, final CTA). Same look = same code.
4. Your design: `<SCRATCH>/d/<design-slug>/tpl.html` (styles stripped; the page markup is between the first
   `<section` and `<footer`; the `<script type="text/x-dc">` at the end holds the data arrays such as faqs,
   features, articles). Screenshot: `<SCRATCH>/dshots/<Design Name>.png`. Images: `<SCRATCH>/d/<design-slug>/assets/`
   (file names are uuids; `manifest.txt` lists their mime types; the template references them by uuid).

## Rules
- Output: `pages/<module>.cjs` exporting `{ slug, title, liveId, kind, build(m) }`
  (`slug` = preview page slug like `new-faq`; `liveId` given in your task; `kind` = `'page'` or `'product'`).
  `build(m)` returns `[container({... cls('ctc-page')}, [ ...bands ], false)]` exactly like home.cjs.
- **Do not build the header or footer** – they are shared templates already. Start at the first hero section.
- Native Elementor widgets only: container, heading, text-editor, button, image, icon, icon-list, toggle,
  video, divider, spacer, shortcode. **No HTML widgets.** No Elementor Pro widgets.
- Keep the design's text exactly (fix nothing, rewrite nothing). Headings with thin+bold parts use
  `<span class="ctc-thin">` (and `ctc-block` for line breaks) like home.cjs.
- Inline SVG icons in the design → closest Font Awesome 5 free solid icon in an `icon` widget
  (e.g. `fas fa-laptop`, `fas fa-clock`, `fas fa-mobile-alt`, `fas fa-redo-alt`, `fas fa-graduation-cap`,
  `fas fa-shield-alt`, `fas fa-book`, `fas fa-phone`, `fas fa-envelope`, `fas fa-comments`).
- Responsive: desktop/tablet/mobile sizes like home.cjs (grids collapse to 1 column on mobile; headings
  `[desktop, tablet, mobile]`).
- Links: never use the design's `*.dc.html` file links. Map them with `URL` from lib.cjs:
  Home→`URL.home`, CTEC 60 Hour Course→`URL.c60`, CTEC 20 Hour Course→`URL.c20`, 15 Hour→`URL.c15`,
  California Tax Law→`URL.caLaw`, Cart→`URL.cart`, Contact Us→`URL.contact`, FAQ→`URL.faq`,
  How to Become→`URL.become`, How to Renew→`URL.renew`, Tax News→`URL.news`, Terms→`URL.terms`,
  Privacy→`URL.privacy`, Refund→`URL.refund`, Need a website→`URL.website`, Login→`URL.login`.
  **Pages not published yet** – Helpful Guides and How-Tos, What To Do After Completing the 60/20 Hour
  Course, Book Add-Ons, CTEC Courses index – link to `URL.TODO_guides`, `URL.TODO_after60`,
  `URL.TODO_after20`, `URL.TODO_books`, `URL.TODO_courses` (they will be filled in later; just use the keys).
- Images: copy each image you need from the design's assets folder to
  `<SCRATCH>/media/<module>/<descriptive-name>.<ext>` (lowercase, dashes, prefix `ctc-`), and reference it in
  build(m) as `m.file('<descriptive-name>.<ext>')`. Logos already uploaded: `m.logo`, `m.ctec`, `m.irs`,
  `m.trustpilot`, `m.bca`, `m.seal`, `m.laptopVideo`, `m.laptopPoster`, `m.mugs` (see home.cjs). Reuse those
  instead of copying duplicates. Resize huge photos to max 1600px wide (python PIL).
- Do **not** run deploy.cjs, do not contact the website, do not edit lib.cjs/chrome.cjs/home.cjs.
  If you need a new reusable CSS rule, put it in your report instead.
- Before finishing: `node -e "require('./pages/<module>.cjs').build(mock)"` must run without errors
  (mock `m.file = n => ({id:1,url:n})` and the other `m.*` keys as objects).
- Report: module file(s) written, images copied, link targets used, any design element you could not
  express natively and how you approximated it, and any CSS rules you need added.
