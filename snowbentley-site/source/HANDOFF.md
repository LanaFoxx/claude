# Handoff: Snow Bentley Realty — WordPress/Elementor rebuild

## Overview
Rebuild of snowbentley.com (currently on Luxury Presence) as a WordPress + Elementor site. The design is a 1:1 clone of the existing site. This package contains the finished **homepage** design, the design tokens, and the content sources for every inner page.

## About the design files
`home.html` is a **design reference built in HTML** — a working prototype showing exact look and behavior. It is not production code to paste into WordPress. The task is to recreate it in Elementor (sections, containers, widgets, theme styles) using the tokens below. `Home.dc.html` is the editable source of that prototype (needs its runtime to run; use `home.html` to view).

The user's folder `snowbentley-pages/` (also at `/home/user/claude/snowbentley/`) holds the raw server HTML of all 30 live pages. Pull copy, links and image URLs for inner pages from there — it is the source of truth for content.

## Fidelity
**High-fidelity.** Colors, type, spacing and copy are final. Match pixel-for-pixel at 1920px desktop; use normal Elementor responsive stacking below 1024px.

## Status
- Homepage: done (`home.html`).
- Inner pages: not designed yet. They use the same header, footer, menu, drawer, "Join My Newsletter / Work With Snow" CTA band and testimonials slider. Build them from `snowbentley-pages/*.html` with the same tokens. List in "Inner pages" below.

---

## Design tokens

Fonts (Google Fonts): `Cormorant Garamond` 300/400/600/700 · `Jost` 300/400/600
```
https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Jost:wght@300;400;500;600&display=swap
```

Colors
- Espresso `#3A2C26` — text, buttons, dark panels, social circles, rules
- Bronze `#937C5C` — small eyebrow labels, eyebrow rule lines, menu item numerals
- Cream `#F5EFE7` — page background, scrolled header, menu panel, drawer
- Sand `#EDE5DA` — image placeholders / alt background
- Stone `#EEEDE9` — testimonials section fallback color
- White `#FFFFFF`
- Hairline on cream `#E3DACE`; muted label text `#6B5B50`; "Call at" gray `#8C7F76`
- Image overlay: `rgba(0,0,0,.30)` on every full-bleed photo; `rgba(0,0,0,.18)` on Search Listings tiles

Type scale (desktop → fluid)
- H1 hero: Cormorant 300, `clamp(40px, 3.5vw, 66px)`, line 1.05, letter-spacing 2px, uppercase
- H2 section: Cormorant 300, `clamp(34px, 2.5vw, 48px)`, line 1.1, letter-spacing 2px, uppercase
- H3 card titles (Explore X, Leave a Message): Cormorant 400, 30–36px, letter-spacing 2px, uppercase
- Tile labels (Buy / Sell / Commercial Sales…): Cormorant 400, 36–38px, letter-spacing 2–3px, uppercase, white
- Hero sublines: Cormorant 400, 21–22px, letter-spacing 1px (uppercase on the first two lines, sentence case on the DRE line)
- Testimonial quote: Cormorant 400, `clamp(20px, 1.7vw, 32px)`, line 1.15
- Body: Jost 300, 16–18px, line 1.5–1.6, letter-spacing .3–.4px
- Bold lead lines: Jost 600, 17px
- Eyebrow label: Jost 400, 13px, letter-spacing 1.5px, uppercase, bronze (with 100px × 1px bronze rule to the left, or centered rule below for centered sections)
- Eyebrow over photos: Jost 600, 13px, white, 104px white rule under it
- Nav links: Jost 400, 15px, letter-spacing .3px, uppercase
- Buttons: Jost 600, 12px, letter-spacing .5px, uppercase
- Footer small text: Jost 300, 13px, letter-spacing .5px; footer links Jost 300 15px uppercase underlined (underline offset 4px)
- Consent copy: Jost 300, 11px, line 1.5, `#6B5B50`

Shapes
- Buttons and text inputs: full pill (`border-radius: 999px`), height 56px (50px for small inputs/drawer), padding 0 32–36px
- Arrow / close / social / hamburger buttons: 56px (arrows) or 40px (others) circles
- Everything else square corners. No shadows anywhere.

