# Mojo’s Flight Desk — portfolio demo

A fully working copy of the Mojo’s Flight Desk dashboard that runs on **sample data only**.
It is a static site: upload this folder to any web host (or a subfolder such as
`/flight-desk-demo/`) and open `index.html`. No WordPress, database or server code needed.

## How it works

- `assets/` holds the real dashboard’s CSS and JavaScript, so it looks and behaves exactly like the live system.
- `demo/mock.js` answers every request the dashboard makes, in the browser. It generates placeholder
  students (John Doe, Jane Roe…), 555-01xx phone numbers, `@example.com` emails, made-up sales and
  made-up dealer prices. Nothing is sent anywhere, and no real Mojo’s data is included.
- Visitors can click around and change things; changes stay in their own browser. **Reset** (bottom of the
  screen, click twice) restores the original sample data.
- Emails, GroupMe, photo uploads, log out and links to WordPress pages are turned off and explain themselves.

## Updating the demo after the real Flight Desk changes

```bash
python3 tools/sync-from-plugin.py /path/to/mojos-dashboard
```

This copies the plugin’s latest CSS/JS and strips anything confidential that lives in the code
(instructor names, the PAP dealer price list and its link).
