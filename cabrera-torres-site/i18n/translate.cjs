// Spanish build: the English page trees are translated piece by piece (the text between HTML tags), so styling
// markup is untouched and a label used on several pages is translated once. Internal links move to /es/.
const ES = require('./es.json');

// English path -> Spanish path. Pages without a Spanish version (blog, articles, legal) stay in English.
const PATHS = {
  '/': '/es/', '/about/': '/es/nosotros/', '/our-approach/': '/es/nuestro-enfoque/', '/meet-jennifer/': '/es/conozca-a-jennifer/',
  '/practice-areas/': '/es/casos-que-manejamos/', '/case-results/': '/es/resultados/', '/testimonials/': '/es/testimonios/',
  '/faq/': '/es/preguntas-frecuentes/', '/contact/': '/es/contacto/',
};
// Page slug -> Spanish page: slug under /es/ (home is the /es/ page itself), title, and Yoast fields.
const PAGES = {
  home: { slug: 'es', title: 'Inicio', seo: { title: 'Abogada de Lesiones Personales en Norcross, GA | Cabrera Torres Law Firm', description: 'Abogada bilingüe de lesiones personales en Norcross, GA. Accidentes de auto y camión, resbalones y caídas, mordeduras de perro. Consulta gratuita: 770-777-HURT.', focus: 'abogado de lesiones personales Norcross' } },
  about: { slug: 'nosotros', title: 'Nosotros', seo: { title: 'Nosotros | Firma Bilingüe de Lesiones Personales en Norcross, GA', description: 'Cabrera Torres Law Firm es una firma bilingüe de lesiones personales en Norcross, Georgia. Manejamos cada caso personalmente, de principio a fin.', focus: 'abogado bilingüe Norcross' } },
  'our-approach': { slug: 'nuestro-enfoque', title: 'Nuestro enfoque', seo: { title: 'Nuestro Enfoque | Abogada Lista para Juicio en Norcross, GA', description: 'Cómo manejamos su caso de lesiones: integridad, compromiso y preparación para juicio desde la primera llamada. Consulta gratuita.', focus: 'abogado de lesiones personales Norcross' } },
  'meet-jennifer': { slug: 'conozca-a-jennifer', title: 'Conozca a Jennifer', seo: { title: 'Jennifer Cabrera-Torres, Esq. | Abogada de Lesiones en Norcross', description: 'Conozca a Jennifer Cabrera-Torres, fundadora y abogada principal: dos décadas en derecho de lesiones personales. Habla español. Consulta gratuita.', focus: 'abogada que habla español Norcross' } },
  'practice-areas': { slug: 'casos-que-manejamos', title: 'Casos que manejamos', seo: { title: 'Casos que Manejamos | Abogado de Accidentes de Auto y Camión en Norcross', description: 'Accidentes de auto y camión, mordeduras de perro, resbalones y caídas y muerte por negligencia: los casos que manejamos y cómo funciona un reclamo en Georgia.', focus: 'abogado de accidentes de auto Norcross' } },
  'case-results': { slug: 'resultados', title: 'Resultados', seo: { title: 'Resultados | Más de $15 Millones Recuperados | Cabrera Torres Law Firm', description: 'Acuerdos y veredictos recientes en casos de autos, camiones, resbalones y caídas y responsabilidad por productos en el área de Atlanta.', focus: 'acuerdos de lesiones personales Georgia' } },
  testimonials: { slug: 'testimonios', title: 'Testimonios', seo: { title: 'Testimonios | Reseñas de Clientes | Cabrera Torres Law Firm', description: 'Lo que dicen nuestros clientes: reseñas verificadas de Google de personas a quienes representamos en casos de lesiones personales.', focus: 'reseñas abogado de lesiones Norcross' } },
  faq: { slug: 'preguntas-frecuentes', title: 'Preguntas frecuentes', seo: { title: 'Preguntas Frecuentes | Reclamos por Lesiones en Georgia', description: 'Respuestas claras sobre costos, plazos, compensación y qué hacer después de un accidente en Georgia. Llame al 770-777-HURT.', focus: 'preguntas abogado de lesiones Georgia' } },
  contact: { slug: 'contacto', title: 'Contacto', seo: { title: 'Contacto | Evaluación Gratuita de su Caso | Cabrera Torres Law Firm', description: '¿Sufrió una lesión? Llame a Jennifer al 770-777-HURT o solicite una evaluación gratuita y confidencial. 1770 Indian Trail Lilburn Rd NW, Suite 350, Norcross, GA 30093.', focus: 'evaluación gratuita de caso Norcross' } },
};
const MENU = [['Nosotros', 'about'], ['Casos que manejamos', 'practice-areas'], ['Resultados', 'case-results'], ['Nuestro enfoque', 'our-approach'], ['Testimonios', 'testimonials'], ['Contacto', 'contact']];

