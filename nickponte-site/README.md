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

## Client review round 1 (Markup.io, Nov 2026)

Applied from Nick's comments on the homepage preview:
* Hero uses Nick's own Hampton Beach drone photo (replaces the stock Rye aerial); contact panel uses his seawall photo.
* Testimonial rotates between three real reviews from the live site, over his Rye coast photo.
* Instagram row (existing Smash Balloon feed 1) between the reviews and the valuation form.
* New "What is your home worth?" section (#valuation). It posts to the existing Elementor valuation form
  (page 5644, form `4acdcf3`: address, name, email, phone), and every "Free home valuation" link points to it.
* Resources section: Buyer Guide, Seller Guide and the 3 latest blog posts.
* Exeter town page uses his downtown Exeter photo; the portrait no longer lazy-loads.
* Still waiting on Nick: "As seen in" logos and links, photos for the other towns.

## Client review round 2 (Markup.io, Nov 2026)

* Header and footer use Nick's new navy/steel logo (`npc-logo-navy`); the white version (`npc-logo-reversed`) is uploaded for dark backgrounds.
* Buyer and Seller Guide pages restyled as previews: `/buyers-guide-preview/` and `/sellers-guide-preview/` (template
  "Coastal Light – Buyer/Seller Guide (preview)"). Their download forms post to the live guide pages' existing Elementor
  forms (5725 / `969c00c`, 5742 / `eb8b9a0`) with the same fields and consent checkbox. The homepage Resources cards and the
  review hub link to these previews. The live `/buyers-guide/` and `/sellers-guide/` pages are unchanged.

## Round 3 (while waiting on Nick)

* Featured Sales preview (`/featured-sales-preview/`): 6 properties, video tours load only on click. The live page's music
  is a hidden Elementor video widget (98 Beach Hill Road, `bab47ee`) set to autoplay; its property photos are also broken.
* Town pages: Nick's long-form town text (neighborhoods, market, schools, things to do) carried over from the current town
  pages (`content/town-pages-live.json`) into a new "Town guide (long text)" field; real median prices (and days on market
  where the page had them) replace the samples; his own drone photos for New Castle, Hampton and Newington, a licensed stock
  mill photo for Dover; sale thumbnails from his video tours.
* Speed/accessibility: theme/plugin CSS the design doesn't use is dropped on these pages, the main photo is preloaded,
  low-contrast grey text darkened, text links underlined. Lighthouse (mobile): home 78, Rye 89, accessibility 98–99.
  The rest is site-wide scripts (Google Tag Manager, Crisp chat, jQuery), to tackle at launch.

## Going live (only after client approval)

One reversible switch: `node deploy.cjs golive` (or Settings > Reading > "Coastal Light design is live").
* The design renders on the EXISTING pages: homepage (2579), Featured Properties (590), Buyer/Seller Guide (5725/5742)
  and the 10 town pages (`NPC_LIVE_TOWNS`), so URLs and Rank Math titles/descriptions stay. Their Elementor content
  is not touched.
* Preview URLs 301 to the real pages; Seabrook and Hampton Falls (no existing page) move to `/nh-towns/<town>/`.
* Noindex comes off everywhere except the review hub.
* `node deploy.cjs rollback` puts the old pages back instantly.

Launch checklist: real numbers in (or untick "Figures are sample data" only where they are real), test-submit each form once,
switch on, check the 14 URLs, update the site logo/icon in Astra and the Elementor header for the rest of the site,
then delete `/design-preview/`.
