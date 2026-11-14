# Claude Code brief: build the GLEC homepage (WordPress) and course page (Moodle)

Paste the "Prompt" section into Claude Code from the root of the repo that holds the WordPress theme/plugin code and the Moodle theme. Keep this folder (`design_handoff_glec_homepage_course_page/`) inside the repo so Claude Code can read it.

## Prompt

You are implementing two designs for georgialicenseexam.com from the handoff folder `design_handoff_glec_homepage_course_page/`. Read `README.md` fully first; it is the spec (tokens, layouts, copy, prices, interactions, data model, open `[CONFIRM]` items). Then read the two `.dc.html` files as described under "How to read the design files" below. Do not ship the HTML files; recreate the designs in the target environments:

1. Homepage → WordPress, Elementor Pro, WooCommerce.
2. Course page template → Moodle theme (child of Boost) + course format template overrides.

Work in this order: shared assets → WordPress homepage (desktop, then 980 px and 600 px breakpoints) → Moodle theme → integration notes. After each stage, list what you built, what deviates from the design and why, and which `[CONFIRM]` items block you. Never invent copy, prices, phone numbers or lesson names; use the `[CONFIRM: …]` placeholder text where the spec does.

### How to read the design files

- Each `.dc.html` is a self-contained HTML prototype. The markup between `<x-dc>` and `</x-dc>` is the design; every element carries its final CSS as an inline `style` attribute, so you can copy values directly. The `<script data-dc-script>` block at the bottom holds the sample data (course objects, lesson lists, stat slides) and small view logic.
- `{{ path }}` is a data hole filled from that script. `<sc-for list="{{ x }}" as="item">` repeats its children for each item. `<sc-if value="{{ cond }}">` renders its children when the condition is true. `<image-slot src="…">` is an image that fills its parent with `object-fit: cover`. `style-hover="…"` is the `:hover` style.
- Artboards are marked with `data-screen-label`: Homepage v2 has "Homepage v2 desktop" (1440), "Homepage v2 mobile" (375) and "Mobile menu open". Course Page has "Course page desktop" and "Course page mobile", each rendered twice from two sample courses (CA-OL at 40%, CARRIER-CEU at 100%).
- The grey notes card at the top of each file is reviewer commentary; ignore it.
- To see the designs rendered, open the `.dc.html` files in a browser with `support.js`, `image-slot.js` and `assets/` beside them.

### Stage 0: shared assets

- Self-host Inter (400/500/600) and Inter Tight (600/700) as woff2 with `font-display: swap`. Do not load Google Fonts at runtime.
- Export the photos in `assets/` to WebP at 1× and 2× for the widths used (hero 950 px, section photos 480–600 px, mobile 375 px). Keep `glec-logo.png` as PNG until a larger/vector logo arrives.
- Lucide icons as inline SVG, 1.5 px stroke. Only the icons listed in README "Assets".

### Stage 1: WordPress homepage

Environment and rules (from the agency standard):
- Theme: Hello Elementor with a child theme (`glec-child`) for fonts, resets and small CSS. Elementor Pro Flexbox Containers only; no legacy Sections/Columns, no Inner Sections. Full-width containers with nested containers for content; content width 1312 px (1440 − 2 × 64).
- Custom breakpoints: Tablet 980 px, Mobile 600 px. Desktop layout above 980; the 375 px artboard is the target for ≤ 600; between 600 and 980, stack grids to 2 columns and keep desktop type sizes minus one step.
- Elementor Site Settings: Global Colors and Global Fonts named exactly as the README token table (Navy, Blue, Safety Orange, Orange Hover, Highlight Orange, Orange Tint, Ink, Slate, Mist, White, Line, Success, Light slate). Every color in the page must reference a global, never a hard-coded hex in a widget.
- Header and footer are Elementor Theme Builder templates with display condition "Entire site". Sticky header via Elementor's Sticky: Top, 76 px (64 px mobile).
- Export the finished page as an Elementor template JSON (`glec-homepage.json`) and the header/footer as kits, and commit them to the repo under `wordpress/elementor-templates/`.

