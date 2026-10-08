# Magnolia Property Care — Elementor Pro site

Built from the Claude Design project `Magnolia Property Care.dc.html` for the
**Hello Elementor** theme and **Elementor Pro**.

## Install

1. Make sure **Hello Elementor** is the active theme and **Elementor** and
   **Elementor Pro** are active.
2. **Plugins → Add New → Upload Plugin**, choose `magnolia-importer.zip`,
   **Install Now**, then **Activate**.
3. **Tools → Magnolia Importer**. Leave "Delete all of these pages" ticked, check
   the email address for estimate requests, and click **Build the site**.
4. When it says Done, deactivate and delete the importer plugin. Everything it
   built lives in Elementor.

The importer:
- moves the existing pages to the Trash (restorable from Pages → Trash)
- imports the logos and photos into the Media Library
- builds Home, About Us, Services, Past Projects and Contact with native
  Elementor widgets (Elementor Full Width template, title hidden) and sets Home
  as the front page
- creates a Theme Builder **header** (sticky, hamburger menu on tablet and
  mobile) and **footer**, both set to show on the entire site
- creates the "Magnolia Main" menu used by the header
- adds the "Request an Estimate" **Elementor Pro form** on the Contact page
  (submissions also appear under Elementor → Submissions)
- sets the global colours, fonts (Marcellus + Jost) and custom CSS in
  Site Settings
- sets the site title to **Magnolia Property Care** and the favicon to the
  magnolia icon
- switches permalinks to `/page-name/` if they were plain

Every section has tablet (≤1024px) and mobile (≤767px) settings.

## Things to finish by hand

- **About Us:** the owner portrait is an Elementor placeholder image. Replace it
  with a photo of Heys.

## Rebuilding the data

`elementor/build_elementor.py` generates `magnolia-importer/data/*.json` (the
Elementor page, header, footer and kit data). Edit it and run:

```
python3 elementor/build_elementor.py magnolia-importer/data
```

`elementor/unpack_design.py` extracts the assets from an exported Claude Design
HTML file.
