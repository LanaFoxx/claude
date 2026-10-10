import requests, http.cookiejar, json, re, sys, os
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
BASE = 'https://taxcoursefinder.com'
os.environ.setdefault('REQUESTS_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')

def session():
    s = requests.Session()
    cj = http.cookiejar.MozillaCookieJar(S + '/cj.txt'); cj.load(ignore_discard=True, ignore_expires=True)
    s.cookies.update(cj)
    s.headers['X-WP-Nonce'] = s.get(BASE + '/wp-admin/admin-ajax.php?action=rest-nonce').text.strip()
    return s

def api(s, method, path, **kw):
    r = s.request(method, BASE + '/wp-json/' + path, **kw)
    try: j = r.json()
    except Exception: j = r.text
    if r.status_code >= 400: raise RuntimeError('%s %s -> %s %s' % (method, path, r.status_code, str(j)[:500]))
    return j
