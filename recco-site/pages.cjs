// Enterprise Apps, AI Platforms and SEED pages (structure from Eric Pozil's 12 Oct 2026 brief, copy from the V3 copy rewrite, 28 Oct 2026).
const L = require('./lib.cjs');
const { C, SERIF, SANS, U, A, px, box, gap, auto, typo, container, widget, band, stack, row, grid, eyebrowText, H2, H3, text, button } = L;
const { subHero, head, arrowLink, numberedCards, checkList, seedBand, matrix } = require('./blocks.cjs');
const { appRows } = require('./platforms.cjs');

/* -------------------------------------------------------- Enterprise Apps */
const enterpriseApps = {
  slug: 'enterprise-apps', title: 'Enterprise Apps',
  build: (m) => [
    subHero(m, {
      label: 'Enterprise Apps', image: 'dome',
      title: 'Enterprise Application Orchestration & Workflow Intelligence',
      lede: 'See how generative AI really performs inside your CRM, ERP, service, and collaboration platforms.',
    }),
    band([
      head(m, 'Enterprise Apps', 'Core Focus Areas'),
      numberedCards([
        ['Workflow Orchestration & Data Integration', 'Does the assistant keep context across email, meetings, files, and CRM records? We test it and trace every answer.'],
        ['Business Application Benchmarks', 'Repeatable scenarios in everyday tools, such as Dynamics 365 Sales pipelines and Power BI dashboards.'],
        ['Agentic Task Execution', 'Agents that summarize meetings, update records, or handle voice, scored on what they actually did.'],
      ]),
    ], { bg: C.white, gap: 56, title: 'Core focus areas' }),
    band([
      head(m, 'Enterprise App Services', 'Vendor-agnostic depth across 23 platforms.',
        'Our consultants have worked on both the vendor side and the client side. They know what each platform does well, what it really costs, and what adoption takes.'),
      appRows(m, { label: false }),
    ], { bg: C.tint, gap: 48, title: 'Platforms by category' }),
    seedBand(m, {
      label: 'SEED Engine', title: 'Backed by SEED Application Hydration',
      body: 'Our app testing runs on SEED packs calibrated for enterprise tools. We trace data flows end to end across Microsoft 365, Google Workspace, and business applications, instead of trusting a demo.',
      cta: 'Review SEED Application Hydration Packs', url: U.seed,
    }),
  ],
};

/* ----------------------------------------------------------- AI Platforms */
const aiPlatforms = {
  slug: 'ai-platforms', title: 'AI Platforms',
  build: (m) => [
    subHero(m, {
      label: 'AI Platforms', image: 'cityData',
      title: 'Head-to-Head Enterprise AI Platform Analysis',
      lede: 'Objective, data-driven comparisons of Microsoft 365 Copilot, ChatGPT Enterprise, Gemini Enterprise, Claude Enterprise, Glean, and Perplexity.',
    }),
    band([
      head(m, 'AI Platforms', 'Platform Evaluation Dimensions'),
      numberedCards([
        ['Multi-Tenant Architecture & Ecosystems', 'Each platform is tested where it lives. That means Microsoft 365 tenants and a dedicated Google Workspace tenant connected to Gemini Enterprise, which shows gaps single-vendor tenants hide.'],
        ['True Operational FinOps', 'Our instrumentation measures actual usage and cost per prompt run. It converts seat-licensed platforms to API list-price equivalents, so all six compare on the same basis.'],
        ['Enterprise Administration & Governance', 'Direct admin access lets us audit controls, Compliance APIs, security boundaries, and tenant analytics first-hand. Demo and business-tier accounts can\u2019t do that.'],
      ]),
    ], { bg: C.white, gap: 56, title: 'Evaluation dimensions' }),
    band([
      head(m, 'Evaluation matrix', 'Comparative Platform Dimensions'),
      matrix(['Dimension', 'Standard Generic Evaluation', 'Recco Independent Platform Analysis'], [
        ['Environment Tier', 'Business, trial, or demo accounts', 'Enterprise-tier licenses for all six platforms'],
        ['Ecosystem Reach', 'One vendor\u2019s tenant', 'Native Microsoft 365 and Google Workspace tenants'],
        ['Cost Transparency', 'Published seat-price estimates', 'Measured cost per prompt run via OpenTelemetry and Billing APIs'],
        ['Output Validation', 'Subjective, one-off scoring', 'Traceable responses mapped to realistic enterprise data'],
      ]),
    ], { bg: C.tint, gap: 48, title: 'Comparison matrix' }),
    seedBand(m, {
      label: 'SEED Lab', title: 'Every comparison runs on SEED.',
      body: 'These findings come from our live multi-vendor lab, which processes 10B+ tokens a month. That means real runs and measured costs, not estimates.',
      cta: 'Explore the SEED Lab', url: U.seed,
    }),
  ],
};

