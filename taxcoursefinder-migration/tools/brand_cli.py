"""Preview helper: rebrand a live HTML document (stdin -> stdout) the same way publish.py will."""
import sys, re
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
import brand
T = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools/'
def table_css(path):
    src = open(path).read(); a = src.index('TABLE_CSS = ("<style>"'); b = src.index('"</style>")', a) + len('"</style>")')
    ns = {}; exec(src[a:b], ns); return ns['TABLE_CSS']
h = sys.stdin.read()
h = h.replace(table_css(T + 'build_prev.py'), table_css(T + 'build.py'))
h = h.replace('width:44px;height:44px;border:1px solid #E3E9EB;border-radius:10px;background:#fff', 'width:60px;height:60px;border:1px solid #E3E9EB;border-radius:12px;background:#F4F6F7')
h = h.replace('width:22px;height:22px', 'width:26px;height:26px')
h = re.sub(r'https://fonts\.googleapis\.com/css2\?family=DM\+Sans[^"]*', brand.FONTS_URL.replace('&', '&amp;'), h)
h = h.replace('california-tax-course-finder-logo-hd.png', 'california-tax-course-finder-logo-hd-cobalt.png').replace('california-tax-course-finder-logo-white-hd.png', 'california-tax-course-finder-logo-white-hd-cobalt.png')
h = re.sub(r'(\[data-hv="\d+"\]:hover\{[^}]*\})', lambda m: m.group(1).replace('#7E9330', brand.COBALT_HOVER), h)
h = h.replace('font-size:clamp(38px,5.4vw,84px)!important;letter-spacing:-.01em', 'font-size:clamp(36px,5.1vw,74px)!important')
h = h.replace('.tcf-hidden-form{display:none!important}</style>', brand.CSS + '.tcf-hidden-form{display:none!important}</style>', 1)
sys.stdout.write(brand.brand(h))
