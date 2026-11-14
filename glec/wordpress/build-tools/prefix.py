import re, sys
src = open(sys.argv[1]).read()
SKIP = (':root','html','body','a','a:','a:hover','.admin-bar','.elementor-location-header','.glec-has-cart','@font-face','*','.page-header','.entry-title','.site-main','.glec-mm','.glec-burger','.glec-cart','.glec-mm-small','.elementor-invisible')
def fix_sel(sel):
    out=[]
    for s in sel.split(','):
        st=s.strip()
        if not st or st.startswith(SKIP) or st.startswith('.g-on-navy') and False: out.append(st); continue
        out.append('.elementor '+st)
    return ','.join(out)
def process(block):
    res=''; i=0
    while i < len(block):
        j = block.find('{', i)
        if j < 0: res += block[i:]; break
        sel = block[i:j]
        sel_nc = re.sub(r'/\*.*?\*/', '', sel, flags=re.S).strip()
        if sel_nc.startswith('@media') or sel_nc.startswith('@supports'):
            depth=1; k=j+1
            while depth: 
                if block[k]=='{': depth+=1
                elif block[k]=='}': depth-=1
                k+=1
            res += sel + '{' + process(block[j+1:k-1]) + '}'; i=k; continue
        k = block.find('}', j)
        body = block[j:k+1]
        pre = re.match(r'\s*(/\*.*?\*/\s*)*', sel, re.S).group(0)
        res += pre + (sel[len(pre):] if sel.strip().startswith('@') else fix_sel(sel[len(pre):])) + body
        i = k+1
    return res
open(sys.argv[2],'w').write(process(src))
