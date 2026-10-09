# Recco Consulting website – Elementor build

Builds the Claude Design handoff (`Recco_Homepage_1.html`, a single-page site) as native Elementor
content on WordPress. No HTML widgets: every heading, paragraph, button, image, link, form field and
color is a normal Elementor control the client can edit.

## Site

| Item | Notes |
| --- | --- |
| Home (front page) | Hero, proof band, Services, Platforms, AI News, About, How we work, Contact form |
| **Recco Header** | Theme Builder header (Entire Site): logo, Nav Menu (**Recco Main Menu**), "Contact us" button, sticky |
| **Recco Footer** | Theme Builder footer (Entire Site): logo, links, copyright |
| Site Settings | Title "Recco Consulting", tagline, favicon = logo arch, global colors + fonts set to the brand |

Menu items are anchor links (`/#services`, `/#platforms`, `/#news`, `/#about`); the section IDs are set
under each section's Advanced > CSS ID. The "Updated daily · <date>" line in AI News uses the
Current Date Time dynamic tag; the news cards are static placeholders until the news feed exists.

## Widgets used

Container (flex + grid, linked containers for the service rows and news cards), Heading, Text Editor,
Button, Image, Icon, Icon List, Nav Menu, Form (with honeypot).

## Fonts

Manrope comes from Google Fonts. **Source Serif 4** is an Elementor Pro Custom Font (Elementor > Custom
Fonts) that uses the design's variable file (`assets/recco-source-serif-4-variable.*`, weight +
optical-size axes). Google's static cut of the font sets large headings about 15% wider and lacks the light
display look of the design. It is registered as static 300/400/500/600 rows pointing at the same
variable file, because Elementor's "variable font" row prints no weight range.

## Responsive behaviour

Breakpoints: tablet ≤1024px, mobile ≤767px. Two-column sections stack on tablet and mobile, the
platform chips wrap, the four steps go 4 → 2 → 1, the proof band goes 3 → 3 → 1. Headings scale (h1 64/50/38,
h2 46/38/32), section padding and gutters shrink, and the nav becomes a hamburger on tablet and mobile.

## Files

* `lib.cjs` – design tokens, layout helpers, header, footer, page CSS.
* `home.cjs` – the homepage sections.
* `prep.cjs` – one-time setup: `cleanup` (deletes old pages/images, trashes old templates), uploads
  media, creates the menu, sets the site title/tagline/favicon. Writes `prep.json` (media + menu IDs).
* `font.cjs` – uploads the variable font and creates the Custom Font.
* `deploy.cjs` – opens each document in the Elementor editor, replaces its content and publishes;
  creates the header/footer templates and their conditions, sets the front page, updates the Kit.
  `node deploy.cjs [chrome] [home] [kit]` (no args = everything).

All scripts need a logged-in Playwright storage state (`STATE`). SiteGround's bot check challenges
Playwright's own HTTP client, so every REST call runs inside the logged-in admin page.
