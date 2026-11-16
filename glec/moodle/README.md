# GLEC Moodle theme (`theme_glec`)

Boost child theme for Moodle 3.11 (the live LMS runs 3.11.18, PHP 7.4) that matches the new website.
Course content, activities, completion rules and certificates are unchanged; this is design only.

## What students get
- **Header** matching the website: GLEC logo (links to the main site), My courses, Log out. Slim navy footer.
- **Course page** (`course/view.php`): code pill, course name, progress (X of Y lessons · %), access end date
  (from the enrolment), class type, a primary button (Start class / Continue: next lesson / Print your certificate),
  8 px progress bar. Sections are collapsible; the one with the next lesson opens. Each lesson row shows
  Complete / Not started / Locked with icon and text. Side cards: certificate (locked with "N lessons to go", or
  ready to print), the name that will print, and contact details.
- **Lesson player** (video activity page, `mod/videofile/view.php`, plus certificate and page activities):
  "Lesson N of M", large video, Previous / Next, and the whole class as a **playlist** on the right
  (complete, now playing, locked), scrolled to the current lesson. When a video ends, an **"Up next"** dialog
  counts down 6 seconds then opens the next lesson (Play now / Stay on this video; Escape cancels).
  Opening the next lesson is what marks it viewed, exactly as before.
- Teachers and admins (or anyone in editing mode) see the standard Boost pages with the drawer and user menu.

## Preserved behaviour
- The site's **Additional HTML** footer script (disables right-click on course pages) needs global jQuery, which
  the old Adaptable theme provided. `theme_glec` loads jQuery globally so that script keeps working.

## Install (on a staging Moodle first)
1. Upload `theme_glec.zip` (Site administration → Plugins → Install plugins) or copy `theme/glec` into `<moodle>/theme/glec`.
2. Run the upgrade (`php admin/cli/upgrade.php`), then Site administration → Appearance → Themes → choose **GLEC**.
3. Purge caches.
Switching back to Adaptable is a single setting if needed.

## How it was tested
On a local restored copy of the live LMS (from the Nov 13 backup: code, database, and the video files for
CARRIER-CEU (2025) and HLG-DD-R-OL), with local-only demo students at 44% and 100%. Email was disabled in that
copy and it never ran on the live site.
