// Section builders. Each takes (data, ctx) and returns one top-level Elementor container.
// `data` comes from source/content.json (extracted from the live site) or is written inline for the
// designed homepage; `ctx` = { m(key) -> media, popups: { menu, connect }, connect: url }.
const K = require('./core.cjs');
const { C, SERIF, SANS, GUT, SEC, LINKS, CONSENT, px, cu, box, cbox, gap, link, typo, container, widget, cls, section, stack, row, grid, heading, H1, H2, H3, label, text, button, textLink, image, fa, eyebrow, social } = K;
const { formStyle, field, consentField, formActions } = require('./chrome.cjs');

const isDark = (rgb) => /58, 44, 38|rgb\(2[0-9], 2[0-9]|#3A2C26/i.test(rgb || '');
const titleCase = (s) => s;
const chevronRight = fa('fas fa-chevron-right'), chevronLeft = fa('fas fa-chevron-left'), chevronDown = fa('fas fa-chevron-down');
const fixUrl = (u, ctx) => {
  if (!u) return ctx.connect;
  if (u === '/properties') return '/properties/sale/';
  if (/google\.com\/maps\/place\/.*review/.test(u)) return LINKS.review;
  if (/^\/(?!\/)/.test(u) && !/[?#]/.test(u) && !u.endsWith('/')) return u + '/';
  return u;
};

/* ------------------------------------------------------------ inner hero */
// Photo band with a bronze box overlapping its bottom edge (Luxury Presence "custom intro").
function innerHero(d, ctx) {
  const img = d.image ? ctx.m(d.image) : null;
  return container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'center', flex_gap: gap(0),
    min_height: px(642), min_height_mobile: px(520), padding: cbox('0', GUT, '0', GUT),
    background_background: 'classic', background_color: img ? C.cream : '#1C1B1A',
    ...(img ? { background_image: img, background_position: 'center center', background_size: 'cover', background_repeat: 'no-repeat', background_overlay_background: 'classic', background_overlay_color: 'rgba(0,0,0,0.4)' } : {}),
    custom_css: img ? 'selector::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 82px; background: #F5EFE7; z-index: 1; }' : '',
    overflow: 'hidden', ...cls('sb-hero'),
  }, [
    container({
      content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(0),
      width: px(670), width_mobile: px(100, '%'), padding: box(40, 32, 24, 32),
      background_background: 'classic', background_color: C.bronze, ...cls('sb-hero-box'),
    }, [
      ...(d.eyebrow ? [label(d.eyebrow, { align: 'center', color: C.white, size: 14, weight: 600, ls: 0.5, upper: true }),
        widget('divider', { width: px(104), align: 'center', color: C.white, weight: px(1), gap: px(0), _margin: box(16, 0, 0, 0), ...cls('sb-rule') })] : []),
      H1(d.title, { color: C.white, align: 'center', size: ['clamp(36px, 2.5vw, 48px)', 36, 'clamp(22px, 7vw, 30px)'], weight: 400, lh: 1.2, ls: 2, settings: { _margin: box(d.eyebrow ? 10 : 0, 0, 0, 0) } }),
      button('', '#', 'white', { pad: box(0), icon: chevronDown, iconGap: 0, cls: 'sb-down', settings: { _margin: box(24, 0, 0, 0), align: 'center' } }),
    ]),
  ], false);
}

/* -------------------------------------------------------- CTA bands */
// "Find your ideal home" style band: title left + white button right (or centered stack).
function ctaBand(d, ctx) {
  const dark = isDark(d.bg);
  const fg = dark ? C.white : C.espresso;
  const btns = (d.buttons || []).map((b) => button(b.text, fixUrl(b.href, ctx), dark ? 'white' : 'dark', {}));
  const body = (d.blocks || []).map((b) => text(b.html.replace(/<\/?span>/g, ''), { color: fg, align: 'center', size: 'clamp(15px, 0.95vw, 18px)', weight: 300, maxW: 1200 }));
  if (d.textAlign === 'center' || !btns.length || body.length) {
    return section([
      ...(d.title ? [H2(d.title, { color: fg, align: 'center', mb: body.length ? 24 : 0 })] : []),
      ...body,
      ...(btns.length ? [row(btns, { justify: 'center', settings: { _margin: box(40, 0, 0, 0) } })] : []),
    ], { bg: dark ? C.espresso : (d.bg === 'rgb(255, 255, 255)' ? C.white : C.cream), align: 'center', minH: d.height ? Math.min(d.height, 487) : undefined, justify: 'center', pad: cbox(d.height && d.height < 260 ? '64px' : SEC, GUT, d.height && d.height < 260 ? '64px' : SEC, GUT) });
  }
  return section([
    H2(d.title, { color: fg, settings: { _element_width: 'auto' } }),
    ...btns,
  ], { dir: 'row', bg: dark ? C.espresso : C.cream, justify: 'space-between', align: 'center', minH: 250, gap: 24, settings: { flex_wrap: 'wrap', flex_direction_mobile: 'column', flex_align_items_mobile: 'flex-start' } });
}

/* --------------------------------------------- full-bleed CTA variants */
function fullBleed(d, ctx) {
  const dark = isDark(d.bg);
  const fg = dark ? C.white : C.espresso;
  const bg = dark ? C.espresso : C.cream;
  const btns = (d.buttons || []).map((b) => button(b.text, fixUrl(b.href, ctx), dark ? 'white' : 'dark'));
  const body = (d.blocks || []).map((b) => text(b.tag === 'ul' && !/^\s*<ul/.test(b.html) ? `<ul>${b.html}</ul>` : b.html, { color: fg, size: d.images.length && !d.imageBleed ? ['clamp(18px, 1.35vw, 22px)', 19, 17] : 'clamp(15px, 0.95vw, 18px)', weight: d.images.length && !d.imageBleed ? 400 : 300, lh: 1.65, ls: 0.3, align: d.images.length ? 'left' : 'center', maxW: d.images.length ? undefined : 1800, cls: b.tag === 'ul' ? 'sb-list' : '' }));
  if (!d.images.length) {
    return section([
      H2(d.title, { color: fg, align: 'center', mb: 24 }),
      ...body,
      ...(btns.length ? [row(btns, { justify: 'center', settings: { _margin: box(40, 0, 0, 0) } })] : []),
    ], { bg, align: 'center', justify: 'center', minH: d.height });
  }
  const copy = stack([
    ...(d.pre ? [eyebrow(d.pre, { mb: 12 })] : []),
    H2(d.title, { color: fg, mb: 30, ...(d.images.length && !d.imageBleed ? { size: ['clamp(36px, 2.8vw, 54px)', 40, 32] } : {}) }),
    stack(body, { gap: 16 }),
    ...(btns.length ? [row(btns, { settings: { _margin: box(40, 0, 0, 0) } })] : []),
  ], { justify: 'center', settings: { _flex_size: 'grow', width: px(50, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%') } });
  const img = ctx.m(d.images[0]);
  if (d.imageBleed) {
    // Photo fills one half edge to edge; copy sits on cream in the other half.
    const pic = container({
      content_width: 'full', width: px(50, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%'), min_height: px(560), min_height_mobile: px(320), padding: box(0),
      background_background: 'classic', background_image: img, background_position: 'center center', background_size: 'cover', background_repeat: 'no-repeat',
    }, []);
    copy.settings.padding = cbox('60px', 'clamp(24px, 3vw, 62px)', '60px', 'clamp(24px, 3vw, 62px)');
    return section(d.imageSide === 'left' ? [pic, copy] : [copy, pic], {
      dir: 'row', bg, pad: box(0), align: 'stretch', minH: 560,
      settings: { flex_wrap: 'wrap', flex_direction_tablet: 'column', ...(d.imageSide === 'right' ? { flex_direction_tablet: 'column-reverse' } : {}) },
    });
  }
  // Boxed photo (Done Deals / What We're Looking For)
  const pic = image(img, { ratio: `${d.imageW || 898} / ${d.imageH || 560}`, settings: { _element_width: 'initial', _element_custom_width: cu('calc(46% - 36px)'), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%'), _flex_size: 'none' } });
  copy.settings.padding = box(0, 0, 0, 0);
  copy.settings.width = cu('calc(54% - 36px)');
  return section(d.imageSide === 'left' ? [pic, copy] : [copy, pic], {
    dir: 'row', bg, align: 'center', gap: 72, minH: d.height,
    settings: { flex_wrap: 'wrap', flex_gap: { unit: 'px', size: 72, column: '72', row: '40', isLinked: false }, flex_direction_tablet: 'column', ...(d.imageSide === 'right' ? { flex_direction_tablet: 'column-reverse' } : {}) },
  });
}

/* ------------------------------------------------- photo tile menus */
// Three tall photo tiles with a label bottom-left (My Vision on home; Home Search / About / Valuation on inner pages)
function tile(media, labelText, url, o = {}) {
  const centered = o.center;
  return container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: centered ? 'center' : 'flex-end', flex_align_items: centered ? 'center' : 'flex-start',
    padding: centered ? box(16) : box(0, 16, 18, 16), min_height: o.minH ? px(o.minH) : px(0),
    background_background: 'classic', background_image: media, background_position: 'center center', background_size: 'cover', background_repeat: 'no-repeat', background_color: C.sand,
    ...(o.overlay ? { background_overlay_background: 'classic', background_overlay_color: o.overlay } : {}),
    ...(o.ratio ? { custom_css: `selector { aspect-ratio: ${o.ratio}; }` } : {}),
    link: link(url), html_tag: 'a', ...cls('sb-tile'),
    ...(o.settings || {}),
  }, [
    heading(labelText, { tag: 'span', color: C.white, size: o.size || 'clamp(26px, 1.9vw, 36px)', weight: 400, lh: 1, ls: o.ls ?? 2, align: centered ? 'center' : 'left' }),
  ]);
}
function galleryMenu(d, ctx) {
  const items = d.items.map((it) => tile(ctx.m(it.image), it.label, fixUrl(it.href, ctx), { ratio: '589 / 707', size: 'clamp(28px, 2.1vw, 40px)' }));
  return section([grid(items, { cols: [3, 3, 1], gap: 15 })], { bg: C.espresso, pad: cbox('96px', GUT, '96px', GUT) });
}

/* ------------------------------------------------- shared lower bands */
function newsletterBand(ctx) {
  const panel = (children, bg) => container({
    content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(0),
    padding: cbox('80px', 'clamp(24px, 5vw, 96px)', '80px', 'clamp(24px, 5vw, 96px)'), min_height: px(605), min_height_mobile: px(0),
    background_background: 'classic', background_color: bg,
  }, children);
  return section([
    grid([
      panel([
        eyebrow('Join My', { center: true }),
        H2('Newsletter', { align: 'center', mb: 30 }),
        text('Stay up-to-date with exclusive news and market updates in the Bay Area.', { align: 'center', maxW: 580, mb: 30 }),
        widget('form', {
          form_name: 'Newsletter', ...formActions('New newsletter sign-up - Snow Bentley Realty'),
          form_fields: [field('email', 'email', 'Enter Your Email Address', { required: true }), consentField()],
          button_text: 'Subscribe', button_align: 'center', success_message: 'Thank you for subscribing!',
          ...formStyle({ rowGap: 22 }), ...cls('sb-form sb-form-news'),
          _element_width: 'initial', _element_custom_width: px(520), _element_custom_width_mobile: px(100, '%'),
          custom_css: 'selector .elementor-field-type-acceptance { margin-bottom: 10px; } selector .e-form__buttons { justify-content: center; } selector .elementor-field-group:has(input[type=email]) .elementor-field-textual { min-height: 50px; }',
        }),
      ], 'rgba(255,255,255,0.82)'),
      panel([
        eyebrow('Get in Touch', { center: true }),
        H2('Work With Snow', { align: 'center', mb: 30 }),
        text("Snow brings the same strategy and care to one of life's biggest decisions. She finds properties that fit her clients' lifestyle and goals, and she guides them through a smooth, well-negotiated process from first showing to closing.", { align: 'center', maxW: 600, mb: 50 }),
        button("Let's Connect", ctx.connect, 'dark', { pad: box(22, 36, 22, 36), align: 'center' }),
        row([
          widget('divider', { width: px(56), color: C.rule, weight: px(1), gap: px(0), _element_width: 'initial', _element_custom_width: px(56), ...cls('sb-rule') }),
          label('or', { size: 12, weight: 300, ls: 0, color: C.orGray, upper: false, settings: { _element_width: 'auto' } }),
          widget('divider', { width: px(56), color: C.rule, weight: px(1), gap: px(0), _element_width: 'initial', _element_custom_width: px(56), ...cls('sb-rule') }),
        ], { gap: 50, justify: 'center', nowrap: true, settings: { _margin: box(40, 0, 36, 0) } }),
        row([
          label('Call at', { size: 17, weight: 300, ls: 0, color: C.gray, upper: false, settings: { _element_width: 'auto' } }),
          textLink(LINKS.phone, LINKS.tel, { size: 15, weight: 600, ls: 0.5, icon: fa('fas fa-phone'), iconAlign: 'row', iconGap: 14 }),
        ], { gap: 14, justify: 'center', nowrap: true }),
      ], 'rgba(255,255,255,0.9)'),
    ], { cols: [2, 1, 1], gap: 0 }),
  ], { image: ctx.m('sb-golden-gate-bg'), bg: C.bronze, pad: cbox('76px', GUT, '76px', GUT) });
}

// Full-width testimonial slider on a photo (home + about)
function testimonialsSlider(ctx) {
  const T = ctx.testimonials;
  const slides = T.map((t) => container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(0), padding: box(0), ...cls('sb-panel') }, [
    text(`<p>“${t.text}”</p>`, { family: SERIF, size: 'clamp(20px, 1.7vw, 32px)', weight: 400, lh: 1.15, ls: 0, align: 'center', cls: 'sb-quote' }),
    label(t.author, { size: 16, weight: 300, ls: 0, upper: false, align: 'center', settings: { _margin: box(56, 0, 0, 0) } }),
  ]));
  return section([
    eyebrow('Success Stories', { center: true, color: C.white, rule: C.white, ruleW: 104, mb: 14 }),
    H2('Testimonials', { color: C.white, align: 'center' }),
    container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', padding: box(0), _margin: box(86, 0, 0, 0), width: px(1296), width_tablet: px(100, '%'), ...cls('sb-switch') }, [
      container({
        content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_align_items: 'center',
        padding: cbox('120px', 'clamp(24px, 6vw, 112px)', '84px', 'clamp(24px, 6vw, 112px)'), min_height: px(512), min_height_mobile: px(0),
        background_background: 'classic', background_color: 'rgba(255,255,255,0.86)',
      }, [
        container({ content_width: 'full', width: px(55), min_height: px(80), padding: box(18, 0, 0, 0), flex_align_items: 'center', flex_justify_content: 'center', background_background: 'classic', background_color: C.espresso, ...cls('sb-quote-mark') }, [
          heading('“', { tag: 'span', color: C.white, size: 44, weight: 700, lh: 1, ls: 0, align: 'center', upper: false }),
        ]),
        ...slides,
      ]),
      row([
        button('', '#', 'white', { pad: box(0), icon: chevronLeft, iconGap: 0, cls: 'sb-arrow sb-prev' }),
        button('', '#', 'white', { pad: box(0), icon: chevronRight, iconGap: 0, cls: 'sb-arrow sb-next' }),
      ], { justify: 'space-between', nowrap: true, cls: 'sb-t-arrows', settings: {
        _position: 'absolute', _offset_orientation_v: 'start', _offset_y: px(50, '%'), _offset_x: px(0), _element_width: 'initial', _element_custom_width: px(100, '%'),
        custom_css: 'selector { position: absolute !important; left: 0; right: 0; top: 50%; transform: translateY(-50%); width: auto !important; padding: 0 clamp(20px, 3.3vw, 62px); z-index: 3; }',
      } }),
    ]),
    button('View All', '/testimonials/', 'white', { align: 'center', settings: { _margin: box(50, 0, 0, 0) } }),
  ], { image: ctx.m('sb-testimonials-bg'), bg: C.stone, align: 'center', justify: 'center', minH: 990, settings: { custom_css: 'selector > .sb-switch { position: static; } selector { position: relative; }' } });
}
// Arrows need to sit at the section gutters: the switch container is static so the absolute arrow row anchors on the section.

/* ------------------------------------------------------------- about */
function agentBio(d, ctx) {
  const paras = d.paragraphs.slice(0, -1); // the last paragraph repeats as a teaser on the live site
  return section([
    container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_gap: { unit: 'custom', size: 'clamp(32px, 7vw, 130px)', column: 'clamp(32px, 7vw, 130px)', row: '40px', isLinked: false }, flex_align_items: 'flex-start', flex_justify_content: 'center', padding: box(0), custom_css: 'selector { max-width: 1576px; margin: 0 auto; }' }, [
      image(ctx.m(d.image), { ratio: '547 / 640', settings: { _element_width: 'initial', _element_custom_width: px(547), _element_custom_width_mobile: px(100, '%'), _flex_size: 'none' } }),
      stack([
        H2(d.title, { size: 'clamp(34px, 2.5vw, 48px)', weight: 400, mb: 24 }),
        text(paras.map((p) => `<p>${p}</p>`).join(''), { size: 'clamp(15px, 0.95vw, 18px)', weight: 400, lh: 1.5, ls: 0.4, pSpace: 24, cls: 'sb-more' }),
        social({ size: 13, settings: { _margin: box(30, 0, 0, 0) } }),
      ], { settings: { _flex_size: 'grow', width: px(50, '%'), width_tablet: px(100, '%'), _element_width: 'initial', custom_css: 'selector { max-width: 760px; flex: 1 1 420px; }' } }),
    ]),
  ], { bg: C.cream });
}
function agentDetails(ctx) {
  const rows = [['Email Address', LINKS.email, LINKS.mailto], ['Primary Phone', '(415) 823-8595', LINKS.tel], ['Address', '2603 Camino Ramon San Ramon CA, 94583', ''], ['License', '#01911217', '']];
  return section([
    stack([
      H3('Contact Details', { size: 40, weight: 400, mb: 24 }),
      ...rows.map(([l, v, u]) => row([
        label(l, { size: 12, weight: 600, ls: 0.5, upper: true, settings: { _element_width: 'auto' } }),
        u ? textLink(v, u, { size: 16, weight: 300, underline: true, cls: 'sb-ul' }) : label(v, { size: 16, weight: 300, ls: 0, upper: false, settings: { _element_width: 'auto' } }),
      ], { justify: 'space-between', nowrap: true, settings: { padding: box(22, 32, 22, 32), padding_mobile: box(18, 0, 18, 0), border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.hair } })),
    ], { settings: { custom_css: 'selector { max-width: 1452px; margin: 0 auto; width: 100%; }' } }),
  ], { bg: C.cream, pad: cbox('40px', GUT, SEC, GUT) });
}

/* ------------------------------------------------------------ contact */
function contactForm(d) {
  const sel = (f) => (f.options || []).map((o, i) => (i === 0 ? `${o}|` : o)).join('\n');
  const F = d.fields.filter((f) => f.name && f.name !== 'middleName' && f.type !== 'checkbox');
  const fields = F.map((f) => {
    const ph = f.placeholder || (f.options ? f.options[0] : f.name);
    if (f.tag === 'select') return field(f.name.replace(/[^a-z]/gi, ''), 'select', '', { label: (f.options && f.options[0]) || f.name, width: '50', required: f.required, extra: { field_options: sel(f) } });
    if (f.tag === 'textarea') return field(f.name.replace(/[^a-z]/gi, '') || 'message', 'textarea', ph, { width: '50', extra: { rows: 4 } });
    return field(f.name.replace(/[^a-z]/gi, ''), f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text', ph, { width: '50', required: f.required });
  });
  return section([
    H2(d.title, { align: 'center', weight: 400, mb: 24 }),
    text(d.intro.join('<br>'), { align: 'center', size: 'clamp(15px, 0.95vw, 18px)', weight: 400, mb: 40 }),
    widget('form', {
      form_name: 'Contact', ...formActions('New contact form message - Snow Bentley Realty'),
      form_fields: [...fields, consentField()], button_text: 'Submit', success_message: 'Thank you for your message. I will be in touch with you shortly.',
      ...formStyle({ rowGap: 22, btnPad: box(20, 32, 20, 32) }), column_gap: px(32), ...cls('sb-form sb-form-noicon'),
      _element_width: 'initial', _element_custom_width: px(1036), _element_custom_width_tablet: px(100, '%'),
    }),
  ], { bg: C.cream, align: 'center' });
}

/* ----------------------------------------------------- home valuation */
function textGrid(d) {
  return section([
    grid(d.items.map((it) => stack([
      H3(it.title, { size: 'clamp(24px, 1.6vw, 30px)', weight: 400, align: 'center', lh: 1.15, mb: 20 }),
      text(it.body, { align: 'center', size: 15, lh: 1.6 }),
    ], { settings: { padding: box(28, 20, 32, 20), border_border: 'solid', border_width: box(1), border_color: C.hair } })), { cols: [3, 1, 1], gap: 0 }),
  ], { bg: C.cream });
}
function timeline(d) {
  const tag = (t) => heading(t, { tag: 'p', family: SANS, size: 14, weight: 400, lh: 1, ls: 1, color: C.white, upper: true, settings: { _element_width: 'auto', _padding: box(9, 18, 9, 18), _background_background: 'classic', _background_color: C.espresso } });
  const copy = (it, align) => stack([
    ...(it.title ? [H3(it.title, { size: 'clamp(24px, 1.6vw, 30px)', weight: 400, align, lh: 1.15, mb: 10 })] : []),
    text(it.html, { align, size: 15, lh: 1.6, ls: 0.4, cls: 'sb-ul-links' }),
  ]);
  return section([
    heading(d.title, { tag: 'h2', align: 'center', size: 'clamp(34px, 2.1vw, 40px)', weight: 400, upper: /^[A-Z\s?'’]+$/.test(d.title), ls: d.title === d.title.toUpperCase() ? 2 : 0.5, mb: 16 }),
    label(d.subtitle, { align: 'center', size: 14, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 40, 0) } }),
    stack(d.items.map((it) => grid([
      container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'flex-end', padding: box(0, 32, 50, 0), padding_mobile: box(0, 0, 16, 0) }, [it.tagLeft ? tag(it.label) : copy(it, 'right')]),
      container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'flex-start', padding: box(0, 0, 50, 32), padding_mobile: box(0, 0, 40, 0), border_border: 'solid', border_width: box(0, 0, 0, 1), border_width_mobile: box(0), border_color: '#B8A890', ...cls('sb-tl-right') }, [it.tagLeft ? copy(it, 'left') : tag(it.label)]),
    ], { cols: [2, 2, 1], gap: 0, align: 'start' })), { settings: { custom_css: 'selector { max-width: 1440px; margin: 0 auto; width: 100%; } selector .sb-tl-right::before { content: ""; position: absolute; left: -4px; top: 10px; width: 7px; height: 7px; border-radius: 50%; background: #937C5C; }' } }),
  ], { bg: C.cream });
}