const SKIP = new Set(['custom_css', '_css_classes', 'css_classes', 'html_tag', 'custom_id', '_element_id', 'anchor', 'id', '_id']);
const mapPath = (u) => {
  const m = /^(\/[^#?]*)([#?].*)?$/.exec(u);
  return m && PATHS[m[1]] ? PATHS[m[1]] + (m[2] || '') : u;
};
const missing = new Set();
function str(s) {
  if (/^\s*<svg/.test(s)) return s;
  const out = s.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) return part.replace(/href="([^"]+)"/g, (all, u) => `href="${mapPath(u)}"`);
    const t = part.trim();
    if (!/[A-Za-z]{2}/.test(t)) return part;
    if (ES[t] === undefined) { missing.add(t); return part; }
    return part.replace(t, ES[t]);
  }).join('');
  return out;
}
function walk(v, key) {
  if (typeof v === 'string') {
    if (key === 'url') return mapPath(v);
    if (key === 'form_name') return `${v} (Español)`;
    if (key === 'email_subject') return `[Español] ${v}`;
    return SKIP.has(key) || /font_family$/.test(key || '') ? v : str(v);
  }
  if (Array.isArray(v)) return v.map((x) => walk(x, key));
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = k === 'elements' ? x.map((e) => walk(e, k)) : walk(x, k === 'settings' ? key : k);
    return o;
  }
  return v;
}
const translate = (elements) => elements.map((e) => walk(e, 'root'));

// EN | ES switch for the header. Each language's link points at the same page in the other language.
function toggleHtml(C) {
  const map = JSON.stringify(PATHS);
  return `<div class="ct-lang"><a data-l="en" href="/" hreflang="en">EN</a><span aria-hidden="true">|</span><a data-l="es" href="/es/" hreflang="es">ES</a></div>
<style>.ct-lang{display:flex;align-items:center;gap:8px;font-family:Montserrat,sans-serif;font-size:12px;font-weight:600;letter-spacing:.14em;white-space:nowrap}
.ct-lang a{color:${C.ivory};text-decoration:none;padding:4px 2px;border-bottom:1px solid transparent}.ct-lang a:hover{color:${C.rose}}
.ct-lang a.on{color:${C.rose};border-bottom-color:${C.rose}}.ct-lang span{color:rgba(196,160,141,.6)}</style>
<script>(function(){var M=${map},R={},k;for(k in M)R[M[k]]=k;var p=location.pathname.replace(/\\/?$/,'/'),es=p.indexOf('/es/')===0,h=location.hash;
document.querySelectorAll('.ct-lang a').forEach(function(a){var to=a.getAttribute('data-l')==='es'?(es?p:(M[p]||'/es/')):(es?(R[p]||'/'):p);a.href=to+h;if((a.getAttribute('data-l')==='es')===es)a.classList.add('on');});
if(es)document.documentElement.lang='es';
if(!document.querySelector('link[hreflang]')){var en=es?R[p]:p,sp=es?p:M[p];if(en&&sp){[['en',en],['es',sp],['x-default',en]].forEach(function(x){var l=document.createElement('link');l.rel='alternate';l.hreflang=x[0];l.href=location.origin+x[1];document.head.appendChild(l);});}}})();</script>`;
}

module.exports = { ES, PATHS, PAGES, MENU, translate, str, missing, mapPath, toggleHtml };
