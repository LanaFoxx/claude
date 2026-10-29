import requests, re, json, os, pickle
S='https://staging156.dreamweb.digital'
CK=os.path.join(os.path.dirname(__file__),'session.pkl')
def session():
    s=requests.Session(); s.headers['User-Agent']='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
    if os.path.exists(CK):
        s.cookies.update(pickle.load(open(CK,'rb')))
        r=s.get(S+'/wp-admin/admin-ajax.php?action=rest-nonce')
        if r.status_code==200 and re.fullmatch(r'[0-9a-f]{10}',r.text.strip()): s.rn=r.text.strip(); return s
    s.get(S+'/wp-login.php')
    s.post(S+'/wp-login.php',data={'log':os.environ.get('WPUSER','mike@dreamwebdigital.com'),'pwd':os.environ['WPPW'],'wp-submit':'Log In','testcookie':'1','redirect_to':S+'/wp-admin/'})
    s.rn=s.get(S+'/wp-admin/admin-ajax.php?action=rest-nonce').text.strip()
    assert re.fullmatch(r'[0-9a-f]{10}',s.rn), 'login failed'
    pickle.dump(s.cookies,open(CK,'wb')); return s
def rest(s,method,path,headers=None,**kw):
    h={'X-WP-Nonce':s.rn}; h.update(headers or {})
    r=s.request(method,S+'/wp-json/'+path,headers=h,**kw)
    if r.status_code>=300: raise Exception(f'{method} {path} {r.status_code} {r.text[:500]}')
    return r.json()
def editor_nonce(s,pid):
    h=s.get(S+f'/wp-admin/post.php?post={pid}&action=elementor').text
    m=re.search(r'"ajax":\{"url":"[^"]+","nonce":"([0-9a-f]+)"',h); return m.group(1)
def save_builder(s,pid,elements,settings=None,status='publish'):
    n=editor_nonce(s,pid)
    actions={'save':{'action':'save_builder','data':{'status':status,'elements':elements,'settings':settings or {}}}}
    r=s.post(S+'/wp-admin/admin-ajax.php',data={'action':'elementor_ajax','_nonce':n,'editor_post_id':pid,'initial_document_id':pid,'actions':json.dumps(actions)})
    j=r.json()
    if not j.get('success') or not j['data']['responses']['save']['success']: raise Exception(r.text[:1000])
    return j
