# Magnolia Property Care — WordPress theme

Built from the Claude Design project `Magnolia Property Care.dc.html`.

## Install

1. In WordPress go to **Appearance → Themes → Add New → Upload Theme**, choose
   `magnolia-property-care.zip` and click **Install Now**, then **Activate**.
2. Go to **Appearance → Magnolia Setup**. It lists the pages already on the site.
   Leave "Move all of these pages to the Trash" ticked, check the estimate email
   address, and click **Set up Magnolia site**.

Setup:
- moves the existing pages to the Trash (restorable from Pages → Trash)
- imports the logos and photos into the Media Library
- creates Home, About Us, Services, Past Projects and Contact, and sets Home as the front page
- switches permalinks to `/page-name/` if they were plain
- sets the site title to "Magnolia Property Care" (optional)

The Contact page form emails requests to the address set on the setup screen.
Page content is stored as Custom HTML blocks, so text can be edited in the page editor.

## Rebuilding from the design

`tools/` holds the conversion scripts: `unpack.py` extracts the exported
Claude Design HTML, `render2.js` renders each screen with Playwright, and
`build.py` writes the generated theme files (content, header, footer, form,
stylesheet). The PHP in `functions.php`, `inc/`, `page.php`, etc. is hand-written.