/* ------------------------------------------------------- neighborhoods */
function hoodCard(h, ctx) {
  return stack([
    image(ctx.m(h.image), { ratio: '589 / 250', link: h.href, cls: 'sb-tile-img' }),
    heading(h.name, { tag: 'h3', size: 'clamp(24px, 1.6vw, 30px)', weight: 400, lh: 1.2, ls: 2, link: h.href, settings: { _margin: box(16, 0, 0, 0) } }),
    widget('divider', { weight: px(1), color: C.espresso, gap: px(0), width: px(100, '%'), _margin: box(40, 0, 20, 0), ...cls('sb-rule') }),
    textLink('Read More', h.href, { size: 12, weight: 600, ls: 1, upper: true, lh: 1, icon: chevronRight, iconGap: 10 }),
  ], { cls: 'sb-tile' });
}
function neighborhoodsGrid(d, ctx) {
  return section([
    eyebrow(d.pre || 'Explore', { center: true, color: C.espresso, mb: 14 }),
    H2(d.title, { align: 'center', weight: 400, mb: 56 }),
    grid(d.items.map((h) => hoodCard({ ...h, href: fixUrl(h.href, ctx) }, ctx)), { cols: [3, 2, 1], gap: 15, rowGap: 56 }),
  ], { bg: C.cream });
}

