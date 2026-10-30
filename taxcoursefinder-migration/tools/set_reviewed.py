"""Record the directory review completion date (one shared value for every page)."""
import sys, re; sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
date = sys.argv[1]
s = session()
h = s.get(BASE + '/wp-admin/edit.php?post_type=tcf_provider&page=tcfd-import').text
f = h[h.find('value="tcfd_reviewed"') - 700:h.find('value="tcfd_reviewed"')]
n = re.findall(r'name="_wpnonce" value="([^"]+)"', f)[-1]
r = s.post(BASE + '/wp-admin/admin-post.php', data={'action': 'tcfd_reviewed', '_wpnonce': n, 'reviewed': date}, allow_redirects=True)
print(r.status_code, re.search(r'id="tcfd-reviewed-date" name="reviewed" value="([^"]*)"', r.text).group(1))