Build steps:
1. Child theme: enqueue fonts, body reset (`margin: 0`, `-webkit-font-smoothing: antialiased`), base link colors `#10476E` / hover `#0B2A42`, focus outline `2px solid #10476E` (white on navy containers), `prefers-reduced-motion` guard that disables all Elementor entrance animations.
2. Header template per README "Header": logo, five nav links (Elementor Nav Menu widget, 17 px 500, gap 28), "Log in" text link, cart icon, "Start here" primary button. Cart icon: WooCommerce Menu Cart widget, hidden with CSS when the cart is empty (`.elementor-menu-cart--empty { display: none }` or the widget's own "Hide empty cart" toggle; verify the class name against the installed Elementor Pro version). Mobile (≤ 600): logo, cart icon (same rule), hamburger opening a full-screen Off-Canvas / Popup styled per "Mobile menu": 28 px Inter Tight links, divider, "Log in" and "My courses" (the latter only when logged in; use Elementor display conditions on user role), pinned footer with phone placeholder, email and full-width "Start here". Trap focus, close on Escape.
3. Sections 1–8, footer: one Elementor Container per numbered section in README "Homepage", styled from the artboard's inline CSS. Notes:
   - Hero: background photo on the container with the two gradient scrims as pseudo-overlays (Elementor Background Overlay supports one gradient; add the second via child-theme CSS on a class `glec-hero`). The floating progress card and "Certificate prints instantly" pill are decorative: absolute-positioned containers, `pointer-events: none`, hidden below 980 and re-placed per the mobile artboard (card over the bottom of the 300 px photo band).
   - Proof strip: container with negative top margin (−72 px desktop, −32 px mobile), `z-index: 2`.
   - Class cards: WooCommerce products exist for HLG-DD-R-OL, HLG-DD-C-OL, CA-OL, CA-TABs, SOS-APP. Each "Add to cart" is an Elementor Button linking to `?add-to-cart=<product_id>` with AJAX add-to-cart enabled, so the header cart icon appears without a reload. Prices must come from the product (use Elementor Pro Dynamic Tags → WooCommerce Product Price) so they cannot drift from the catalogue.
   - Stats band mobile slider: Elementor Loop Carousel or Nested Carousel, one stat per slide, arrows and dots per README, autoplay OFF, loop ON, `transform .35s ease`. Desktop shows the static 4-column grid instead (two containers with responsive visibility).
   - Testimonials: three static cards, no carousel.
   - Closing CTA, footer: per README. One footer only.
4. Accessibility and QA checklist before you report: one H1; heading order H1 → H2 → H3; sentence case; body ≥ 18 px desktop / 17 px mobile; buttons ≥ 52 / 48 px; tap targets ≥ 44 px; contrast ≥ 4.5:1 (no white on `#E46312`); side-by-side headings wrap to the same line count at 1440; Lighthouse a11y ≥ 95; no layout shift from fonts (preload the two woff2 files).

### Stage 2: Moodle course page theme

Target: a Boost child theme `theme_glec` that restyles the course view page (`/course/view.php?id=…`) to match `GLEC Course Page.dc.html`. Students land here from "My courses". Write it as a standard Moodle theme plugin in `moodle/theme/glec/` with `version.php`, `config.php` (parent `boost`), `lib.php`, `scss/pre.scss`, `scss/post.scss`, `lang/en/theme_glec.php`, and Mustache overrides under `templates/`.

Mapping from the design to Moodle:
- Site header → override `theme_boost/navbar` (or `core/navbar` in your version): logo left; right cluster "My courses" (`/my/courses.php`, active state 600 navy with 2 px bottom border), "Log out", cart icon linking back to the WordPress cart. 72 px tall, white, 1 px `#E2E8F0` rule. Hide Moodle's default drawer toggles and the user menu avatar on course pages; keep the user menu reachable from "My courses" or `/user/profile.php`.
- Breadcrumb → "My courses › [Course full name]" using `core/navbar` breadcrumb data; mobile shows "‹ My courses".
- Course header → override `core_course/course_header` / `theme_boost/core/full_header`: code pill from the course `shortname`, H1 from `fullname`, facts row: progress from `core_completion\progress::get_course_progress_percentage()` plus counts of completed/total activities with completion enabled; access end from the user's enrolment `timeend` ("Access until …", or "Access until … or until you pass" when a course custom field `glec_untilpass` is true); type from a course custom field `glec_type` (values: "License class", "Board-approved CEU · 4 hours"). Primary button: "Continue: [next activity name]" (first activity not complete), "Start class" at 0%, "Print your certificate" at 100% (link to the course's certificate activity, see below). 8 px `role="progressbar"` bar.
- CEU info panel → render when `glec_type` starts with "Board-approved CEU".
- Sections and lesson rows → override `core_courseformat/local/content/section`, `.../section/header`, `.../cm`, `.../cmitem` (format_topics on Moodle 4.x). Row grid `44px 1fr 80px 150px`; number = running index within the course; title = activity name; length = activity custom field `glec_length` if your Moodle version supports activity custom fields, otherwise drop the column; status from completion state: complete / in progress (viewed but not complete, or `COMPLETION_INCOMPLETE` with a tracked view) / not started. Only the "Continue" target row gets the Mist background. Section meta right of the heading: "N lessons · H h MM min · complete|M of N complete". Mobile: only the section containing the next activity is expanded; others collapse to a 56 px summary button (use `<details>`/`<summary>` or Boost's section collapse with the design's styling). A completed course opens the last section.
- Side column (380 px) → a theme-level block region or a custom `course_sidebar` Mustache partial rendered from the course layout (`layout/course.php`):
  1. Certificate card: uses `mod_customcert` (or `mod_certificate`; confirm which is installed). Locked state when the certificate activity's availability (completion of all prior activities) is not met: "N lessons to go", "Unlocks after the last lesson." Unlocked: thumbnail preview, primary "Print your certificate" → certificate `view.php?id=…&downloadown=1`, secondary "Save as PDF" (same URL, different label is acceptable only if the plugin cannot distinguish; otherwise omit the secondary button and report it). "Name that will print: [user fullname]" + link to `/user/edit.php`.
  2. Class materials: all `mod_resource` / `mod_url` activities in a section named "Materials" (or tagged `glec-materials`) listed as 44 px download rows; the sebookstore link as an external-link row; CA-OL shipping line when course custom field `glec_ships` is true.
  3. Questions card: email, phone placeholder, "Audio help" button when a course custom field `glec_audio_url` is set (label from `glec_audio_label`).
