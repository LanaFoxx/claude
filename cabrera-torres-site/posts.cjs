// The six Resources articles, built as WordPress posts with Elementor content.
const L = require('./lib.cjs');
const P = require('./parts.cjs');
const { articles, articleCta } = require('./content.json');
const { C, box, band, container, gap, heading, text, button, image } = L;

const SEO = {
  'first-7-days': ['What to Do in the First 7 Days After a Car Crash in Georgia', 'The steps that protect your health and your Georgia injury claim in the first week after a crash, and the mistakes insurers count on.', 'what to do after a car accident Georgia'],
  'georgia-dog-bite-law': ['Georgia Dog Bite Law, Explained | Cabrera Torres Law Firm', 'When is a dog owner liable in Georgia? How leash ordinances factor in and what homeowner’s insurance covers after a dog bite.', 'Georgia dog bite law'],
  'fell-in-a-store': ['I Fell in a Store. Do I Have a Case? | Georgia Slip and Fall', 'What has to be proven in a Georgia premises liability claim after a fall in a store, and why surveillance video matters so much.', 'slip and fall in a store Georgia'],
  'what-is-my-case-worth': ['What Is My Injury Case Worth? | Cabrera Torres Law Firm', 'The factors that actually move a personal injury claim’s value in Georgia, and why no one can give you a number on day one.', 'what is my injury case worth'],
  'truck-accidents-different': ['Why Truck Accident Cases Are Different | Cabrera Torres', 'Federal trucking regulations, multiple liable parties and evidence that disappears fast: why Georgia truck accident cases need quick action.', 'truck accident lawyer Georgia'],
  'contingency-fees': ['How Contingency Fees Work | No Fee Unless We Win', 'What “no fee unless we win” actually means for a personal injury case, and what to ask a lawyer before you sign.', 'how contingency fees work'],
};

const build = (a) => (m) => [
  P.pageHero(m, { kicker: `${a.tag} · ${a.read}`, title1: a.title, title2: '', intro: a.excerpt }),
  band(C.blush, [
    button('← Resources', L.URL.blog, 'underline', { settings: { button_text_color: C.roseDeep, border_width: box(0), text_padding: box(0) } }),
    image(m[P.ART_IMG[a.src]], { settings: { _margin: box(28, 0, 40, 0), custom_css: 'selector img { width: 100%; aspect-ratio: 2 / 1; object-fit: cover; display: block; }' } }),
    ...a.body.map((p) => text(p, { color: C.inkSoft, size: 18, lh: 1.7, settings: { _margin: box(0, 0, 22, 0) } })),
    container({
      content_width: 'full', flex_direction: 'column', flex_gap: gap(8), flex_align_items: 'flex-start', padding: box(32), margin: box(26, 0, 0, 0),
      background_background: 'classic', background_color: C.ivory, border_border: 'solid', border_width: box(0, 0, 0, 3), border_color: C.rose,
    }, [
      heading(articleCta.h, 'h2', 22, C.ink, 'left', { lh: 1.25, ls: 0 }),
      text(articleCta.p, { settings: { _margin: box(0, 0, 10, 0) } }),
      button('Free Case Evaluation', L.URL.contact, 'gold', { pad: box(14, 26, 14, 26) }),
    ]),
  ], { pad: [80, 110], width: 716 }),
  P.ctaBand(),
];

module.exports = articles.map((a) => ({
  type: 'post', slug: a.slug, title: a.title, excerpt: a.excerpt, category: a.tag, imageKey: P.ART_IMG[a.src],
  seo: { title: SEO[a.slug][0], description: SEO[a.slug][1], focus: SEO[a.slug][2] },
  build: build(a),
}));
