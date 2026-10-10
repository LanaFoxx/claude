# Cabrera Torres Law website – Elementor build

Builds the Claude Design homepage (`Cabrera Torres Law - Homepage.html`) as native Elementor content on
WordPress (Hello Elementor + Elementor Pro). No HTML widgets: every heading, paragraph, button, image,
link, list, tab, FAQ item and form field is a normal Elementor control the client can edit.

## What's on the site

| Item | Notes |
| --- | --- |
| Home (front page, `/`) | Hero, recognition marquee, case results, about Jennifer, quote band, practice-area tabs, testimonials, FAQ accordion (FAQPage schema), legal resources, contact form |
| **Cabrera Torres Header** | Theme Builder header, Entire Site: top bar + sticky nav (menu **Cabrera Torres Main Menu**, hamburger on tablet/mobile) |
| **Cabrera Torres Footer** | Theme Builder footer, Entire Site |

The previous site's header/footer templates were kept but unassigned (no display conditions).

## SEO

* Yoast SEO: organization "Cabrera Torres Law" (emblem logo), Home title / meta description / focus keyphrase
  set in `pages/home.cjs` (`seo`), applied through Yoast's Elementor integration.
* One H1 per page (hero kicker: "Personal Injury Lawyer · Norcross, Georgia"); every section title is an H2,
  card / tab / FAQ titles are H3. The "People First. Justice Always." slogan keeps its look but is a `<p>`.
* Every image is a Media Library attachment with alt text, title and description (`media.json`);
  photos converted to WebP with descriptive file names.
* Site title "Cabrera Torres Law", tagline "Personal Injury Lawyer in Norcross, Georgia", favicon made from the emblem.

## Not carried over from the design

* EN / ES language toggle (needs a multilingual plugin such as WPML or Polylang plus Spanish pages).
* Resource cards and the footer Privacy Policy / Disclaimer links have no target pages yet.

## Files

* `lib.cjs` – design tokens, layout helpers, header, footer, page settings.
* `pages/home.cjs` – the homepage sections + Yoast fields.
* `media.json` – file name, title, alt text, description for each uploaded image.
* `deploy.cjs` – opens each document in the Elementor editor, replaces its content and publishes;
  creates the header/footer templates and sets/verifies their conditions; writes Yoast fields.
  `node deploy.cjs [unassign:<id>,<id>] [chrome] [home] [seo]` (no args = chrome + home + seo).
  Needs `WP_URL`, a logged-in Playwright storage state (`STATE`) and the uploaded media/menu IDs (`PREP`, JSON).
