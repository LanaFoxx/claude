"""Turn the two provider forms into 5-step forms in the built page JSON (provider-application, create-your-school-profile).

Replaces the old single-page form markup (listing_form_old) with the stepped markup (listing_form), the
sidebar "Sections" list with the step list, and adds the time estimate under each page title.
Run ssr.mjs for both pages afterwards so the server-rendered copy matches."""
import json, sys
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/tools')
import listing_form as NEW, listing_form_old as OLD
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'

SUB = ('<p class="tcf-form-time" style="margin:0;display:flex;gap:10px;align-items:center;font:600 19px Manrope,sans-serif;color:rgba(255,255,255,.88)">'
       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;color:#FF6B57"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>'
       'Takes about %d minutes &middot; 5 short steps &middot; save and finish later</p>')

PAGES = {
    'provider-application': (OLD.form(), NEW.form(), OLD.sections_js(), NEW.sections_js(), 'verify'),
    'create-your-school-profile': (OLD.profile_form(), NEW.profile_form(), OLD.sections_js(OLD.PROFILE_SECTIONS), NEW.sections_js(NEW.PROFILE_SECTIONS), 'profile'),
}

for slug, (old_f, new_f, old_s, new_s, kind) in PAGES.items():
    f = S + '/build/pages/%s.json' % slug
    pg = json.load(open(f))
    for k in ('widget', 'code'):
        v = pg[k]
        if k == 'widget':
            assert v.count(old_f) == 1, (slug, 'form', v.count(old_f))
            v = v.replace(old_f, new_f)
            assert v.count('>Sections<') == 1, (slug, 'sections label')
            v = v.replace('>Sections<', '>Steps<')
            h = v.index('</h1>', v.index('<h1')) + len('</h1>')
            v = v[:h] + SUB % NEW.MINUTES[kind] + v[h:]
        assert k == 'widget' or v.count(old_s) == 1, (slug, 'sections js', v.count(old_s))
        v = v.replace(old_s, new_s)  # the widget carries its own copy of the page script
        pg[k] = v
    json.dump(pg, open(f, 'w'), indent=1)
    print('patched', slug)
