// Homepage (/, page 65) – Claude Design "Cataxcourses Homepage Redesign" (Sep 30 2026).
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, auto, link, typo, container, widget, cls, wcls, band, stack, row, grid, linkBox,
  eyebrow, heading, H2, text, button, ctaCard, image, checkList, pill } = L;

const COURSES = [
  { kind: 'Qualifying Education', bold: 'CTEC 60', tagline: 'Becoming a California tax preparer? Start here.', amount: '179.95', label: 'CTEC 60 Hour Course', url: URL.c60, icon: 'fas fa-graduation-cap', iconSize: 150,
    features: ['Updated with the Latest Tax Laws', 'Everything You Need To Know To Prepare Taxes', 'Online Video Course with complimentary PDF', 'Book Available as an additional study aid', 'Online Exam with Immediate Results', '24/7 Course Access', 'Instant Reporting To CTEC!', 'Unlimited Exam Attempts', 'Student Support Available Via Phone, Live Chat, and Email'] },
  { kind: 'Continuing Education', bold: 'CTEC 20', tagline: 'Renewing your CTEC registration? Start here.', amount: '69.95', label: 'CTEC 20 Hour Course', url: URL.c20, icon: 'fas fa-redo-alt', iconSize: 110,
    features: ['Meets CTEC 20 Hour Renewal Requirement', 'Online Video Course with complimentary PDF', 'Book Available as an additional study aid', 'Online Exam with Immediate Results', '24/7 Course Access', 'Instant Reporting To CTEC!', 'Most Current and Up To Date Tax Laws', 'Unlimited Exam Attempts', 'Student Support Available Via Phone, Live Chat, and Email'] },
];
const a = (href, t = href) => `<a href="${href}">${t}</a>`;
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
];
const ARTICLES = [
  ['01', 'Getting Started', 'How To Become a California Tax Preparer', 'The steps CTEC requires to become a registered tax preparer, starting with the 60 Hour Qualifying Education course.', URL.become],
  ['02', 'Renewal', 'How To Renew Your CTEC Registration', 'Complete the 20 Hour Continuing Education course and pay CTEC fees before the October 31 deadline.', URL.renew],
  ['03', 'Your Business', 'How To Start Your Own Tax Preparer Website', 'What a professional tax preparer website needs, how to get a domain and hosting, and how to start taking clients online.', URL.website],
  ['04', 'Tools', 'How To Get Tax Preparer Software', 'How professional tax software works, what to compare, and how to get set up before tax season.', URL.news],
];

const badges = (m, h, extra = {}) => row([
  image(m.ctec, { height: [h[0], h[0], Math.round(h[0] * 0.8)], settings: { width: auto, _element_width: 'auto' } }),
  image(m.irs, { height: [h[1], h[1], Math.round(h[1] * 0.8)], settings: { width: auto, _element_width: 'auto' } }),
  image(m.trustpilot, { height: [h[2], h[2], Math.round(h[2] * 0.8)], /* no link (Trustpilot link removed on request) */ settings: { width: auto, _element_width: 'auto' } }),
  image(m.bca, { height: [h[3], h[3], Math.round(h[3] * 0.8)], link: URL.bca, settings: { width: auto, _element_width: 'auto' } }),
], { gap: h[4], rowGap: 20, justify: 'center', cls: 'ctc-badge-slider', settings: extra });

