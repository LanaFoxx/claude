# Junk Ninja LLC website – Elementor Pro build

Builds the Claude Design handoff (`Junk Ninja Home.dc.html`) as native Elementor Pro content on the
WordPress site (Hello Elementor theme). Text, links, images and colors are normal Elementor controls.

## What is on the site
* **Home** (front page): hero, trust ticker, send-photos steps, services picker, about, realtors band,
  before & after, reviews, service areas, FAQ, quote form.
* **Junk Ninja Header** / **Junk Ninja Footer**: Theme Builder templates, condition Entire Site.
  The footer template also holds the fixed Call / Text Photos / Free Quote bar for tablet and mobile.
* **Junk Ninja Main Menu**: WordPress menu used by the header. "Get a Free Quote" (class `jn-menu-quote`) only shows in the mobile menu.
* **Site Settings**: breakpoints tablet ≤1180px, mobile ≤760px (the design's two breakpoints), global colors
  and fonts (Russo One, Archivo), global custom CSS (marquee keyframes, heading shadow, scroll offset).

## How the custom parts work
* Services picker = Nested Tabs (vertical). It becomes an accordion at ≤760px. A small HTML widget
  script makes hovering a service select it on desktop.
* FAQ = Nested Accordion. Ticker = two inline Icon Lists in a container animated with CSS.
* Quote form = Elementor Pro Form. Submissions are saved (Elementor > Submissions) and emailed to the
  site admin email. The photo drop area is an HTML field whose label opens the hidden Upload field.

## Files
* `lib.cjs` – design tokens, helpers, Site Settings, header, footer.
* `pages/home.cjs` – the home page.
* `prep.cjs` – uploads `assets/` to the Media Library and creates the menu.
* `deploy.cjs` – `node deploy.cjs [kit] [chrome] [home]` (no args = all). Needs `WP_URL`, a logged-in
  Playwright `STATE` file and `PREP` (media and menu IDs written by prep.cjs).
  Redeploying a page replaces it: check for edits made in Elementor first.

## Still open
* Photos not yet supplied as files show a striped "Photo to come" image: services Residential, Appliances,
  House & Estate, Yard Waste, Construction Debris; all before/after photos except the first garage "after".
* Reviews are placeholders (need real Google reviews and the review link).
* FAQ "How soon can you do it?" has a neutral holding answer pending the client.
* Form email goes to the admin email; switch to junkninjallc@gmail.com at launch. Housecall Pro not wired.
* SEO title/meta description and LocalBusiness schema need an SEO plugin (none installed).
