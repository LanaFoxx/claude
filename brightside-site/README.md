# Brightside site – Elementor build

Builds the Claude Design handoff "Brightside Home" (Fossil Free Media) on the WordPress staging site
**staging161.dreamweb.digital** (Hello Elementor + Elementor/Elementor Pro 4.4, Flexbox Containers).

| Document | ID | Notes |
| --- | --- | --- |
| Home (front page) | 532 | `elementor_header_footer` template |
| About `/about/` | 581 | Copy from the current brightside.now/about |
| Take Action `/take-action/` | 585 | Featured action + action cards (placeholders) |
| Petition template `/take-action/petition-template/` | 589 | Duplicate per petition; paste the Solidarity Tech petition iframe into the dashed slot |
| Contact `/contact/` | 593 | Join form embed tagged `utm_campaign=contact-page` |
| Brightside Header (Theme Builder) | 557 | Entire Site. Also carries the site-wide CSS/JS, stage and mobile menu |
| Brightside Footer (Theme Builder) | 560 | Entire Site |
| Site Settings (kit) | 8 | Breakpoints tablet ≤980 / mobile ≤600, global colours + fonts |

## How it is built

* `lib.cjs` – element trees for header, footer and homepage. Everything the client edits is a native
  widget: Heading, Text Editor, Button, Image, Icon (FA6 SVGs from the media library), Menu Anchor.
  HTML widgets hold only what the handoff allows: the global stage/CSS/JS, glint grids, the hero arc
  badge + pause control, the marquee, the clip play buttons and the Solidarity Tech embeds.
* `assets/bs-site.css` – all styling, scoped to `#bs-header`, `#bs-home`, `#bs-footer`, `.bs-stage`,
  `.bs-menu`. Elements carry `bs-*` classes (Advanced → CSS Classes).
* `assets/bs-site.js` – stage glow crossfade + star canvas (diagonal beam, cursor lean; off ≤600px and
  under reduced motion), header tightening, reveals, glint cursor brighten, hero/marquee pause
  (`aria-pressed`, sessionStorage), Brightsiders mouse drag, full-screen menu (focus trap, Esc, scroll lock).
* Both files are inlined into the header template's first HTML widget at deploy time. They sit in a
  zero-height container *outside* `#bs-header`: the pill's `backdrop-filter` would otherwise become the
  containing block of the fixed stage and menu.
* `deploy.cjs` – `node deploy.cjs [kit] [chrome] [home] [about] [take-action] [petition] [contact]`, needs `STATE` (Playwright login state) and
  `PREP` (media IDs from `tools/prep.cjs` + `tools/prep-svg.cjs`). Redeploying `home` replaces the page
  content, so check for client edits first.

## Site specifics

* **Elementor Pro license shows "Mismatch"** (key registered to another domain). Custom Code and
  Custom Fonts uploads are unavailable, so fonts were converted to WOFF2 and uploaded through the
  WordPress Font Library (`/wp-content/uploads/fonts/`), and `@font-face` lives in `bs-site.css`.
  Theme Builder, Pro widgets and conditions work.
* Elementor bundles Font Awesome 5.15 (no Bluesky, no `people-group`), so the FA6 Free SVGs
  (`assets/icons/`, CC BY 4.0) are in the media library and used as Icon/Button SVG icons. SVG upload
  goes through Elementor's upload path (`uploadTypeCaller=elementor-wp-media-upload`); REST refuses SVG.
* Solidarity Tech: `act.brightside.now` does not resolve yet, so both embeds use
  `https://www.brightside.now/join/embed` (allowed by the handoff). Change `EMBED` in `lib.cjs` when the
  act host is live. Hero card `utm_campaign=home-hero`; the lower card is `home-footer` + `loading="lazy"`.
  `v1.js` is included once.
* Default look is the yellow stage (client pick): white "majority" panel, orange "Ready to join" panel,
  purple join cards.
* Front page title: "Brightside – The Movement for People Who Love Clean Energy" (site title + tagline).
  Favicon: 2×2 Yellow glint grid on Off Grid Black. Organization JSON-LD is in the footer.

## Still open (client / later)

Hero video + poster (mural photo with slow drift is the stand-in, labelled), Brightsiders clips (play
buttons do nothing yet), stat figures, petition details (Take Action panel), event bar, Privacy Policy
page (`/privacy-policy/` links 404 until it exists), About/Contact pages (nav uses on-page anchors),
SMS consent wording, meta description (needs an SEO plugin), GA4 `G-ECR8VQVK3G` (not added to staging
on purpose), Elementor Pro license reactivation for this domain.

## Multi-page structure (round 2)

* Nav and footer link to real pages (About · Take Action · Contact), matching the current site's URLs.
  Header/menu "Join" jumps to the page's own join form when it has one, otherwise the homepage card.
* Inner pages share a shorter page hero (still photo, no drift, so no pause control) and the orange
  "join" split panel.
* Contact: Solidarity Tech's `/contact/embed` renders their whole page chrome inside the iframe, so the
  Contact page uses the join form (same fields the current Contact page has). For a real message field,
  create a contact form in Solidarity Tech and swap the iframe URL.
* Photo stickers and clip cards no longer move on hover (client request); their resting tilt stays.
