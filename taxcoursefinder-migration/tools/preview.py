"""Compose full preview documents (live <head> + header + page + footer exactly as publish.py would send them). Nothing is published."""
import sys, json, re
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
slugs = sys.argv[1:]
sys.argv = ['x', 'none']; sys.path.insert(0, S + '/tools')
exec(open(S + '/tools/publish.py').read())
hdr, ftr = hf_html()
ids = json.load(open(S + '/ids.json'))
for slug in slugs:
    pg = json.load(open(B + '/pages/%s.json' % slug))
    live = s.get(BASE + (pg['url'] if pg['url'] != '/' else '/') + '?pv=1').text
    head = live[:live.index('<body')]
    body_tag = re.search(r'<body[^>]*>', live).group(0)
    tail = live[live.rindex('<script type="speculationrules"') if '<script type="speculationrules"' in live else live.rindex('</body>'):]
    doc = (head + body_tag + '<div class="elementor-location-header">' + hdr + '</div>' + page_html(pg) +
           '<div class="elementor-location-footer">' + ftr + '</div>' + tail)
    open(S + '/pv/%s.html' % slug, 'w').write(doc)
    print('preview', slug, len(doc))