/* ------------------------------------------------------------------- SEED */
const PILLARS = [
  ['Agile Multi-Vendor Lab', 'Native Enterprise Access Without Procurement Bottlenecks',
    'Serious analysis needs the licensed product, not a trial. Our tenants are procured independently, so new platforms go live in days. Often that\u2019s before the market takes them seriously.', [
      'Enterprise-tier access to Microsoft 365 Copilot, ChatGPT, Claude, Glean, Perplexity, and Gemini Enterprise, the last in a dedicated Google Workspace tenant, plus every AI build and agent tool we cover.',
      'Licenses bought directly from each vendor, giving visibility into pricing, admin consoles, analytics, security settings, and APIs.',
      'Same-day turnaround on new releases, plus eligibility for private previews.',
    ]],
  ['Recco-Tuned Data Hydration', 'Signal-Dense Context, Not Static Filler',
    'Artificial data produces artificial results. Recco-Tuned hydration fills Teams, email, meetings, and files with realistic, traceable context built for complex, multi-step prompts.', [
      'Base packs with agentic meeting content and voice agents, so every output traces back to its source.',
      'Differentiator packs built to show Work IQ, security boundaries, and cross-app orchestration.',
      'Prompt-specific packs for deep workflows like Dynamics 365 Sales and Power BI dashboards.',
    ]],
  ['Proprietary FinOps & Telemetry Stack', 'Per-Task Cost & Execution Visibility',
    'Quality without cost is half an answer. We measure both on every run, including 54,000+ Claude model requests a month.', [
      'Our own instrumentation cross-references OpenTelemetry, platform Compliance APIs, and Billing APIs.',
      'Cost per prompt run, including API list-price equivalents for seat-licensed platforms like Claude.',
      'Regular calibration against live test runs keeps ITOps, SecOps, and FinOps benchmarks accurate.',
    ]],
  ['Platform Analysis SMEs & Solution Architects', 'Expert Translation of Telemetry into Strategy',
    'Our SMEs and solution architects turn raw telemetry into clear vendor trade-offs and environments that are ready to present.', [
      'Daily tracking of vendor feature releases, model changes, pricing shifts, and API updates.',
      'Trade-off evaluations that weigh quality, latency, accuracy, and operational cost together.',
      'Demo design and tenant setup for keynotes, events, and executive briefings.',
    ]],
];

const pillar = ([name, headline, desc, details], i) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(16), padding: box(40), padding_mobile: box(26, 22, 28, 22),
  background_background: 'classic', background_color: C.white, border_radius: box(12),
  border_border: 'solid', border_width: box(1), border_color: C.lineSoft,
  box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 20, blur: 50, spread: -34, color: 'rgba(30,73,94,0.28)' },
  _title: `Pillar ${i + 1}`,
}, [
  eyebrowText(`Pillar ${i + 1} · ${name}`),
  widget('heading', { title: headline, header_size: 'h3', title_color: C.navy, ...typo('typography', SERIF, [28, 26, 24], 400, { lh: 1.2, ls: -0.3 }) }),
  text(desc, { size: 15.5, lh: 1.65 }),
  widget('heading', { title: 'Key details', header_size: 'p', title_color: C.navy, ...typo('typography', SANS, 13, 700, { lh: 1.3, ls: 0.6 }), _padding: box(8, 0, 0, 0) }),
  checkList(details),
]);

