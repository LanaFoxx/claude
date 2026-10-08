# RecordFLOW – How-To Videos (Elementor build)

Builds the Claude Design page `How-To Videos.dc.html` as native Elementor content on the
staging WordPress site. No HTML widgets – every heading, paragraph, button, image, link and
color is a normal Elementor control the client can edit.

## What gets created on the site

| Item | Type | Notes |
| --- | --- | --- |
| How-To Videos (page) | Elementor page, *Elementor Full Width* template | Hero, 8-card video library grid, CTA band |
| RecordFLOW Header | Theme Builder header | Logo, Nav Menu (hamburger on tablet/mobile), Log-in + Try Risk-Free buttons, sticky |
| RecordFLOW Footer | Theme Builder footer | Logo, link lists (Icon List), newsletter (Pro Form), bottom bar |
| RecordFLOW Main Menu | WP menu | Used by the header Nav Menu widget |
| `recordflow-*.png` | Media | Logo (black/white), brand mark (blue/white), hero dot pattern |

Header and footer display condition: *Include → Singular → Page → How-To Videos*.

## Responsive behaviour

* Desktop (>1024px): 3-column video grid, horizontal nav, 4-column footer.
* Tablet (≤1024px): 2-column grid, hamburger nav, 2-column footer, smaller headings.
* Mobile (≤767px): 1-column grid, hamburger nav, Log-in hidden, stacked footer, 20px gutters.

## Files

* `elements.cjs` – the Elementor element trees (containers + widgets) for header, page, footer.
* `deploy.cjs` – opens each document in the Elementor editor, replaces its content, publishes,
  and sets the Theme Builder conditions. Needs a logged-in Playwright storage state (`STATE`) and
  the IDs of uploaded media/page/menu (`PREP`, JSON).
