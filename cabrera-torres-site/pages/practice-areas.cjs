// Practice areas: four areas (two with photos), how a claim works, who pays / what you can recover.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { areasFull, process: edu, heroes } = require('../content.json');
const { C, px, box, container, band, stack, grid, eyebrow, heading, H2, H3, text } = L;

const PHOTO = { dog: ['area_dog', 2, 'right'], fall: ['area_fall', -2, 'left'] };
const areaCopy = (a) => stack([
  heading(a.name, 'h2', [38, 32, 28], C.black, 'left', { lh: 1.15 }),
  text(a.desc, { size: 17, settings: { _margin: box(0, 0, 10, 0) } }),
  P.plusList(a.items, { size: 16 }),
], { gap: 14 });
function areaRow(m, a) {
  const ph = PHOTO[a.key];
  if (!ph) return container({ content_width: 'full', padding: box(0), width: px(820), width_tablet: px(100, '%'), width_mobile: px(100, '%') }, [areaCopy(a)]);
  const [key, tilt, side] = ph;
  const photo = P.framedPhoto(m[key], { tilt, mat: 12, ratio: '4 / 3', pos: 'center center' });
  return grid(side === 'right' ? [areaCopy(a), photo] : [photo, areaCopy(a)], {
    cols: [side === 'right' ? 'minmax(0,1.4fr) minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1.4fr)', 1, 1], gap: 56, rowGap: 40, align: 'center',
  });
}

module.exports = {
  slug: 'practice-areas', title: 'Practice Areas',
  seo: {
    title: 'Practice Areas | Car Accident & Injury Lawyer Norcross GA',
    description: 'Car and truck accidents, dog bites, slip and fall and wrongful death: what Cabrera Torres Law handles and how a Georgia injury claim works.',
    focus: 'car accident lawyer Norcross',
  },
  build: (m) => [
    P.pageHero(m, heroes.practice),
    band(C.cream, [
      ...areasFull.map((a) => areaRow(m, a)),
    ], { pad: [100, 40], gap: 80 }),
    band(C.cream, [
      eyebrow(edu.kicker, C.goldDark, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
      H2(edu.title1.replace(/,$/, ','), edu.title2, false, 'center', { sizes: [48, 40, 32] }),
      grid(edu.steps.map((s) => P.numberCard(s.n, s.h, s.p, { pad: box(32, 28, 32, 28), nGap: 16, hSizes: [20, 20, 20], pSize: 15 })), { cols: [4, 2, 1], gap: 24, settings: { margin: box(56, 0, 0, 0) } }),
      grid([
        stack([H3(edu.whoH, C.black, [26, 24, 22]), text(edu.whoP)], { gap: 12 }),
        stack([H3(edu.recH, C.black, [26, 24, 22]), P.plusList(edu.rec, { size: 16, rowGap: 8 })], { gap: 12 }),
      ], { cols: [2, 1, 1], gap: 48, align: 'start', settings: { margin: box(72, 0, 0, 0) } }),
    ], { pad: [80, 110], align: 'center' }),
    P.ctaBand(),
  ],
};
