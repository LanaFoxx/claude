// Shared builder for the four WooCommerce course pages (Claude Design "CTEC 60/20 Hour Course",
// "CTEC 15 Hour In Lieu of Experience Course", "California Tax Law 5 Hours"). One layout, data-driven:
// hero → enroll (packages, #enroll) → course features → credentials → helpful articles → FAQ → final CTA.
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, auto, link, typo, container, widget, cls, wcls, fa, band, stack, row, grid, linkBox,
  eyebrow, heading, H2, text, button, image, pill } = L;

const a = (href, t = href) => `<a href="${href}">${t}</a>`;
// Same FAQ on all four designs (the designs show the first five).
const FAQS = [
  ['Are you approved by CTEC to offer continuing or qualifying education courses?',
    [`Yes, California Tax Courses is approved by the California Tax Education Council (CTEC) and the IRS for continuing (CE) and qualifying (QE) education. Our CTEC provider number is 6280 and our IRS Provider number is HPKCW. You can view our company listed on the CTEC website at ${a('https://www.ctec.org/ApprovedEducationProviders?nav=tax-professionals')}.`]],
  ['Are you approved by the IRS to offer continuing education?',
    [`California Tax Courses is an IRS Approved Education Provider. Our IRS Provider number is HPKCW. You can find our company and information listed on the IRS Website at ${a('https://www.ceprovider.us/public/default/listing')}`]],
  ['How do I take your course? Where do I login at?',
    ['All of our courses and exams are delivered online. Once you pay for the course, you will automatically receive an email with your login information (check your spam folder if you can’t find it). The course can be accessed from your computer, tablet, or smartphone anywhere you can connect to the internet. You can login at anytime 24/7 and take your course at your own pace. Your progress is automatically saved when you log out, or leave the website, so you can resume from where you left off.',
      'Going somewhere for the weekend and want to work on the course while you’re gone. No problem! As long as you have internet access on your device, you can access your course!',
      'Our online courses are all in Video format with a complimentary PDF that you can download and use to follow along or study with.',
      `Course Login: ${a('https://learn.cataxcourses.com/login')}`]],
  ['How long will I have access to your courses?',
    ['You will always have full access to your CTEC tax course, even after you’ve completed it. This means you can retake your courses or go back for a refresher as many times as you’d like. You will also have access to your completion certificate at any time.',
      'After 1 year of enrolling, the course will no longer be good for CTEC credit, as we have to update our coures each year with new tax laws. So if you take more than 1 year to complete your course, you\'ll need to enroll in new updated course for CTEC credit.']],
  ['I\'m interested in becoming a California Tax Preparer, which course should I enroll in?',
    [`If you want to prepare taxes for a fee or compensation in the state of California, you are first required to complete a CTEC 60 Hour Qualifying Education tax course. You will also need to complete a series of other steps for CTEC, in order to become a Registered Tax Preparer. Click ${a(URL.become, '&gt;HERE&lt;')} for more information.`]],
];

// Design SVG icons → Font Awesome 5 solid (matched by feature title prefix).
const FEATURE_ICONS = [
  ['CTEC', 'fas fa-landmark'], ['Instant Reporting', 'fas fa-bolt'], ['Unlimited Attempts', 'fas fa-redo-alt'],
  ['Fully Online Video Course', 'fas fa-laptop'], ['Access from computer', 'fas fa-mobile-alt'],
  ['Instant Enrollment', 'fas fa-graduation-cap'], ['Updated with', 'fas fa-calendar-alt'],
];
const featureIcon = (title) => (FEATURE_ICONS.find(([k]) => title.startsWith(k)) || [0, 'fas fa-check'])[1];

const enrollBtn = (label, o = {}) => button(label, '#enroll', { size: [22, 21, 19], pad: box(18, 28, 18, 28), ...o });

