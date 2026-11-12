// Wardlow & Dale new Home (design/home.html) as Elementor data: header template, footer template, page.
const L = require('./lib.cjs');
const { T, SIDE, box, cbox, gap, C, W, H, EB, H2, H3, TX, IMG, ICON, BTN, iconList } = L;

const HOME = '/new-design/';
const FORM = '#case-review';
const TEL = 'tel:4043828008';
const PHONE = '404-382-8008';
const chip = (t, dk = false) => `<span class="wd-chip${dk ? ' wd-chip-dk' : ''}">${t}</span>`;
const tlink = (t, href = '#') => `<a class="wd-tlink" href="${href}">${t}</a>`;
// Section: full-bleed background, content 1320px max via side padding.
const sec = (cls, bg, children, o = {}) => C(`wd-sec ${cls}`, { bg, padding: cbox(`${o.pt ?? 144}px`, SIDE, `${o.pb ?? 144}px`, SIDE), ...o }, children);

/* ------------------------------------------------------------------ header */
function header(m) {
  return [C('wd-root wd-hdr-root', { cssId: 'wd-2026' }, [
    C('wd-util', { dir: 'row', justify: 'space-between', align: 'center', gap: 16, bg: T.ink, padding: cbox('0', SIDE, '0', SIDE), minH: 40 }, [
      TX(`Free consultations · <span lang="es">Hablamos español</span> ${chip('CONFIRM both', true)}`, 'wd-util-l', { color: T.mist, size: 13, lh: 1.5 }),
      TX('3343 Peachtree Rd. NE, Atlanta', 'wd-util-r', { color: T.mist, size: 13, lh: 1.5 }),
    ]),
    C('wd-hdr', { tag: 'header', dir: 'row', justify: 'space-between', align: 'center', gap: 24, bg: T.white, padding: cbox('0', SIDE, '0', SIDE), minH: 88 }, [
      C('wd-logo', { dir: 'row', align: 'center' }, [
        IMG(m.logoColor, 'wd-logo-full', { link: HOME }),
        IMG(m.logoCompact, 'wd-logo-compact', { link: HOME }),
      ]),
      C('wd-nav', { tag: 'nav', dir: 'row', align: 'center', gap: 32, attrs: 'aria-label|Main' }, [
        BTN('Practice areas', '#', 'wd-nav-item', { variant: 'text', size: 15, icon: m.chevron, iconGap: 6, extra: { typography_font_weight: '500' } }),
        BTN('About', '#', 'wd-nav-item', { variant: 'text', size: 15, icon: m.chevron, iconGap: 6, extra: { typography_font_weight: '500' } }),
        BTN('Insights', '#', 'wd-nav-item', { variant: 'text', size: 15, extra: { typography_font_weight: '500' } }),
        BTN('Contact', '#', 'wd-nav-item', { variant: 'text', size: 15, extra: { typography_font_weight: '500' } }),
      ]),
      C('wd-hdr-right', { dir: 'row', align: 'center', gap: 24 }, [
        BTN(PHONE, TEL, 'wd-hdr-phone', { variant: 'text', size: 15, icon: m.phone, iconGap: 8, iconBefore: true }),
        BTN('Free case review', FORM, 'wd-hdr-cta', { sm: true }),
        BTN('Call 404-382-8008', TEL, 'wd-icon-btn wd-icon-call', { variant: 'text', icon: m.phone }),
        BTN('Open menu', '#', 'wd-icon-btn wd-icon-menu', { variant: 'text', icon: m.menu }),
      ]),
    ]),
  ], false)];
}

