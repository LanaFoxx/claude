# Framework Speed (fw-speed)

A front-end performance plugin for frameworkorgdev.co (Elementor and Hello theme on GoDaddy Managed WP).

It applies to logged-out front-end requests only. It is skipped for logged-in users, the Elementor editor/preview, and REST, AJAX and feed requests.
Turn it off for one request with `?fws_off=1`, or turn off only the CSS purge with `?fws_nopurge=1`.
To revert everything, deactivate the plugin.

## What it does
- **Fonts**: drops the unused Adobe Typekit kit and Elementor's Google Fonts requests (every weight of Roboto, Roboto Slab and Montserrat). It self-hosts only what the pages use: Montserrat variable (300–900) latin, Montserrat 600 italic and Roboto 400. Montserrat is preloaded.
- **CSS**: inlines local stylesheets (no render-blocking requests), rewrites relative `url()` paths, and drops `wp-components` and the admin design tokens. A conservative unused-CSS purge (`purge.php`) removes a rule only when a class it requires appears nowhere in the page markup, in inline scripts, or in the page's own JS files, and isn't on the runtime safelist (Swiper, Elementor sticky/motion, SmartMenus, etc.).
- **Rendering**: puts `content-visibility:auto` on page sections from the 4th onward.
- **JS**: jQuery, Elementor and Elementor Pro scripts are held and run in their original order on the first user interaction (scroll, touch, key, real mouse move). All of them are preloaded in parallel at that moment. jQuery `ready` is held until the whole queue has run. A click on a menu toggle or a JS-only link made while loading is replayed afterwards. GoDaddy's traffic/RUM scripts load after that.
- Removes the emoji detection script.

Cached CSS is stored in `fws_css_*` transients and cleared when Elementor regenerates CSS and on plugin updates.