/* ------------------------------------------------------------------ hero */
function heroMedia(m, d) {
  if (d.productImage) {
    // Navy card with a gold top bar around the course's product image (as in the 15h / CA Law designs).
    return container({
      content_width: 'full', flex_direction: 'column', padding: box(14), flex_gap: gap(0),
      background_background: 'classic', background_color: C.navy, border_radius: box(16), overflow: 'hidden',
      border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
      box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 80, spread: -40, color: 'rgba(0,0,0,0.6)' },
    }, [
      container({ content_width: 'full', padding: box(24), border_radius: box(10), overflow: 'hidden', background_background: 'classic', background_color: C.white, flex_align_items: 'center' }, [
        image({ ...d.productImage, source: 'library' }, { settings: { width: px(100, '%'), image_border_radius: box(6) } }),
      ]),
    ]);
  }
  if (d.youtube) {
    // Navy card with a gold top bar around the course video (YouTube).
    return container({
      content_width: 'full', flex_direction: 'column', padding: box(14), flex_gap: gap(0),
      background_background: 'classic', background_color: C.navy, border_radius: box(16), overflow: 'hidden',
      border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
      box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 80, spread: -40, color: 'rgba(0,0,0,0.6)' },
    }, [
      container({ content_width: 'full', padding: box(0), border_radius: box(10), overflow: 'hidden', background_background: 'classic', background_color: '#000000' }, [
        widget('video', { video_type: 'youtube', youtube_url: d.youtube, aspect_ratio: '169', modestbranding: 'yes', rel: 'yes', _title: d.youtubeTitle || '' }),
      ]),
    ]);
  }
  // Laptop animation; d.laptop picks a course-specific recording (e.g. '20' → ctc-laptop-animation-20.mp4).
  const vid = d.laptop ? m.file(`ctc-laptop-animation-${d.laptop}.mp4`) : m.laptopVideo;
  const poster = d.laptop ? m.file(`ctc-laptop-animation-${d.laptop}-poster.jpg`) : m.laptopPoster;
  return widget('video', {
    video_type: 'hosted', hosted_url: { url: vid.url, id: vid.id }, autoplay: 'yes', play_on_mobile: 'yes', mute: 'yes', loop: 'yes', controls: '',
    preload: 'auto', aspect_ratio: '32', poster: { url: poster.url, id: poster.id }, ...wcls('ctc-laptop'),
  });
}