// Phone hero (approved handoff "option 2a", Nov 2026): headline, subhead, one box with both courses, provider logos,
// then the full course-player laptop. Shown at Elementor's mobile width only; tablet and desktop
// keep the original hero. Navy and gold use the site's own colors.
function mobileHero(m) {
  const row = (label, title, amount, url, arrowBg, arrowFg) =>
    `<a class="ctc-mh-row" href="${url}"><span><span class="ctc-mh-lab">${label}</span><span class="ctc-mh-t">${title}</span></span>` +
    `<span class="ctc-mh-p">$${amount}</span><span class="ctc-mh-ar" style="background:${arrowBg};color:${arrowFg}" aria-hidden="true">→</span></a>`;
  const css = `
.ctc-mh{font-family:Outfit,sans-serif;color:${C.navy}}
.ctc-mh-pill{display:inline-flex;padding:7px 12px;border-radius:999px;background:#F0E3BD;color:#7A5A0E;font:600 11px/1 Outfit,sans-serif;letter-spacing:2px;text-transform:uppercase}
.ctc-mh h1{margin:16px 0 0;padding:0;font:400 28px/1.1 Outfit,sans-serif;letter-spacing:-.2px;color:${C.navy}}
.ctc-mh h1 b{display:block;margin-top:6px;font-weight:800;font-size:46px;line-height:1.05;letter-spacing:-1px}
.ctc-mh h1 i{font-style:normal;color:${C.gold}}
.ctc-mh-sub{margin:14px 0 0;font:400 16px/1.45 Outfit,sans-serif;color:#4B5162;text-wrap:pretty}
.ctc-mh-box{margin-top:22px;background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(28,37,65,.10);box-shadow:0 8px 24px rgba(28,37,65,.08)}
.ctc-mh-row{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;min-height:74px;box-sizing:border-box;padding:16px 16px 16px 18px;text-decoration:none!important;color:${C.navy}!important;transition:background 150ms ease}
.ctc-mh-row+.ctc-mh-row{border-top:1px solid rgba(28,37,65,.12)}
.ctc-mh-row:hover,.ctc-mh-row:active{background:#F7F5EF}
.ctc-mh-row:focus-visible{outline:2px solid ${C.gold};outline-offset:-2px}
.ctc-mh-lab{display:block;font:600 11px/1 Outfit,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8A6512}
.ctc-mh-t{display:block;margin-top:5px;font:600 17px/1.2 Outfit,sans-serif;color:${C.navy}}
.ctc-mh-p{font:800 20px/1 Outfit,sans-serif;color:${C.navy}}
.ctc-mh-ar{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;font:700 16px/1 Outfit,sans-serif}
.ctc-mh-prov{margin-top:16px;display:flex;align-items:center;gap:10px;font:400 12px/1.2 Outfit,sans-serif;color:#5B6170}
.ctc-mh-prov img{height:30px;width:auto;display:block}
.ctc-mh-lap{margin:18px -8px 0}
.ctc-mh-lap img{display:block;width:100%;height:auto;mix-blend-mode:multiply;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 4%,#000 96%,transparent 100%),linear-gradient(180deg,#000 82%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 4%,#000 96%,transparent 100%),linear-gradient(180deg,#000 82%,transparent 100%);mask-composite:intersect}`;
  const html = `<style>${css}</style><div class="ctc-mh">` +
    `<span class="ctc-mh-pill">CTEC &amp; IRS Approved</span>` +
    `<h1>California Tax Education<b>Made Simple<i>.</i></b></h1>` +
    `<p class="ctc-mh-sub">Online, self-paced courses to renew your CTEC or become a California tax preparer.</p>` +
    `<div class="ctc-mh-box">` +
    row('20 Hour CE', 'Renew your CTEC', COURSES[1].amount, URL.c20, C.navy, '#FFFFFF') +
    row('60 Hour QE', 'Become a tax preparer', COURSES[0].amount, URL.c60, C.gold, C.navy) +
    `</div>` +
    `<div class="ctc-mh-prov">Approved provider<img src="${m.ctec.url}" alt="CTEC approved provider" height="30"><img src="${m.irs.url}" alt="IRS approved continuing education provider" height="30"></div>` +
    `<div class="ctc-mh-lap"><img src="${m.laptopPoster.url}" alt="California Tax Courses online course player" width="1180" height="787" fetchpriority="high"></div>` +
    `</div>`;
  return widget('html', { html, _css_classes: 'ctc-mh-wrap', hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet' });
}

function hero(m) {
  return band(C.cream, [
    image(m.seal, { width: 560, cls: 'ctc-deco', settings: { hide_mobile: 'hidden-mobile', _position: 'absolute', _element_width: 'initial', _element_custom_width: px(560), _element_custom_width_mobile: px(320), opacity: px(0.1), _offset_orientation_h: 'end', _offset_x_end: px(-140), _offset_orientation_v: 'end', _offset_y_end: px(-200), _z_index: 0 } }),
    grid([
      stack([
        pill('CTEC &amp; IRS Approved Tax Education', { settings: { hide_mobile: 'hidden-mobile' } }),
        heading('<span class="ctc-thin ctc-block" style="font-size:.6em">California Tax Education</span><span class="ctc-block ctc-hero-big" style="font-size:1.25em;line-height:1.05;margin-top:6px">Made Simple<span class="ctc-gold">.</span></span>',
          'h1', [77, 64, 46], C.navy, 'left', { lh: 1.05, settings: { _margin: box(18, 0, 22, 0), _margin_mobile: box(0, 0, 22, 0) } }),
        text('California Tax Courses is a CTEC Approved Continuing Education and Qualifying Education Provider. Our courses are offered online and can be accessed from a computer or smartphone, 24/7 anywhere you have access to the internet! We offer a 20 hour continuing education course for those who want to renew their CTEC registration, and a 60 Hour Qualifying Education Course for those who want to become a registered tax preparer.',
          { maxW: 560, settings: { _margin: box(0, 0, 30, 0) } }),
        row([
          ctaCard('Need to renew?', '20 Hour CE Course →', URL.c20, 'navy'),
          ctaCard('Becoming a preparer?', '60 Hour QE Course →', URL.c60, 'gold'),
        ], { settings: { hide_mobile: 'hidden-mobile' } }),
      ]),
      stack([
        pill('CTEC <span class="ctc-gold">&amp;</span> IRS Approved', { color: C.white, bg: C.navy, size: [15, 14, 12], ls: 0.1, radius: box(6), pad: box(7, 12, 7, 12),
          settings: { _position: 'absolute', _offset_orientation_h: 'end', _offset_x_end: px(20), _offset_orientation_v: 'start', _offset_y: px(-14), _z_index: 2, hide_mobile: 'hidden-mobile' } }),
        widget('video', {
          video_type: 'hosted', hosted_url: { url: m.laptopVideo.url, id: m.laptopVideo.id }, autoplay: 'yes', play_on_mobile: 'yes', mute: 'yes', loop: 'yes', controls: '',
          preload: 'auto', aspect_ratio: '32', poster: { url: m.laptopPoster.url, id: m.laptopPoster.id }, ...wcls('ctc-laptop'),
        }),
        badges(m, [40, 48, 44, 56, 28], { hide_mobile: 'hidden-mobile' }),
      ], { gap: 28, settings: { _z_index: 1, _flex_order_mobile: 'start', flex_gap_mobile: gap(18) } }),
    ], { cols: [2, 1, 1], gap: 56, gapM: 0, align: 'center', settings: { hide_mobile: 'hidden-mobile' } }),
    mobileHero(m),
  ], { pad: [88, 96], cls: 'ctc-dots-cream', settings: { padding_mobile: box(26, 24, 0, 24) } });
}

// Phones: the hero's full introduction continues on white right under the laptop.
function mobileIntro() {
  return band('#FFFFFF', [
    text('California Tax Courses is a CTEC Approved Continuing Education and Qualifying Education Provider. Our courses are offered online and can be accessed from a computer or smartphone, 24/7 anywhere you have access to the internet! We offer a 20 hour continuing education course for those who want to renew their CTEC registration, and a 60 Hour Qualifying Education Course for those who want to become a registered tax preparer.',
      { size: [17, 17, 17], lh: 1.65 }),
  ], { settings: { hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet', padding_mobile: box(28, 24, 28, 24) } });
}

function courseCard(c) {
  return container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.white, border_radius: box(16), overflow: 'hidden',
    border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -30, color: 'rgba(0,0,0,0.6)' },
  }, [
    container({ content_width: 'full', flex_direction: 'column', padding: box(60, 60, 0, 60), padding_mobile: box(36, 24, 0, 24), flex_gap: gap(0), _flex_size: 'grow' }, [
      widget('icon', { selected_icon: { value: c.icon, library: 'fa-solid' }, primary_color: C.gold, size: px(c.iconSize), size_mobile: px(Math.round(c.iconSize * 0.6)),
        _position: 'absolute', _offset_orientation_h: 'end', _offset_x_end: px(40), _offset_orientation_v: 'start', _offset_y: px(16), _z_index: 0, hide_mobile: 'hidden-mobile', ...wcls('ctc-deco ctc-o18') }),
      eyebrow(c.kind, C.goldText, 'left', { size: 16, ls: 0.12 }),
      heading(`${c.bold} <span class="ctc-thin">Hour Course</span>`, 'h3', [40, 36, 30], C.navy, 'left', { lh: 1.1, ls: -0.01, link: c.url, settings: { _margin: box(8, 0, 0, 0) } }),
      text(c.tagline, { size: [21, 20, 18], lh: 1.5, settings: { _margin: box(12, 0, 0, 0) } }),
      container({ content_width: 'full', padding: box(32, 0, 54, 0), padding_mobile: box(24, 0, 32, 0), _flex_size: 'grow' }, [checkList(c.features)]),
    ]),
    linkBox(c.url, {
      content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(16),
      padding: box(28, 60, 28, 60), padding_mobile: box(24, 24, 24, 24),
      background_background: 'classic', background_color: C.sand, border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line,
      ...cls('ctc-pricebar'),
    }, [
      stack([
        widget('heading', { title: `<span class="ctc-thin ctc-gold">$</span>${c.amount}`, header_size: 'span', title_color: C.navy, ...typo('typography', HEAD, [43, 40, 36], 800, { lh: 1, ls: 0 }) }),
        eyebrow(c.label, C.goldText, 'left', { size: 14, ls: 0.12 }),
      ], { gap: 6, settings: { width: auto, width_mobile: auto } }),
      widget('heading', { title: 'View Course →', header_size: 'span', title_color: C.white, ...typo('typography', HEAD, [22, 21, 19], 700, { lh: 1.2, ls: 0 }),
        _background_background: 'classic', _background_color: C.gold, _padding: box(18, 28, 18, 28), _padding_mobile: box(14, 20, 14, 20), _border_radius: box(12), _element_width: 'auto' }),
    ]),
  ]);
}

function courses() {
  return band(C.navy, [
    row([
      stack([
        eyebrow('CTEC Courses', C.gold, 'center'),
        H2('<span class="ctc-thin ctc-block">Online. Self-paced.</span><span class="ctc-block ctc-fit-line">Instant reporting to CTEC.</span>', C.white, 'center', { settings: { _margin: box(12, 0, 0, 0) } }),
      ], { settings: { width: auto, width_mobile: px(100, '%') } }),
      text(`Questions before enrolling? Call us at <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`, {
        align: 'center', color: C.light, linkColor: C.gold, linkHover: C.goldHover, size: [18, 17, 16], lh: 1.4,
        settings: { _element_width: 'auto', _background_background: 'classic', _background_color: C.navy2, _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine, _border_radius: box(999), _padding: box(10, 18, 10, 18) },
      }),
    ], { justify: 'center', align: 'center', gap: 20, settings: { flex_direction: 'column', _margin: box(0, 0, 44, 0), margin: box(0, 0, 44, 0) } }),
    grid(COURSES.map(courseCard), { cols: [2, 1, 1], gap: 24 }),
  ]); // no dots: sits under the dotted hero
}

function credentials(m) {
  return band(C.white, [
    stack([
      eyebrow('Credentials', C.goldText, 'center'),
      H2('<span class="ctc-thin ctc-block">School Credentials &amp;</span><span class="ctc-block">Reviews</span>', C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 16, 0) } }),
      text('California Tax Courses is a CTEC &amp; IRS Approved Education Provider. We are also a Proud Member of the Business Consumer Alliance and TrustPilot.', { align: 'center' }),
    ], { maxW: 820, align: 'center', settings: { margin: box(0, 'auto', 48, 'auto'), _margin: box(0, 0, 48, 0) } }),
    container({ content_width: 'full', padding: box(40, 0, 40, 0), border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.line }, [badges(m, [60, 68, 64, 68, 64])]),
    text(`Have Questions Before Enrolling? Call Us Today At <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`, { align: 'center', color: C.navy, size: [21, 20, 18], lh: 1.5, settings: { _margin: box(36, 0, 0, 0) } }),
  ], { align: 'center' });
}

