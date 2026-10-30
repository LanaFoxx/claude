"""Update Yoast SEO title/description for pages (needs plugin 2.11.1+, which exposes the fields to editors over REST)."""
import sys, json; sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
s = session()
ids = json.load(open(S + '/ids.json'))
META = {
    'home': (None, 'Compare 20 hour and 60 hour CTEC courses from top California tax schools: prices, coupon codes, course format and how fast each school reports to CTEC.'),
    'ctec-20-hour-course': ('20 Hour CTEC Course: Compare Top Tax Schools (2026)', 'Compare 20 hour CTEC continuing education courses from top tax schools for 2026 renewal: prices, coupon codes, course format and how fast each school reports to CTEC.'),
    'ctec-60-hour-course': ('60 Hour CTEC Course: Compare Top Tax Schools (2026)', 'Compare 60 hour CTEC qualifying education courses from top tax schools to become a California tax preparer: prices, coupon codes, course format and support.'),
    'about': (None, 'California Tax Course Finder is an independent directory of top CTEC-approved tax schools, comparing price, course format and current offers.'),
    'how-we-compare-providers': (None, 'How California Tax Course Finder selects and compares CTEC-approved schools: what each listing shows, how prices are checked, and why there are no paid rankings.'),
}
for slug, (title, desc) in META.items():
    pid = ids[slug]
    before = api(s, 'GET', 'wp/v2/pages/%d?context=edit&_fields=meta' % pid)['meta']
    meta = {'_yoast_wpseo_metadesc': desc}
    if title: meta['_yoast_wpseo_title'] = title
    for k in ('_yoast_wpseo_opengraph-description', '_yoast_wpseo_twitter-description'):
        if before.get(k): meta[k] = desc  # keep social descriptions in step only where they were set
    after = api(s, 'POST', 'wp/v2/pages/%d' % pid, json={'meta': meta})['meta']
    print(slug, '|', before.get('_yoast_wpseo_title'), '->', after.get('_yoast_wpseo_title'), '|', after.get('_yoast_wpseo_metadesc')[:60])