Buttons
- Dark: bg `#3A2C26`, white text
- Outline: transparent, 1px `#3A2C26` border, espresso text
- White: bg `#FFF`, espresso text (on photos)
- Translucent: bg `rgba(255,255,255,.8)`, espresso text (Home Valuation button on photo)

Spacing
- Page gutter: `clamp(20px, 3.3vw, 62px)` (62px at 1877–1920)
- Section vertical padding: `clamp(56px, 5vw, 96px)` (96px desktop)
- Grid gap between photo tiles: 15px

---

## Homepage — section by section (top to bottom)

### 1. Header (fixed, scroll-aware)
- Height 116px, padding 10px gutter. Logo left (95px tall). Right: nav row gap 22px — `HOME SEARCH`, `HOME VALUATION`, `WHAT WE'RE LOOKING FOR`, `LET'S CONNECT` (opens drawer), `415-823-8595`, `SELECT LANGUAGE ▾` (Google Translate), then hamburger circle 40px.
- **At top (over hero):** transparent, white text, white logo (`4155cf8c…`), hamburger white circle with espresso lines.
- **Scrolling down:** header slides up out of view (`translateY(-100%)`, .4s ease).
- **Scrolling up (anywhere below 80px):** header slides back in with cream `#F5EFE7` background, espresso text, color logo (`2aebcf66…`), hamburger espresso circle with white lines. Background fades .3s.
- Elementor: sticky header, "hide on scroll down / show on scroll up", transparent-on-top with scrolled style; two logo variants.

### 2. Hero (100vh, min 640px)
- Background video (loop, muted, autoplay) with poster, 30% black overlay. Sources: see Assets.
- Centered stack, white: eyebrow `AWARD-WINNING CHINESE-SPEAKING AGENT IN THE BAY AREA` (Jost 600 13px) → H1 `SNOW BENTLEY REALTY` → `COMMERCIAL LEASING & SALES · LUXURY REAL ESTATE` → `COSTAR POWER BROKER` → `CA DRE# 01911217 | Brokered by eXp Commercial of California, Inc.` (margins 12/20/14/14/30px).
- Search row: pill input 300×56, bg `rgba(255,255,255,.25)` + 6px backdrop blur, pin icon, placeholder "Search address or city"; white pill button `SEARCH` 112×56 → `/home-search/listings` (IDX page).

### 3. My Vision (cream)
- H2 centered `MY VISION`; paragraph centered, max-width 1200px (copy in home.html).
- 3 photo tiles, aspect 574:690, gap 15px, labels bottom-left (16px/18px inset): `BUY` → `/home-search/listings`, `LET'S CONNECT` → opens drawer, `SELL` → `/home-valuation`. No overlay (as on live site).

### 4. How Much Is Your Home Worth? (full-bleed photo, min 630px)
- Photo `20591ddb…` + 30% black overlay. Centered white: H2, checklist row (✓ Instant property valuation · ✓ Expert advice · ✓ Sell for more, Jost 300 15px, gap 28px), then row: white pin icon · pill input 1px white border, transparent, placeholder "Enter your home address..." · translucent pill button `HOME VALUATION` → RealScout URL. Row max-width 1450px.

### 5. Meet Snow (cream)
- Inner max-width 1540px; two columns, image 563px wide (aspect 563:805) left, text right, gap ~120px.
- Eyebrow `—— MEET`, H2 `SNOW BENTLEY`, bold lines `Global Reach, Local Expertise` / `Specializing in Commercial Sales & Leasing` + `Luxury Residential Real Estate`, two paragraphs, `CA DRE# 01911217 | eXp Commercial of California, Inc.`, buttons `LEARN MORE` (dark → `/about`) + `LET'S CONNECT` (outline → drawer), gap 20px, margin-top 60px.

