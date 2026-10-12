# Tax Course Finder – Directory Manager (WordPress plugin)

Manages every CTEC provider listing shown in the taxcoursefinder.com directory: 20-hour CE and 60-hour QE pricing, coupons and sales, Google ratings, and the course features the directory filters on. Replaces the older "Tax Course Finder Data Manager" plugin and keeps all of its data (same post type and field names).

Requires ACF Pro (already on the site).

## Where things are (WP Admin → Providers)

| Menu | What it does |
|---|---|
| All Providers | Every listing with price, offers, feature and Google columns. Filter for *No features set*, *Missing a price*, *Offer needs review* … |
| Add Provider | Create a listing by hand. Tabs: Overview, 20-Hour CE Pricing, 60-Hour QE Pricing, Course Features, Coupons & Sales, Google Rating, Verification & Links, Notes. |
| Import Data | Paste ChatGPT's reply (or upload .json / .csv) → preview every change → apply the rows you tick. |
| ChatGPT Prompt | Ready-made prompts: research all providers, update existing listings, or find missing providers. |
| Import History | Every import with its changes, and an Undo button. |
| Export | Download all listings as JSON or CSV (re-importable). |

## Monthly update workflow

1. **Providers → ChatGPT Prompt** → copy *Update my existing listings*, click *Download current data to attach*.
2. In ChatGPT (with web search on), paste the prompt and attach the file. It replies ~15 providers at a time.
3. **Providers → Import Data** → paste the reply → **Preview Import**.
4. Check the preview (red = old value, green = new). Untick anything you don't want, or change where a row goes. Then **Apply Checked Rows**.
5. The directory updates immediately. If something looks wrong, **Import History → Undo**.

## Import rules

- `null`, blank, or "unknown" never erases an existing value. To clear a field on purpose use `"clear_fields": ["field_name"]`.
- *Update* mode replaces existing values; *Fill gaps only* adds values only where the listing is empty.
- Providers are matched by CTEC number, then name or alias (punctuation, "Inc"/"LLC" ignored), then website domain. Unmatched providers can be added as new, skipped, or matched to an existing listing by hand.
- A provider with `"listing_status": "removed"` is set to draft (hidden).
- Coupons are matched by code and course, so re-importing updates them instead of duplicating.
- Coupons and offers only show on the site when they are active, not expired, and have a VERIFIED status. Imported codes without a source URL come in as *NEEDS REVIEW* (hidden) until you check them.
- Prices sort as flat prices only when the status is VERIFIED and the type is Complete Package (or Package Sale).

## Data feed

`GET /wp-json/tcf/v1/providers` returns published listings (cached, cleared automatically on every save and import). Each provider includes `features` (17 booleans), `offers` with a normalized `scope` (`ce` / `qe` / `both`), `logo_url` and `last_checked`.

## School pages (`/schools/{slug}/`)

Every provider has a school page built from the School Page design. It stays private until you switch
**School page live** on (School Page box → Status tab): until then visitors get a 404, it is `noindex`,
it is left out of the sitemap and the directory does not link to it. Editors always see a preview with a
yellow banner. Empty fields show "Not confirmed".

## Private provider profile form (`/provider-profile/`)

Schools fill in their own details here. The page is unlisted: not in any menu, footer or sitemap,
`noindex, nofollow`, no canonical or social tags, never cached.

- **Per-school link:** each provider's edit screen has a *School profile form* box with a private link
  (`/provider-profile/?t=…`). It pre-fills what we already have and ties the submission to that listing.
  *New link* replaces the token if a link gets passed around.
- **General link:** `/provider-profile/` with no token works for schools not yet listed; submissions are
  matched by CTEC number or name.
- **Review queue:** Providers → *Profile Submissions* (menu badge = awaiting review). You also get an email
  at the site admin address. Each submission shows *Listing now* vs *Submitted*; changed rows are pre-checked.
  Pick the listing (or create a new draft listing) and click **Apply checked fields to listing**.
- Applying never turns the school page live. School-reported prices are saved with status `REVIEW` and a
  note; mark them `VERIFIED` after you check them. A course marked "not offered" stores nothing else.
- Uploads: logo + up to 3 screenshots (PNG/JPG/WebP/GIF, 5 MB each) go to the Media Library with alt text.
- Spam controls: hidden honeypot field, a minimum fill time, and 6 submissions per hour per connection.