function hero(m, d) {
  const para = ([t, bold], i) => text(t, {
    size: [17, 17, 16], lh: 1.6, color: bold ? C.navy : C.gray, weight: bold ? 700 : 400,
    settings: { _margin: box(i === 0 ? 22 : 14, 0, 0, 0) },
  });
  const videoFirst = !d.productImage; // 60 / 20 hour: on mobile the pill + laptop video come first, as on the homepage
  const mobileOnly = { hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet' };
  return band(C.cream, [
    image(m.seal, { width: 560, cls: 'ctc-deco', settings: { _position: 'absolute', _element_width: 'initial', _element_custom_width: px(560), opacity: px(0.1), _offset_orientation_h: 'end', _offset_x_end: px(-140), _offset_orientation_v: 'end', _offset_y_end: px(-200), _z_index: 0, hide_mobile: 'hidden-mobile' } }),
    grid([
      stack([
        pill(d.pill, videoFirst ? { settings: { hide_mobile: 'hidden-mobile' } } : {}),
        heading(d.h1, 'h1', [64, 52, 38], C.navy, 'left', { lh: 1.05, settings: { _margin: box(18, 0, 0, 0) } }),
        ...d.intro.map(para),
        row([
          enrollBtn(d.heroCta),
          widget('heading', { title: `Questions? ${PHONE.label}`, header_size: 'span', link: link(PHONE.tel), title_color: C.navy, ...typo('typography', HEAD, [20, 20, 18], 700, { lh: 1.3, ls: 0 }), ...wcls('ctc-navlink') }),
        ], { gap: 16, settings: { margin: box(30, 0, 0, 0), _margin: box(30, 0, 0, 0) } }),
      ]),
      stack([
        ...(videoFirst ? [pill(d.pill, { settings: { ...mobileOnly, _margin_mobile: box(0, 0, 18, 0) } })] : []),
        heroMedia(m, d),
        text(d.caption, { align: 'center', size: [15, 15, 14], lh: 1.6, settings: { _margin: box(18, 0, 0, 0) } }),
      ], { settings: { _z_index: 1, ...(videoFirst ? { _flex_order_mobile: 'start' } : {}) } }),
    ], { cols: [2, 1, 1], gap: 56, gapM: 40, align: 'center', settings: { _z_index: 1 } }),
  ], { pad: [88, 96], cls: 'ctc-dots-cream' });
}

/* ---------------------------------------------------------------- enroll */
function pkg(p) {
  const ic = (v, s) => widget('icon', { selected_icon: fa(v), primary_color: C.gold, size: px(s), align: 'center' });
  const icons = p.book
    ? row([ic('fas fa-laptop', 44), widget('heading', { title: '+', header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, 30, 300, { lh: 1, ls: 0 }) }), ic('fas fa-book', 38)], { gap: 8, justify: 'center' })
    : ic('fas fa-laptop', 44);
  const was = p.was ? ` <span style="font-size:24px;font-weight:300;color:#8A8F99;text-decoration:line-through">$${p.was}</span>` : '';
  return stack([
    icons,
    heading(p.name, 'h3', [28, 26, 24], C.navy, 'center', { weight: 700, lh: 1.2, ls: 0 }),
    widget('heading', { title: `<span class="ctc-thin ctc-gold">$</span>${p.price}${was}`, header_size: 'span', title_color: C.navy, align: 'center', ...typo('typography', HEAD, [68, 60, 52], 800, { lh: 1, ls: 0 }) }),
    text(p.desc, { align: 'center', size: [19, 18, 17], lh: 1.65, maxW: 520, settings: { _flex_size: 'grow' } }),
    p.soldOut // product out of stock in WooCommerce: no order link (an order link would only error at checkout)
      ? widget('heading', { title: 'Out of Stock', header_size: 'span', align: 'center', title_color: C.gray, ...typo('typography', HEAD, [22, 21, 19], 700, { lh: 1.2, ls: 0 }),
        _element_width: 'auto', _flex_align_self: 'center', _background_background: 'classic', _background_color: C.sand, _border_radius: box(12), _padding: box(18, 36, 18, 36), _margin: box(4, 0, 0, 0) })
      : button(p.label, p.url, { variant: p.variant, align: 'center', size: [22, 21, 19], pad: box(18, 36, 18, 36), settings: { _margin: box(4, 0, 0, 0) } }),
  ], { gap: 14, align: 'center' });
}

// Mobile only: "—— OR ——" between the two packages (stacked on phones).
function orDivider() {
  const rule = () => container({ content_width: 'full', width: px(34, '%'), width_tablet: px(34, '%'), width_mobile: px(34, '%'), padding: box(0), min_height: px(1), min_height_mobile: px(1), height: px(1), background_background: 'classic', background_color: C.line });
  return container({
    content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center', flex_justify_content: 'center', flex_gap: gap(16), padding: box(0),
    hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet',
  }, [
    rule(),
    widget('heading', { title: 'OR', header_size: 'span', title_color: C.goldText, align: 'center', ...typo('typography', HEAD, 18, 800, { lh: 1, ls: 0.12 }),
      _element_width: 'auto', _flex_size: 'none', _background_background: 'classic', _background_color: C.goldPale, _border_radius: box(999), _padding: box(12, 18, 12, 18) }),
    rule(),
  ]);
}

