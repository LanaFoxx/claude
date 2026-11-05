#!/bin/bash
# usage: run.sh <url> <name> [desktop]
cd "$(dirname "$0")"
extra=""; [ "$3" = "desktop" ] && extra="--preset=desktop"
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome ./node_modules/.bin/lighthouse "$1" $extra --quiet --output=json --output-path=out/$2.json --chrome-flags="--headless=new --no-sandbox --proxy-server=$HTTPS_PROXY --ignore-certificate-errors" >/dev/null 2>out/$2.err
python3 -I -c "
import json,sys;d=json.load(open('out/$2.json'))
c=d['categories'];a=d['audits']
print('$2',{k:round((v['score'] or 0)*100) for k,v in c.items()}, {m:a[m]['displayValue'] for m in ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index']})
"
