import sys,json,re; sys.path.insert(0,'/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
from wp import *
def load(s):
    t=s.get(BASE+'/wp-admin/admin.php?page=wpseo_page_settings',timeout=60).text
    i=t.find('"settings":{"wpseo":'); st,_=json.JSONDecoder().raw_decode(t[i+11:])
    return st, re.search(r'"endpoint":"[^"]+","nonce":"([^"]+)"',t).group(1)
def save(s, st, nonce):
    form=[('option_page','wpseo_page_settings'),('_wp_http_referer','admin.php?page=wpseo_page_settings_saved'),('action','update'),('_wpnonce',nonce)]
    sv=lambda v: 'true' if v is True else 'false' if v is False else '' if v is None else str(v)
    for k,v in st.items():
        if isinstance(v,dict):
            for sk,x in v.items():
                if isinstance(x,list):
                    for n,y in enumerate(x): form.append(('%s[%s][%d]'%(k,sk,n),sv(y)))
                elif isinstance(x,dict):
                    for n,y in x.items(): form.append(('%s[%s][%s]'%(k,sk,n),sv(y)))
                else: form.append(('%s[%s]'%(k,sk),sv(x)))
        else: form.append((k,sv(v)))
    r=s.post(BASE+'/wp-admin/options.php',data=form,allow_redirects=False,timeout=120)
    return r.status_code, r.headers.get('location')
