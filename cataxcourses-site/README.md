# cataxcourses.com – Oxygen → Elementor Pro migration

Goal: rebuild every page in Elementor (Pro) from the Claude Design handoff, keeping every URL,
Yoast title and meta description unchanged. Pages are built and tested as **private** preview pages
first; the original pages are only overwritten at go-live, after approval.

## Current site (audited 2026-10-13)

* Builder: Oxygen 4.8.3 (+ OxyNinja, Oxygen Elements for WooCommerce, Oxygen Gutenberg, Oxy Transfer Pro).
  Active theme slot: Total (ignored while Oxygen is active). Hello Elementor installed, **inactive – leave it until go-live**.
* Elementor (free) 4.3.5 installed + active on 2026-10-13; Flexbox Container feature enabled.
  Elementor Pro is **not installed** yet (needs the licensed zip from the client).
* WooCommerce store. Course "Order Now" buttons are the normal WooCommerce variation add-to-cart form;
  the *WooCommerce Direct Checkout* plugin sends every add-to-cart straight to `/checkout/` (cart skipped).
  Verified for all four packages (60 h video / video + book, 20 h video / video + book).
  New course pages must keep using the native WooCommerce add-to-cart form so this keeps working.
* Moodle: plugin *Enrolled Moodle Course* redirects `order-received` to the page using the plugin page
  template `thankyou.php` → **`/thank-you/` (page 5318)**. That template creates/enrolls the Moodle user.
  **Never change that page's template, never duplicate it, never give another page the `thankyou.php`
  template** (the redirect picks the last matching page). It calls `get_header()/get_footer()`, so after go-live it
  will simply pick up the theme/Elementor header and footer.
* Code Snippets in use: "If Already In Cart Skip To Checkout", "Remove Coupon Field From Checkout", "Flush".

## Preview mechanism

`wp/preview-snippet.php` is installed as Code Snippet **"CTC Elementor preview (temporary)"** (front-end).
For *private* pages using an Elementor page template it bypasses Oxygen's `template_include` and renders
Elementor canvas, wrapped in the draft header/footer library templates whose IDs are stored in the options
`ctc_preview_header` / `ctc_preview_footer`. Public pages are untouched. Delete the snippet at go-live.

Test pages to delete when done: 29035 `zz-elementor-test-canvas`, 29036 `zz-elementor-test-header_footer` (private).

## Go-live checklist (only after client approval)

1. Full backup (All-in-One WP Migration) + DB export.
2. Install/activate Elementor Pro, enter licence.
3. Header/footer: create Pro Theme Builder header/footer from the draft templates, condition *Entire Site*.
4. For each page: copy `_elementor_data`, `_elementor_page_settings`, `_elementor_edit_mode`, template from the
   private preview page into the **original page ID** (keeps slug, Yoast meta, menu links, front-page setting).
   Skip `/thank-you/` (Moodle) – leave template `thankyou.php`.
5. Activate Hello Elementor, deactivate Oxygen + Oxygen add-ons.
6. Test: every URL 200, Yoast title/description unchanged, Order Now → checkout for each package,
   test order → `/thank-you/` → Moodle enrolment e-mail.
7. Remove preview snippet + private preview pages.