function enroll(d) {
  const body = d.packages.length > 1
    ? grid([
      pkg(d.packages[0]),
      container({ content_width: 'full', padding: box(0), background_background: 'classic', background_color: C.line, hide_mobile: 'hidden-mobile' }),
      orDivider(),
      pkg(d.packages[1]),
    ], { cols: ['minmax(0,1fr) 1px minmax(0,1fr)', 'minmax(0,1fr) 1px minmax(0,1fr)', '1fr'], gap: 64, rowGap: 0, gapT: 32, gapM: 32 })
    : stack([pkg(d.packages[0])], { maxW: 720, settings: { margin: box(0, 'auto', 0, 'auto') } });
  return band(C.white, [
    stack([
      eyebrow('Enroll', C.goldText, 'center'),
      H2(d.enrollTitle, C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
    ], { settings: { margin: box(0, 0, 56, 0), _margin: box(0, 0, 56, 0) } }),
    body,
    text(`Questions before enrolling? Call us at <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`, { align: 'center', size: [19, 18, 17], lh: 1.5, linkColor: C.goldText, linkHover: C.goldDeep, settings: { _margin: box(48, 0, 0, 0) } }),
  ], { settings: { _element_id: 'enroll' } });
}

/* -------------------------------------------------------------- features */
function features(d) {
  const item = (f, right) => stack([
    widget('icon', { selected_icon: fa(featureIcon(f.title)), view: 'framed', shape: 'circle', primary_color: C.gold, size: px(34), icon_padding: px(17), border_width: box(2), align: right ? 'right' : 'left', align_mobile: 'center' }),
    heading(f.title, 'h3', [27, 25, 23], C.white, right ? 'right' : 'left', { weight: 700, lh: 1.15, ls: 0, settings: { _margin: box(4, 0, 0, 0), align_mobile: 'center' } }),
    text(f.body, { size: [18, 17, 16], lh: 1.65, color: C.muted, align: right ? 'right' : 'left', settings: { align_mobile: 'center' } }),
  ], { gap: 12, align: right ? 'flex-end' : 'flex-start', settings: { flex_align_items_mobile: 'center' } });
  const half = Math.ceil(d.features.length / 2);
  return band(C.navy, [
    stack([
      eyebrow('What\'s included', C.gold, 'center'),
      H2('<span class="ctc-thin">Course</span> Features:', C.white, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
    ], { maxW: 820, align: 'center', settings: { margin: box(0, 'auto', 56, 'auto'), _margin: box(0, 0, 56, 0) } }),
    grid([
      stack(d.features.slice(0, half).map((f) => item(f, true)), { gap: 44 }),
      container({ content_width: 'full', padding: box(0), background_background: 'gradient', background_color: C.gold, background_color_b: 'rgba(212,169,58,0.1)', background_gradient_type: 'linear', background_gradient_angle: { unit: 'deg', size: 180 }, hide_mobile: 'hidden-mobile' }),
      stack([
        ...d.features.slice(half).map((f) => item(f, false)),
        enrollBtn('Enroll Now →', { pad: box(18, 32, 18, 32) }),
      ], { gap: 44, align: 'flex-start', settings: { flex_align_items_mobile: 'center' } }),
    ], { cols: ['minmax(0,1fr) 2px minmax(0,1fr)', 'minmax(0,1fr) 2px minmax(0,1fr)', '1fr'], gap: 64, rowGap: 0, gapT: 32, gapM: 40 }),
  ], { cls: 'ctc-dots-dark' });
}

/* ----------------------------------------------------------- credentials */
const badges = (m, h, extra = {}) => row([
  image(m.ctec, { height: [h[0], h[0], Math.round(h[0] * 0.8)], settings: { width: auto, _element_width: 'auto' } }),
  image(m.irs, { height: [h[1], h[1], Math.round(h[1] * 0.8)], settings: { width: auto, _element_width: 'auto' } }),
  image(m.trustpilot, { height: [h[2], h[2], Math.round(h[2] * 0.8)], link: URL.trustpilot, settings: { width: auto, _element_width: 'auto' } }),
  image(m.bca, { height: [h[3], h[3], Math.round(h[3] * 0.8)], link: URL.bca, settings: { width: auto, _element_width: 'auto' } }),
], { gap: h[4], rowGap: 20, justify: 'center', cls: 'ctc-badge-slider', settings: extra });

function credentials(m) {
  return band(C.white, [
    stack([
      eyebrow('Credentials', C.goldText, 'center'),
      H2('<span class="ctc-thin">School</span> Credentials &amp; Reviews', C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 16, 0) } }),
      text('California Tax Courses is a CTEC &amp; IRS Approved Education Provider. We are also a Proud Member of the Business Consumer Alliance and TrustPilot.', { align: 'center' }),
    ], { maxW: 820, align: 'center', settings: { margin: box(0, 'auto', 48, 'auto'), _margin: box(0, 0, 48, 0) } }),
    container({ content_width: 'full', padding: box(40, 0, 40, 0), border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.line }, [badges(m, [60, 68, 64, 68, 64])]),
    text(`Have Questions Before Enrolling? Call Us Today At <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`, { align: 'center', color: C.navy, size: [21, 20, 18], lh: 1.5, settings: { _margin: box(36, 0, 0, 0) } }),
  ], { align: 'center' });
}

