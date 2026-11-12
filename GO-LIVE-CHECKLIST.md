# Website go-live checklist

Run every item before (and right after) any website goes live. Report each one as done, skipped (with the reason) or blocked.

## 1. Safety
- [ ] Full backup before changes (All-in-One WP Migration or host backup); note the file name.
- [ ] Never overwrite live pages without the client's approval; build previews first when asked.

## 2. WordPress, theme, plugins
- [ ] WordPress core on the latest version.
- [ ] Only theme installed: **Hello Elementor** (latest). Every other theme deleted.
- [ ] **Elementor + Elementor Pro** installed, active, latest.
- [ ] Every plugin up to date.
- [ ] Unused plugins deactivated **and deleted** (check content, shortcodes, front-end assets and settings first). Keep only what the site uses. Ask before removing anything that may be used outside the site (backups/management connectors, chat, CRM).
- [ ] Old Theme Builder parts, saved templates and popups that nothing uses moved to Trash.

## 3. Build (easy for the client to edit)
- [ ] Every page built with **native Elementor widgets** (Heading, Text Editor, Image, Button, Icon List, Form, Posts, Nav Menu, Loop Grid…), containers for layout, global colors and fonts in the Site Kit.
- [ ] HTML widgets only where nothing else works, kept small. No pages pasted in as raw HTML.
- [ ] Custom CSS only on the widget that needs it, kept short.
- [ ] Header, footer, single post, blog archive and 404 built as Elementor Theme Builder templates.
- [ ] Content the client updates often (prices, stats, listings) easy to find from the WordPress dashboard.
- [ ] WordPress dashboard simplified for the client: no plugin nags, short menu, quick links.

## 4. Brand and sharing
- [ ] Site name (Settings › General) and tagline set.
- [ ] Site logo set.
- [ ] Favicon / site icon = the icon from the logo (512×512 PNG, square, readable at 16px).
- [ ] Link-preview image (Open Graph / X card): **1200×630**, logo fully visible with safe margins, nothing cropped, under 300 KB. Pages without their own image use it.
- [ ] Test a link preview (paste a URL in a chat app, or use a sharing debugger).

## 5. Google search (on-page SEO)
- [ ] Every page: unique title ≤ 60 characters, meta description 120–160 characters.
- [ ] Exactly one H1 per page; H2/H3 in logical order (no skipped levels used for styling).
- [ ] Clean URLs; old URLs that changed 301-redirect to the new ones (check printed/QR links).
- [ ] XML sitemap lists every live page and nothing that redirects or is noindex.
- [ ] robots.txt allows crawling (and the sitemap is listed); no stray noindex.
- [ ] Image alt text on every meaningful image.
- [ ] Internal links between related pages; no broken links (404s).
- [ ] Structured data: Organization/LocalBusiness (or the right type), BreadcrumbList, Article on posts, FAQPage where there are FAQs. Validate it.
- [ ] Google Search Console: sitemap submitted, key pages inspected.

## 6. AI search (ChatGPT, Perplexity, Google AI)
- [ ] robots.txt allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended.
- [ ] llms.txt present and accurate (services, areas, contact, key pages).
- [ ] Clear, factual answers on the page: who, what, where, prices, contact; FAQ sections with direct answers.
- [ ] Consistent name, address, phone everywhere (site, schema, Google Business Profile).

## 7. Devices and visual check
- [ ] Every page checked at phone (~390px), tablet (~820px) and desktop (~1440px).
- [ ] No sideways scrolling, overlapping or cut-off text, broken images or console errors.
- [ ] Tap targets at least 44px on touch screens; body text at least 16px on phones.
- [ ] Forms submit (one real test each, with the client's OK) and arrive where expected.
- [ ] Screenshots reviewed by eye, not just by script.

## 8. Speed (PageSpeed Insights)
- [ ] Target **95+** (as close to 100 as possible) on mobile and desktop for every page.
- [ ] Images: WebP/AVIF, sized for their display width, lazy-loaded below the fold; hero image preloaded.
- [ ] Minimal CSS/JS per page; no unused plugin assets; fonts preloaded or local.
- [ ] Page caching on; good Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms).

## 9. Media library
- [ ] Delete images that are not used anywhere on the live site or staging (left over from other projects or old designs). Check pages, posts, templates, Elementor data, widgets, theme settings and featured images before deleting.

## 10. Hand-off
- [ ] Commit and push the build scripts.
- [ ] Send the client the live links and what they can edit and where.
