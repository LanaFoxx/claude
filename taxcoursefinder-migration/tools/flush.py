import sys; sys.path.insert(0,'/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
import re
def flush(s):
    r=s.post(BASE+'/wp-admin/admin-ajax.php',data={'action':'elementor_clear_cache','_nonce':re.search(r'data-nonce="([^"]+)"[^>]*data-id="elementor-tools-general-button-clear-files-data"',s.get(BASE+'/wp-admin/admin.php?page=elementor-tools').text).group(1)})
    print('elementor cache', r.text[:40])
    r=s.get(BASE+'/wp-admin/options-privacy.php')
    for act in ['nexcess-mapps-flush-object-cache','nexcess-mapps-flush-cache']:
        n=re.search(r'value="'+act+r'".*?name="nexcess-mapps-nonce" value="([^"]+)"',r.text,re.S).group(1)
        r2=s.post(BASE+'/wp-admin/options-privacy.php',data={'action':act,'nexcess-mapps-nonce':n,'_wp_http_referer':'/wp-admin/options-privacy.php'})
        print(act, r2.status_code)
if __name__=='__main__': flush(session())