/* ------------------------------------------------------------ guides */
function guideDownload(d, ctx) {
  const form = stack([
    H3(d.title, { size: 'clamp(28px, 1.9vw, 36px)', weight: 400, mb: 36 }),
    widget('form', {
      form_name: `Guide request - ${d.title}`, ...formActions(`Guide request (${d.title}) - Snow Bentley Realty`),
      form_fields: [field('name', 'text', 'Name', { required: true }), field('phone', 'tel', 'Phone', { required: true }), field('email', 'email', 'Email', { required: true }), consentField()],
      button_text: 'Send', success_message: 'Thank you! Snow will send your guide shortly.',
      ...formStyle({ rowGap: 18, btnPad: box(18, 24, 18, 24) }), ...cls('sb-form sb-form-noicon'),
    }),
  ], { justify: 'center', settings: { width: px(42, '%'), width_tablet: px(100, '%'), _flex_size: 'none' } });
  const pic = image(ctx.m(d.image), { settings: { _element_width: 'initial', _element_custom_width: px(50, '%'), _element_custom_width_tablet: px(100, '%'), _flex_size: 'none' } });
  return section(d.imageSide === 'left' ? [pic, form] : [form, pic], { dir: 'row', bg: C.white, justify: 'space-between', align: 'center', gap: 40, settings: { flex_wrap: 'wrap', flex_direction_tablet: 'column' } });
}