/* -------------------------------------------------------------- articles */
function articles(d) {
  const list = [
    ['01', 'Getting started', 'How To Become a California Tax Preparer', URL.become],
    ['02', 'Renewal', 'How To Renew Your CTEC Registration', URL.renew],
    ['03', 'Next steps', d.after[0], d.after[1]],
  ];
  const item = ([num, tag, title, url]) => linkBox(url, {
    container_type: 'grid', content_width: 'full',
    grid_columns_grid: { unit: 'custom', size: 'auto minmax(0,1fr) auto' }, grid_columns_grid_tablet: { unit: 'custom', size: 'auto minmax(0,1fr) auto' }, grid_columns_grid_mobile: { unit: 'custom', size: 'auto minmax(0,1fr)' },
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(32), grid_gaps_mobile: gap(16), grid_align_items: 'center',
    padding: box(36, 40, 36, 40), padding_mobile: box(24, 20, 24, 20), background_background: 'classic', background_color: C.white, border_radius: box(16),
    ...cls('ctc-article ctc-article-w'),
  }, [
    widget('heading', { title: num, header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, [64, 56, 40], 800, { lh: 1, ls: 0 }), _element_width: 'initial', _element_custom_width: px(90), _element_custom_width_mobile: px(52) }),
    stack([
      eyebrow(tag, C.goldText, 'left', { size: 15, ls: 0.12 }),
      widget('heading', { title, header_size: 'h3', title_color: C.navy, ...typo('typography', HEAD, [32, 28, 22], 700, { lh: 1.15, ls: 0 }), _margin: box(8, 0, 0, 0) }),
    ]),
    widget('icon', { selected_icon: fa('fas fa-arrow-right'), view: 'stacked', shape: 'circle', primary_color: C.navy, secondary_color: C.white, size: px(22), icon_padding: px(21), ...wcls('ctc-article-arrow') }),
  ]);
  return band(C.sand, [
    row([
      stack([eyebrow('Info', C.goldText), H2('<span class="ctc-thin">Helpful</span> Articles:', C.navy, 'left', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } })], { settings: { width: auto } }),
      widget('heading', { title: 'All guides &amp; how-tos →', header_size: 'span', link: link(URL.TODO_guides), title_color: C.goldText, ...typo('typography', HEAD, [22, 21, 19], 700, { lh: 1.3, ls: 0 }) }),
    ], { justify: 'space-between', align: 'flex-end', gap: 24, settings: { margin: box(0, 0, 40, 0), _margin: box(0, 0, 40, 0) } }),
    stack(list.map(item), { gap: 16 }),
  ]);
}

