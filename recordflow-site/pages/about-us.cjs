const L = require('../lib.cjs');
const { C, HEAD, px, box, gap, typo, container, widget, band, stack, grid, eyebrow, H2, text, image, decoMark, pos, subHero, ctaBand, darkCard, sectionHead } = L;

const member = (media, name, role) => stack([
  image(media, { width: px(100, '%'), height: [260, 260, 300], radius: 12, objPos: 'top center' }),
  stack([
    widget('heading', { title: name, header_size: 'h3', title_color: C.ink, ...typo('typography', HEAD, 18, 600, { lh: 1.3 }) }),
    text(role, { size: 14, lh: 1.4 }),
  ], { gap: 2 }),
], { gap: 12, align: 'stretch' });

// Live site: real copy and staff from the old myrecordflow.com About page.
const ABOUT = L.LIVE ? {
  lede: 'We are an independent, American-owned and operated company based in Colorado building tools to help our customers manage water efficiently and maximize beneficial uses.',
  story: [
    'At RecordFLOW, our mission is simple: develop low-cost, secure, and easy-to-use tools for managers and users of ditch and canal systems to protect your water rights and operate your systems efficiently.',
    "As water managers ourselves, we know what it's like to operate complex water delivery systems. RecordFLOW exists to help small water rights owners to large-scale irrigation districts organize data and information, make that information easy to access, and bring clarity to water administration.",
  ],
  team: [['blakeTeam', 'Blake Osborn', 'Founder & CEO'], ['bailey', 'Bailey Blankenship', 'Software Engineer'], ['ian', 'Ian Smithpeter', 'Electrical Engineer']],
} : {
  lede: 'Placeholder: RecordFLOW started with a notepad and pencil on a ditch in Colorado. We built the tool we could not find.',
  story: [
    'Placeholder: Blake Osborn has managed water in Colorado for X years. Faced with scattered records and no tool built for ditch and canal systems, he started building RecordFLOW in 20XX.',
    'Placeholder: today RecordFLOW serves ditch companies, districts and individual water rights owners across the West.',
  ],
  team: [['blake', 'Blake Osborn', 'Founder & Water Manager'], ['teamPortrait', 'Team member', 'Role placeholder'], ['teamPortrait', 'Team member', 'Role placeholder'], ['teamPortrait', 'Team member', 'Role placeholder']],
};

module.exports = {
  slug: 'about-us', title: 'About Us',
  build: (m) => [
    subHero(m, 'About Us', 'Built by water managers. Not tech insiders.',
      ABOUT.lede),
    band(C.white, [grid([
      container({ content_width: 'full', flex_direction: 'column', padding: box(0), width: px(460), width_tablet: px(100, '%'), width_mobile: px(100, '%') }, [
        decoMark(m.iconBlue, 220, pos.tr(-70, -80), 0.18),
        image(m.blake, { width: px(100, '%'), height: [520, 480, 420], radius: 12, objPos: 'top center' }),
      ]),
      stack([
        eyebrow('Our story'), H2('From a notepad to a platform.'),
        ...ABOUT.story.map((t) => text(t)),
        widget('heading', {
          title: '"We are not a technology company. We are a water management platform that happens to run on software."', header_size: 'p', title_color: C.ink,
          ...typo('typography', HEAD, 19, 600, { lh: 1.4, style: 'italic' }),
          _border_border: 'solid', _border_width: box(0, 0, 0, 3), _border_color: C.blue, _padding: box(4, 0, 4, 20), _margin: box(6, 0, 0, 0),
        }),
        eyebrow('Blake Osborn · Founder', C.slate),
      ], { maxW: 520 }),
    ], { cols: [2, 2, 1], gap: 56, gapT: 40, gapM: 48 })], { gap: 0 }),
    band(C.ink, [
      sectionHead('What we believe', 'Three principles, every feature.', { dark: true }),
      grid([
        darkCard('01', 'Easy to use', 'Placeholder: if a ditch rider cannot learn it in an afternoon, we rebuild it.'),
        darkCard('02', 'Affordable', 'Placeholder: priced for a single headgate, scaled for a district.'),
        darkCard('03', 'Secure', 'Placeholder: your data stays yours. US-hosted, never sold.'),
      ], { cols: [3, 2, 1], gap: 18, align: 'stretch' }),
    ]),
    band(C.cream, [
      sectionHead('Team', 'The people behind RecordFLOW'),
      grid(ABOUT.team.map(([img, name, role]) => member(m[img] || m.teamPortrait, name, role)),
        { cols: [ABOUT.team.length === 3 ? 3 : 4, 2, 1], gap: 28, align: 'start' }),
    ]),
    ctaBand(m),
  ],
};
