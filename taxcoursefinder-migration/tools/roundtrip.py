import sys,re,json; sys.path.insert(0,'/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
from collections import Counter
s=session()
t=s.get(BASE+'/wp-admin/edit.php?post_type=tcf_provider&page=tcfd-export',timeout=60).text.replace('&amp;','&')
n=re.search(r'action=tcfd_export[^"\']*?_wpnonce=([a-f0-9]+)',t).group(1)
exp=s.get(BASE+'/wp-admin/admin-post.php?action=tcfd_export&format=json&_wpnonce='+n,timeout=60)
csv=s.get(BASE+'/wp-admin/admin-post.php?action=tcfd_export&format=csv&_wpnonce='+n,timeout=60)
def preview(raw, fname=None):
    t=s.get(BASE+'/wp-admin/edit.php?post_type=tcf_provider&page=tcfd-import',timeout=60).text
    pn=re.search(r'name="_wpnonce" value="([^"]+)"',t).group(1)
    files={'tcfd_file':(fname, raw, 'text/plain')} if fname else None
    r=s.post(BASE+'/wp-admin/admin-post.php',data={'action':'tcfd_preview','_wpnonce':pn,'tcfd_raw':'' if fname else raw,'tcfd_mode':'overwrite','tcfd_create':'1','tcfd_label':'roundtrip test'},files=files,timeout=120)
    t=r.text
    rows=re.findall(r'<tr><th>([^<]*)</th><td class="old">([^<]*)</td><td class="arrow">→</td><td class="new">([^<]*)</td></tr>',t)
    return re.findall(r'data-filter="(\w+)"[^>]*><b>(\d+)</b>',t), Counter(r[0] for r in rows), re.findall(r'Coupons &amp; sales</th><td colspan="3">([^<]*)',t)[:3]
print('json', preview(exp.text)); print('csv', preview(csv.content,'export.csv'))
