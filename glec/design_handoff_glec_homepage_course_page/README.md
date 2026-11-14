# Handoff: GLEC Homepage + Course Page Template

Site: georgialicenseexam.com (Georgia License Exam Company). Client approver: Mikesh Vora on behalf of Garrison Michael. Builder: Dream Web Digital.

## Overview

Two designs for the redesign of georgialicenseexam.com:

1. **Homepage** (`GLEC Homepage v2.dc.html`): gets a Georgia HVAC tech onto the license path or into a class purchase in as few taps as possible. Prices and proof up front, one orange button per screen.
2. **Course page template** (`GLEC Course Page.dc.html`): the page a logged-in student sees after My Courses → "Access this course." One template; every class (license or CEU) feeds its own data in. Shown in two states: CA-OL at 40% (in progress) and a 4-hour CEU at 100% (certificate ready).

Both are shown at desktop 1440 px and mobile 375 px.

## About the design files

The `.dc.html` files are **design references built in HTML**, not production code. Open each in a browser (keep `support.js`, `image-slot.js` and `assets/` beside them) to see the artboards. Your job is to **recreate these designs in the target environment**: the live site is WordPress (Enfold theme today; rebuild per Michael's standards: Elementor Flexbox Containers only, full-width nested containers, custom breakpoints at 980 px and 600 px) with WooCommerce for the cart, and **Moodle** for the student course area (per the client; the live site today runs the WP Courses plugin inside WordPress, so confirm which one ships before building the course page). Apply the course page as a theme over the LMS output. See `CLAUDE_CODE.md` for the build plan.

The notes card at the top of each file (design decisions and placeholders) is for the reviewer, not for the build.

## Fidelity

**High-fidelity.** Colors, type, spacing, copy and prices are final unless marked `[CONFIRM: …]`. Recreate pixel-close with the site's build tooling.

## Rules that must survive the build

- Sentence case everywhere. No all caps, no exclamation marks, no "click here".
- Body text 18 px desktop, 17 px minimum mobile. Buttons 52 px tall desktop, 48 px minimum mobile, full width on mobile. Tap targets ≥ 44 × 44.
- Text contrast ≥ 4.5:1 (3:1 for ≥ 24 px). Never white text on `#E46312`; use `#E46312` only for large numerals and accents.
- Progress and completion shown by text and icon, never color alone.
- Visible focus outline on every link/button. One H1 per page.
- Nothing above the fold animates; only subtle 200–300 ms fades on scroll; respect `prefers-reduced-motion`. No autoplay sliders on the homepage (the mobile stats slider is user-driven).
- Side-by-side headings must have the same number of lines (shorten copy or adjust widths).
- Testimonials are quoted exactly as written; stats exactly: 20 years (since 2006), 82% exam pass rate, 5,400+ student members, 1,740+ online design classes sold.
- No stale dates. No FAQ in navigation. No LinkedIn link.

## Design tokens

**Color**

| Token | Hex | Use |
|---|---|---|
| Navy | `#0B2A42` | Headings, header text, dark sections, feature card, footer text |
| Blue | `#10476E` | Links, secondary button border/text, icons, eyebrows |
| Safety Orange | `#C2410C` | Primary buttons (white text), required badge, 20-year badge |
| Orange Hover | `#9A3412` | Primary button hover; dark-orange pill text |
| Highlight Orange | `#E46312` | Large numerals, step numbers, quote marks, safety stripes, logo-adjacent accent only |
| Orange Tint | `#FDEBDD` | Code pill background on white class cards (text `#9A3412`) |
| Ink | `#0F172A` | Body text |
| Slate | `#475569` | Secondary text |
| Mist | `#F5F7FA` | Alternate section background, pills, info panels |
| White | `#FFFFFF` | Main background, cards |
| Line | `#E2E8F0` | Hairlines, borders, progress track |
| Success | `#15803D` | Progress bar fill, completed lesson check, "Board-approved" badge |
| Light slate | `#CBD5E1` | Muted text on navy, empty "not started" circle |

**Type** (two families only; self-host in production)

- Headings: Inter Tight 600/700, letter-spacing −0.02 to −0.045 em, line-height 1.05–1.2.
- Body/UI: Inter 400/500/600, line-height 1.6. Tabular figures on prices and stats (`font-variant-numeric: tabular-nums`).
- Scale: H1 64 px desktop / 40 px mobile · H2 44 / 30 · H3 22–26 / 19–22 · body 18 / 17 · small 15–16 · pills 12–13 px 600.
- Big numerals: 72 px (stats band), 56 px (step numbers, feature price), 48 px (proof strip), 88 px (mobile stats slider).

**Layout**

- Desktop artboard 1440 px; horizontal padding 64 px (content width 1312). Mobile 375 px; padding 20 px.
- Section padding 104 px desktop (hero 700 px tall), 64 px mobile. 8-point spacing.
- Corners: 12 px cards/images (16 px closing CTA card), 10 px buttons/inputs, 6 px code pills, 999 px badges.
- Shadows (one soft level, plus deeper for floating elements): cards `0 10px 30px rgba(11,42,66,.08)`; feature/photo frames `0 20–24px 50–60px rgba(11,42,66,.18–.22)`; floating cards over photos `0 24px 60px rgba(0,0,0,.35)`.
- Textures: blueprint grid `linear-gradient(rgba(11,42,66,.055) 1px,transparent 1px), linear-gradient(90deg, same)` at `40px 40px` on Mist; `rgba(255,255,255,.05–.07)` lines on navy. Safety stripe `repeating-linear-gradient(135deg,#E46312 0 14px,transparent 14px 28px)` as a 6 px top rule / 8 px left rule / 36 × 4 px eyebrow dash.
- Icons: Lucide, 1.5 px stroke, 20–26 px.

**Buttons**

- Primary: bg `#C2410C`, white, 600 18 px, 52 px tall, padding 0 28px, radius 10; hover `#9A3412`. On photo heroes add `box-shadow 0 8px 24px rgba(0,0,0,.25)`.
- Secondary: white bg, 1.5 px border `#10476E`, text `#10476E`; hover bg `#F5F7FA`. On navy: border `rgba(255,255,255,.7)`, white text.
- Text links: `#10476E`, 600, arrow icon 20 px.

## Homepage (`GLEC Homepage v2.dc.html`)

### Header (sticky, 76 px, white, 1 px `#E2E8F0` bottom rule)
- Left: real logo `assets/glec-logo.png` at 46 px tall (mobile 38 px). Ask client for a higher-resolution file; the site copy is 300 × 89.
- Center nav (17 px 500, gap 28): License classes · CEU classes · How to get licensed · About · Contact.
- Right (gap 24): "Log in" text link · cart icon **only when the cart has ≥ 1 item** (badge `#C2410C`, white 11 px count, top-right of icon) · primary button "Start here" (48 px tall in header).
- Mobile (64 px): logo left; right: cart icon (same rule) and a two-line menu button, both 44 × 44.
- No utility bar, no mega menu, no social icons.

### 1. Hero (700 px, navy)
- Photo `assets/hero-home-study.png` fills the right 66%, object-fit cover. Scrims: horizontal `#0B2A42 0–36% → rgba(11,42,66,.92) 46% → .45 64% → .08 82% → 0 100%`; vertical `transparent 70% → rgba(11,42,66,.55) 100%`. Blueprint grid (white .06) on the left 48%, masked out to the right.
- Content block: padding 92 px top, 64 px left, max-width 760. Eyebrow 15 px 600 white with a 36 × 4 orange safety-stripe dash: "Georgia Conditioned Air (HVAC) contractor license". H1 64 px white, max 640: **"Get your Georgia HVAC license. We'll show you every step."** (alternates B "Georgia HVAC license classes, taught step by step." C "Get licensed in Georgia. Every step, shown in full."). Support 20 px `#E2E8F0`, max 520: "Online classes taught by Garrison Michael, with full step-by-step solutions. Unlimited 24/7 access for up to a year or until you pass." Buttons: primary "Start here" (→ How to get licensed page) and white-outline "See classes and prices" (→ #classes).
- Floating card (320 px, white, radius 12, right 96 / bottom 120): pill "CA-OL", green "8 of 20 complete", title "Exam Prep Review Class" (Inter Tight 17), 8 px green progress bar at 40%, "Lesson 9 · Gas pipe sizing" + orange "Continue →". Floating pill (right 360 / bottom 300): green check circle + "Certificate prints instantly". Decorative; not interactive.
- Mobile: navy block with grid texture, eyebrow, H1 40 px, support, two full-width stacked buttons, then a 300 px photo band (edge to edge) with the progress card over its bottom.

### Proof strip (overlaps hero by 72 px; mobile by 32 px)
White card, radius 12, shadow, 3 equal cells with 1 px dividers: `20` years in business / since 2006 · `82%` exam pass rate / Georgia CA exam · `5,400+` student members / GA, SC, AL, TN and beyond. Numerals 48 px Inter Tight 700 navy; labels 16 px slate with a 500 ink second line. Mobile: 26 px numerals, 12 px labels, centered.

### 2. How to get licensed (Mist + blueprint grid, top padding 144 to clear the strip)
Eyebrow "Start here" (blue 15 px 600), H2 "How to get licensed, in three steps", right-aligned link "See all 10 steps →". Three white cards (radius 12, padding 32, shadow) on a dashed `#CBD5E1` connector line at 58 px. Each card: 56 px orange number `01/02/03` left, 52 px navy rounded-square icon right (clipboard-check / play-circle / award), H3 26 px, body slate.
1. **Check which license fits** — Restricted (Class 1) for units up to 5 tons, or Non-Restricted (Class 2) for all sizes. Our chart shows which one matches your experience.
2. **Take the design classes** — Residential Design is required for every license. Non-Restricted adds Commercial Design. Then apply to the Board online through GOALS.
3. **Prep for the exam and pass** — After Board approval, take the Exam Prep Review Class, tab your books and schedule your PSI exam.
Mobile: cards stack; link below.

### 3. Conditioned Air license classes (`#classes`, white)
Eyebrow "Prices up front", H2 "Conditioned Air license classes", intro "All online. Unlimited 24/7 access for up to a year or until you pass. You buy the reference books separately." Right link "Order the books ↗" → sebookstore.com/glec.html.
Grid `1.2fr 1fr 1fr`, two rows, gap 24. Feature card spans both rows.
- **Feature card (navy, grid texture, radius 12, padding 40, orange radial glow top-right):** pill "HLG-DD-R-OL" (white .12 bg), badge "Required for every CA license" (bg `#C2410C`), H3 32 px "Residential Design Class", copy `#CBD5E1` "ACCA Manual J & D: heat loss and gain, duct design. About 16 hours online.", check list (orange checks): Residential Design Study Guide included · SOS-APP application videos included free · Certificate prints when you finish the videos. Bottom row: "Restricted and Non-Restricted" small, price **$470** 56 px `#E46312`, primary "Add to cart".
- **Four white cards (border Line, radius 12, padding 28, shadow):** top row = code pill (bg `#FDEBDD`, text `#9A3412`, 13 px 600) + right-aligned 14 px slate qualifier; H3 23 px; copy 16 px slate; bottom row price 32 px navy + secondary "Add to cart" (48 px).
  - HLG-DD-C-OL · Non-Restricted only · **Commercial Design Class** · Carrier System Design Manuals 1, 2 and 3. About 8 hours online. · $270
  - CA-OL · After Board approval · **Exam Prep Review Class** · Every reference book except Manuals J & D, plus quizzes. Ships a printed study guide. · $535
  - CA-TABs · Shipped · **Permanent reference tabs** · 317+ laser-printed tabs with placement charts. Best bought with CA-OL. [CONFIRM: 317 or 328] · $155
  - SOS-APP · "Free with design classes" (orange `#C2410C` 13 px 600) · **Application Overview videos** · How to complete the Board application in GOALS, with checklists. · $96
- "Add to cart" posts to WooCommerce; show the cart icon in the header once count > 0.
- Mobile: feature card first, then four cards stacked, price and button always visible.

### 4. Why GLEC (white)
Grid `1fr 560px`, gap 80. Left: eyebrow "Why GLEC", H2 "Taught the way the exam is written", 2 × 2 Mist cards (radius 12, padding 24) with 44 px white icon tiles (blue icons: list-checks, target, clock, package), H3 21 px, 16 px copy:
- **Solutions, not answers** — Every example shows the chart lookup, the equation and the calculator keys.
- **Only the Georgia CA exam** — One exam, one Board, one application. We know exactly what is on the test.
- **24/7 for up to a year** — Watch from home or the job, as many times as you need, until you pass.
- **Tabs, guide, application** — Permanent tabs, a printed study guide and application help, ready before exam day.
Right (520 px tall): photo `assets/practice-exam.png` in a radius-12 frame with a navy grid-textured rectangle offset 24 px right/up behind it; floating white chip bottom-left: `1,740+` (34 px orange) "online design classes sold".

### Stats band (navy, grid texture, 6 px safety stripe on top)
Four columns, each with a 1 px white .18 left rule and 28 px padding: `82%` exam pass rate · `5,400+` student members · `1,740+` online design classes sold · `20` years in business, since 2006. Numerals 72 px `#E46312`, labels 18 px white.
**Mobile: a slider.** One stat per slide (88 px numeral, 20 px label, 15 px `#CBD5E1` note), 44 px round prev/next buttons at the edges (border white .3, bg navy .6), dots below (active dot 28 × 8 orange, others 8 × 8 white .35). Transition `transform .35s ease`, wraps around. User-driven only, no autoplay. Notes: "On the Georgia Conditioned Air exam." / "From Georgia, SC, AL, TN and nationwide companies." / "Residential and Commercial Design, online since 2018." / "Founded 2006. 20th anniversary October 2026."

### 5. Meet your instructor (Mist)
Grid `480px 1fr`, gap 96. Left (540 px tall): photo frame radius 12 with a hatched (`repeating-linear-gradient(135deg, rgba(11,42,66,.12) 0 2px, transparent 2px 10px)`) block offset bottom-left; 124 px orange circle badge top-right: "20 / years / 2006–2026". Photo `assets/garrison.png` (supplied by client, 376 × 350 on an orange textured background, object-fit cover). Ask for a larger file; it is upscaled ~1.3× in the 480 px desktop frame. Right: eyebrow "Meet your instructor", H2 "Garrison Michael", 20 px "Owner and instructor. Founded GLEC in 2006 after teaching the Conditioned Air review classes at the Georgia Trane Training Center.", three white stat tiles (34 px numerals): `34+` years in HVAC · `6` states licensed · `B.S.` Building Construction Engineering; 17 px line "Formerly with Trane and Johnson Controls. GA Conditioned Air Non-Restricted, GA Low Voltage Universal, EPA 608/609, LEED AP, DET."; link "About GLEC →".

### 6. CEU classes (white)
Grid `1fr 600px`, gap 80. Left (520 px): photo `assets/workshop-mentorship.png`, radius 12, shadow; floating white card bottom-left with 44 px green award circle: "Board-approved / Georgia Conditioned Air Licensing Board". Right: eyebrow "License renewal", H2 "Renewing your license? Board-approved CEU classes.", 19 px "Licensed CA contractors need 4 CEU hours a year. All online, 4 months of access, certificate prints the moment you finish the videos.", price card (white, border, radius 12, shadow; rows `1fr 80px 64px`, 17 px, hours 15 px slate, price 20 px Inter Tight):
Carrier System Design Manuals 1, 2, 3 · 4 hours · $50 / EPA Mold Remediation, an HVAC perspective · 4 hours · $50 / Wire Helix Trunk & Branch Duct Sizing · 4 hours · $50 / 2018, 2021 or 2024 Code Changes, IFGC & IMC · 4 hours · $50 / ADC Flex Duct Installation Standards · 1 hour · $15. Primary button "See CEU classes".

### 7. What students say (photo `assets/classroom.png` behind a navy scrim `.86 → .94`)
Eyebrow "Student stories" (`#E2E8F0`), H2 white "What students say", right link white "Read more student stories →". Three white cards (radius 12, padding 32, deep shadow): 72 px orange opening quote mark, 18 px quote, divider, 40 px navy initials circle + name 16 px 600 + "Student" 14 px. Quotes verbatim:
- James O.: "I passed my exam with an adjusted score of 93. I could not have done this without your courses. With 21 years of experience I still could not have passed this exam without your exam prep review course."
- Brett R.: "I just got an email confirmation that I passed my exam and was approved by the board. Thanks for all your help. I don't think that your classes could have been any better. Your Manual J & D, and the exam prep review class had me way over prepared to the point that the test was no sweat. Thanks again."
- Marroll S.: "I would have never passed the CA License Exam without your help. Your classes even helped me tremendously in passing the Tennessee exams. I have been doing HVAC for over 40 years and I learned a lot. Thanks so much."
Static row, no autoplay.

### 8. Closing call to action (Mist + grid)
White card, radius 16, padding 64 × 72, deep shadow, 8 px safety-stripe left rule. Left: H2 "Not sure where to start?", 19 px "The 10-step guide walks you from your first question to your license. Or ask us directly.", mail + phone row (phone placeholder `[CONFIRM: phone number]` until the Prempt AI line exists). Right: stacked 56 px buttons, primary "Start here", secondary "Contact us".

### Footer (white, 1 px top rule)
Grid `1.5fr 1fr 1fr 1fr 1.3fr`. Logo 44 px + "Online classes for the Georgia Conditioned Air contractor license and Board-approved CEUs, since 2006." Columns (15 px 600 headings, 16 px slate links): **Classes** License classes · CEU classes · Technician certifications. **Help** How to get licensed · Quick links · Board application and meeting dates · Contact. **Company** About · Testimonials · Policies. **Contact** 2625 Piedmont Road NE / UPS Store, Ste 56, PMB-320 / Atlanta, Georgia 30324-3086 / Mailing address only · Info@GeorgiaLicenseExam.com · phone placeholder · Facebook link only if the client wants it [CONFIRM]. Fine print row: "© 2026 Georgia License Exam Company" · Policies · Hold Harmless policy. One footer only; no duplicate blocks.

### Mobile menu (full-screen white panel)
Header with logo and 44 px close button. Links 28 px Inter Tight 600 navy, 14 px vertical padding: License classes · CEU classes · How to get licensed · About · Contact. Divider, then 18 px "Log in", "My courses" (only when logged in). Pinned to bottom: phone placeholder and email, then full-width primary "Start here".

## Course page template (`GLEC Course Page.dc.html`)

One template, data-driven. Shown twice: **CA-OL, 8 of 20 lessons, 40%** and **CARRIER-CEU, 18 of 18 videos, 100%**. Lesson names and lengths are realistic placeholders [CONFIRM: real lesson names]. Elements WP Courses may not output are flagged below; keep markup simple so it can skin the plugin.

### Header
Same site header, but the right cluster is: "My courses" (active: 600 navy, 2 px navy bottom border spanning the 72 px header height), "Log out", cart icon. Breadcrumb under it (15 px slate): My courses › [Class name]. Mobile: "‹ My courses" back link.

### Course header (border-bottom Line)
- Code pill (13 px 600, Mist bg), H1 40 px (mobile 28 px) class name, facts row 17 px slate with 20 px icons separated by 1 px rules: progress (green check-circle, 500 ink text) "8 of 20 lessons · 40%" · access (calendar) "Access until Nov 13, 2027 or until you pass" (CEU: "Access until Mar 13, 2027", 4 months) [CONFIRM: available in WP Courses?] · type (book) "License class" or "Board-approved CEU · 4 hours".
- Primary button right (mobile full width after the bar): "Continue: Lesson 9" / "Start class" at 0% / "Print your certificate" at 100%.
- 8 px progress bar, track Line, fill `#15803D`, `role="progressbar"` with aria values. On mobile the header, three facts, bar and button fit in the first 375 × 812 screen.

### Main column
- CEU only: Mist info panel (radius 12, info icon blue, 17 px): "The Board requires the full 4 hours. Each video is checked off when you watch it to the end. Your certificate unlocks after the last video."
- Sections: H2 22 px Inter Tight + right meta "8 lessons · 3 h 26 min · complete" above a 1 px ink rule.
- Lesson rows are links, grid `44px 1fr 80px 150px`, min-height 68 (mobile 60), 1 px Line bottom border, radius 8, hover Mist. Number 16 px slate tabular · title (600 if current) · length 15 px slate right · status with icon **and** text: Complete (green check-circle), In progress (blue play-circle), Not started (`#CBD5E1` empty circle). The current lesson is the only row with a Mist background. Per-lesson length and in-progress state [CONFIRM: available in WP Courses?].
- Mobile: only the current section is expanded (chevron up); other sections collapse to a 56 px summary button (title + meta, chevron down). A completed class opens the last section.

### Side column (380 px; stacks after the list on mobile), cards: border Line, radius 12, padding 24
1. **Certificate of completion.** Locked: Mist panel with lock icon, "12 lessons to go", "Unlocks after the last lesson." Unlocked: certificate thumbnail (white card: GLEC / Georgia License Exam Company, "Certificate of Completion", "This certifies that", legal name, "completed [class] · 4 CEU hours · Nov 13, 2026"), primary "Print your certificate", secondary "Save as PDF", 15 px "Keep your certificates on file for 7 years. The Board can ask for them at renewal." Always: "Name that will print: [legal name]" + link "Not right? Correct it before printing" [CONFIRM: how name changes are handled].
2. **Class materials.** Download rows (file icon, 44 px tall) e.g. "Exam Prep Study Guide, tab lists PDF", "2026 reference book list PDF", "Georgia Board rule, experience requirements PDF"; external link "Order the reference books at sebookstore.com"; CA-OL only: truck icon + "Your printed study guide ships by UPS to the address on your order." [CONFIRM: what shipping info can be shown].
3. **Questions about this class?** Email link, phone placeholder, and when the class has one, an Audio help button (52 px, blue outline, 32 px blue play circle): "Audio help: How the Exam Prep class works (2:55)".

No marketing content, upsells or banners on this page.

## Interactions and state

- Homepage: header sticky; cart icon visibility = cart count > 0; "Add to cart" → WooCommerce; "Start here" → How to get licensed page; "See classes and prices" → smooth scroll to `#classes`; mobile stats slider (index state, prev/next wrap, dots jump); mobile menu open/close with focus trap and Escape.
- Course page: data per class — code, name, type, unit (lesson/video), access end date, sections → lessons (number, title, length, status), materials, ships (bool), audio help (string|null), legal name. Derived: completed count, percent, remaining, CTA label, locked/unlocked certificate, which section is open on mobile.
- Hover: primary `#9A3412`; secondary and lesson rows Mist. Focus: visible 2 px outline (use `#10476E` on light, white on navy).

## Assets (in `assets/`)

- `glec-logo.png` — existing client logo from the live site (300 × 89, transparent). Request a larger/vector file.
- `hero-home-study.png` — hero photo (tech studying at kitchen table).
- `practice-exam.png` — Why GLEC section.
- `workshop-mentorship.png` — CEU section.
- `classroom.png` — testimonials background.
- `garrison.png` — Garrison Michael, instructor section (client-supplied, small; request a larger file).
- `mentor-air-handler.png` — spare; not used in v2.
- Icons: Lucide (clipboard-check, play-circle, award, list-checks, target, clock, package, shopping-cart, menu, x, arrow-right, check, check-circle, calendar, book, info, lock, file-down, external-link, truck, mail, phone, chevron-up/down/left/right).
- Export photos as WebP in production.

## Open items (`[CONFIRM]`)

Phone number for the Prempt AI line · higher-resolution logo and Garrison photo · CA-TABs count 317 vs 328 · Facebook link yes/no · WP Courses vs Moodle, and what the plugin outputs (access end date, lesson length, in-progress state, certificate button, legal-name edit) · real lesson names for CA-OL and one CEU · UPS shipping info to show · FAQ page removed from nav.

## Files

- `GLEC Homepage v2.dc.html` — homepage, desktop 1440 + mobile 375 + open mobile menu.
- `GLEC Course Page.dc.html` — course template, two states, desktop + mobile.
- `CLAUDE_CODE.md` — build plan and prompt for Claude Code (WordPress homepage + Moodle course theme).
- `support.js`, `image-slot.js` — runtime for viewing the HTML references; not for production.
- `assets/` — logo and photos.