function students(m) {
  const frame = (img) => container({ content_width: 'full', padding: box(10), padding_mobile: box(5), background_background: 'classic', background_color: C.white, border_radius: box(14) }, [
    image(img, { settings: { image_border_radius: box(8), width: px(100, '%') } }),
  ]);
  return band(C.navy, [
    eyebrow('Our Students', C.gold, 'center'),
    H2('<span class="ctc-thin ctc-block">Our students showcasing their official</span><span class="ctc-block">California Tax Courses Coffee Mug!</span>', C.white, 'center', { sizes: [55, 44, 30], settings: { _margin: box(12, 0, 22, 0) } }),
    text('Real CTEC-registered preparers across California who completed their course with us.', { align: 'center', color: C.muted, size: [24, 21, 19], lh: 1.6, maxW: 720 }),
    grid(m.mugs.map(frame), { cols: [4, 2, 2], gap: 20, gapM: 12, settings: { margin: box(48, 0, 0, 0), _margin: box(48, 0, 0, 0) } }),
    stack([
      button('Buy the Coffee Mug →', URL.mug, { align: 'center' }),
      text('Submit a picture of you with the official California Tax Courses mug to <a href="mailto:help@cataxcourses.com"><strong>help@cataxcourses.com</strong></a> and receive a free course coupon.',
        { align: 'center', color: C.muted, linkColor: C.gold, linkHover: C.goldHover, size: [18, 17, 16], lh: 1.6, maxW: 520 }),
    ], { gap: 16, align: 'center', settings: { margin: box(40, 0, 0, 0), _margin: box(40, 0, 0, 0) } }),
  ], { align: 'center', cls: 'ctc-dots-dark' });
}

