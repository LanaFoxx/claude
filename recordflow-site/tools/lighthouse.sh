#!/bin/bash
# Lighthouse (mobile + desktop) for one page of the site; prints category scores and core metrics.
# usage: SITE=https://myrecordflow.com tools/lighthouse.sh /about-us/ [tag]
# Needs `npm i lighthouse@12` (run from a folder where it is installed) and a Chromium at CHROME_PATH.
SITE="${SITE:-https://myrecordflow.com}"; P="${1:-/}"; T="${2:-lh}"
CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}"
FLAGS="--headless=new --no-sandbox${HTTPS_PROXY:+ --proxy-server=$HTTPS_PROXY}"
for s in mobile desktop; do
  F=""; [ "$s" = desktop ] && F="--preset=desktop"
  CHROME_PATH=$CHROME_PATH npx lighthouse "$SITE$P?nocache=$RANDOM" $F --quiet \
    --only-categories=performance,accessibility,best-practices,seo \
    --chrome-flags="$FLAGS" --output=json --output-path="$T-$s.json" 2>/dev/null
  node -e "const r=require(process.argv[1]);console.log(process.argv[2],Object.values(r.categories).map(c=>c.id+':'+Math.round(c.score*100)).join(' '),'|',['largest-contentful-paint','total-blocking-time','cumulative-layout-shift'].map(k=>k+'='+r.audits[k].displayValue).join(' '))" "$PWD/$T-$s.json" "$P $s"
done
