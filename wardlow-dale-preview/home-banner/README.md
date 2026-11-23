# Home hero photo (client request, Nov 2026)

Current state on staging Home (ID 457): the ORIGINAL hero is in place (same wording, button, courthouse background),
with one addition: the photo of Sara and Torrie from the client's banner, bottom-right of the hero (media 1283,
`wd-home-hero-partners.webp`, left/top edges faded to transparent so it blends into the background).
Above 1180px it sits to the right of the text; at 1180px and below it moves under the text.

* `add-hero-photo.cjs`: adds (or replaces) that one Image widget in the hero. Nothing else in the hero changes.
* `restore-hero.cjs` + `home457-before-20261119.json.gz`: Elementor backup of Home from before any change; the script swaps
  a "Home banner" section back to the original hero (used on Nov 23 to undo the full banner rebuild).
* `deploy-banner.cjs`: the full-banner rebuild from Nov 19 (no longer live; kept for reference). Its media (1267–1270) was deleted.
* `upload-banner.cjs`: media upload helper (`PATTERN=… node upload-banner.cjs <dir> <out.json>`).

The /new-design/ preview and all its items were deleted on Nov 19 with `../rollback.cjs`.
The photo is cut from the client's 1644×654 banner screenshot and still carries that banner's green background;
a full-resolution original or a cut-out of the photo would make it sharper and blend perfectly.