/* ------------------------------------------------------------------ footer */
function footer(m) {
  const col = (title, links) => C('wd-ftr-col', { gap: 12 }, [
    EB(title, 'wd-ftr-col-h', T.gold, { size: 12 }),
    iconList(links.map((t) => ({ text: t, link: '#' })), 'wd-ftr-links', { color: T.ivory, hover: T.gold, size: 16, space: 12 }),
  ]);
  return [C('wd-root wd-ftr-root', { cssId: 'wd-2026' }, [
    C('wd-ftr', { tag: 'footer', bg: T.ink, padding: cbox('96px', SIDE, '48px', SIDE) }, [
      C('wd-ftr-top', { grid: 'minmax(0,4fr) minmax(0,7fr)', gap: gap(96, 56) }, [
        C('wd-ftr-brand', { gap: 24 }, [
          IMG(m.logoReversed, 'wd-ftr-logo', { link: HOME }),
          TX('<p>A Georgia personal injury law firm in Atlanta, owned and led by attorneys Sara J. Wardlow and Torrie L. Dale.</p>', 'wd-ftr-desc', { color: T.mist, size: 16, lh: 1.55 }),
          iconList([
            { text: PHONE, link: TEL, icon: m.phone },
            { text: 'info@wardlowdale.com', link: '#', icon: m.mail },
            { text: '3343 Peachtree Rd. NE, Suite 145-906, Atlanta, GA 30326 · <a class="wd-map" href="#">Map</a>', icon: m.pin },
            { text: 'Office hours [CONFIRM]', icon: m.clock },
          ], 'wd-ftr-addr', { color: T.ivory, size: 16, space: 10, iconSize: 18 }),
        ]),
        C('wd-ftr-nav', { tag: 'nav', grid: 'repeat(3,minmax(0,1fr))', gap: gap(48, 40), attrs: 'aria-label|Footer' }, [
          col('Practice areas', ['Auto accidents', 'Truck accidents', 'Premises liability']),
          col('The firm', ['About', 'Sara J. Wardlow', 'Torrie L. Dale', 'Insights', 'Contact']),
          col('Resources', ['Free case review', 'Privacy policy', 'Disclaimer', 'Accessibility']),
        ]),
      ]),
      TX([
        `<p>${chip('DRAFT · FOR ATTORNEY APPROVAL', true)}</p>`,
        `<p>Attorney advertising. Wardlow &amp; Dale, LLC. Attorneys responsible for this website: Sara J. Wardlow and Torrie L. Dale. Principal office: 3343 Peachtree Rd. NE, Suite 145-906, Atlanta, GA 30326 [CONFIRM] · ${PHONE}.</p>`,
        '<p>*No attorney fee unless we recover: our contingency fee covers attorney’s fees only. Court costs and case expenses are separate and may still be owed by the client. Contingency fees are not permitted in all types of cases.</p>',
        '<p id="results">*Past results depend on the facts of each case and do not guarantee or predict a similar outcome in any future matter.</p>',
        '<p>The information on this website is for general information only and is not legal advice. Contacting us does not create an attorney-client relationship.</p>',
      ].join(''), 'wd-comp', { color: T.mist, size: 14, lh: 1.6, cssId: 'fees' }),
      C('wd-ftr-bot', { dir: 'row', wrap: 'wrap', justify: 'space-between', align: 'center', gap: 16 }, [
        iconList(['Privacy policy', 'Disclaimer', 'Accessibility'].map((t) => ({ text: t, link: '#' })), 'wd-ftr-bot-links', { inline: true, color: T.ivory, hover: T.gold, size: 14, space: 24 }),
        TX('© 2026 Wardlow &amp; Dale, LLC', 'wd-ftr-copy', { color: T.mist, size: 14 }),
      ]),
    ]),
    C('wd-mbar', { dir: 'row', gap: 10, bg: T.white }, [
      BTN('Call now', TEL, 'wd-mbar-call', { variant: 'outline', size: 16, icon: m.phone, iconGap: 8, iconBefore: true }),
      BTN('Free case review', FORM, 'wd-mbar-go', { size: 16 }),
    ]),
    W('html', 'wd-js', { html: SCRIPT }),
  ], false)];
}