/* ------------------------------------------------------- testimonials */
function testimonialsGrid(ctx) {
  return section([
    grid(ctx.testimonials.map((t) => stack([
      heading('“', { tag: 'span', size: 40, weight: 700, lh: 0.6, ls: 0, upper: false, settings: { _margin: box(0, 0, 20, 0) } }),
      text(`<p>${t.text}</p>`, { size: 'clamp(15px, 0.9vw, 17px)', weight: 300, lh: 1.6, ls: 0.3, cls: 'sb-quote sb-quote-short' }),
      label(t.author, { size: 16, weight: 400, ls: 0.5, upper: false, settings: { _margin: box(48, 0, 0, 0) } }),
      widget('divider', { weight: px(1), color: C.hair, gap: px(0), width: px(100, '%'), _margin: box(40, 0, 0, 0), ...cls('sb-rule') }),
    ], { settings: { padding: box(40, 0, 0, 0) } })), { cols: [2, 1, 1], gap: 64, rowGap: 0, align: 'start' }),
  ], { bg: C.cream, settings: { custom_css: 'selector > .e-con-inner, selector > .e-grid { max-width: 1150px; margin: 0 auto; }' }, pad: cbox(SEC, 'clamp(20px, 10vw, 385px)', SEC, 'clamp(20px, 10vw, 385px)') });
}

