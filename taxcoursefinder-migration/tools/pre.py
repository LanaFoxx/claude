import re,glob,json,os,sys,html
d=sys.argv[1]; hv={}
for f in glob.glob(d+'/*.dc.html'):
    s=open(f).read()
    def rep(m):
        v=html.unescape(m.group(1))
        if v not in hv: hv[v]=len(hv)
        return f' data-hv="{hv[v]}"'
    s=re.sub(r' style-hover="([^"]*)"',rep,s)
    open(f,'w').write(s)
json.dump(hv,open(sys.argv[2],'w'),indent=0)
print(len(hv))