// Phone action bar hides while a form field has focus; textarea gets a 500-character limit and counter.
const SCRIPT = `<script>
(function(){
  function init(){
    var r=document.documentElement;
    var F='#wd-2026 input,#wd-2026 textarea,#wd-2026 select',t;
    document.addEventListener('focusin',function(e){if(e.target.matches(F)){clearTimeout(t);r.classList.add('wd-typing');}});
    /* wait before showing the bar again, so it never lands under a tap that is moving between fields */
    document.addEventListener('focusout',function(){clearTimeout(t);t=setTimeout(function(){var a=document.activeElement;if(!a||!a.matches(F))r.classList.remove('wd-typing');},400);});
    document.querySelectorAll('#wd-2026 .wd-form textarea').forEach(function(t){
      if(t.dataset.wdCount)return;t.dataset.wdCount=1;t.maxLength=500;
      var c=document.createElement('span');c.className='wd-count';c.id=t.id+'-count';c.setAttribute('aria-live','polite');
      t.setAttribute('aria-describedby',c.id);
      var u=function(){c.textContent=t.value.length+' / 500';};u();t.addEventListener('input',u);
      t.parentNode.appendChild(c);
    });
  }
  if(document.readyState!=='loading')init();else document.addEventListener('DOMContentLoaded',init);
})();
</script>`;

