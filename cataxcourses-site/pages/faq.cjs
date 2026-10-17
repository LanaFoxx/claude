// Frequently Asked Questions (/frequently-asked-questions/, page 77) – Claude Design "Frequently Asked Questions".
// Also exports FAQS + faqSection() for the Contact Us page (same dark FAQ block).
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, URL, px, box, gap, typo, container, widget, cls, wcls, band, stack, row, grid, linkBox,
  eyebrow, heading, H2, text, pill } = L;

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
  ['I\'m interested in becoming a California Tax Preparer, which course should I enroll in?',
    [`If you want to prepare taxes for a fee or compensation in the state of California, you are first required to complete a CTEC 60 Hour Qualifying Education tax course. You will also need to complete a series of other steps for CTEC, in order to become a Registered Tax Preparer. Click ${a(URL.become, 'HERE')} for more information.`]],
  ['What is the deadline to renew with CTEC? When do I need to enroll in and complete the CTEC 20 Hour Renewal Course?',
    ['The deadline to complete your CTEC Registration Renewal is October 31st. You must have your CTEC 20 Hour Continuing Education tax course completed and CTEC fees paid by this date in order to complete your registration renewal.']],
  ['What is the deadline to complete the CTEC 60 Hour Qualifying Education course? How long will the course take?',
    ['There is NO deadline for the 60 hour QE Course. How long it take all depends on you. The course is self-paced.',
      `When you are finished with the 60 hour qualifying education course, complete the remaining steps in the CTEC registration process (click ${a(URL.become, 'HERE')} for more information). When these steps are done and you receive your certification, from CTEC, you are ready to begin!`,
      'You must complete 20 hours of continuing education and pay your renewal fees to CTEC every year in order to stay registered.']],
  ['How long will it take your school to report my course completion hours to CTEC and the IRS?',
    ['California Tax Courses will report their students course completion to CTEC and/or the IRS typically within 1-3 hours, depending on the day and time you complete your course. If your course is completed on the weekend, it will be reported between 9am-1pm Monday morning.',
      'We also stay up late on October 31st and the January late deadline, till midnight to make sure everyone who completes their course last minute has their hours reported before the Midnight deadline. Be sure to pay your fees owed to CTEC in order to complete your registration!']],
  ['Do the courses expire? Do you offer refunds?',
    ['The CTEC 60 Hour Qualifying Education Course is valid for 1 year after purchase date. This means you have up to 1 year to complete the course for valid CTEC credit. The course will expire 1 year after the time of purchase and will no longer be valid for CTEC credit, which means we cannot report your course completion to CTEC if you took more than 1 year to finish the course. You are not entitled to a refund or a new course if your course has expired. You will need to re purchase the latest version of the 60 hour course.']],
  ['Where is your school located?',
    ['Because of the recent COVID-19 Pandemic, California Tax Courses delivers its course content exclusively online. Our office is located in Los Angeles.']],
  ['What are your hours of opertation?',
    ['California Tax Courses support team is available Monday – Friday from 9am – 4pm PST.']],
];

// Inner-page hero (pill + two-part H1). dark=true → navy band (Contact Us).
function pageHero(label, thin, bold, dark = false) {
  return band(dark ? C.navy : C.cream, [
    pill(label, dark ? { color: C.gold, bg: C.navy2, settings: { _border_border: 'solid', _border_width: box(1), _border_color: C.navyLine } } : {}),
    heading(`<span class="ctc-thin ctc-block" style="font-size:.6em">${thin}</span>${bold}<span class="ctc-gold">.</span>`,
      'h1', [68, 56, 44], dark ? C.white : C.navy, 'left', { lh: 1.05, settings: { _margin: box(18, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(1000), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } }),
  ], { pad: [88, 56], cls: dark ? 'ctc-dots-dark' : 'ctc-dots-cream' });
}

// Dark FAQ band (same as home.cjs faq(), but all questions, top-aligned + sticky intro column).
function faqSection() {
  return band(C.navy, [
    grid([
      stack([
        eyebrow('FAQ', C.gold),
        H2('<span class="ctc-thin">Frequently Asked</span> Questions', C.white, 'left', { settings: { _margin: box(12, 0, 18, 0) } }),
        text(`Still have a question? Call <br><a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>, <br>Monday – Friday, 9am – 4pm PST.`, { color: C.muted, linkColor: C.gold, linkHover: C.goldHover, size: [20, 19, 18], lh: 1.6 }),
      ], { cls: 'ctc-sticky' }),
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
    ], { cols: ['minmax(0,1fr) minmax(0,2fr)', '1fr', '1fr'], gap: 48, gapM: 32, align: 'start' }),
  ], { cls: 'ctc-dots-dark' });
}

// Two-line CTA, big line on top (phone / Contact Us buttons).
function helpCta(big, small, url, variant) {
  const gold = variant === 'gold';
  return linkBox(url, {
    content_width: 'full', width: L.auto, width_mobile: px(100, '%'), flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(2),
    padding: box(16, 32, 16, 32), border_radius: box(12),
    background_background: 'classic', background_color: gold ? C.gold : C.navy,
    ...cls(`ctc-cta ${gold ? 'ctc-cta-gold' : 'ctc-cta-navy'}`),
  }, [
    widget('heading', { title: big, header_size: 'span', title_color: C.white, align: 'center', ...typo('typography', HEAD, [24, 23, 22], 700, { lh: 1.1, ls: 0 }) }),
    widget('heading', { title: small, header_size: 'span', title_color: C.white, align: 'center', ...typo('typography', HEAD, 15, 300, { lh: 1.3, ls: 0 }) }),
  ]);
}

function help() {
  return band(C.white, [
    eyebrow('Help', C.goldText, 'center'),
    H2('<span class="ctc-thin">Didn\'t find your answer?</span> We are here to help.', C.navy, 'center', { lh: 1.05,
      settings: { _margin: box(12, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(900), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } }),
    row([
      helpCta(PHONE.label, 'Mon – Fri, 9am – 4pm PST', PHONE.tel, 'gold'),
      helpCta('Contact Us →', 'Email or live chat', URL.contact, 'navy'),
    ], { gap: 16, justify: 'center', settings: { margin: box(40, 0, 0, 0), _margin: box(40, 0, 0, 0) } }),
  ], { pad: [110, 110], align: 'center', cls: 'ctc-dots-white' });
}

module.exports = {
  slug: 'new-faq', title: 'FAQ (new design preview)', liveId: 77, kind: 'page',
  FAQS, faqSection, pageHero,
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    pageHero('Info', 'Everything you need to know before enrolling.', 'Frequently Asked Questions'), faqSection(), help(),
  ], false)],
};
