"""List recent profile/listing submissions in the review queue (admin), with their status side box."""
import sys, re, html; sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
s = session()
t = s.get(BASE + '/wp-admin/edit.php?post_type=tcfd_profile_sub&post_status=all').text
rows = re.findall(r'<tr id="post-(\d+)"[^>]*>(.*?)</tr>', t, re.S)
for pid, row in rows[:8]:
    title = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'class="row-title"[^>]*>(.*?)</a>', row, re.S).group(1))).strip()
    status = 'Draft' if 'post-state' in row and 'Draft' in row else ''
    print(pid, '|', title, '|', status)
    if len(sys.argv) > 1 and sys.argv[1] in title:
        e = s.get(BASE + '/wp-admin/post.php?post=%s&action=edit' % pid).text
        box = e[e.find('id="tcfd_profile_meta"'):]; box = box[:box.find('</div></div>') + 10]
        print('   ', re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', box)))[:600])
        rv = e[e.find('id="tcfd_profile_review"'):]; rv = rv[:6000]
        print('   REVIEW:', re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', rv)))[:1500])
