// Practice areas: four areas (two with photos), how a claim works, who pays / what you can recover.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { areasFull, process: edu, heroes } = require('../content.json');
const { C, px, box, container, band, stack, grid, eyebrow, heading, H2, H3, text } = L;

// Each area gets its own full-width band, alternating white and blush so the page reads as separate sections.
const AREA_STYLE = {
  mva: { bg: C.light, photo: ['area_mva', 2, 'right'] },
  dog: { bg: C.blush, photo: ['area_dog', -2, 'left'] },
  fall: { bg: C.light, photo: ['area_fall', 2, 'right'] },
  cat: { bg: C.blush },
};
const areaCopy = (a, dark, center) => stack([
  heading(a.name, 'h2', [38, 32, 28], C.ink, center ? 'center' : 'left', { lh: 1.15 }),
  text(a.desc, { size: 17, color: C.inkSoft, align: center ? 'center' : 'left', settings: { _margin: box(0, 0, 10, 0) } }),
  P.plusList(a.items, { size: 16, color: C.inkSoft, ...(center ? { width: 560 } : {}) }),
], { gap: 14, align: center ? 'center' : undefined });
function areaBand(m, a) {
  const st = AREA_STYLE[a.key];
  const opts = { pad: [96, 96], anchor: a.key, settings: { border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line } };
  if (!st.photo) return band(st.bg, [container({ content_width: 'full', padding: box(0), width: px(820), width_tablet: px(100, '%'), width_mobile: px(100, '%') }, [areaCopy(a, st.dark, true)])], { ...opts, align: 'center' });
  const [key, tilt, side] = st.photo;
  const photo = P.framedPhoto(m[key], { tilt, mat: 12, ratio: '4 / 3', pos: 'center center' });
  return band(st.bg, [
    grid(side === 'right' ? [areaCopy(a, st.dark), photo] : [photo, areaCopy(a, st.dark)], {
      cols: [side === 'right' ? 'minmax(0,1.4fr) minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1.4fr)', 1, 1], gap: 64, rowGap: 40, align: 'center',
    }),
  ], opts);
}

module.exports = {
  slug: 'practice-areas', title: 'Practice Areas',
  seo: {
    title: 'Practice Areas | Car Accident & Injury Lawyer Norcross GA',
    description: 'Car and truck accidents, dog bites, slip and fall and wrongful death: what Cabrera Torres Law Firm handles and how a Georgia injury claim works.',
    focus: 'car accident lawyer Norcross',
  },
  build: (m) => [
    P.pageHero(m, heroes.practice),
    ...areasFull.map((a) => areaBand(m, a)),
    band(C.light, [
      eyebrow(edu.kicker, C.roseDeep, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
      H2(edu.title1.replace(/,$/, ','), edu.title2, false, 'center', { sizes: [48, 40, 32] }),
      grid(edu.steps.map((s) => P.numberCard(s.n, s.h, s.p, { pad: box(32, 28, 32, 28), nGap: 16, hSizes: [20, 20, 20], pSize: 15 })), { cols: [4, 2, 1], gap: 24, settings: { margin: box(56, 0, 0, 0) } }),
    ], { pad: [100, 100], align: 'center' }),
    band(C.ivory, [
      grid([
        stack([H3(edu.whoH, C.ink, [26, 24, 22]), text(edu.whoP)], { gap: 12 }),
        stack([H3(edu.recH, C.ink, [26, 24, 22]), P.plusList(edu.rec, { size: 16, rowGap: 8 })], { gap: 12 }),
      ], { cols: [2, 1, 1], gap: 48, align: 'start' }),
    ], { pad: [96, 100] }),
    P.ctaBand(),
  ],
};
