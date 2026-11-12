import sys, hashlib, json, xml.etree.ElementTree as ET
ns = {'wp': 'http://wordpress.org/export/1.2/', 'content': 'http://purl.org/rss/1.0/modules/content/'}
root = ET.parse(sys.argv[1]).getroot()
out = {}
for it in root.iter('item'):
    g = lambda k: (it.find(k, ns).text or '') if it.find(k, ns) is not None else ''
    meta = {}
    for pm in it.findall('wp:postmeta', ns):
        meta[pm.find('wp:meta_key', ns).text] = pm.find('wp:meta_value', ns).text or ''
    h = lambda s: hashlib.md5(s.encode()).hexdigest()
    out[g('wp:post_id')] = {
        'type': g('wp:post_type'), 'status': g('wp:status'), 'title': it.findtext('title'),
        'modified': g('wp:post_modified'), 'menu_order': g('wp:menu_order'), 'slug': g('wp:post_name'),
        'content': h(g('content:encoded')),
        'elementor_data': h(meta.get('_elementor_data', '')),
        'page_settings': h(meta.get('_elementor_page_settings', '')),
        'conditions': meta.get('_elementor_conditions', ''),
        'meta_all': h(json.dumps({k: v for k, v in sorted(meta.items()) if k not in ('_edit_lock', '_elementor_css', '_elementor_element_cache', '_elementor_page_assets')})),
    }
json.dump(out, open(sys.argv[2], 'w'), indent=1, sort_keys=True)
print(len(out), 'items')
