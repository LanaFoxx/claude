# RecordFLOW website – Elementor build

Builds the 8-page Claude Design handoff (RecordFLOW redesign) as native Elementor content on the
WordPress site. No HTML widgets: every heading, paragraph, button, image, link, list, form and
color is a normal Elementor control the client can edit.

## Pages

| Page | Slug | Notes |
| --- | --- | --- |
| Home (front page) | `/` | Hero, partner-logo carousel, principles, problem, product cards, founder, legacy band, who uses, ROI, FlowSENSE, trial form, FAQ accordion |
| Product Overview | `/product-overview/` | Create / Collect / Connect + Control / feature checklist |
| FlowSENSE | `/flowsense/` | How-it-works stepper, specs, pricing |
| How-To Videos | `/how-to-videos/` | 8 video cards (linked containers) |
| About Us | `/about-us/` | Story, values, team grid |
| Contact Us | `/contact-us/` | Details + contact form |
| Terms of Service / Privacy Policy | `/terms-of-service/`, `/privacy-policy/` | 7 placeholder sections each |

Site-wide: **RecordFLOW Header** and **RecordFLOW Footer** Theme Builder templates (condition: Entire Site),
nav uses the WordPress menu **RecordFLOW Main Menu**.

## Widgets used

Container (flex + grid), Heading, Text Editor, Button, Image, Icon, Icon List, Divider,
Image Carousel (partner logos), Nested Accordion (FAQ), Nav Menu, Form (newsletter, homepage question, contact).

## Responsive behaviour

Breakpoints: tablet ≤1024px, mobile ≤767px. Grids step down (e.g. 4 → 2 → 1 cards), two-column
sections stack on mobile (most also on tablet), headings scale (h1 58/46/38, h2 44/36/30), section
padding and gutters shrink, the nav becomes a hamburger on tablet and mobile.

## Files

* `lib.cjs` – design tokens, layout helpers, shared sections (sub-page hero, CTA band), header, footer.
* `pages/*.cjs` – one module per page.
* `deploy.cjs` – opens each document in the Elementor editor, replaces its content and publishes;
  creates missing pages and the header/footer templates and sets their conditions.
  `node deploy.cjs [chrome] [page-slug ...]` (no args = everything). Needs a logged-in Playwright
  storage state (`STATE`) and the uploaded media/menu IDs (`PREP`, JSON).

## Performance (live site, Nov 2026)

PageSpeed work on myrecordflow.com was applied in place, because the client edits the live pages in
Elementor. Do not redeploy a page from `pages/*.cjs` without first checking for their edits.

* ElementsKit Lite is deactivated: no page uses its widgets, but its CSS and JS loaded everywhere.
* Elementor > Settings > Performance has "Load Google Fonts locally" turned on. The Default Kit's
  Roboto globals now use Figtree, so Roboto no longer loads; the form fields use it.
* Images: the client's 1080x1920 PNG phone mockups (up to 2.6 MB), `Map_Desktop.png`, the hero,
  the headgate and canal photos, and the logos were re-encoded as WebP. They were uploaded as new
  media with alt text, and the Elementor data was repointed to them. The originals are still in the
  Media Library.
* Custom Code `snippets/hero-preload.html` preloads the homepage hero (LCP). Update it if the hero
  image changes. `snippets/a11y-fixes.html` gives the skip link a target, underlines links in body
  text and gives carousel arrows a 24px tap target.
* Small text on light backgrounds uses `C.mutedText` (#667085) for WCAG contrast. The app-tour
  inactive items dim to .85 instead of .55. The site icon was replaced, because the old 32px file
  was a 404.
* `tools/lighthouse.sh` runs Lighthouse for a page.

The remaining mobile blocking time comes from Google Tag Manager (Site Kit), reCAPTCHA v3 on the
contact and quote forms, and Elementor's own jQuery front end.
