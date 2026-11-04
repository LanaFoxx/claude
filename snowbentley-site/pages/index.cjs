// Page registry: every page of the site with its WordPress slug/parent and its Elementor content.
// Inner pages are generated from source/content.json (the live site's sections, in order).
const fs = require('fs');
const path = require('path');
const K = require('../lib/core.cjs');
const S = require('../lib/sections.cjs');
const home = require('./home.cjs');
const { C, LINKS, box, section, H2, text, row, button } = K;

const content = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'source', 'content.json'), 'utf8'));

// "What We're Looking For" gets the new Development Site block from the handoff (fifth, after Industrial — Lease).
const DEV_SITE = {
  type: 'full-bleed-cta', bg: 'rgb(245, 239, 231)', title: 'DEVELOPMENT SITE — ACQUISITION', imageSide: 'left', imageBleed: false, imageW: 898, imageH: 560, buttons: [],
  images: ['c94562ec-1739-4336-bfc0-645b32ffe148'],
  blocks: [
    { tag: 'ul', html: '<li><strong>Multifamily — Southern California</strong> — Institutional buyer actively acquiring in the $30M–$40M range. Target markets: Irvine, San Gabriel, and Alhambra. Stabilized or value-add considered.</li><li>Open to land, existing improvements for teardown, or office/R&amp;D assets suitable for residential conversion</li><li>Off-market and pre-listing opportunities welcome; principals and their representatives only</li>' },
  ],
};

// RealScout city / neighborhood ids for each neighborhood page
const AREAS = {
  atherton: [['Atherton', ['city', '0603092']]], hillsborough: [['Hillsborough', ['city', '0633798']]],
  lamorinda: [['Lafayette', ['city', '0639122']], ['Moraga', ['city', '0649187']], ['Orinda', ['city', '0654232']]],
  'los-gatos': [['Los Gatos', ['city', '0644112']]], 'menlo-park': [['Menlo Park', ['city', '0646870']]],
  'mountain-view': [['Mountain View', ['city', '0649651']]], 'pacific-heights': [['Pacific Heights', ['neighborhood', '194564']]],
  'palo-alto': [['Palo Alto', ['city', '0655282']]], piedmont: [['Piedmont', ['city', '0656938']]], 'san-francisco': [['San Francisco', ['city', '0667000']]],
};

function idxSearch(ctx) {
  return section([
    H2('Search Bay Area Listings', { align: 'center', mb: 24 }),
    text('Search every home for sale across the Bay Area MLSs. Create a free account to save searches and get new listings by email.', { align: 'center', maxW: 900, mb: 40 }),
    K.widget('html', { html: S.rsMap(null, 880), ...K.cls('sb-idx'), _element_width: 'initial', _element_custom_width: K.px(100, '%') }),
    row([button('Open Full Screen', LINKS.portal, 'dark'), button("Let's Connect", ctx.connect, 'outline')], { justify: 'center', settings: { _margin: K.box(40, 0, 0, 0) } }),
  ], { bg: C.cream, align: 'center' });
}

// Commercial: RealScout only carries residential MLS listings, so point commercial visitors to Snow directly.
function commercialCta(ctx) {
  return section([
    H2('Commercial Opportunities', { align: 'center', mb: 24 }),
    text("Many of Snow's commercial sale and lease opportunities are shared directly with qualified buyers and tenants before they reach the open market. Tell Snow what you're looking for, see the requirements she's currently sourcing for, or browse recent deals.", { align: 'center', maxW: 960, mb: 40 }),
    row([button("Let's Connect", ctx.connect, 'dark'), button("What We're Looking For", '/what-were-looking-for/', 'outline'), button('Done Deals', '/done-deals/', 'outline')], { justify: 'center' }),
  ], { bg: C.cream, align: 'center', minH: 420, justify: 'center' });
}