const seed = {
  slug: 'seed', title: 'SEED',
  build: (m) => [
    subHero(m, {
      label: 'SEED: Synthetic Enterprise Environment Data', image: 'serverBlur',
      title: 'The Enterprise AI Proving Ground: Where Reality Replaces Claims',
      lede: 'Golden tenants show that a feature works. SEED shows how well it works, what it costs, and why. 10B+ tokens and 5,800+ prompts a month, live for 16+ months.',
    }),
    band([
      head(m, 'SEED', 'The Four Pillars of SEED'),
      grid(PILLARS.map(pillar), { cols: [2, 1, 1], gap: [28, 28], gapT: [24, 24], gapM: [18, 18], align: 'stretch' }),
    ], { bg: C.tint, gap: 56, title: 'Four pillars' }),
    band([
      head(m, 'Hydration', 'SEED Pack Architecture vs. Generic Hydration',
        'How tiered SEED packs make platform differences visible and traceable, where standard hydrated tenants can\u2019t.'),
      matrix(['Hydration Level', 'Recco-Tuned SEED Packs', 'Generic / Standard Hydrated Tenants'], [
        ['SEED Pack — Base', 'Baseline data with clear traceability, including agentic meeting content and voice agent activity.', 'Differences are hard to verify. Meeting content is hydrated by hand, so it is slow and static.'],
        ['SEED Pack — Differentiators', 'Custom modules that show Work IQ, security policy enforcement, and cross-app orchestration. New packs are added as capabilities ship.', 'Not included. Relies on default, low-signal objects.'],
        ['SEED Pack — Prompt-Specific', 'Deep scenario hydration, such as Dynamics 365 Sales and Power BI, plus prompt optimization recommendations.', 'Not included. Testing is limited to generic knowledge queries.'],
      ], { highlight: 1 }),
    ], { bg: C.white, gap: 48, title: 'Hydration matrix' }),
    band([
      head(m, 'Infrastructure', 'SEED Lab Infrastructure Matrix',
        'What\u2019s live in the SEED environment today, and what\u2019s on the roadmap.'),
      matrix(['Capability', 'Operational Value', 'The SEED Environment'], [
        ['Enterprise Tier Licenses', 'Test true enterprise admin, security, and the licensed experience', 'Full licensed access to every platform and tool we test'],
        ['Independent Tenant Setup', 'Test Google Workspace and Gemini without M365 dependencies', 'Included'],
        ['Agile Procurement', 'New platforms licensed and configured in days, not quarters', 'Active'],
        ['Per-Task Cost Engine', 'Measure real cost per prompt run across platforms', 'Proprietary Telemetry Stack'],
        ['Multi-Tenant Reset & Hydration', 'Consistent, clean, repeatable test storylines', 'Active (Automation Roadmap)'],
        ['Event-Ready Demo Buildouts', 'Show verified platform capabilities on stage and in briefings', 'Turnkey Execution'],
      ], { highlight: 2, cols: 'minmax(0,0.9fr) minmax(0,1.3fr) minmax(0,0.9fr)' }),
    ], { bg: C.tint, gap: 48, title: 'Infrastructure matrix' }),
    band([
      stack([
        H2('Base your AI decisions on verified data.', C.white, { sizes: [42, 36, 30], lh: 1.12, align: 'center' }),
        text('Validating a platform rollout, tracking a fast-moving vendor, or building your next keynote demo? SEED gives you the evidence.', {
          align: 'center', color: 'rgba(255,255,255,0.84)', size: [17, 17, 16], lh: 1.7, maxW: 640,
        }),
        row([button('Schedule a SEED Briefing', A.contact, 'green', { arrow: true })], { justify: 'center', settings: { width: auto } }),
      ], { gap: 24, align: 'center', maxW: 760 }),
    ], {
      pad: [96, 96], image: m.serverBlur, title: 'Closing CTA', settings: { flex_align_items: 'center' },
      overlay: L.overlayGradient('rgba(30,73,94,0.96)', 'rgba(30,73,94,0.86)', 90),
    }),
  ],
};

module.exports = { enterpriseApps, aiPlatforms, seed };
