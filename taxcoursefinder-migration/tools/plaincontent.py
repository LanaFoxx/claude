import sys,json,re; sys.argv=['x','none']; sys.path.insert(0,'/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
exec(open('/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools/publish.py').read())
from bs4 import BeautifulSoup
ids=json.load(open(S+'/ids.json'))
for slug,i in ids.items():
    h=page_html(json.load(open(B+'/pages/%s.json'%slug)))
    h=re.sub(r'<template\b.*?</template>|<script\b.*?</script>','',h,flags=re.S)
    soup=BeautifulSoup(h,'html.parser')
    for t in soup(['svg','style','input','select','textarea','button','form']): t.decompose()
    for t in soup.find_all(True):
        keep={'a':('href',),'img':('src','alt')}.get(t.name,())
        for a in list(t.attrs):
            if a not in keep: del t[a]
    for t in soup.find_all('img'):
        if 'check-' in t.get('src',''): t.decompose()
    for t in soup.find_all(['div','span','b','label','section']): t.unwrap()
    out=re.sub(r'(?<=href=")/', BASE+'/', re.sub(r'\n\s*\n+','\n',str(soup)).strip())
    api(s,'POST','wp/v2/pages/%d'%i,json={'content':out}); print(slug,len(out))
