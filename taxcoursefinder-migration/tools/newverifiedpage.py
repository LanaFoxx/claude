import sys, json
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
s = session()
ids = json.load(open(S + '/ids.json'))
slug = 'listing-verified'
if slug not in ids:
    p = api(s, 'POST', 'wp/v2/pages', json={'title': 'Thank You for Verifying Your School', 'slug': slug, 'status': 'publish', 'template': 'elementor_header_footer', 'comment_status': 'closed', 'ping_status': 'closed',
                                             'meta': {'_elementor_edit_mode': 'builder', '_elementor_template_type': 'wp-page'}})
    ids[slug] = p['id']; json.dump(ids, open(S + '/ids.json', 'w')); print('created', p['id'], p['link'])
else: print('exists', ids[slug])
