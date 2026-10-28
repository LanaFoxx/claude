"""Preview an import file through the plugin importer, then apply it if every row matches an existing listing."""
import sys,re,html,json;sys.path.insert(0,'/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
from html.parser import HTMLParser
path, label = sys.argv[1], sys.argv[2]
s=session()
h=s.get(BASE+'/wp-admin/edit.php?post_type=tcf_provider&page=tcfd-import').text
f=h[h.find('value="tcfd_preview"')-600:h.find('value="tcfd_preview"')]
n=re.findall(r'name="_wpnonce" value="([^"]+)"',f)[-1]
r=s.post(BASE+'/wp-admin/admin-post.php',data={'action':'tcfd_preview','_wpnonce':n,'tcfd_raw':open(path).read(),'tcfd_label':label,'tcfd_mode':'overwrite'},allow_redirects=True)
t=html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>|<style.*?</style>','',r.text,flags=re.S))))
m=re.search(r'\d+ providers? in the data.{0,170}',t); print(m.group(0) if m else t[:600])
i=t.find('What changes'); print('PREVIEW:', t[i:i+700])
h=r.text; i=h.find('value="tcfd_apply"'); form=h[h.rfind('<form',0,i):h.find('</form>',i)]
data=[]
class P(HTMLParser):
    def __init__(s): super().__init__(); s.sel=None
    def handle_starttag(s,t,a):
        a=dict(a)
        if t=='input' and a.get('name'):
            if a.get('type') in ('checkbox','radio'):
                if 'checked' in a: data.append((a['name'],a.get('value','1')))
            elif a.get('type')!='submit': data.append((a['name'],a.get('value','')))
        if t=='select': s.sel=a.get('name'); s.first=None; s.got=False
        if t=='option' and s.sel:
            if s.first is None: s.first=a.get('value')
            if 'selected' in a: data.append((s.sel,a.get('value'))); s.got=True
    def handle_endtag(s,t):
        if t=='select' and s.sel:
            if not s.got: data.append((s.sel,s.first))
            s.sel=None
P().feed(form)
tg=[v for k,v in data if k.startswith('target[')]
print(len(tg),'targets', tg)
if tg and all(v.isdigit() for v in tg):
    r=s.post(BASE+'/wp-admin/admin-post.php',data=data,allow_redirects=True)
    m=re.search(r'Import applied\.</strong>(.*?)<a',r.text,re.S); print(html.unescape(re.sub(r'<[^>]+>','',m.group(1))) if m else 'NOT APPLIED')
else: print('NOT APPLIED (unmatched rows)')
