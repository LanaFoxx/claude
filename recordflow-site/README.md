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