function build(slug, ctx) {
  const page = content[slug];
  const name = (page.sections[0] && page.sections[0].title || '').replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase());
  const out = [];
  let secs = page.sections;
  if (slug === 'what-were-looking-for') {
    const i = secs.findIndex((s) => s.type === 'newsletter-contact-cta');
    secs = [...secs.slice(0, i), DEV_SITE, ...secs.slice(i)];
  }
  // Keep the alternating cream / espresso rhythm for image + text rows
  let alt = 0;
  for (const s of secs) {
    switch (s.type) {
      case 'custom-intro': case 'neighborhood-intro': out.push(S.innerHero(s, ctx)); break;
      case 'full-bleed-cta': {
        if (s.images && s.images.length && !s.imageBleed) { s.bg = alt % 2 ? 'rgb(58, 44, 38)' : 'rgb(245, 239, 231)'; s.imageSide = alt % 2 ? 'right' : 'left'; alt++; }
        out.push(S.fullBleed(s, ctx)); break;
      }
      case 'simple-cta': {
        if (!s.title && /feedback/i.test(JSON.stringify(s.blocks))) s.title = 'HAD A GREAT EXPERIENCE?';
        out.push(S.ctaBand(s, ctx)); break;
      }
      case 'gallery-style-menu': out.push(S.galleryMenu(s, ctx)); break;
      case 'newsletter-contact-cta': out.push(S.newsletterBand(ctx)); break;
      case 'testimonials-slider': out.push(S.testimonialsSlider(ctx)); break;
      case 'agent-bio': out.push(S.agentBio(s, ctx)); break;
      case 'agent-details': out.push(S.agentDetails(ctx)); break;
      case 'custom-form': out.push(S.contactForm(s)); break;
      case 'text-grid': out.push(S.textGrid(s)); break;
      case 'timeline': out.push(S.timeline(s)); break;
      case 'instant-home-valuation-modal': out.push(home.homeWorth(ctx)); break;
      case 'gridItem': out.push(slug === 'neighborhoods' ? S.neighborhoodsGrid(s, ctx) : S.areaSearch(AREAS[slug.split('/')[1]], name)); break;
      case 'signup-form-download': out.push(S.guideDownload(s, ctx)); break;
      case 'cardItem': out.push(S.testimonialsGrid(ctx)); break;
      case 'newsletter-signup': out.push(S.staySignup()); break;
      case 'terms-and-conditions': out.push(S.legalBody(s)); break;
      case 'neighborhood-overview': out.push(S.overview(s)); break;
      case 'poi': out.push(S.poi(s, ctx)); break;
      case 'neighborhood-demographics': out.push(S.demographics(s)); break;
      case 'schoolTemplate': out.push(S.schools(s)); break;
      case 'gallery': out.push(S.galleryImage(s, ctx)); break;
      case 'neighborhood-map': out.push(S.hoodMap(s, name)); break;
      case 'flex': break;
      case 'propertyItem': {
        // Live LP listing feeds -> RealScout IDX (one per page)
        if (out.some((x) => x.__idx)) break;
        if (slug === 'commercial') { const c = commercialCta(ctx); Object.defineProperty(c, '__idx', { value: true, enumerable: false }); out.push(c); break; }
        const kind = slug === 'properties/sold' ? 'sold' : 'active';
        const sec = S.idxListings(kind, { title: kind === 'sold' ? 'Past Transactions' : slug === 'commercial' ? 'Featured Listings' : 'Featured Listings' });
        Object.defineProperty(sec, '__idx', { value: true, enumerable: false });
        out.push(sec); break;
      }
      case 'neighborhood-home-search-cta': case 'blogItem': break;
      default: console.warn(`[${slug}] no builder for section type ${s.type}`);
    }
  }
  return out;
}

const seo = (slug) => ({ seoTitle: content[slug]?.title, seoDesc: content[slug]?.description });
const pageTitle = (slug) => {
  const h = content[slug].sections.find((s) => /intro/.test(s.type));
  const t = (h && h.title) || content[slug].title.split('|')[0].trim();
  return t.toLowerCase().replace(/(^|[\s/-])(\w)/g, (m0) => m0.toUpperCase()).replace(/'S\b/g, "'s").replace(/We'Re/g, "We're");
};

const inner = [
  'about', 'contact', 'residential', 'commercial', 'done-deals', 'what-were-looking-for', 'home-valuation', 'neighborhoods',
  'testimonials', 'blog', 'buyers', 'sellers', 'guides', 'terms-and-conditions', 'review-site',
].map((slug) => ({ slug, path: slug, title: pageTitle(slug), ...seo(slug), build: (ctx) => build(slug, ctx) }));

const hoods = Object.keys(content).filter((k) => k.startsWith('neighborhoods/')).map((k) => ({
  slug: k.split('/')[1], path: k, parent: 'neighborhoods', title: pageTitle(k), ...seo(k), build: (ctx) => build(k, ctx),
}));

const props = ['sale', 'sold'].map((s) => ({ slug: s, path: `properties/${s}`, parent: 'properties', title: pageTitle(`properties/${s}`), ...seo(`properties/${s}`), build: (ctx) => build(`properties/${s}`, ctx) }));

const searchHero = { eyebrow: 'Bay Area Listings', title: 'HOME SEARCH', image: 'fbaf8acd-b2aa-48d9-9db9-0a8df214a0c7' };
const idxPage = (ctx) => [S.innerHero(searchHero, ctx), idxSearch(ctx), S.newsletterBand(ctx)];

const PAGES = [
  { ...home, path: '', front: true, seoTitle: 'Snow Bentley Realty | Bay Area Commercial & Luxury Real Estate', seoDesc: 'Snow Bentley Realty: award-winning, Chinese-speaking Bay Area agent for commercial leasing & sales and luxury residential real estate. CA DRE# 01911217.' },
  ...inner,
  { slug: 'properties', path: 'properties', title: 'Properties', build: (ctx) => build('properties/sale', ctx) },
  ...props,
  { slug: 'home-search', path: 'home-search', title: 'Home Search', ...seo('home-search/listings'), build: idxPage },
  { slug: 'listings', path: 'home-search/listings', parent: 'home-search', title: 'Home Search', ...seo('home-search/listings'), build: idxPage },
  ...hoods,
  // /review forwards to the Google review form (a 301 on the live site); fallback button if JS is off.
  { slug: 'review', path: 'review', title: 'Leave a Review', build: (ctx) => [section([
    K.widget('html', { html: `<script>location.replace(${JSON.stringify(LINKS.review)});</script>` }),
    H2('Had a Great Experience?', { color: C.white, align: 'center', mb: 24 }),
    button('Leave a Review', LINKS.review, 'white', { align: 'center' }),
  ], { bg: C.espresso, align: 'center', minH: 487, justify: 'center' })] },
];

module.exports = { PAGES, build };
