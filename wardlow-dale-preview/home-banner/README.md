# Home banner (client request, Nov 19 2026)

The client chose not to use the new design. Their banner ("Injured in a car accident?") replaces only the
hero section of the existing staging Home page (ID 457), rebuilt as live text. The rest of Home is unchanged,
and the /new-design/ preview and all its items (page, templates, snippet, 27 media) were deleted with `../rollback.cjs`.

* `deploy-banner.cjs`: builds the banner section and swaps it in (finds the original hero `32e60168` or an earlier banner by its title).
* `upload-banner.cjs`: uploads the banner photo crop and the three gold icons (media 1267–1270, `wd-home-banner-*`).
* `restore-hero.cjs` + `home457-before-20261119.json.gz`: full Elementor backup of Home taken before the change; the script puts the old hero back.

Notes: the photo is cropped from the client's 1644×654 banner (left edge faded into the green), so it is soft on large/retina
screens until we get the original. Headline font is Cinzel (closest Google font to the banner's serif); tagline and labels use Poppins like the rest of the site.
The banner's logo is left out because the site header directly above already shows it. The existing "Free case evaluation" button was kept (restyled gold; still links to `#` and is still hidden on phones, as before).
