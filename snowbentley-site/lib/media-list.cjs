// Every media file the build needs, keyed by Luxury Presence media id (or full URL for
// non-LP assets), with a readable WordPress file name and alt text.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const content = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'content.json'), 'utf8'));
const homeData = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'home-data.json'), 'utf8'));

const VIDEO = 'https://res.cloudinary.com/luxuryp/videos/f_mp4,vc_h264,q_auto:best,w_1920,c_limit/g8p7m0kpme81xzy4qxtc/v1_snow-bentley.mp4';
const POSTER = 'https://res.cloudinary.com/luxuryp/videos/so_0,eo_0,f_jpg,q_auto/g8p7m0kpme81xzy4qxtc/v1_snow-bentley.jpg';

// Fixed assets from the design handoff
const NAMED = {
  '2aebcf66-1a83-4c58-9e8a-c1cf3b8def66': ['sb-logo-color', 'Snow Bentley Realty'],
  '4155cf8c-daa6-423d-9076-7c481fdc24e8': ['sb-logo-white', 'Snow Bentley Realty'],
  'fbaf8acd-b2aa-48d9-9db9-0a8df214a0c7': ['sb-tile-buy', 'Buy'],
  'e096368e-cd6d-411a-82c3-09447dc3a86e': ['sb-tile-lets-connect', "Let's Connect"],
  '8e8b5400-7015-4ee2-8e0b-a9616acc4b72': ['sb-tile-sell', 'Sell'],
  '20591ddb-8a46-4e2e-b68f-13b2b74c07ea': ['sb-home-worth-bg', 'Luxury home exterior at dusk'],
  'e22256cc-24c8-4658-ac56-7f014796ef74': ['sb-snow-bentley-headshot', 'Snow Bentley San Ramon, CA Real Estate Agent Headshot'],
  'f6a1384a-fb50-4f28-8f3c-dfeafbcb6fec': ['sb-testimonials-bg', 'Modern living room'],
  'f95b7474-5300-43d2-aaa6-b1767656a7f8': ['sb-listings-commercial-sales', 'Commercial Sales'],
  'ac226cec-892f-4312-863f-07773c7056f4': ['sb-listings-commercial-leasing', 'Commercial Leasing'],
  'fc8caa14-75bb-4d2e-b19c-12511e3a20f2': ['sb-listings-luxury-residential', 'Luxury Residential'],
  '36992463-4792-4bf9-974a-3ee606854281': ['sb-golden-gate-bg', 'Golden Gate Bridge'],
  '36b1231e-2d63-49e8-b594-b2f74ed4775e': ['sb-exp-commercial-logo', 'eXp Commercial'],
  '382304bf-5354-45f0-878f-80323ad7d65a': ['sb-realtor-eho-logos', 'REALTOR and Equal Housing Opportunity'],
  '3929c765-a573-4397-a07c-8f8481feeece': ['sb-contact-bg', 'Snow Bentley Realty'],
  [VIDEO]: ['sb-hero-video', 'Snow Bentley Realty hero video'],
  [POSTER]: ['sb-hero-poster', 'Golden Gate Bridge aerial view'],
};

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

function collectMedia() {
  const map = new Map();
  const add = (key, name, alt) => {
    if (!key || map.has(key)) return;
    const n = NAMED[key];
    map.set(key, { key, name: n ? n[0] : name, alt: n ? n[1] : alt });
  };
  Object.entries(NAMED).forEach(([k, [n, a]]) => add(k, n, a));
  homeData().neighborhoods.forEach((h) => add(h.image, `sb-neighborhood-${h.slug}`, h.name));
  const c = content();
  for (const [slug, page] of Object.entries(c)) {
    const ps = slug.replace(/\//g, '-');
    page.sections.forEach((s, i) => {
      const nm = (x) => `sb-${ps}-${slugify(x || s.type)}`;
      if (s.image) add(s.image, nm(s.title + (s.type === 'signup-form-download' ? `-${i}` : '')), s.title ? s.title.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : '');
      if (s.bgImage) add(s.bgImage, nm(`${s.title || s.type}-bg`), s.title || '');
      (s.images || []).forEach((im, j) => add(im, nm(`${s.title || s.type}-${j + 1}`), s.title || ''));
      (s.items || []).forEach((it) => it.image && add(it.image, nm(it.label || it.name), it.label || it.name || ''));
      (s.rows || []).forEach((r) => r.image && /^https?:/.test(r.image) && add(r.image, `sb-poi-${slugify(r.name)}`, r.name));
    });
  }
  return [...map.values()];
}

module.exports = { collectMedia, VIDEO, POSTER, NAMED };
