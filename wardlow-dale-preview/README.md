# Wardlow & Dale – new Home preview (staging129)

The design reference (`wd-redesign-package/design/home.html`) built as native Elementor content at
**https://staging129.dreamweb.digital/new-design/**, without changing anything that already existed on staging.

## What was created (change log)

| ID | Type | Name |
| --- | --- | --- |
| 1216 | Page (Elementor Canvas, published) | New Design – Home (`/new-design/`) |
| 1210 | Saved Container template | WD 2026 – Header |
| 1213 | Saved Container template | WD 2026 – Footer (compliance strip and phone action bar included) |
| 1230 | Elementor Custom Code (`<head>`, condition: Page #1216 only) | WD 2026 – Preview noindex |
| 1183–1209 | Media | `wd-2026-*` (5 headshots, 3 logos, signature, 2 watermarks, Atlanta photo, 3 practice photos, 3 thumbs, 9 SVG icons) |

Existing media reused as is: 1172 `Sara-Torrie-Partners.jpg` (hero) and 1173 `Angela.jpg` (team).
Nothing else was added: no Theme Builder templates or conditions, menus, Kit or Site Settings changes, plugins, users or theme files.

## Files

* `lib.cjs`: tokens and Elementor JSON helpers. Every container is a Flexbox Container set to Full Width.
* `build.cjs`: header, footer and page element trees (native widgets, plus one HTML widget for the phone bar and textarea counter script).
* `css/`: scoped CSS (`#wd-2026 …`). `base.css` is shared, and the header, footer and page each get their own file, saved as document Custom CSS.
* `deploy.cjs`: creates/publishes the two templates and the page through the Elementor editor.
  `STATE=state.json MEDIA=media.json WD_FORM_EMAIL=… node deploy.cjs [header] [footer] [page]`
* `rollback.cjs`: deletes only the items above (dry run unless `--delete`; checks each label first).
* `snapshot.py`: builds the before/after snapshot (ID, post_modified, `_elementor_data` and meta hashes, conditions) from a WXR export.
* `tools/`: login (credentials from env), WXR export, media upload, screenshots/layout checks (`shots.cjs`), interaction QA (`qa.cjs`).

## Token values set directly on widgets (move to Site Settings at launch)

Global Colors/Fonts were not touched. Every Heading, Text Editor, Button, Icon, Icon List and Form widget carries the SPEC.md hex value and
Manrope typography itself (see `T` in `lib.cjs` and the `typo()` calls in `build.cjs`): Ink, Stone, Evergreen, Brand Green, Gold Leaf (+ hover),
Antique Gold, Mist, Ivory/Linen/White backgrounds, Rule and Field borders (in CSS), Error (form). Breakpoint changes at 1180/980/600 live in the scoped CSS,
because the site's Elementor breakpoints are 1024/767 and were left alone.

## Deviations from the brief

* **Backup**: no SSH/WP-CLI access, so `wp db export` was not possible. Instead: a full All-in-One WP Migration backup (database and files,
  `staging129-dreamweb-digital-20261112-161149-….wpress`, 490 MB, in WP-Admin › All-in-One WP Migration › Backups) and a WXR export kept with the before/after snapshots.
* **No SEO plugin is installed**, so noindex/nofollow is done with a Custom Code `<meta name="robots">` limited to page 1216. The page is still listed in
  WordPress's own `wp-sitemap.xml` (it can't be excluded without code or a plugin). staging's robots.txt already disallows everything.
* **Headshots and logo**: the originals on staging have no alt text (and the logo's fallback would be "1"), and existing media can't be edited, so
  WebP copies with SPEC.md alt text were uploaded (`wd-2026-headshot-*` cropped 4:5 from the staging originals; logo from the package).
* `#wd-2026` is used as the top container ID on the page and on both templates, as asked, so the ID appears three times in the page HTML.
* Header nav items are links to `#` (no dropdowns yet), and the menu icon links to `#`. The review prev/next buttons are static placeholders, as in the reference.
* The text-field focus style is the reference's 2px Evergreen border (not an outline).
