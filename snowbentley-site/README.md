# Snow Bentley Realty – WordPress / Elementor rebuild

Clone of snowbentley.com (Luxury Presence) as native Elementor content on **staging195.dreamwebdigital.com**.
Homepage from the Claude Design handoff (`source/HANDOFF.md`, `source/Home.dc.html`); every inner page
rebuilt from the live site's content (`source/content.json`, extracted by `tools/extract.cjs`).

## What's on the site

| Piece | Where |
| --- | --- |
| Header (fixed, transparent over hero, hides on scroll down / cream on scroll up, two logos) | Theme Builder → **Snow Bentley Header** (Entire Site) |
| Footer + floating "Let's Connect" pill | Theme Builder → **Snow Bentley Footer** (Entire Site) |
| Full-screen menu (hamburger) | Popup → **Snow Bentley Menu** |
| "Let's Connect" drawer with form | Popup → **Snow Bentley Let's Connect** |
| 32 pages | Home (front page), about, contact, residential, commercial, done-deals, what-were-looking-for, home-valuation, neighborhoods (+10 detail pages), testimonials, blog, buyers, sellers, guides, terms-and-conditions, review-site, properties (+sale, sold), home-search (+listings) |

All copy, links, images and colors are normal Elementor widgets. The one HTML widget (top of the header,
`lib/site.html`) holds the site CSS and a small script for the interactive parts:

* `.sb-switch` – testimonial slider, neighborhood switcher, demographics/school tabs (`.sb-panel`, `.sb-tab`, `.sb-prev`, `.sb-next`). In the editor all panels show stacked so each can be edited.
* `.sb-quote` – long testimonials truncate with Read More / Read Less; `.sb-more` – collapsible About bio.
* Scroll-aware header, Google Translate behind "Select Language", hero scroll-down arrows.
* It also strips the old `dwd-projects` plugin's site-wide CSS (it forces its own font on every element).

Forms (Let's Connect, contact, newsletter, guide requests, Stay Connected) use Elementor Pro Forms: entries are
saved under Elementor → Submissions and emailed to the WordPress admin address. The hero search and home-value
forms redirect to `/home-search/listings/?keyword=…` and RealScout.

## Not cloneable / to wire up before launch

* **IDX** – RealScout web components (Snow's existing RealScout account, agent id `QWdlbnQtMjgxNzU1` in
  `lib/core.cjs`): `/home-search/` + `/home-search/listings/` have the search form and live listings, residential /
  commercial / properties/sale show active listings, properties/sold shows sold ones; "My Search Portal" opens
  snowbentley.realscout.com. The script loads only on pages with a widget. Neighborhood pages link to the search page
  (RealScout widgets can't filter by city). Note the listings widget shows the *office's* listings (eXp), as RealScout defines them.
* **Guide PDFs** – the Guides page forms collect leads; attach the PDFs/autoresponder.
* **Form recipients / CRM** – set `email_to` (currently the WP admin email) and any CRM integration.
* **/review redirect** – add a 301 from `/review` to the Google review link (`LINKS.review` in `lib/core.cjs`).
* **SEO** – Yoast titles/descriptions per page are in `source/content.json` (`title`, `description`).

## Changes made to the existing staging site (reversible)

Recorded in `build/deployed.json` → `prep`:
* Old DWD pages renamed so the live URLs are free: about → `dwd-about`, contact → `dwd-contact`, blog → `dwd-blog`.
* Old DWD theme header (#3294) and footer (#3162) set to Draft.
* Site title → "Snow Bentley Realty"; front page → the new Home page (old values in `prep.settingsBefore`).

## Build

```
STATE=state.json node tools/extract.cjs      # live site -> source/content.json (optional, already done)
STATE=state.json node tools/media.cjs        # LP CDN -> WP media library, writes build/media.json
STATE=state.json node deploy.cjs [prep] [chrome] [home|pages|hoods|<page-path> ...]
STATE=state.json node tools/purge.cjs        # Elementor CSS + W3TC + SiteGround caches
```

`STATE` is a Playwright storage state of a logged-in admin session (not committed).
New pages are created by duplicating the Home page (Elementor 4.3 can't save a page created empty over REST).

Files: `lib/core.cjs` tokens + Elementor JSON helpers, `lib/chrome.cjs` header/footer/popups,
`lib/sections.cjs` one builder per section type, `pages/home.cjs`, `pages/index.cjs` page registry.
