#!/usr/bin/env python3
"""Refresh the demo from the real Flight Desk plugin.

    python3 tools/sync-from-plugin.py /path/to/mojos-dashboard

Copies the plugin's CSS and app.js into assets/ and strips anything confidential that is
hard-coded in the code itself (instructor names, the PAP dealer price list and its link).
All people, sales and numbers shown in the demo come from demo/mock.js, never the plugin.
"""
import os, re, shutil, sys

src = sys.argv[1] if len(sys.argv) > 1 else None
if not src or not os.path.isfile(os.path.join(src, 'assets', 'app.js')):
    sys.exit('Usage: sync-from-plugin.py /path/to/mojos-dashboard')
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dst = os.path.join(here, 'assets')

for f in ('app.css', 'hq.css', 'ds.css', 'dash.css', 'pages.css'):
    css = open(os.path.join(src, 'assets', f), encoding='utf-8').read()
    css = css.replace("url('/wp-content/uploads/2026/06/norwester.ttf')", "url('norwester.ttf')")
    open(os.path.join(dst, f), 'w', encoding='utf-8').write(css)

js = open(os.path.join(src, 'assets', 'app.js'), encoding='utf-8').read()

def must(old, new):
    global js
    if old not in js:
        sys.exit('Could not find expected code (plugin changed?): ' + old[:70])
    js = js.replace(old, new)

# 1) real instructor names -> demo team
js, n = re.subn(r"var INSTR = \{[^}]*\};", "var INSTR = { 'alex': 1, 'jordan': 1, 'taylor': 1, 'casey': 1 };", js)
if n != 1: sys.exit('INSTR block not found')
must('placeholder="e.g. Avery&#10;Ben"', 'placeholder="e.g. Jordan&#10;Sam"')

# 2) PAP dealer price list: keep the layout, replace every price and the PDF link
i = js.index('var PAP = {'); j = js.index('] } ] };', i) + len('] } ] };')
pap = js[i:j]
pap = re.sub(r"src: '[^']*'", "src: '#demo'", pap)
pap = re.sub(r"updated: '[^']*'", "updated: 'sample prices'", pap)
seed = [0]
def fake(m):
    seed[0] += 1
    v = int(m.group(1).replace(',', ''))
    v = max(10, round(v * (0.83 + (seed[0] * 37 % 23) / 100) / 10) * 10)
    return "'€" + format(v, ',') + "'"
pap = re.sub(r"'€([\d,]+)'", fake, pap)
js = js[:i] + pap + js[j:]

# 3) safety net: nothing that points at the live site's private files
for bad in ('docs.google.com', 'drive.google.com'):
    if bad in js: sys.exit('Unexpected private link left in app.js: ' + bad)

open(os.path.join(dst, 'app.js'), 'w', encoding='utf-8').write(js)
print('Demo assets refreshed from', src)