function articles() {
  const item = ([num, tag, title, desc, url]) => linkBox(url, {
    container_type: 'grid', content_width: 'full',
    grid_columns_grid: { unit: 'custom', size: 'auto minmax(0,1fr) auto' }, grid_columns_grid_tablet: { unit: 'custom', size: 'auto minmax(0,1fr) auto' }, grid_columns_grid_mobile: { unit: 'custom', size: 'auto minmax(0,1fr)' },
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(32), grid_gaps_mobile: gap(16), grid_align_items: 'center',
    padding: box(36, 40, 36, 40), padding_mobile: box(24, 20, 24, 20), background_background: 'classic', background_color: C.sand, border_radius: box(16),
    ...cls('ctc-article'),
  }, [
    widget('heading', { title: num, header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, [64, 56, 40], 800, { lh: 1, ls: 0 }), _element_width: 'initial', _element_custom_width: px(90), _element_custom_width_mobile: px(52) }),
    stack([
      eyebrow(tag, C.goldText, 'left', { size: 15, ls: 0.12 }),
      widget('heading', { title, header_size: 'h3', title_color: C.navy, ...typo('typography', HEAD, [32, 28, 22], 700, { lh: 1.15, ls: 0 }), _margin: box(8, 0, 10, 0) }),
      text(desc, { size: [19, 18, 16], lh: 1.6, maxW: 760 }),
    ]),
    widget('icon', { selected_icon: { value: 'fas fa-arrow-right', library: 'fa-solid' }, view: 'stacked', shape: 'circle', primary_color: C.navy, secondary_color: C.white, size: px(22), icon_padding: px(21), ...wcls('ctc-article-arrow') }),
  ]);
  return band(C.white, [
    row([
      stack([eyebrow('Info', C.goldText, 'center'), H2('<span class="ctc-thin">Helpful</span> Articles:', C.navy, 'center', { lh: 1.05, settings: { _margin: box(12, 0, 0, 0) } })], { settings: { width: auto } }),
      widget('heading', { title: 'All guides &amp; how-tos →', header_size: 'span', align: 'center', link: link(URL.guides), title_color: C.goldText, ...typo('typography', HEAD, [22, 21, 19], 700, { lh: 1.3, ls: 0 }) }),
    ], { justify: 'center', align: 'center', gap: 16, settings: { flex_direction: 'column', margin: box(0, 0, 40, 0), _margin: box(0, 0, 40, 0) } }),
    stack(ARTICLES.map(item), { gap: 16 }),
  ]); // no dots: between dotted students + FAQ sections
}