/* --------------------------------------------------------------- blog */
function staySignup() {
  return section([
    H2('Stay Connected', { color: C.white, align: 'center', weight: 400, mb: 24 }),
    text('Stay in the know on market trends, exclusive properties, and real estate insights in the Bay Area.', { color: C.white, align: 'center', size: 16, weight: 400, mb: 30 }),
    widget('form', {
      form_name: 'Stay Connected', ...formActions('New Stay Connected sign-up - Snow Bentley Realty'),
      form_fields: [field('name', 'text', 'Name', { width: '33' }), field('email', 'email', 'Email', { required: true, width: '33' }), consentField()],
      button_text: 'Submit', button_width: '33', success_message: 'Thank you for subscribing!',
      ...formStyle({ rowGap: 16, border: C.white, btnPad: box(18, 24, 18, 24) }), column_gap: px(16),
      field_background_color: C.white, button_background_color: C.white, button_text_color: C.espresso, button_background_hover_color: C.cream, button_hover_color: C.espresso,
      html_color: C.white, label_color: C.white, ...cls('sb-form sb-form-noicon'),
      _element_width: 'initial', _element_custom_width: px(740), _element_custom_width_mobile: px(100, '%'),
      custom_css: 'selector .elementor-field-type-acceptance label, selector .elementor-field-type-acceptance label a { color: #fff; } selector .e-form__buttons { order: 2; } selector .elementor-field-type-acceptance { order: 3; }',
    }),
  ], { bg: C.espresso, align: 'center', minH: 455, justify: 'center' });
}

