#!/bin/bash
# Lighthouse (mobile + desktop) for one page of the site; prints category scores and core metrics.
# usage: SITE=https://myrecordflow.com tools/lighthouse.sh /about-us/ [tag]
# Needs `npm i lighthouse@12` (run from a folder where it is installed) and a Chromium at CHROME_PATH.
SITE="${SITE:-https://myrecordflow.com}"; P="${1:-/}"; T="${2:-lh}"
CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium}"
FLAGS="--headless=new --no-sandbox${HTTPS_PROXY:+ --proxy-server=$HTTPS_PROXY}"
# Test the clean URL (as PageSpeed Insights does) so Kinsta serves it from its page cache; warm it first.
for i in 1 2; do curl -s -o /dev/null -A "Mozilla/5.0" "$SITE$P"; done
for s in mobile desktop; do
  F=""; [ "$s" = desktop ] && F="--preset=desktop"
  CHROME_PATH=$CHROME_PATH npx lighthouse "$SITE$P" $F --quiet \
    --only-categories=performance,accessibility,best-practices,seo \
    --chrome-flags="$FLAGS" --output=json --output-path="$T-$s.json" 2>/dev/null
  node -e "const r=require(process.argv[1]);console.log(process.argv[2],Object.values(r.categories).map(c=>c.id+':'+Math.round(c.score*100)).join(' '),'|',['largest-contentful-paint','total-blocking-time','cumulative-layout-shift'].map(k=>k+'='+r.audits[k].displayValue).join(' '))" "$PWD/$T-$s.json" "$P $s"
done
