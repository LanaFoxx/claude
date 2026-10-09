# Bayfield Inn homepage – Elementor build

Builds the Claude Design "Bayfield Inn Homepage" handoff as native Elementor content on
staging152.dreamweb.digital. No HTML widgets: every heading, paragraph, button, image, slide,
link, icon and color is a normal Elementor control the client can edit.

## What gets built

* **Home** (static front page): hero copy + fading Slides widget (4 slides, captions, bars, arrows),
  "Est. 1898" intro, Rooms & Suites cards, Dining (The Deck) split, Weddings & Events split.
* **Bayfield Inn Header** / **Bayfield Inn Footer** Theme Builder templates (Entire Site).
  The nav uses the WordPress menu **Bayfield Main Menu**.
* Site title "Bayfield Inn", tagline, favicon (white logo on brand green).
* Elementor › Custom Code snippet **Bayfield fonts** loads Geist + Newsreader from Google Fonts
  (Geist is not in Elementor's built-in font list).

The design's Standard Rooms card had an empty photo slot, so it uses Elementor's placeholder
image until a photo is chosen.

## Responsive behaviour

Tablet ≤1024px, mobile ≤767px. Hero stacks (copy above slider) on tablet and mobile; room cards
3 → 3 → 1; Dining/Events 2 → 2 → 1; footer 4 → 2 → 1; nav becomes a hamburger on tablet and
mobile, phone number hidden on mobile; headings and section padding step down.

## Files

* `build.cjs` – design tokens, helpers, header, footer, homepage element trees.
* `deploy.cjs` – `node deploy.cjs [prep] [chrome] [home]` (no args = everything). Needs
  `WP_URL`, a logged-in Playwright storage state (`STATE`) and `MEDIA` (folder with the images
  extracted from the design bundle). IDs are cached next to the state file.
