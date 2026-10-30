"""Apply the active brand theme to the plugin from its pre-brand originals (scratchpad/orig), then lint PHP.
PHP files only get palette + fonts, with font-name quotes escaped for single-quoted PHP strings."""
import sys, re, subprocess
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
sys.path.insert(0, S + '/tools'); import brand
P = '/home/user/claude/tcf-directory-manager/'
FILES = {'school-template.html': 'templates', 'profile-template.html': 'templates', 'school.js': 'assets', 'profile.js': 'assets', 'class-school.php': 'includes'}
for f, d in FILES.items():
    s = open(S + '/orig/' + f).read()
    if f == 'school.js':  # hero course buttons sit on the light hero
        for k, act in (('ce', '!qe'), ('qe', 'qe')):
            old = "%sColor: '#fff', %sBorder: %s ? '#95AB3B' : 'rgba(255,255,255,.5)'" % (k, k, act)
            assert old in s, old
            s = s.replace(old, "%sColor: %s ? '#fff' : '#0B2E40', %sBorder: %s ? '#95AB3B' : '#D7DFE2'" % (k, act, k, act))
    if f.endswith('.html'):
        s = brand.brand(s)
    else:
        s = brand.palette(brand.fonts(s))
    if f.endswith('.php'):
        s = re.sub(r"(?<!\\)'(Instrument Serif|Instrument Sans|Source Serif 4|DM Sans|Source Sans 3|Plus Jakarta Sans)(?<!\\)'", r"\\'\1\\'", s)
    open(P + d + '/' + f, 'w').write(s)
bad = [f for f in subprocess.run(['bash', '-c', 'cd %s && for f in $(find . -name "*.php"); do php -l "$f" >/dev/null 2>&1 || echo "$f"; done' % P], capture_output=True, text=True).stdout.split()]
assert not bad, 'PHP syntax errors: %s' % bad
print('plugin branded (%s), PHP lint clean' % brand.THEME)
