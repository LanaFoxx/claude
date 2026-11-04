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
    { tag: 'p', html: '<em>(Qualified buyer, active in the SF AI Corridor)</em>' },
    { tag: 'ul', html: '<li><strong>Entitled Multifamily</strong> — 200+ units, fully entitled, SoMa and Mission Bay; shovel-ready preferred, will consider sites with entitlements in final approval</li><li><strong>Multifamily — Southern California</strong> — Institutional buyer actively acquiring in the $30M–$40M range. Target markets: Irvine, San Gabriel, and Alhambra. Stabilized or value-add considered.</li><li>Open to land, existing improvements for teardown, or office/R&amp;D assets suitable for residential conversion</li><li>Off-market and pre-listing opportunities welcome; principals and their representatives only</li>' },
  ],
};

function idxSearch(ctx) {
  return S.idxListings('search', { title: 'Search Bay Area Listings', text: 'Search every home for sale across the Bay Area MLSs, save searches and get new-listing alerts.', portal: true, connect: ctx.connect });
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
      case 'gridItem': out.push(slug === 'neighborhoods' ? S.neighborhoodsGrid(s, ctx) : S.areaSearch(page.sections.find((x) => x.type === 'neighborhood-home-search-cta') || {}, ctx, name)); break;
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
