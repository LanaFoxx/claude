# DWD Projects Portfolio (WordPress plugin)

Add a website project once and it shows up everywhere projects are displayed on dreamwebdigital.com:
the Portfolio grid, the homepage browser carousel, and its own case-study page at `/portfolio/<project>/`.

## Adding a project
1. **Projects → Add Project**, enter the project name and the live site URL.
2. Click **Capture screenshots**. The plugin (via the Microlink API) takes a full-page desktop
   screenshot, a phone screenshot, and reads the page's real section boundaries.
3. Review the sections: every image is previewed; click **Skip** on ones you don't want, drag a
   blue cut line to adjust, click the page to add a cut, or × to remove one.
4. **Save selected images** creates the section images, the cover image (portfolio card +
   carousel) and a phone mockup, and adds them to the project. Reorder or remove them anytime.
5. Fill in the details (industry, description, working together, review) and **Publish**.

## How sections are cut
Section edges come from the live page's layout (Elementor top-level containers/sections, or
`header`/`section`/`footer` elements on other sites). The site header is kept with the first
section and the footer with the last; thin strips (under 180px) stay with the section above.
If the layout can't be read, edges are detected from background colour changes in the image.

## Shortcodes
- `[dwd_portfolio]` — project grid
- `[dwd_project_slider]` — homepage carousel (projects with "Show on homepage" ticked)
- `[dwd_projects_cta]` — "Yours could be next" band

## Settings
**Projects → Settings**: optional Microlink API key (the free tier allows about 16 captures a
day), capture width, default project notes, and the call-to-action text.

**Projects → Import** moved the original hand-built project pages into Projects (old pages
were set to Draft, not deleted).