function faq() {
  return band(C.navy, [
    grid([
      stack([
        eyebrow('FAQ', C.gold, 'left', { settings: wcls('ctc-mc') }),
        H2('<span class="ctc-thin">Frequently Asked</span> Questions', C.white, 'left', { cls: 'ctc-mc', settings: { _margin: box(12, 0, 18, 0) } }),
        text(`Still have a question? Call <br><a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>, <br>Monday – Friday, 9am – 4pm PST.`, { cls: 'ctc-mc', color: C.muted, linkColor: C.gold, linkHover: C.goldHover, size: [20, 19, 18], lh: 1.6 }),
      ]),
      widget('toggle', {
        tabs: FAQS.map(([q, ps]) => ({ _id: L.id(), tab_title: q, tab_content: ps.map((p) => `<p>${p}</p>`).join('') })),
        selected_icon: { value: 'fas fa-plus', library: 'fa-solid' }, selected_active_icon: { value: 'fas fa-minus', library: 'fa-solid' },
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

// Email newsletter signup (coupon codes + CTEC deadline reminders). Elementor Pro form: signups are saved in
// Elementor > Submissions and emailed to the site admin; add the Mailchimp action once the audience is connected.
function newsletter() {
  const field = (o) => ({ _id: L.id().slice(0, 7), width: '100', ...o });
  const perk = (icon, t) => row([
    widget('icon', { selected_icon: { value: icon, library: 'fa-solid' }, view: 'stacked', shape: 'circle', primary_color: C.goldPale, secondary_color: C.goldDeep, size: px(16), icon_padding: px(10), _flex_size: 'none' }),
    text(t, { color: C.navy, size: [18, 17, 16], weight: 600, lh: 1.4 }),
  ], { gap: 12, settings: { flex_wrap: 'nowrap' } });
  return band(C.sand, [
    grid([
      stack([
        eyebrow('Newsletter', C.goldText, 'left', { settings: wcls('ctc-mc') }),
        H2('<span class="ctc-thin ctc-block">Coupon codes &amp;</span><span class="ctc-block">CTEC deadline reminders.</span>', C.navy, 'left', { cls: 'ctc-mc', lh: 1.05, settings: { _margin: box(12, 0, 16, 0) } }),
        text('Join our email list and be the first to get discount codes on CTEC courses, plus reminders before every CTEC renewal deadline so you never miss October 31st.', { size: [20, 19, 18], maxW: 560 }),
        stack([perk('fas fa-tag', 'Exclusive coupon codes'), perk('fas fa-calendar-check', 'CTEC deadline reminders'), perk('fas fa-envelope-open-text', 'Tax law updates for preparers')], { gap: 12, settings: { margin: box(24, 0, 0, 0) } }),
      ]),
      container({
        content_width: 'full', flex_gap: gap(16), padding: box(36, 36, 36, 36), padding_mobile: box(24, 20, 24, 20),
        background_background: 'classic', background_color: C.white, border_radius: box(16),
        border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
        box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -30, color: 'rgba(28,35,51,0.35)' },
      }, [
        widget('heading', { title: 'Get coupon codes by email', header_size: 'h3', title_color: C.navy, ...typo('typography', HEAD, [28, 26, 24], 800, { lh: 1.15, ls: -0.01 }) }),
        widget('form', {
          form_name: 'Newsletter Signup (homepage)',
          form_fields: [
            field({ custom_id: 'first_name', field_type: 'text', field_label: 'First Name', placeholder: 'First name' }),
            field({ custom_id: 'email', field_type: 'email', field_label: 'Email', placeholder: 'you@example.com', required: 'true' }),
          ],
          show_labels: '', input_size: 'md', column_gap: px(12), row_gap: px(14),
          button_text: 'Sign Me Up →', button_size: 'md', button_width: '100',
          submit_actions: ['save-to-database', 'email'],
          email_subject: 'New newsletter signup – California Tax Courses', email_content: '[all-fields]', email_from_name: 'California Tax Courses',
          success_message: "You're on the list! Watch your inbox for coupon codes and CTEC deadline reminders.",
          error_message: 'Something went wrong. Please try again or call us at (888) 229-1994.', required_field_message: 'Please enter your email.',
          field_text_color: C.navy, field_background_color: C.white, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(10),
          ...typo('field_typography', BODY, 17, 400, { lh: 1.5 }),
          button_background_color: C.gold, button_hover_background_color: C.goldHover, button_text_color: C.white, button_hover_color: C.white,
          button_border_radius: box(12), button_text_padding: box(16, 28, 16, 28), ...typo('button_typography', HEAD, [21, 20, 19], 700, { lh: 1.2, ls: 0 }),
          message_color: C.navy, _css_classes: 'ctc-news-form',
        }),
        text(`No spam. Unsubscribe anytime. See our <a href="${URL.privacy}">Privacy Policy</a>.`, { size: 14, lh: 1.5, linkColor: C.goldText, align: 'center' }),
      ]),
    ], { cols: ['minmax(0,1.1fr) minmax(0,1fr)', '1fr', '1fr'], gap: 56, gapM: 32, align: 'center' }),
  ]);
}

function finalCta() {
  return band(C.white, [
    stack([
      eyebrow('Get Started', C.goldText, 'center'),
      H2('<span class="ctc-thin ctc-block">Ready to start?</span>Enroll Today &amp; Save', C.navy, 'center', { sizes: [60, 48, 38], lh: 1.05, settings: { _margin: box(14, 0, 18, 0) } }),
      text(`Online, self-paced, CTEC &amp; IRS approved. Questions before enrolling? <span style="white-space:nowrap">Call <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>.</span>`, { align: 'center', size: [21, 20, 18], cls: 'ctc-nowrap-d', settings: { _margin: box(0, 0, 36, 0) } }),
      row([
        ctaCard('Need to renew?', '20 Hour CE Course →', URL.c20, 'navy', { smallSize: 16, bigSize: 22 }),
        ctaCard('Becoming a preparer?', '60 Hour QE Course →', URL.c60, 'gold', { smallSize: 16, bigSize: 22 }),
      ], { justify: 'center' }),
    ], { maxW: 1100, align: 'center' }),
  ], { pad: [110, 110], align: 'center' }); // no dots: under the dotted FAQ
}

module.exports = {
  slug: 'new-home', title: 'Home (new design preview)', liveId: 65,
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    hero(m), mobileIntro(), courses(), credentials(m), students(m), articles(), faq(), newsletter(), finalCta(),
  ], false)],
};
