import sys,re,json; sys.path.insert(0,'/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
import subprocess, zipfile, tempfile
# never upload a plugin that would fatal the site: lint every PHP file inside the zip first
with tempfile.TemporaryDirectory() as tmp:
    zipfile.ZipFile(S + '/tcf-directory-manager.zip').extractall(tmp)
    bad = subprocess.run(['bash', '-c', 'cd %s && for f in $(find . -name "*.php"); do php -l "$f" >/dev/null 2>&1 || echo "$f"; done' % tmp], capture_output=True, text=True).stdout.split()
    if bad: sys.exit('NOT UPLOADED - PHP syntax errors: %s' % bad)
s=session()
h=s.get(BASE+'/wp-admin/plugin-install.php?tab=upload').text
n=re.search(r'name="_wpnonce" value="([^"]+)"',h).group(1)
r=s.post(BASE+'/wp-admin/update.php?action=upload-plugin',data={'_wpnonce':n,'_wp_http_referer':'/wp-admin/plugin-install.php?tab=upload','install-plugin-submit':'Install Now'},
        files={'pluginzip':('tcf-directory-manager.zip',open(S+'/tcf-directory-manager.zip','rb'),'application/zip')})
m=re.search(r'href="([^"]*overwrite=update-plugin[^"]*)"',r.text)
if m:
    u=m.group(1).replace('&amp;','&')
    r=s.get(u if u.startswith('http') else BASE+'/wp-admin/'+u)
t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',r.text)); i=t.find('Installing'); print(t[i:i+300])
