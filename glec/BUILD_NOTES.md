# GLEC homepage build notes (Stage 1, WordPress)

Built on **staging158.dreamweb.digital** (staging only; nothing in this build touches georgialicenseexam.com).
Source spec: `design_handoff_glec_homepage_course_page/` (README.md, CLAUDE_CODE.md, `GLEC Homepage v2.dc.html`).

## What is on staging

| Item | Where |
|---|---|
| Theme | Hello Elementor 3.5.2 + child theme **GLEC Child** (`wordpress/glec-child/`, active) |
| Plugins | Elementor 4.4.0, Elementor Pro (license mismatch on this domain, see below), WooCommerce 11.3.0, SiteGround Speed Optimizer + Security |
| Homepage | Page "Home" (ID 547), set as the static front page, template "Elementor Full Width" |
| Header | Theme Builder header "GLEC header" (ID 553), condition: Entire site |
| Footer | Theme Builder footer "GLEC footer" (ID 554), condition: Entire site |
| Site Settings | Default Kit (ID 8): 13 Global Colors named exactly as the README token table, Global Fonts (H1, H2, H3, H3 card, Body, Lead, Small, Eyebrow), breakpoints Tablet 980 / Mobile 600, content width 1312 |
| Products | HLG-DD-R-OL $470 (538), HLG-DD-C-OL $270 (539), CA-OL $535 (540), CA-TABs $155 (541), SOS-APP $96 (542). Prices show 0 decimals. |
| Menu | "Primary": License classes (/#classes) · CEU classes (/#ceu) · How to get licensed · About · Contact |
| Stub pages | How to get licensed (543), About (544), Contact (545), Policies (546): "coming soon" placeholders so links resolve |
| Media | hero, practice-exam, workshop-mentorship, classroom, garrison as WebP; logo as PNG |

Exports in `wordpress/elementor-templates/` (`glec-homepage.json`, `glec-header.json`, `glec-footer.json`, importable via Elementor → Templates → Import) and `site-settings-kit.json` (the kit settings applied).
`wordpress/build-tools/build.py` generates the Elementor JSON; `prefix.py` produces `glec.min.css` from `glec.css`.

## How it's built

- Elementor **Flexbox Containers only** (no Sections/Columns/Inner Sections). Full-width parent containers, boxed to 1312 px, nested containers for content.
- Section padding, gaps and responsive direction live in Elementor container settings (desktop / 980 / 600).
- Headings and text reference **Global Colors and Global Fonts**. Decorative CSS (blueprint grid, safety stripes, scrims, floating cards, shadows) is in `glec-child/assets/glec.css` and uses `var(--e-global-color-*)`, so it follows the globals.
- Fonts: Inter 400/500/600 and Inter Tight 600/700 self-hosted woff2 with `font-display: swap`, two files preloaded. Elementor is told they're local, so **no Google Fonts requests** (verified).
- Prices on the class cards are **Elementor Pro dynamic tags (WooCommerce Product Price)**, so they can't drift from the catalogue. "Add to cart" uses the Elementor Pro **Custom Add To Cart** widget with AJAX.
- The header cart icon shows only when the cart has ≥ 1 item, updates via WooCommerce cart fragments (no reload), and has the `#C2410C` count badge.

## Verified on staging

- 1440 px: page height 6710 px vs 6715 px in the design; layout matches the artboard. 375 px matches the mobile artboard.
- One H1. No horizontal scroll at 1440 or 375. No console errors.
- axe-core (WCAG 2 A/AA + best practice): **0 violations** at 1440 and 375.
- All tap targets ≥ 44 × 44 on mobile (only the visually hidden skip link is smaller).
- Add to cart → cart icon appears with count 1, no reload. "See classes and prices" smooth-scrolls to `#classes` (sticky header offset applied).
- Mobile menu: opens full-screen, focus moves inside, focus is trapped, Escape closes and returns focus.
- Mobile stats slider: prev/next, wraps both ways, dots jump, swipe, no autoplay, `aria-live` announcements.
- `prefers-reduced-motion` disables transitions and Elementor entrance animations.

## Changes after review (requested by Dream Web Digital)

- Hero: floating progress card and "Certificate prints instantly" pill removed. Above 1440 px the navy band stays full-bleed while text, photo, scrims and grid anchor to the centred 1440 artboard. Photo anchored right so the subject sits further left; taller mobile photo band.
- Proof strip: safety-stripe top rule, orange Lucide icons (award / target / users), no icon tiles, dividers inset; labels stack under numbers between 601 and 1180 px.
- Step cards: icon tiles removed, 44 px blue icons.
- Instructor stats: no boxes; open row with hairline dividers, centred number and label.
- "How to get licensed" section: plain Mist, no grid. Rule: grid textures never on two adjacent sections. It now starts under the hero so there's no white band.
- Footer: navy, orange 19 px bold column titles (large-text contrast), white links, logo on a white plate.
- Standard pages + WooCommerce: `assets/pages.css` (page padding/titles, orange buttons, notices, forms, cart/checkout type scale at 18 px, faint outlined totals/summary boxes, no inner borders). WooCommerce "coming soon" mode switched off on staging so visitors can reach cart/checkout.
- Fixed: Elementor forces `width/height:100%` on container `::before`, which stretched the steps connector line; all decorative pseudo-elements are now pinned explicitly.

## Deviations from the brief (and why)

1. **Mobile menu**: built as a `[glec_mobile_menu]` shortcode (button + full-screen dialog, focus trap and Escape in `glec.js`) instead of an Elementor Off-Canvas/Popup. That gave reliable focus trapping, Escape handling and a pinned "Start here" footer. Links come from the WP "Primary" menu, so they stay editable. "My courses" appears only when logged in (`[glec_account_links]`).
2. **Mobile stats slider**: a small accessible HTML/JS carousel (in an HTML widget) instead of Elementor Loop/Nested Carousel. Same behaviour as the spec: one stat per slide, 44 px arrows, dots, `transform .35s ease`, loop, no autoplay. Desktop shows the static 4-column grid.
3. **Hero scrims, textures, floating progress card and "Certificate prints instantly" pill** are HTML widgets + child-theme CSS (decorative, `aria-hidden`, `pointer-events: none`). Elementor's single background overlay can't express the two gradients plus the masked grid.
4. **Grid templates** with fractional/fixed columns (`1.2fr 1fr 1fr`, `1fr 560px`, `480px 1fr`, `1fr 600px`, footer `1.5fr 1fr 1fr 1fr 1.3fr`) are applied by CSS class on the container (`g-classgrid`, `g-why`, `g-instr`, `g-ceu`, `g-fgrid`) because Elementor's grid control can't express them exactly.
5. **Sticky header** uses CSS `position: sticky` on the Theme Builder header location (with admin-bar offset) instead of Elementor's Motion Effects sticky. There's no JS and no layout jump.
6. **Nav breakpoint**: the desktop nav switches to the hamburger at **≤ 1180 px** (not 980) because five links + Log in + cart + "Start here" don't fit between 980 and 1180 at 17 px.
7. **Mobile copy**: the mobile artboard shortens a few blurbs (Why GLEC cards, feature card, CEU intro). The build uses the desktop copy at every width so there's one source of truth. Easy to swap per breakpoint if wanted.
8. **Mobile feature card**: "Add to cart" sits full width under the $470 price (the side-by-side layout overflowed at 375 px), in line with "buttons full width on mobile".
9. **CEU price table** is static HTML (the CEU classes aren't WooCommerce products yet).
10. **Links without a page yet** point to stub pages or `#`: Technician certifications, Quick links, Board application and meeting dates, Hold Harmless policy, "Read more student stories" (→ `/#testimonials`), "See CEU classes" (→ `/#ceu`).

## Open `[CONFIRM]` items (still shown as placeholders)

- Phone number (Prempt AI line): header menu, CTA, footer. Set once via WP option `glec_phone` for the mobile menu; it's literal text in the CTA/footer widgets.
- CA-TABs tab count: 317 vs 328 (card copy and product description).
- Higher-resolution / vector logo (current 300 × 89 PNG) and a larger Garrison photo (376 × 350, upscaled in the 480 px frame).
- Facebook link in the footer: not added (default "no").
- Final destination pages for "Start here", "How to get licensed" (10-step guide), CEU classes, Testimonials, Policies.

## Needs attention

- **Elementor Pro license shows "Mismatch" on staging158** (license is tied to another domain), so Pro could not update from 4.3.3 → 4.4.0 here. Reconnect under Elementor → License (Disconnect, then Connect) and update.
- The WooCommerce store isn't configured beyond prices: **no payment gateway** (checkout shows "no payment methods" and a "Missing parameter(s): billing_address" banner, which goes away as soon as any gateway is enabled; verified), and no shipping, tax or store address yet (CA-TABs needs shipping; the license classes are virtual).
- Next stage (Moodle course page theme) waits on Moodle admin access.
