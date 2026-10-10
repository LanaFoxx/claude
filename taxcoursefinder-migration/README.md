# taxcoursefinder.com migration (Claude Design → WordPress/Elementor)

Converts the Claude Design handoff (`*.dc.html`) into Elementor pages on taxcoursefinder.com.

- `build/tcf-runtime.js` – small vanilla-JS runtime (sc-for / sc-if / `{{ }}` templates) + adapter mapping `/wp-json/tcf/v1/providers` onto the design's data model. Loaded site-wide from the Elementor header template.
- `build/site.css` – design globals, hover states, theme resets, tablet/mobile rules.
- `build/pages/*.json` – per-page HTML widget (server-rendered HTML + template + component code).
- `build/hf.json` – header/footer markup (Elementor templates 40/41).
- `seo.json` – Yoast titles / meta descriptions / focus keyphrases; `alts.json` – media alt text.

Pipeline: `pre.py` → `extract.mjs` → `build.py` → `ssr.mjs` (renders each page with live provider data) → `publish.py hf|content`.
`wp.py` expects a logged-in cookie jar (`cj.txt`, not committed) in the scratch directory.