/* ------------------------------------------------------------------- FAQ */
function faq() {
  return band(C.navy, [
    grid([
      stack([
        eyebrow('FAQ', C.gold),
        H2('<span class="ctc-thin">Frequently Asked</span> Questions', C.white, 'left', { settings: { _margin: box(12, 0, 18, 0) } }),
        text(`Still have a question? Call <br><a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>, <br>Monday – Friday, 9am – 4pm PST.`, { color: C.muted, linkColor: C.gold, linkHover: C.goldHover, size: [20, 19, 18], lh: 1.6 }),
        button('View All FAQs →', URL.faq, { size: [20, 19, 18], pad: box(16, 28, 16, 28), settings: { _margin: box(28, 0, 0, 0) } }),
      ]),
      widget('toggle', {
        tabs: FAQS.map(([q, ps]) => ({ _id: L.id(), tab_title: q, tab_content: ps.map((p) => `<p>${p}</p>`).join('') })),
        selected_icon: fa('fas fa-plus'), selected_active_icon: fa('fas fa-minus'),
        title_html_tag: 'h3', icon_align: 'right', faq_schema: '',
        border_width: px(0), space_between: px(10), title_background: C.navy2, title_color: C.white, tab_active_color: C.white,
        ...typo('title_typography', BODY, [21, 20, 18], 700, { lh: 1.4 }), title_padding: box(18, 22, 18, 22),
        icon_color: C.navy, icon_active_color: C.navy, icon_space: px(0),
        content_background_color: C.navy2, content_color: C.light, ...typo('content_typography', BODY, [20, 19, 17], 400, { lh: 1.65 }), content_padding: box(0, 22, 22, 22),
        ...wcls('ctc-faq'),
      }),
    ], { cols: ['minmax(0,1fr) minmax(0,2fr)', '1fr', '1fr'], gap: 48, gapM: 32, align: 'center' }),
  ], { cls: 'ctc-dots-dark' });
}

/* ------------------------------------------------------------- final CTA */
// Two-line CTA button, big label on top, small line below (centered).
const cta2 = (big, small, url, variant) => linkBox(url, {
  content_width: 'full', width: auto, width_mobile: px(100, '%'), flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(2),
  padding: box(16, 32, 16, 32), border_radius: box(12),
  background_background: 'classic', background_color: variant === 'gold' ? C.gold : C.navy,
  ...cls(`ctc-cta ${variant === 'gold' ? 'ctc-cta-gold' : 'ctc-cta-navy'}`),
}, [
  widget('heading', { title: big, header_size: 'span', title_color: C.white, align: 'center', ...typo('typography', HEAD, [24, 23, 21], 700, { lh: 1.1, ls: 0 }) }),
  widget('heading', { title: small, header_size: 'span', title_color: C.white, align: 'center', ...typo('typography', HEAD, 15, 300, { lh: 1.3, ls: 0 }) }),
]);

function finalCta(d) {
  return band(C.white, [
    eyebrow('Get Started', C.goldText, 'center'),
    H2('<span class="ctc-thin ctc-block">Instant enrollment.</span><span class="ctc-block">Start your course today.</span>', C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } }),
    row([
      cta2('Enroll Now →', d.finalSmall, '#enroll', 'gold'),
      cta2(PHONE.label, 'Mon – Fri, 9am – 4pm PST', PHONE.tel, 'navy'),
    ], { gap: 16, justify: 'center', settings: { margin: box(40, 0, 0, 0), _margin: box(40, 0, 0, 0) } }),
  ], { pad: [110, 110], align: 'center' }); // no dots: under the dotted FAQ
}

// d: page data (see pages/course-*.cjs).
function coursePage(data) {
  const d = { ...data, features: data.features.map(([title, body]) => ({ title, body })) };
  return {
    slug: d.slug, title: d.title, liveId: d.liveId, kind: 'product',
    build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
      hero(m, d), enroll(d), features(d), credentials(m), articles(d), faq(), finalCta(d),
    ], false)],
  };
}

module.exports = { coursePage, FAQS };
