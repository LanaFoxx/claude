import sys, re, json, base64, gzip, os, html
src, out = sys.argv[1], sys.argv[2]
t = open(src, encoding='utf-8').read()
def block(kind):
    m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % kind, t, re.S)
    return m.group(1) if m else None
man = json.loads(block('manifest'))
ext = {'image/png':'png','image/jpeg':'jpg','image/svg+xml':'svg','text/javascript':'js','application/javascript':'js','text/html':'html','text/css':'css','font/woff2':'woff2'}
for k,v in man.items():
    b = base64.b64decode(v['data'])
    if v.get('compressed'): b = gzip.decompress(b)
    fn = f"{k}.{ext.get(v['mime'], 'bin')}"
    open(os.path.join(out, fn),'wb').write(b)
    print(fn, v['mime'], len(b))
for kind in ('ext_resources','page_order','template'):
    c = block(kind)
    if c is not None:
        open(os.path.join(out, '_'+kind+'.txt'),'w').write(c)
        print(kind, len(c))
