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
* Services picker = Nested Tabs (vertical). It becomes an accordion at ≤760px. Hover-to-select on desktop
  comes from the Junk Ninja Site plugin. There are no HTML widgets or HTML form fields anywhere.
* FAQ = Nested Accordion. Ticker = two inline Icon Lists in a container animated with CSS.
* Quote form = Elementor Pro Form. Submissions are saved (Elementor > Submissions) and emailed to the
  site admin email. The photo drop area is the native Upload field styled with CSS.

## Speed, SEO and AI search (Nov 2026)
Lighthouse on the staging URL: mobile 97 / 100 / 100 / 69, desktop 99 / 100 / 100 / 69
(performance / accessibility / best practices / SEO). SEO is 69 only because the staging site is set to
"Discourage search engines"; every other SEO audit passes.

* **Junk Ninja Site plugin** (`plugin/junk-ninja-site`, installed and active; upload the folder as a zip to update):
  inlines the site's own CSS (no render-blocking requests), trims Google Font CSS to the Latin faces,
  preloads the hero photo and the two font files, lazy-loads every image except the header logo and hero
  mascot, moves jQuery to the footer without jQuery Migrate, removes emoji/block-library/global styles.
  SEO: title, meta description, Open Graph/Twitter, LocalBusiness + Service catalog + WebSite + WebPage +
  FAQPage JSON-LD, robots.txt that welcomes Google/Bing and AI crawlers (GPTBot, ClaudeBot, PerplexityBot…)
  once the site is public, `/llms.txt` summary for AI assistants, page-only XML sitemap.
  Business facts and the FAQ text live in `jn_business()`; keep the FAQ in step with the page.
* Elementor > Settings: local Google Fonts, font-display swap, internal CSS print method, optimized markup,
  inline SVG icons, element cache 24h, background lazy load off (the hero background is the LCP).
* Hello theme: its meta description, header/footer and theme.css are turned off (the plugin and Elementor templates replace them).
* Contrast: eyebrow text `#0B7785` and inactive service names `#566B80` (design values failed WCAG AA).
* Logos are uploaded at display size (`junk-ninja-logo-300.png`, `junk-ninja-logo-white-424.png`), mascot as WebP.

### Before launch
* Settings > Reading: untick "Discourage search engines" on the real domain.
* Nexcess page cache: enabled under Nexcess > Page Cache, but `WP_CACHE` is off and there is no
  `advanced-cache.php` drop-in, so pages are not cached yet (about 0.9s server time). Turn page caching on in the
  Nexcess portal (or set `define('WP_CACHE', true);` in wp-config.php). Also ask Nexcess for long cache
  headers on static files.

## Files
* `lib.cjs` – design tokens, helpers, Site Settings, header, footer.
* `pages/home.cjs` – the home page.
* `prep.cjs` – uploads `assets/` to the Media Library and creates the menu.
* `tools/lighthouse.sh` – Lighthouse mobile + desktop for a page.
* `plugin/junk-ninja-site/` – the site plugin.
* `deploy.cjs` – `node deploy.cjs [kit] [chrome] [home]` (no args = all). Needs `WP_URL`, a logged-in
  Playwright `STATE` file and `PREP` (media and menu IDs written by prep.cjs).
  Redeploying a page replaces it: check for edits made in Elementor first.

## Still open
* Photos not yet supplied as files show a striped "Photo to come" image: services Residential, Appliances,
  House & Estate, Yard Waste, Construction Debris; all before/after photos except the first garage "after".
* Reviews are placeholders (need real Google reviews and the review link).
* FAQ "How soon can you do it?" has a neutral holding answer pending the client.
* Form email goes to the admin email; switch to junkninjallc@gmail.com at launch. Housecall Pro not wired.
* Add the street address (if the client wants it public) and Google Business Profile link to `jn_business()` / schema.