/* -------------------------------------------------------------------- page */
function page(m, tpl) {
  const lead = (html, cls) => TX(html, `wd-lead ${cls || ''}`, { size: 22, lh: 1.5 });
  const muted = (html, cls, size = 17) => TX(html, cls, { color: T.stone, size });

  const hero = C('wd-hero', { bg: T.ivory, grid: 'minmax(0,7fr) minmax(0,5fr)', padding: cbox('0', '0', '0', SIDE) }, [
    C('wd-hero-copy', { justify: 'center', padding: box(96, 64, 128, 0) }, [
      EB(`Georgia personal injury attorneys ${chip('CONFIRM service area')}`, 'wd-hero-eyebrow'),
      H('Your injury.<br>Their fault.<br><strong>Our fight.</strong>', 'h1', 'wd-h1', { size: 'clamp(56px, 6.6vw, 96px)', weight: 300, lh: 1.02, ls: -0.03 }),
      lead('<p>Wardlow &amp; Dale is a Georgia personal injury firm that holds at-fault parties accountable. From your first call to the close of your case, you work directly with the two attorneys who own the firm.</p>', 'wd-hero-lead wd-lead-long'),
      lead('<p>Work directly with the two attorneys who own the firm, from your first call to the close of your case.</p>', 'wd-hero-lead wd-lead-short'),
      C('wd-hero-cta', { dir: 'row', wrap: 'wrap', align: 'center', gap: 28 }, [
        BTN('Free case review', FORM, 'wd-hero-btn', { icon: m.arrowRight }),
        muted(`<p>or call ${tlink(PHONE, TEL)}</p>`, 'wd-hero-call'),
      ]),
      muted('<p>No attorney fee unless we recover<a href="#fees">*</a></p>', 'wd-hero-fee', 14),
    ]),
    C('wd-hero-photo', {}, [IMG(m.partners, 'wd-hero-img')]),
  ]);

  const num = (n, label) => C('wd-num', { gap: 8 }, [
    H(n, 'p', 'wd-num-n', { color: T.gold, size: 'min(104px, 27cqw)', weight: 300, lh: 0.95, ls: -0.02 }),
    TX(`<p>${label}</p>`, 'wd-num-l', { color: T.mist, size: 14, lh: 1.5 }),
  ]);
  const badge = (t) => C('wd-badge', { dir: 'row', align: 'center', gap: 16 }, [
    TX('<p>Official badge</p>', 'wd-badge-ph', { color: T.mist, size: 11, lh: 1.2 }),
    TX(`<p>${t}</p>`, 'wd-badge-t', { color: T.mist, size: 13, lh: 1.45 }),
  ]);
  const proof = C('wd-proof', { tag: 'section', bg: T.ink, padding: cbox('144px', SIDE, '104px', SIDE), attrs: 'aria-label|The firm in numbers' }, [
    C('wd-nums', { grid: 'repeat(3,minmax(0,1fr))' }, [
      num('20+', 'Years combined experience'), num('$50M+', 'Recovered for clients<a href="#results">*</a>'), num('1,000+', 'Clients served'),
    ]),
    C('wd-recog', { dir: 'row', wrap: 'wrap', align: 'center', gap: gap(40, 24) }, [
      EB('Recognition', 'wd-recog-eb', T.mist),
      badge('Super Lawyers Rising Star<br>Torrie L. Dale · [year]'),
      badge('Top 40 Under 40, The National Trial Lawyers<br>Torrie L. Dale · [year]'),
      TX(`<p>${chip('CONFIRM stats, years, badge licences', true)}</p>`, 'wd-recog-chip', { size: 13 }),
    ]),
  ]);

  const partner = (img, name, cred, bio) => C('wd-partner', { tag: 'article', gap: 8 }, [
    IMG(img, 'wd-partner-img', { size: 'large' }),
    H3(name, 'wd-partner-name'),
    EB('Co-Founder &amp; Managing Partner', 'wd-role', T.stone, { size: 12 }),
    TX(`<p>${cred}</p>`, 'wd-cred', { size: 16, lh: 1.55 }),
    TX(`<p>${tlink(bio)}</p>`, 'wd-bio', { size: 16 }),
  ]);
  const owners = sec('wd-owners', T.ivory, [
    C('wd-owners-copy', { gap: 24 }, [
      EB('The owners'),
      H2('You’ll work with <strong>the owners of the firm.</strong> Not a call center.'),
      lead('<p>Sara J. Wardlow and Torrie L. Dale built Wardlow &amp; Dale as equal owners, and they lead every case together.</p>', 'wd-owners-lead'),
      muted('<p>Both have worked on the defense and plaintiff sides of the courtroom, so they know exactly how the other side thinks, and they use it for you.</p>', 'wd-owners-muted'),
      IMG(m.signature, 'wd-signature'),
    ]),
    C('wd-partners', { grid: 'repeat(2,minmax(0,1fr))', gap: gap(32, 40) }, [
      partner(m.sara, 'Sara J. Wardlow', '14+ years of legal experience on both sides of the courtroom. Has worked on and resolved multiple seven-figure cases.<a href="#results">*</a>', 'Read Sara’s bio'),
      partner(m.torrie, 'Torrie L. Dale', `Trial-tested in Georgia state and federal courts. Super Lawyers Rising Star and a Top 40 Under 40 by The National Trial Lawyers, [years]. ${chip('CONFIRM years')}`, 'Read Torrie’s bio'),
    ]),
  ], { grid: 'minmax(0,5fr) minmax(0,7fr)', gap: gap(80, 56), gridAlign: 'start' });

  const prow = (no, thumb, name, desc) => C('wd-prow', { tag: 'a', link: '#' }, [
    IMG(thumb, 'wd-th'),
    H(no, 'span', 'wd-no', { color: T.antique, size: 13, weight: 600, lh: 1.6 }),
    H(name, 'span', 'wd-nm', { size: 34, weight: 700, lh: 1.15, ls: -0.02 }),
    TX(`<p>${desc}</p>`, 'wd-ds', { color: T.stone, size: 16, lh: 1.5 }),
    ICON(m.arrowRight, 'wd-ar', T.evergreen, 20),
  ]);
  const practice = sec('wd-practice', T.linen, [
    EB('Practice areas'),
    H2('<strong>Cases</strong> we handle'),
    C('wd-plist', {}, [
      prow('01', m.thumbAuto, 'Auto accidents', 'Rear-end, intersection and distracted-driver crashes caused by someone else’s negligence.'),
      prow('02', m.thumbTruck, 'Truck accidents', 'Tractor-trailer and commercial vehicle crashes, where several parties may share the blame.'),
      prow('03', m.thumbPremises, 'Premises liability', 'Slip, trip and fall injuries caused by unsafe conditions on someone else’s property.'),
    ]),
    TX(`<p>Not sure your case fits? ${tlink('Ask us')}.</p>`, 'wd-practice-foot', { size: 17 }),
  ]);

  const pbRow = (n, them, themL, us, usL) => C('wd-pb-row', { grid: 'repeat(2,minmax(0,1fr))' }, [
    C('wd-pb-them', { grid: '32px minmax(0,1fr)', gap: 32 }, [
      H(n, 'span', 'wd-pb-n', { color: T.gold, size: 13, weight: 600, lh: 1.6 }),
      C('wd-pb-tx', {}, [
        EB('What insurers do', 'wd-pb-lab', T.mist, { size: 11 }),
        H(them, 'p', 'wd-pb-t', { color: T.ivory, size: 21, weight: 600, lh: 1.35 }),
        TX(`<p>${themL}</p>`, 'wd-pb-l', { color: T.mist, size: 16, lh: 1.55 }),
      ]),
    ]),
    C('wd-pb-us', {}, [
      EB('What we do', 'wd-pb-lab', T.gold, { size: 11 }),
      H(us, 'p', 'wd-pb-t', { color: T.ivory, size: 21, weight: 600, lh: 1.35 }),
      TX(`<p>${usL}</p>`, 'wd-pb-l', { color: T.mist, size: 16, lh: 1.55 }),
    ]),
  ]);
  const playbook = sec('wd-pb', T.ink, [
    C('wd-pb-intro', {}, [
      EB('The other side’s playbook', '', T.gold),
      H2('<strong>We’ve been on the other side.</strong> Here’s what that means for you.', '', T.ivory),
    ]),
    C('wd-pb-head', { grid: 'repeat(2,minmax(0,1fr))' }, [
      EB('What insurers do', 'wd-pb-head-them', T.mist, { size: 12 }),
      EB('What we do', 'wd-pb-head-us', T.gold, { size: 12 }),
    ]),
    pbRow('01', 'Call early for a recorded statement', 'Adjusters often call within days, before you know how badly you’re hurt.', 'We handle every insurer call', 'Once you hire us, the insurance company talks to us, not you.'),
    pbRow('02', 'Make a quick, low offer', 'An early check can look generous. Accepting it usually ends your claim.', 'We value the full claim first', 'Medical costs, lost income and future needs are documented before any offer is considered.'),
    pbRow('03', 'Watch your social media', 'One photo or post can be used to argue you aren’t really hurt.', 'We preserve evidence early', 'Photos, video, witness accounts and vehicle data are gathered before they disappear.'),
    pbRow('04', 'Question your medical treatment', 'Gaps or delays in care are used to blame your injuries on something else.', 'We help document your treatment', 'A clear, consistent record of your care and recovery.'),
    C('wd-pb-foot', { dir: 'row', wrap: 'wrap', justify: 'space-between', align: 'center', gap: 24 }, [
      TX('<p><a class="wd-tlink wd-tlink-light" href="#">How we work, in detail</a></p>', 'wd-pb-more', { color: T.ivory, size: 17, weight: 600 }),
      TX(`<p>${chip('CONFIRM attorneys approve wording', true)}</p>`, 'wd-pb-chip', { size: 13 }),
    ]),
  ]);

  const step = (n, title, text, on) => C(`wd-step${on ? ' wd-step-on' : ''}`, { gap: 10 }, [
    H(n, 'span', 'wd-step-no', { color: T.antique, size: 13, weight: 600, lh: 1.6 }),
    H3(title, 'wd-step-h', { size: 'min(24px, 11cqw)' }),
    TX(`<p>${text}</p>`, 'wd-step-p', { size: 16, lh: 1.55 }),
  ]);
  const how = sec('wd-how', T.ivory, [
    C('wd-how-head', { dir: 'row', wrap: 'wrap', justify: 'space-between', align: 'flex-end', gap: 32 }, [
      C('wd-how-title', {}, [EB('How a case works'), H2('What happens <strong>after you call.</strong>')]),
      muted('<p>Every case is different, so there are no promises about timing or outcome. What doesn’t change is who you work with.</p>', 'wd-how-note'),
    ]),
    C('wd-steps', { grid: 'repeat(5,minmax(0,1fr))', gap: 32 }, [
      step('01', 'Free case review', 'Tell us what happened. We listen, answer your questions and explain your options.', true),
      step('02', 'Investigation and evidence', 'We gather reports, records, photos and witness accounts to show who is at fault.', true),
      step('03', 'Treatment and documentation', 'You focus on getting better while we track your care, bills and lost income.'),
      step('04', 'Demand and negotiation', 'We present the full value of your claim to the insurer and negotiate.'),
      step('05', 'Litigation and trial', 'If a fair settlement isn’t offered, we’re prepared to file suit and go to trial.'),
    ]),
  ]);

  const voices = sec('wd-voices', T.linen, [
    EB('Client voices', 'wd-v-eb'),
    C('wd-v-q', { gap: 28 }, [
      TX('<blockquote>“A real client review goes here, quoted exactly as written and used with the client’s permission. Shown one at a time, with no autoplay.”</blockquote>', 'wd-quote', { size: 34, weight: 300, lh: 1.35, ls: -0.01 }),
      muted(`<p>[First name, last initial] · [Case type] · ${tlink('Google review')} ${chip('CONFIRM real reviews, or cut this section')}</p>`, 'wd-v-cap', 15),
    ]),
    C('wd-v-ctl', { dir: 'row', align: 'center', gap: 16 }, [
      BTN('Previous review', '#', 'wd-sq', { variant: 'outline', icon: m.arrowLeft }),
      BTN('Next review', '#', 'wd-sq', { variant: 'outline', icon: m.arrowRight }),
      muted('<p>1 / 3</p>', 'wd-v-count', 14),
    ]),
  ], { tag: 'section', attrs: 'aria-label|Client voices' });

  const tm = (img, name, role, cls = '') => C(`wd-tm ${cls}`, { gap: 12 }, [
    IMG(img, 'wd-tm-img', { size: 'large' }),
    C('wd-tm-cap', {}, [
      H(name, 'p', 'wd-tm-name', { size: 20, weight: 700, lh: 1.25 }),
      TX(`<p>${role}</p>`, 'wd-tm-role', { color: T.stone, size: 14, lh: 1.45 }),
    ]),
  ]);
  const team = sec('wd-team', T.ivory, [
    C('wd-team-copy', { gap: 20 }, [
      EB('Our team'),
      H2('A small team that <strong>knows your name.</strong>'),
      TX('<p>Every member of our team is here because they believe in fighting for the people who need it most. Rebekah is bilingual, so Spanish-speaking clients get the same attentive support throughout their case.</p>', 'wd-team-p'),
      iconList([{ text: `<span lang="es">Hablamos español</span> ${chip('CONFIRM')}`, icon: m.globe }], 'wd-es', { color: T.evergreen, iconColor: T.brand, size: 17, weight: 600, iconSize: 22, indent: 10 }),
      BTN('Meet the team', '#', 'wd-team-btn', { variant: 'outline' }),
    ]),
    C('wd-collage', { grid: 'minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)', gap: gap(24, 40), gridAlign: 'start' }, [
      tm(m.angela, 'Angela Johnson', 'Senior Litigation Paralegal'),
      tm(m.rebekah, 'Rebekah Covarrubias', 'Litigation Paralegal · English &amp; Spanish', 'wd-o1'),
      tm(m.susan, 'Susan Standley', 'Pre-Litigation Paralegal', 'wd-o2'),
      C('wd-dogs', { dir: 'row', align: 'center', gap: 24, bg: T.linen }, [
        IMG(m.braxton, 'wd-dogs-img', { size: 'medium_large' }),
        C('wd-dogs-cap', { gap: 4 }, [
          H('Braxton &amp; Mojo', 'p', 'wd-tm-name', { size: 20, weight: 700, lh: 1.25 }),
          TX('<p>Office managers and founding fathers. They greet visitors, supervise lunch breaks and keep stress levels low.</p>', 'wd-tm-role', { color: T.stone, size: 15, lh: 1.5 }),
          TX(`<p>${chip('CONFIRM photo of Mojo')}</p>`, 'wd-dogs-chip', { size: 13 }),
        ]),
      ]),
    ]),
  ], { grid: 'minmax(0,4fr) minmax(0,8fr)', gap: gap(72, 56), gridAlign: 'start' });

  const cat = (c, d) => H(`${c} <em>${d}</em>`, 'p', 'wd-cat', { color: T.evergreen, size: 13, weight: 600, lh: 1.6, ls: 0.14, transform: 'uppercase' });
  const insights = sec('wd-ins', T.ivory, [
    C('wd-ins-in', {}, [
      C('wd-ins-head', { dir: 'row', wrap: 'wrap', justify: 'space-between', align: 'flex-end', gap: 24 }, [
        C('wd-ins-title', {}, [EB('Insights'), H2('Know your rights <strong>after an injury.</strong>')]),
        TX(`<p>${tlink('All insights')}</p>`, 'wd-ins-all', { size: 17 }),
      ]),
      C('wd-feat', { tag: 'article', grid: 'minmax(0,7fr) minmax(0,5fr)', gap: gap(56, 32), gridAlign: 'center' }, [
        IMG(m.atlanta, 'wd-feat-img', { size: 'large' }),
        C('wd-feat-tx', { gap: 16 }, [
          cat('Car accidents', 'Aug 4, 2025'),
          H3('What to do after a car accident in Georgia: a step-by-step guide', 'wd-feat-h', { size: 32, lh: 1.15, ls: -0.02, link: '#' }),
          muted('<p>A car accident can turn an ordinary day into one of the worst of your life. Here’s what to do next, step by step.</p>', 'wd-feat-p', 18),
          TX(`<p>${tlink('Read the guide')}</p>`, 'wd-feat-more', { size: 16 }),
        ]),
      ]),
      C('wd-posts', { grid: 'repeat(2,minmax(0,1fr))' }, [
        C('wd-post', { tag: 'article', gap: 10 }, [cat('Truck accidents', 'Jan 29, 2026'), H3('Why truck accident cases are different, and why it matters who you hire', 'wd-post-h', { size: 24, lh: 1.25, link: '#' })]),
        C('wd-post', { tag: 'article', gap: 10 }, [cat('Your claim', 'Jan 29, 2026'), H3('5 mistakes that can hurt your personal injury claim', 'wd-post-h', { size: 24, lh: 1.25, link: '#' })]),
      ]),
    ]),
  ], { pt: 0 });

  const opt = (t) => t;
  const form = W('form', 'wd-form', {
    form_name: 'WD 2026 – Case review (preview)',
    form_fields: [
      { _id: L.id(), custom_id: 'name', field_type: 'text', field_label: 'Full name', placeholder: '', required: 'true', width: '50' },
      { _id: L.id(), custom_id: 'phone', field_type: 'tel', field_label: 'Phone', placeholder: '', required: 'true', width: '50' },
      { _id: L.id(), custom_id: 'case_type', field_type: 'radio', field_label: 'What kind of case?', field_options: ['Auto accident', 'Truck accident', 'Premises liability', 'Other / not sure'].map(opt).join('\n'), inline_list: 'elementor-subgroup-inline', width: '100' },
      { _id: L.id(), custom_id: 'message', field_type: 'textarea', field_label: 'Briefly, what happened?', rows: 4, width: '100' },
      { _id: L.id(), custom_id: 'trust', field_type: 'html', field_label: 'Trust line', width: '60',
        field_html: '<div class="wd-trust"><span class="wd-t-shield">No cost to talk</span><span class="wd-t-check">No attorney fee unless we recover<a href="#fees">*</a></span><span class="wd-t-clock">Reply within [CONFIRM]</span></div>' },
      { _id: L.id(), custom_id: 'hp', field_type: 'honeypot', field_label: 'Honeypot', width: '100' },
    ],
    show_labels: 'yes', mark_required: '', label_position: 'above', input_size: 'md',
    button_text: 'Request my free case review', button_size: 'md', button_width: '40', button_align: 'end',
    selected_button_icon: L.svg(m.arrowRight), button_icon_align: 'row-reverse', button_icon_indent: L.px(10),
    submit_actions: ['email'],
    email_to: process.env.WD_FORM_EMAIL || '', email_subject: '[PREVIEW] Wardlow & Dale case review', email_content: 'Full name: [field id="name"]<br>Phone: [field id="phone"]<br>What kind of case?: [field id="case_type"]<br>Briefly, what happened?: [field id="message"]',
    email_from_name: 'Wardlow & Dale preview', email_content_type: 'html',
    custom_messages: 'yes', success_message: 'Thanks. This is a preview, so your message went to Dream Web Digital, not the firm.',
    error_message: 'Something went wrong. Please call us at 404-382-8008.', required_field_message: 'This field is required.', invalid_message: 'Please check this field.',
    column_gap: L.px(16), row_gap: L.px(24),
    label_color: T.ink, ...L.typo('label_typography', 14, 600, { lh: 1.4 }), label_spacing: L.px(6),
    field_text_color: T.ink, ...L.typo('field_typography', 17, 400, { lh: 1.5 }),
    field_background_color: T.white, field_border_color: T.field, field_border_width: box(1), field_border_radius: box(2),
    html_color: T.stone, ...L.typo('html_typography', 13, 500, { lh: 1.5 }),
    button_background_color: T.gold, button_text_color: T.ink, button_background_hover_color: T.goldHover, button_hover_color: T.ink,
    ...L.typo('button_typography', 16, 600, { lh: 1.2 }), button_border_radius: box(2), button_text_padding: box(0, 28),
    message_typography_typography: 'custom', success_message_color: T.evergreen, error_message_color: T.error,
  });

  const close = sec('wd-close', T.evergreen, [
    C('wd-close-top', { grid: 'minmax(0,7fr) minmax(0,5fr)', gap: gap(96, 32), gridAlign: 'end' }, [
      C('wd-close-title', {}, [
        EB('Free, confidential case review', '', T.gold),
        H2('The clock is ticking <strong>on your claim.</strong>', 'wd-close-h2', T.ivory, { size: 56, lh: 1.06 }),
      ]),
      C('wd-close-side', { gap: 24 }, [
        TX('<p>In Georgia, you generally have two years from the date of an injury to file a personal injury lawsuit. Some claims have shorter deadlines, so it helps to talk early.</p>', 'wd-close-p', { color: T.ivory, size: 18, lh: 1.55 }),
        C('wd-call-block', { gap: 4 }, [
          EB('Talk to Sara or Torrie', 'wd-call-eb', T.mist),
          H(PHONE, 'p', 'wd-phone-big', { color: T.ivory, size: 44, weight: 600, lh: 1.2, ls: -0.02, link: TEL }),
        ]),
      ]),
    ]),
    C('wd-form-wrap', { cssId: 'case-review' }, [
      C('wd-form-panel', { bg: T.white, gap: 24, padding: box(48) }, [
        C('wd-form-head', { dir: 'row', wrap: 'wrap', justify: 'space-between', align: 'center', gap: gap(32, 16) }, [
          C('wd-form-head-l', { dir: 'row', align: 'center', gap: 16 }, [
            C('wd-avatars', { dir: 'row' }, [IMG(m.sara, 'wd-av', { size: 'thumbnail' }), IMG(m.torrie, 'wd-av', { size: 'thumbnail' })]),
            C('wd-form-titles', { gap: 2 }, [
              EB('Reviewed by Sara or Torrie', 'wd-kicker', T.antique, { size: 12 }),
              H3('Tell us what happened', 'wd-form-h', { cssId: 'crf-title' }),
            ]),
          ]),
          muted('<p>Takes about two minutes. No cost, no obligation.</p>', 'wd-form-note', 15),
        ]),
        form,
        muted(`<p>Submitting this form does not create an attorney-client relationship. Please don’t include confidential details. ${tlink('Privacy policy')}</p>`, 'wd-fine', 14),
      ]),
    ]),
  ]);

  return [C('wd-root wd-page-root', { cssId: 'wd-2026', bg: T.ink }, [
    W('template', 'wd-tpl wd-tpl-hdr', { template_id: String(tpl.header) }),
    C('wd-main', { tag: 'main' }, [hero, proof, owners, practice, playbook, how, voices, team, insights, close]),
    W('template', 'wd-tpl wd-tpl-ftr', { template_id: String(tpl.footer) }),
  ], false)];
}

module.exports = { header, footer, page };
