# Nick Ponte Realty – "Coastal Light" preview

Builds the design handoff (homepage + 12 town market pages) on nickponterealty.com as **preview pages only**.
Nothing live is changed: no existing page, the front-page setting, or the live Astra/Elementor header and footer.

| Preview | URL |
| --- | --- |
| Review hub for the client | `/design-preview/` |
| Homepage | `/home-preview/` |
| Town pages | `/town-preview/<town>/` (rye, portsmouth, hampton, north-hampton, new-castle, exeter, stratham, greenland, seabrook, hampton-falls, newington, dover) |

All preview pages are `noindex, nofollow` (Rank Math and core robots filters) and left out of the sitemaps.

## How it works

* `plugin/nickponte-coastal` – WordPress plugin "Nick Ponte Coastal Light (preview)". Deactivate it to remove every preview.
  * Registers the **Town** post type (`np_town`, admin menu "Towns (preview)") with a "Monthly market snapshot" box:
    intro, snapshot month, median / days on market / active / sale-to-list / sold, 12-month trend, Nick's read,
    neighborhoods (`Name | note` per line), recent sales (`Street | meta | price | side | closed | image URL`),
    a "sample data" note toggle and the Zillow link toggle. Featured image = town photo. Order = Page Attributes > Order.
  * Page templates "Coastal Light – Home (preview)" and "Coastal Light – Review hub". The templates print their own header and
    footer and drop the theme/Elementor CSS on those pages only.
  * Town pages emit FAQPage + RealEstateAgent/LocalBusiness JSON-LD; title "Top Realtor in {Town} NH | Nick Ponte".
  * The off-market email form posts to the site's existing Elementor Pro form (footer template 295, form `bd8b8a8`),
    so it uses the same email action as the live footer form. It was not test-submitted, because that would email Nick.
* `content/towns-source.cjs` – sample town data from the prototype. **All market numbers are placeholders.**
* `media/` – optimized images uploaded as `npc-*` media (387 Ocean rendering is now a local copy).
* `deploy.cjs` – `WPU=... WPP=... node deploy.cjs [plugin] [media] [home] [review] [towns] [--reseed]`.
  Existing towns keep the owner's edits unless `--reseed` is passed.

## Going live (only after client approval)

Not done yet. Plan: point the real homepage and `/nickponterealty-com-realtor-<town>-nh/` URLs at these templates
(keeping their URLs and Rank Math SEO), remove the noindex, and enter real market figures.