/* --------------------------------------------------------- legal page */
function legalBody(d) {
  // The live page uses plain <p>/<div> blocks; promote one-line section titles to headings.
  let html = d.html.replace(/<div>\s*/g, '').replace(/\s*<\/div>/g, '');
  html = html.replace(/<p>([^<]{2,80})<\/p>/g, (m0, t) => (/[.:;,]$/.test(t.trim()) || t.length > 70 ? m0 : `<h3>${t.trim()}</h3>`));
  return section([
    text(html, { size: 16, weight: 300, lh: 1.7, ls: 0.3, pSpace: 18, cls: 'sb-legal', settings: { custom_css: 'selector h3 { font: 400 26px/1.2 "Cormorant Garamond", serif; letter-spacing: 1px; text-transform: uppercase; margin: 36px 0 14px; color: #3A2C26; } selector a { text-decoration: underline; }' } }),
  ], { bg: C.white, settings: { custom_css: 'selector > * { max-width: 1200px; margin-left: auto; margin-right: auto; }' } });
}

/* ------------------------------------------------- neighborhood detail */
const rsMap = (geo, h = 820) => `<iframe class="sb-rs-map" src="https://snowbentley.realscout.com/homesearch/map${geo ? `?geo_type=${geo[0]}&geo_id=${geo[1]}` : ''}" title="Home search" loading="lazy" style="width:100%;height:${h}px;border:0;display:block;background:#fff"></iframe>`;
// Live MLS listings for the area (RealScout map search, filtered to the neighborhood's city). areas: [[label, [geo_type, geo_id]], ...]
function areaSearch(areas, name) {
  const embed = (geo) => widget('html', { html: rsMap(geo), ...cls('sb-idx sb-panel'), _element_width: 'initial', _element_custom_width: px(100, '%') });
  return section([
    H2('Property Listings', { align: 'center', weight: 400, mb: 24 }),
    text(`Homes for sale in ${name}, updated live from the MLS. Save a search to get new listings by email.`, { align: 'center', mb: 36 }),
    areas.length > 1
      ? container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', padding: box(0), ...cls('sb-switch') }, [
        row(areas.map(([l]) => label(l, { size: 12, weight: 400, ls: 0.5, upper: true, cls: 'sb-tab sb-pilltab', settings: { _element_width: 'auto' } })), { gap: 8, justify: 'center', settings: { _margin: box(0, 0, 24, 0) } }),
        ...areas.map(([, geo]) => embed(geo)),
      ])
      : embed(areas[0][1]),
  ], { bg: C.cream, align: 'center' });
}
function overview(d) {
  const icons = ['fas fa-users', 'far fa-user', 'fas fa-chart-area', 'fas fa-dollar-sign'];
  return section([
    H2(d.title, { color: C.white, weight: 400, mb: 24 }),
    text(d.text, { color: C.white, size: 16, weight: 400, maxW: 1200, mb: 50 }),
    row(d.stats.map((s, i) => row([
      widget('icon', { selected_icon: fa(icons[i % 4]), view: 'framed', shape: 'circle', primary_color: C.white, size: px(16), icon_padding: px(12), border_width: box(1), _element_width: 'auto' }),
      stack([
        label(s.value, { family: SERIF, size: 24, weight: 400, ls: 0.5, color: C.white, upper: true }),
        label(s.label, { size: 12, weight: 400, ls: 0.5, color: C.white, upper: true }),
      ], { gap: 6, settings: { _element_width: 'auto' } }),
    ], { gap: 16, nowrap: true, settings: { _element_width: 'auto' } })), { justify: 'space-between', gap: 32 }),
  ], { bg: C.espresso });
}
function poiTable(rows) {
  const stars = (r) => { const n = Math.round(parseFloat(r) || 0); return '<span class="sb-stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span> ' + r.replace(' stars', ''); };
  return `<table><thead><tr><th>Name</th><th>Category</th><th>Distance</th><th>Reviews</th><th>Ratings by Yelp</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.imageUrl ? `<img class="sb-poi-img" src="${r.imageUrl}" alt="">` : ''}<span style="display:inline-block;vertical-align:middle"><a class="sb-name" href="${r.href}" target="_blank" rel="noopener">${r.name}</a><a class="sb-addr" href="${r.mapHref}" target="_blank" rel="noopener">${r.address}</a></span></td><td><span class="sb-badge">${r.category}</span></td><td>${r.distance}</td><td>${r.reviews}</td><td>${stars(r.rating)}</td></tr>`).join('')}</tbody></table>`;
}
function poi(d, ctx) {
  const rows = d.rows.map((r) => ({ ...r, imageUrl: r.image && ctx.has(r.image) ? ctx.m(r.image).url : '' }));
  return section([
    H2(d.title, { weight: 400, mb: 20 }),
    text(d.text, { size: 14, weight: 400, ls: 0.5, upper: true, color: C.muted, mb: 40 }),
    row(d.scores.map((s) => row([
      heading(s.value, { tag: 'p', size: 24, weight: 300, ls: 0, align: 'center', upper: false, cls: 'sb-score', settings: { _element_width: 'auto' } }),
      stack([heading(s.title, { tag: 'h6', size: 20, weight: 300, ls: 0.5, lh: 1.2 }), label(s.label, { size: 11, weight: 600, ls: 0.5, color: C.muted })], { gap: 6, settings: { _element_width: 'auto' } }),
    ], { gap: 20, nowrap: true, settings: { _element_width: 'auto', padding: box(20, 40, 20, 0) } })), { gap: 60, settings: { padding: box(0, 0, 40, 0), border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.hair } }),
    heading(d.poiTitle, { tag: 'h4', size: 32, weight: 300, mb: 16, settings: { _margin: box(48, 0, 16, 0) } }),
    text(d.poiText, { size: 14, weight: 400, ls: 0.5, upper: true, color: C.muted, maxW: 760, mb: 24 }),
    row(d.filters.map((f, i) => label(f.replace(/^SEARCH BUSINESSES RELATED TO\s*/i, ''), { size: 12, weight: 400, ls: 0.5, upper: true, cls: `sb-pilltab${i === 0 ? ' is-active' : ''}`, settings: { _element_width: 'auto' } })), { gap: 8, settings: { _margin: box(0, 0, 24, 0) } }),
    text(poiTable(rows), { cls: 'sb-table' }),
  ], { bg: C.cream });
}
function demographics(d) {
  const pctOf = (v) => { const m = v.match(/\(([\d.]+)%\)/) || v.match(/([\d.]+)%/); return m ? parseFloat(m[1]) : 0; };
  const statRow = (stats) => row(stats.map((s, i) => stack([
    label(s.value, { family: SERIF, size: 24, weight: 400, ls: 0.5, upper: true }),
    label(s.label, { size: 12, weight: 400, ls: 0.5, upper: true }),
  ], { gap: 6, settings: { _element_width: 'initial', _element_custom_width: px(Math.floor(100 / stats.length) - 1, '%'), _element_custom_width_mobile: px(46, '%'), padding: box(0, 20, 0, i ? 20 : 0), border_border: 'solid', border_width: box(0, 0, 0, i ? 1 : 0), border_color: C.hair } })), { gap: 0, align: 'flex-start', settings: { padding: box(30, 0, 30, 0), border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.hair, _margin: box(0, 0, 40, 0) } });
  const bars = (ch) => stack([
    label(ch.title, { size: 12, weight: 400, ls: 0.5, upper: true, settings: { _margin: box(0, 0, 18, 0) } }),
    ...ch.bars.map((b) => widget('progress', {
      title: `${b.label}`, title_display: 'yes', progress_type: '', percent: px(Math.max(1, Math.min(100, pctOf(b.value)))), display_percentage: 'hide', inner_text: b.value,
      bar_color: C.espresso, bar_bg_color: C.white, bar_height: px(16), bar_border_radius: box(0), title_color: C.espresso,
      bar_inline_color: C.white, ...typo('bar_inner_typography', SANS, 11, 400), ...typo('typography', SANS, 12, 400), ...cls('sb-progress'),
      _margin: box(0, 0, 14, 0),
    })),
  ], { settings: { _flex_size: 'grow', width: px(48, '%'), width_tablet: px(100, '%') } });
  const panels = d.tabs.map((t) => container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-panel') }, [
    text(t.text, { size: 15, weight: 400, maxW: 1200, mb: 30 }),
    ...(t.stats.length ? [statRow(t.stats)] : []),
    row(t.charts.map(bars), { align: 'flex-start', gap: 60, nowrap: false }),
  ]));
  return section([
    H2(d.title, { weight: 400, mb: 24 }),
    container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-switch') }, [
      row(d.tabs.map((t) => label(t.name, { size: 12, weight: 400, ls: 0.5, upper: true, cls: 'sb-tab sb-pilltab', settings: { _element_width: 'auto' } })), { gap: 8, settings: { _margin: box(0, 0, 24, 0) } }),
      ...panels,
    ]),
  ], { bg: C.cream });
}
const GRADE = { KINDERGARTEN: 'K', PRE_KINDERGARTEN: 'PK', FIRST_GRADE: '1st', SECOND_GRADE: '2nd', THIRD_GRADE: '3rd', FOURTH_GRADE: '4th', FIFTH_GRADE: '5th', SIXTH_GRADE: '6th', SEVENTH_GRADE: '7th', EIGHTH_GRADE: '8th', NINTH_GRADE: '9th', TENTH_GRADE: '10th', ELEVENTH_GRADE: '11th', TWELFTH_GRADE: '12th', UNGRADED: 'Ungraded' };
function schoolTable(list) {
  const stars = (n) => (n ? `<span class="sb-stars">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span> ${n}/5` : '<span style="color:#8C7F76">No rating available</span>');
  return `<table><thead><tr><th>Type</th><th>Name</th><th>Category</th><th>Grades</th><th>School Rating</th></tr></thead><tbody>${list.map((s) => {
    const addr = `${s.address}, ${s.city}, ${s.state}, ${s.zipCode}`;
    const name = s.url ? `<a class="sb-name" href="${s.url}" target="_blank" rel="noopener">${s.name}</a>` : `<span class="sb-name">${s.name}</span>`;
    return `<tr><td><span class="sb-school-icon"></span></td><td>${name}<a class="sb-addr" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener">${addr}</a></td><td><span class="sb-badge">${s.schoolType}</span></td><td>${GRADE[s.lowGrade] || s.lowGrade || ''} - ${GRADE[s.highGrade] || s.highGrade || ''}</td><td>${stars(s.schoolRating)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function schools(d) {
  const levels = ['PRIMARY', 'MIDDLE', 'HIGH', 'MIXED'];
  const groups = levels.map((l) => d.schools.filter((s) => s.educationLevel === l));
  const tabs = levels.map((l, i) => [`${d.tabs[i] || l} (${groups[i].length})`, groups[i]]).filter(([, g]) => g.length);
  return section([
    H2(d.title, { weight: 400, mb: 24 }),
    container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-switch') }, [
      row(tabs.map(([t]) => label(t, { size: 14, weight: 300, ls: 0.5, upper: true, cls: 'sb-tab sb-pilltab', settings: { _element_width: 'auto' } })), { gap: 8, settings: { _margin: box(0, 0, 24, 0) } }),
      text(d.text, { size: 15, weight: 300, color: C.gray, maxW: 1000, mb: 30 }),
      ...tabs.map(([, g]) => text(schoolTable(g), { cls: 'sb-table sb-panel' })),
    ]),
  ], { bg: C.cream });
}
function galleryImage(d, ctx) {
  return section([], { image: ctx.m(d.images[0]), overlay: 'rgba(0,0,0,0)', minH: 'clamp(320px, 56vw, 1080px)', pad: box(0) });
}
function hoodMap(d, name) {
  // Map fills the section; the espresso "Navigate" card floats over its bottom-left corner.
  return container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-map'), custom_css: 'selector { position: relative; }' }, [
    widget('google_maps', { address: `${d.lat},${d.lng}`, zoom: px(13), height: px(796), height_mobile: px(520), custom_css: 'selector iframe { display: block; }' }),
    container({
      content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(24), padding: box(40, 32, 40, 32),
      background_background: 'classic', background_color: C.espresso,
      custom_css: 'selector { position: absolute; left: clamp(20px, 3.3vw, 62px); bottom: 62px; width: 394px; max-width: calc(100% - 40px); z-index: 2; }',
    }, [
      label(name, { size: 18, weight: 300, ls: 0, color: C.white, upper: false, align: 'center' }),
      button('Navigate', d.href, 'white', { align: 'center', pad: box(18, 32, 18, 32) }),
    ]),
  ], false);
}

// RealScout IDX (live MLS data). kind: 'search' (search form + active listings) | 'active' | 'sold'
function idxListings(kind, o = {}) {
  const id = LINKS.realscoutId;
  const listings = (status) => `<realscout-office-listings agent-encoded-id="${id}" sort-order="${status === 'Sold' ? 'STATUS_AND_SIGNIFICANT_CHANGE' : 'NEWEST'}" listing-status="${status}" property-types="${o.types || 'SFR,MF,TC,LAL,MOBILE,OTHER'}" price-min="${o.priceMin || 0}"></realscout-office-listings>`;
  const html = kind === 'search'
    ? `<realscout-advanced-search agent-encoded-id="${id}"></realscout-advanced-search>`
    : listings(kind === 'sold' ? 'Sold' : 'For Sale');
  return section([
    ...(o.title ? [H2(o.title, { align: 'center', weight: 400, mb: 24 })] : []),
    ...(o.text ? [text(o.text, { align: 'center', maxW: 900, mb: 40 })] : []),
    widget('html', { html, ...cls('sb-idx'), _element_width: 'initial', _element_custom_width: px(100, '%') }),
    ...(kind === 'search' ? [widget('html', { html: listings('For Sale'), ...cls('sb-idx'), _margin: box(48, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(100, '%') })] : []),
    ...(o.portal ? [row([button('Open Full Map Search', LINKS.portal, 'dark'), button("Let's Connect", o.connect, 'outline')], { justify: 'center', settings: { _margin: box(48, 0, 0, 0) } })] : []),
  ], { bg: C.cream, align: 'center' });
}

module.exports = {
  rsMap, idxListings, innerHero, ctaBand, fullBleed, tile, galleryMenu, newsletterBand, testimonialsSlider, agentBio, agentDetails, contactForm,
  textGrid, timeline, hoodCard, neighborhoodsGrid, guideDownload, testimonialsGrid, staySignup, legalBody,
  areaSearch, overview, poi, demographics, schools, galleryImage, hoodMap, fixUrl, chevronRight, chevronLeft,
};
