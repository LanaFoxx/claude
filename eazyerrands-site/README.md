# Eazy Errands – AHCA compliance update (2026-10-27)

Eazy Errands LLC is registered with Florida AHCA (License No. 242370) and has completed background screenings.
These scripts applied the website wording updates on https://eazyerrands.com through the Elementor editor
(Elementor validates the data and regenerates CSS).

* `content.cjs` – every change, per Elementor document: 55 Home, 682 About Us, 976 Services, 645 FAQ, 60 Footer (site-wide).
* `apply.cjs` – `node apply.cjs <docId ...>` runs those ops in the editor and publishes. Needs a logged-in Playwright
  storage state in `state.json` (not committed).
* `polish.cjs` – follow-up: centred two-tone headings on tablet/mobile, widened the hero tagline.
* `backup-2026-10-27/` – each document's Elementor data **before** the change (for rollback).

Note: the new FAQ item was inserted with `document/repeater/insert`, which appends the nested content slot at the end;
it was moved into position afterwards (slot `1cd1b22` → index 3 of accordion `8b0b720`).