### 6. Testimonials (full-bleed photo, min 990px)
- Photo `f6a1384a…` + 30% overlay. Centered white eyebrow `SUCCESS STORIES` with 104px white rule, H2 `TESTIMONIALS`.
- Card max-width 1296px, bg `rgba(255,255,255,.86)`, padding 120px 112px 84px, min-height 512px. Quote-mark box 55×80 espresso, centered, overlapping card top by 60px, white `“` 44px.
- Quote Cormorant 32px, truncated at ~430 chars with `READ MORE ⌄` (Cormorant 600 12px uppercase, letter-spacing 1.5px) toggling to full text / `READ LESS`. Author Jost 300 16px, 56px below.
- Prev/next: 56px white circles at the page gutters, vertically centered on the section. `VIEW ALL` white pill 50px below card → `/testimonials`.
- 20 testimonials, in site order (all text in home.html / `Home.dc.html`).

### 7. Search Listings (cream)
- H2 centered. Grid: left tile 869:564; right column two tiles 217 and 332 tall (ratios 217fr/332fr), gap 15px. 18% dark overlay, centered white labels: `COMMERCIAL SALES` → `/home-search/listings?propertyType=COMMERCIAL`, `COMMERCIAL LEASING` → `…&isLease=true`, `LUXURY RESIDENTIAL` → `…?keyword=Luxury Residential&priceMin=3000000` (IDX queries — map to IDX Broker equivalents).

### 8. Neighborhoods (cream; image bleeds to right edge)
- Top row: eyebrow `—— LOCAL EXPERTISE` + left-aligned H2 `NEIGHBORHOODS`; right: two 56px espresso circle arrows.
- Left column 528px: list of 10 names (Jost 300 17px uppercase), rows 65px, 1px `#E3DACE` dividers; active row has espresso divider + chevron. List shows ~7 rows (455px) with 60px cream fade at bottom; full-width dark pill `VIEW ALL` → `/neighborhoods`.
- Right: active neighborhood photo (1217:622) bleeding to viewport edge; espresso card 460×322 anchored bottom-right (overlapping image bottom by 64px, right edge at the gutter), padding 60px 48px: H3 `EXPLORE {NAME}`, link `READ MORE →` (Jost 600 12px) → `/neighborhoods/{slug}`.
- Order: Atherton, Hillsborough, Lamorinda, Los Gatos, Menlo Park, Mountain View, Pacific Heights, Palo Alto, Piedmont, San Francisco.

### 9. Newsletter / Work With Snow (full-bleed photo, padding 76px)
- Photo `36992463…` (Golden Gate) + 30% overlay. Two panels, no gap, each padding 80px 96px, min-height 605px, centered content.
- Left `rgba(255,255,255,.82)`: eyebrow `JOIN MY` (Jost 600 13px `#6B5B50`) with 100px bronze rule below, H2 `NEWSLETTER`, paragraph, pill email input 520×50 with envelope icon (1px espresso border), consent checkbox + 11px copy (exact text in home.html, links to `/terms-and-conditions`), dark pill `SUBSCRIBE`.
- Right `rgba(255,255,255,.9)`: eyebrow `GET IN TOUCH`, H2 `WORK WITH SNOW`, paragraph, dark pill `LET'S CONNECT` (drawer), `—— or ——` (12px, `#C9BFB4` rules 56px), `Call at ☏ 415-823-8595` (number Jost 600 15px).

### 10. Footer (cream, padding 96px top, 40px bottom)
- eXp Commercial logo 70px tall.
- Row (margin-top 50px, bottom 1px espresso rule): `SNOW BENTLEY` (Cormorant 400 26px uppercase) + `CONTACT DETAILS` (phone, email underlined) · `ADDRESS` (2603 Camino Ramon / San Ramon, CA 94583) · 1px vertical rule · right: 4 espresso 40px social circles (Facebook, Instagram, LinkedIn, Google).
- `NAVIGATION` row (label width 190px): Residential | Home Search | Home Valuation | Neighborhoods | Let's Connect — underlined uppercase links separated by 1px espresso vertical bars, padding 0 16px.
- `USEFUL ITEMS` row: What We're Looking For? | Done Deals | Testimonials.
- Legal: `Snow Bentley | CA DRE# 01911217` / `eXp Commercial of California, Inc. | CA DRE# 02134436`; disclaimer line; REALTOR® + Equal Housing logos (46px).
- Bottom right: `COPYRIGHT © 2026 | PRIVACY POLICY` → `/terms-and-conditions`. ("Powered by Luxury Presence" intentionally removed.)

### Floating button
`LET'S CONNECT ^` dark pill, fixed 20px from bottom-left, 50px tall. Opens the drawer.

