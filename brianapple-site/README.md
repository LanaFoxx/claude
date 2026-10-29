# Brian Apple Retirement Planning — Elementor build

Builds the Brian Apple site on `staging156.dreamweb.digital` (Hello Elementor + Elementor Pro) from the
design files (desktop, mobile, signup landing). Everything is native Elementor content, so it stays editable
in the Elementor editor.

| Page | URL | Notes |
|---|---|---|
| Home | `/` | hero, value prop, 3 steps, audiobook form, FAQ teaser, CTA, webinar form |
| Services | `/services/` | three service tiers with fees |
| About Brian | `/about/` | bio, headshot, credential cards |
| FAQs | `/faqs/` | accordion (7 Q&As, FAQ schema on) |
| Contact | `/contact/` | contact form |
| Legal & Compliance | `/legal-compliance/` | disclosures |
| Free Resources | `/free-resources/` | signup landing, Elementor Canvas (no site header/footer) |

Header and footer are Theme Builder templates (`templates.json`) set to *Entire site*. The menu is
"Brian Apple Main". Styles live in **Site Settings → Custom CSS** (`site.css`, scoped automatically by
`setup.py`); elements use `ba-*` CSS classes.

## Re-running

```bash
pip install requests
export WPPW='…'          # WP admin password (WPUSER optional)
python3 setup.py kit     # global colours, fonts, custom CSS
python3 site.py header footer home services about faq contact legal signup
```

`setup.py menu` and `setup.py templates` were one-time steps (they create the menu and template shells).
Re-running `site.py` overwrites the Elementor content of those pages — Elementor keeps revisions.
