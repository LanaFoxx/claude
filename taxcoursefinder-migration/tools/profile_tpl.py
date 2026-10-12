"""Convert the Provider Profile Form design into the plugin's template.
Select options get the ACF choice keys as values so a submission maps straight onto the School Page fields."""
import json, re, sys
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
sys.argv = ['x', 'none']; sys.path.insert(0, S + '/tools')
exec(open(S + '/tools/publish.py').read())          # fix_media, MEDIA
d = json.load(open(S + '/ext/Provider Profile Form.json'))

OPTS = {
    'approved_types': {'Qualifying education (60-hour)': 'qe', 'Continuing education (20-hour)': 'ce', 'Both QE and CE': 'both'},
    'package_kind': {'Complete package: all required hours': 'complete', 'Partial course: some hours only': 'partial'},
    'pace': {'Self-paced': 'self_paced', 'Follows a schedule': 'scheduled', 'Both options available': 'both'},
    'start_now': {'Yes, right after checkout': 'immediately', 'No, enrollment is processed first': 'by_request', 'Live classes start on set dates': 'next_session'},
    'after_completion': {'Yes, until access expires': 'until_expiry', 'Yes, permanently': 'permanent', 'No': 'access_ends'},
    'exam_structure': {'Chapter quizzes plus final exam': 'quizzes_final', 'Final exam only': 'final_only', 'Chapter quizzes only': 'chapter_only'},
    'timers': {'No timers': 'none', 'Timed final exam': 'exam', 'Required lesson timers': 'lesson', 'Both': 'both'},
    'who_reports': {'We report to CTEC and the IRS': 'school_irs', 'We report to CTEC only': 'school', 'Student self-reports': 'student'},
    'reporting_time': {'Same day': 'same_day', 'Within 24 hours': '24h', '1–2 business days': '1_2_days', '3–5 business days': '3_5_days', 'Weekly batch': 'weekly', 'Longer than a week': 'longer'},
    'certificate': {'Immediately after the final exam': 'immediate', 'Within 24 hours': '24h', 'After we report to CTEC': 'after_report', 'Mailed': 'mailed'},
    'chat': {'Yes, staffed': 'staffed', 'Yes, automated only': 'automated', 'No': 'none'},
    'tz': {'Pacific': 'PT', 'Mountain': 'MT', 'Central': 'CT', 'Eastern': 'ET'},
}

b = d['header'] + d['body']
b = re.sub(r'href="([^"#]+)\.dc\.html(#[^"]*)?"', lambda m: 'href="/"', b)
b = re.sub(r'(src|href)="assets/([^"]+)"', lambda m: m.group(1) + '="@@MEDIA:' + m.group(2) + '@@"', b)
b = fix_media(b)
b = b.replace(' style="min-width:1100px"', '', 1)

def opts(m):
    name, inner = m.group(1), m.group(3)
    table = OPTS[name]
    def one(o):
        txt = o.group(2)
        if txt == 'Select': return '<option value="">Select</option>'
        return '<option value="%s">%s</option>' % (table[txt.replace('&amp;', '&')], txt)
    inner = re.sub(r'<option([^>]*)>([^<]*)</option>', one, inner)
    return '<select name="%s"%s>%s</select>' % (name, m.group(2), inner)
b, n = re.subn(r'<select name="(\w+)"([^>]*)>(.*?)</select>', opts, b, flags=re.S)
assert n == len(OPTS), n

# unbound controls keep their state across re-renders; name them so submit can read them
b = b.replace('<input type="file" accept="image/*" style', '<input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif" style', 1)
b = b.replace('<input type="file" accept="image/*" multiple="" style', '<input type="file" name="screenshots" accept="image/png,image/jpeg,image/webp,image/gif" multiple="" style', 1)
b = b.replace('PNG or SVG, transparent background preferred.', 'PNG, JPG or WebP, transparent background preferred. Max 5 MB.')
b = b.replace('<input type="checkbox" required="" style', '<input type="checkbox" name="confirm" required="" style', 1)
b = b.replace('<input type="checkbox" style="width:20px;height:20px;margin-top:4px', '<input type="checkbox" name="notify" style="width:20px;height:20px;margin-top:4px', 1)
# spam trap (hidden from people) + send status / error line
b = b.replace('<form onsubmit="{{ submit }}" style="display:flex;flex-direction:column;gap:24px">',
              '<form onsubmit="{{ submit }}" style="display:flex;flex-direction:column;gap:24px">'
              '<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label>Leave empty<input name="company_fax" tabindex="-1" autocomplete="off"></label></div>', 1)
b = b.replace('<span style="font-size:16px;color:#8A9AA3">{{ savedNote }}</span>',
              '<span style="font-size:16px;color:#8A9AA3">{{ savedNote }}</span>'
              '<sc-if value="{{ error }}"><div role="alert" style="flex-basis:100%;background:#FBEAEA;border:1px solid #E5B4B4;color:#8A1F1F;border-radius:10px;padding:12px 16px;font-size:17px">{{ error }}</div></sc-if>', 1)
b = b.replace('>Submit school details<svg', '>{{ submitLabel }}<svg', 1)
# token-linked forms say which listing they update
b = b.replace('<h1 style="margin:0;font:300 56px/1.08 \'Source Serif 4\',Georgia,serif;text-wrap:balance">Complete your school page</h1>',
              '<h1 style="margin:0;font:300 56px/1.08 \'Source Serif 4\',Georgia,serif;text-wrap:balance">Complete your school page</h1>'
              '<sc-if value="{{ forName }}"><div style="font:700 19px Manrope,sans-serif;color:#AEC25A">For {{ forName }}</div></sc-if>', 1)

def tag(old, cls):
    global b
    assert old in b, old
    b = b.replace(old, old.replace('<div ', '<div class="%s" ' % cls, 1), 1)
tag('<div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 380px;', 'tcfp-hero')
tag('<div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:260px minmax(0,1fr);', 'tcfp-main')
tag('<div style="position:sticky;top:24px;display:flex;flex-direction:column;gap:4px">', 'tcfp-nav')

assert '.dc.html' not in b and '@@MEDIA' not in b and 'image-slot' not in b
open('/home/user/claude/tcf-directory-manager/templates/profile-template.html', 'w').write(b)
print('template', len(b))