### Let's Connect drawer (right, 460px, cream)
Backdrop `rgba(0,0,0,.45)`. Eyebrow `LET'S CONNECT`, outline circle ×, H3 `LEAVE A MESSAGE`, pill fields: Full Name*, Email*, Phone*, select "Interested in…" (Selling & Buying / Selling / Buying / Renting / Other), rounded textarea Message, consent checkbox, dark pill `SUBMIT`. Success copy: "Thank you for your message. I will be in touch with you shortly." Below a rule: Contact Details + Address.

### Full menu (hamburger)
Cream panel slides in from the right (.45s ease) covering 80% of the viewport (max 1500px); page dims 10%. Header switches to its scrolled/cream style so the color logo shows at top-left; espresso 40px circle × at top-right (26px/40px inset).
Padding 130px top, ~113px left, ~212px right. Four columns, items Cormorant 300 30px uppercase with bronze 11px numerals 01–11 to the left (gap 10px), 32px apart:
- 01 Home `/` · 02 About Snow `/about` · 03 Properties → sub-links (Jost 300 15px uppercase underlined, indent 24px, gap 16px): Residential, Commercial, Done Deals, What We're Looking For?
- 04 Home Search `/home-search` · 05 Home Valuation (RealScout) · 06 Neighborhoods
- 07 Testimonials · 08 Blog · 09 Resources → Buyer's Guide `/buyers`, Seller's Guide `/sellers`, Guides `/guides`
- 10 Let's Connect `/contact` · 11 My Search Portal (IDX login)
Then 1px espresso rule (large gap above, ~22vh), 70px below it a 3-column row: CONTACT DETAILS (Snow Bentley | CA DRE# 01911217 / eXp Commercial of California, Inc / phone / EMAIL uppercase, underlined), ADDRESS, FOLLOW (4 espresso social circles).

---

## Interactions summary
- Header: fixed; hidden on scroll-down past 80px, shown on scroll-up; transparent at top. Transitions: transform .4s ease, background .3s.
- Testimonials: prev/next cycle 20 items, Read More/Less toggle, optional 7s autoplay (off by default).
- Neighborhoods: click a name or use arrows to switch the photo + "Explore X" card.
- Menu / drawer: open-close with slide/fade; drawer submit shows success state (wire to a real form plugin + CRM).
- Hover: links turn bronze `#937C5C`; tiles on the live site zoom the image slightly on hover (`lp_animation-img-zoom`) — optional.
- Language: Google Translate widget behind `SELECT LANGUAGE ▾`.
- `/review` must 301-redirect to the Google review link (see Assets).

## Inner pages (to build from `snowbentley-pages/`)
about, what-were-looking-for (add the new "Development Site — Acquisition" block, text below), residential, commercial, done-deals, neighborhoods + 10 detail pages, testimonials, blog, buyers, sellers, guides, contact, home-search (IDX Broker placeholder), home-valuation, properties/sale, properties/sold, terms-and-conditions, review (redirect).
Inner-page pattern on the live site: eyebrow + H1 hero band, content sections, then the shared Testimonials slider, Newsletter/Work With Snow band, footer.

New content for What We're Looking For (add as a fifth block after Industrial — Lease):
```
Development Site — Acquisition
(Qualified buyer, active in the SF AI Corridor)
- Entitled Multifamily — 200+ units, fully entitled, SoMa and Mission Bay; shovel-ready preferred, will consider sites with entitlements in final approval
- Open to land, existing improvements for teardown, or office/R&D assets suitable for residential conversion
- Off-market and pre-listing opportunities welcome; principals and their representatives only
```
Also fix the live-site typo "Buyer's Gide" → "Buyer's Guide".

## Assets (all currently hosted by Luxury Presence — download and re-upload to the WP media library before launch)
Base: `https://media-production.lp-cdn.com/cdn-cgi/image/format=auto,quality=85/https://media-production.lp-cdn.com/media/<id>`
- Logo color (scrolled header, menu): `2aebcf66-1a83-4c58-9e8a-c1cf3b8def66`
- Logo white (hero header): `4155cf8c-daa6-423d-9076-7c481fdc24e8`
- Hero poster: `https://res.cloudinary.com/luxuryp/videos/so_0,eo_0,f_auto,q_auto/g8p7m0kpme81xzy4qxtc/v1_snow-bentley.jpg`
- Hero video (webm vp9 / mp4 h265 / mp4 h264): `https://res.cloudinary.com/luxuryp/videos/f_webm,vc_vp9,q_auto:best,w_1920,c_limit/g8p7m0kpme81xzy4qxtc/v1_snow-bentley.webm` · `…/f_mp4,vc_h265,q_auto:best,w_1920,c_limit/…/v1_snow-bentley.mp4` · `…/f_mp4,vc_h264,q_auto:best,w_1920,c_limit/…/v1_snow-bentley.mp4`
- Vision tiles: Buy `fbaf8acd-b2aa-48d9-9db9-0a8df214a0c7`, Let's Connect `e096368e-cd6d-411a-82c3-09447dc3a86e`, Sell `8e8b5400-7015-4ee2-8e0b-a9616acc4b72`
- Home worth background: `20591ddb-8a46-4e2e-b68f-13b2b74c07ea`
- Headshot: `e22256cc-24c8-4658-ac56-7f014796ef74`
- Testimonials background: `f6a1384a-fb50-4f28-8f3c-dfeafbcb6fec`
- Search listings: Commercial Sales `f95b7474-5300-43d2-aaa6-b1767656a7f8`, Commercial Leasing `ac226cec-892f-4312-863f-07773c7056f4`, Luxury Residential `fc8caa14-75bb-4d2e-b19c-12511e3a20f2`
- Neighborhoods: Atherton `cb7d53d4-4728-4a38-b9b3-310275e09090`, Hillsborough `61399524-45de-447f-9161-d3e04d898704`, Lamorinda `312076af-719a-4d7c-aeea-77d8dada2502`, Los Gatos `2054fa71-846d-4eb3-9476-5b8b3908a76a`, Menlo Park `4811e183-fb88-414e-9359-0f33d2f0650a`, Mountain View `819ada2a-74ae-4242-a339-c31a31c1219f`, Pacific Heights `6fe28325-2041-4100-b93f-5e5545f5c6fe`, Palo Alto `0cc4b407-c97a-4f3b-95a3-957a2d657c73`, Piedmont `5e8ee836-05db-4923-90ec-4d0bb97cf1b0`, San Francisco `ac026db8-83d6-4ade-81fd-509126f2bb5f`
- Newsletter/CTA background (Golden Gate): `36992463-4792-4bf9-974a-3ee606854281`
- Footer: eXp Commercial logo `36b1231e-2d63-49e8-b594-b2f74ed4775e`, REALTOR®/EHO `382304bf-5354-45f0-878f-80323ad7d65a`
- Contact modal background (contact page): `3929c765-a573-4397-a07c-8f8481feeece`
- Icons: inline SVG (pin, check, chevrons, envelope, phone, hamburger, ×, Facebook, Instagram, LinkedIn, "G").

Links
- Home Valuation: `https://snowbentley.realscout.com/homesearch/home-reports?hva_public=true`
- Social: Facebook `https://www.facebook.com/p/Snow-Bentley-61575852646089/`, Instagram `https://www.instagram.com/snowlibentley/?hl=en`, LinkedIn `https://www.linkedin.com/in/snow-bentley`, Google `https://maps.app.goo.gl/bK8Nzc5w69ZdCsiJ9`
- `/review` → `https://www.google.com/maps/place//data=!4m3!3m2!1s0x8c1df049d2be74b1:0x378b4f58eef62d80!12e1?source=g.page.m.kd._&laa=lu-desktop-review-solicitation`
- Phone `415-823-8595`, email `snow@snowbentley.com`, address `2603 Camino Ramon, San Ramon, CA 94583`, CA DRE# 01911217; broker eXp Commercial of California, Inc. CA DRE# 02134436.

## Files
- `home.html` — self-contained homepage prototype (open in any browser; images/video load from the live CDN).
- `Home.dc.html` — editable source of the prototype (template + logic class with all testimonial and neighborhood data).
- `snowbentley-pages/` (user's local folder) — raw HTML of all 30 live pages, for inner-page content.
