// Practice areas: four areas (two with photos), how a claim works, who pays / what you can recover.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { areasFull, process: edu, heroes } = require('../content.json');
const { C, px, box, container, band, stack, grid, eyebrow, heading, H2, H3, text } = L;

// Each area gets its own full-width band, alternating ivory and espresso-mid (v3 section rhythm).
const AREA_STYLE = {
  mva: { bg: C.ivory, photo: ['area_mva', 0, 'right'] },
  dog: { bg: C.espMid, dark: true, photo: ['area_dog', 0, 'left'] },
  fall: { bg: C.ivory, photo: ['area_fall', 0, 'right'] },
  cat: { bg: C.espMid, dark: true },
};
const areaCopy = (a, dark, center) => stack([
  heading(a.name, 'h2', [40, 34, 30], dark ? C.ivory : C.ink, center ? 'center' : 'left', { lh: 1.14 }),
  text(a.desc, { size: 17, color: dark ? C.ivory : C.inkSoft, align: center ? 'center' : 'left', settings: { _margin: box(0, 0, 10, 0) } }),
  P.plusList(a.items, { size: 16, color: dark ? C.ivory : C.inkSoft, ...(center ? { width: 560 } : {}) }),
], { gap: 14, align: center ? 'center' : undefined });
function areaBand(m, a) {
  const st = AREA_STYLE[a.key];
  const opts = { pad: [100, 100], width: 1240, anchor: a.key };
  if (!st.photo) return band(st.bg, [container({ content_width: 'full', padding: box(0), width: px(820), width_tablet: px(100, '%'), width_mobile: px(100, '%') }, [areaCopy(a, st.dark, true)])], { ...opts, align: 'center' });
  const [key, tilt, side] = st.photo;
  const photo = P.framedPhoto(m[key], { ratio: '4 / 3', pos: 'center center' });
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
    band(C.ivory, [
      eyebrow(edu.kicker, C.espMid, 'center', { weight: 600, ls: 0.34, settings: { _margin: box(0, 0, 18, 0) } }),
      H2(edu.title1.replace(/,$/, ','), edu.title2, false, 'center', { sizes: [44, 38, 32] }),
      grid(edu.steps.map((s) => P.numberCard(s.n, s.h, s.p, { pad: box(32, 28, 32, 28), nGap: 16, pSize: 15 })), { cols: [4, 2, 1], gap: 24, settings: { margin: box(56, 0, 0, 0) } }),
    ], { pad: [100, 100], width: 1320, align: 'center' }),
    band(C.espMid, [
      grid([
        stack([H3(edu.whoH, C.ivory, [24, 22, 20], { ls: 0.04 }), text(edu.whoP, { color: C.ivory })], { gap: 12 }),
        stack([H3(edu.recH, C.ivory, [24, 22, 20], { ls: 0.04 }), P.plusList(edu.rec, { size: 16, rowGap: 8, color: C.ivory })], { gap: 12 }),
      ], { cols: [2, 1, 1], gap: 48, align: 'start' }),
    ], { pad: [100, 100], width: 1240 }),
    P.ctaBand(),
  ],
};
