import json, sys, os, re
sys.path.insert(0, os.path.dirname(__file__)); import wp
D = os.path.dirname(__file__)
s = wp.session()
PAGES = json.load(open(f'{D}/pages.json'))
what = sys.argv[1:]

def scope(css):
    # prefix class selectors with `body` so they outrank Elementor's per-page widget defaults
    import re
    def fix(m):
        sels = [x.strip() for x in m.group(1).split(',')]
        sels = [x if not x.startswith('.') or x.startswith('.admin-bar')
                else ('body ' + x) if x.startswith('.elementor')
                else ('body .elementor.elementor ' + x) for x in sels]
        return ','.join(sels) + '{'
    return re.sub(r'(?<=[}\n])\s*([^{}@/]+?)\s*\{', lambda m: '\n' + fix(m), css)

if 'kit' in what:
    kit = wp.rest(s, 'GET', 'wp/v2/elementor_library/8?context=edit')['meta']['_elementor_page_settings'] or {}
    font = lambda fam, w: {'typography_typography': 'custom', 'typography_font_family': fam, 'typography_font_weight': w}
    kit.update({
        'site_name': 'Brian Apple Retirement Planning',
        'system_colors': [
            {'_id': 'primary', 'title': 'Maroon', 'color': '#692427'},
            {'_id': 'secondary', 'title': 'Navy', 'color': '#243E5E'},
            {'_id': 'text', 'title': 'Body Text', 'color': '#4A4A4A'},
            {'_id': 'accent', 'title': 'Maroon Dark', 'color': '#521C1F'}],
        'custom_colors': [
            {'_id': 'ba_ink', 'title': 'Ink', 'color': '#333333'},
            {'_id': 'ba_navy_dark', 'title': 'Navy Dark', 'color': '#1B2F49'},
            {'_id': 'ba_gray', 'title': 'Light Gray', 'color': '#F0F0F0'},
            {'_id': 'ba_line', 'title': 'Border', 'color': '#E2E2E2'}],
        'system_typography': [
            dict(_id='primary', title='Headings', **font('Libre Caslon Text', '400')),
            dict(_id='secondary', title='Serif Accent', **font('Libre Caslon Text', '400')),
            dict(_id='text', title='Body', **font('Source Sans 3', '400')),
            dict(_id='accent', title='Buttons', **font('Source Sans 3', '600'))],
        'body_color': '#333333',
        'body_typography_typography': 'custom', 'body_typography_font_family': 'Source Sans 3',
        'link_normal_color': '#692427', 'link_hover_color': '#521C1F',
        'container_width': {'unit': 'px', 'size': 1160, 'sizes': []},
        'custom_css': scope(open(f'{D}/site.css').read()),
    })
    wp.save_builder(s, 8, [], kit)
    print('kit saved')

if 'menu' in what:
    menus = wp.rest(s, 'GET', 'wp/v2/menus?context=edit')
    m = next((x for x in menus if x['slug'] == 'brian-apple-main'), None)
    if not m:
        m = wp.rest(s, 'POST', 'wp/v2/menus', json={'name': 'Brian Apple Main', 'slug': 'brian-apple-main'})
    for it in wp.rest(s, 'GET', f'wp/v2/menu-items?menus={m["id"]}&per_page=100'):
        wp.rest(s, 'DELETE', f'wp/v2/menu-items/{it["id"]}', params={'force': 'true'})
    for i, (t, k) in enumerate([('Home', 'home'), ('Services', 'services'), ('About Brian', 'about'), ('FAQs', 'faq'), ('Contact', 'contact')]):
        wp.rest(s, 'POST', 'wp/v2/menu-items', json={'title': t, 'menus': m['id'], 'type': 'post_type', 'object': 'page',
                                                     'object_id': PAGES[k]['id'], 'menu_order': i + 1, 'status': 'publish'})
    print('menu', m['id'], m['slug'])

if 'templates' in what:
    tpl = {}
    h = s.get(wp.S + '/wp-admin/edit.php?post_type=elementor_library').text
    nonce = re.search(r'elementor_new_post&(?:amp;|#038;)?post_type=page&(?:amp;|#038;)?template_type=wp-page&(?:amp;|#038;)?_wpnonce=([0-9a-f]+)', h).group(1)
    for typ, title in [('header', 'Brian Apple — Header'), ('footer', 'Brian Apple — Footer')]:
        r = s.get(wp.S + '/wp-admin/edit.php', params={'action': 'elementor_new_post', 'post_type': 'elementor_library',
                                                       'template_type': typ, '_wpnonce': nonce, 'post_data[post_title]': title},
                  allow_redirects=False)
        pid = int(re.search(r'post=(\d+)', r.headers['location']).group(1))
        tpl[typ] = pid
        print(typ, pid)
    json.dump(tpl, open(f'{D}/templates.json', 'w'))