- Course custom fields to create (Site admin → Courses → Course custom fields, category "GLEC"): `glec_type` (select), `glec_untilpass` (checkbox), `glec_ships` (checkbox), `glec_audio_url` (text), `glec_audio_label` (text). Document them in the theme README.
- Styling: all tokens from README as SCSS variables in `pre.scss`; override Boost's `$primary` with `#10476E`, `$success` with `#15803D`, body font Inter 18 px / 1.6 (17 px ≤ 600 px), headings Inter Tight. Page max width 1312 px with 64 px gutters (20 px mobile). Hide the Boost course index drawer and the block drawer on course pages for students; keep them for editing teachers (`$PAGE->user_is_editing()`).
- Keep everything else in Moodle (activity pages, quizzes, gradebook) on default Boost styling with only the tokens and fonts applied. No marketing content on course pages.

### Stage 3: integration notes to produce (do not build without confirmation)

- WooCommerce purchase → Moodle enrolment: recommend a bridge (e.g. Edwiser Bridge or a custom webhook calling Moodle's `enrol_manual_enrol_users` web service) with enrolment duration = 12 months for license classes, 4 months for CEU classes. Document the product ↔ course shortname map.
- Single sign-on from the WordPress "Log in" / "My courses" links to Moodle (OAuth 2 or the bridge's SSO). Until SSO exists, "Log in" points to the Moodle login page.
- Header cart icon in Moodle reads the WooCommerce cart count via the Store API (`/wp-json/wc/store/v1/cart`) only if cookies are shared across the same domain; otherwise omit the icon in Moodle and report it.

### Open items that block parts of the build

Phone number · larger logo and Garrison photo · CA-TABs count (317 vs 328) · Facebook link yes/no · Moodle vs WP Courses (final) · certificate plugin in use · real lesson names and lengths for CA-OL and one CEU · what shipping info can be shown · FAQ removed from nav.

### Definition of done

- Homepage matches `GLEC Homepage v2.dc.html` at 1440 and 375 within normal browser rendering differences; Elementor template JSON committed; a11y checklist passed.
- Moodle theme installs cleanly (`php admin/cli/upgrade.php`), course view matches `GLEC Course Page.dc.html` for a 40% in-progress license class and a 100% complete CEU class; no PHP notices; works with editing on for teachers.
- A `BUILD_NOTES.md` listing deviations, assumptions and unresolved `[CONFIRM]` items.
