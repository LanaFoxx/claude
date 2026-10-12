// Enterprise Apps, AI Platforms and SEED pages (copy from Eric Pozil's 12 Oct 2026 brief).
const L = require('./lib.cjs');
const { C, SERIF, SANS, U, px, box, gap, typo, container, widget, band, stack, grid, eyebrowText, H3, text } = L;
const { subHero, head, arrowLink, numberedCards, checkList, seedBand, matrix } = require('./blocks.cjs');

/* -------------------------------------------------------- Enterprise Apps */
const enterpriseApps = {
  slug: 'enterprise-apps', title: 'Enterprise Apps',
  build: (m) => [
    subHero(m, {
      label: 'Enterprise Apps', image: 'dome',
      title: 'Enterprise Application Orchestration & Workflow Intelligence',
      lede: 'Validate how generative AI integrates into core business operations, CRM ecosystems, and enterprise productivity suites.',
    }),
    band([
      head(m, 'Enterprise Apps', 'Core Focus Areas'),
      numberedCards([
        ['Workflow Orchestration & Data Integration', 'Measuring how models interact across enterprise applications, databases, and collaboration hubs without losing context or dropping state.'],
        ['Business Application Benchmarks', 'Specific testing scenarios built around real-world tools, including Dynamics 365 Sales processes and Power BI analytical telemetry.'],
        ['Agentic Task Execution', 'Stress-testing multi-agent interactions, automated meeting summarization, and voice-agent telemetry within line-of-business software.'],
      ]),
    ], { bg: C.white, gap: 56, title: 'Core focus areas' }),
    seedBand(m, {
      label: 'SEED Engine', title: 'Backed by SEED Application Hydration',
      body: 'Our application testing relies on SEED packs specifically calibrated for enterprise tools, enabling end-to-end evaluation of data flows across Microsoft 365, Google Workspace, and external enterprise APIs.',
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
      lede: 'Objective, data-driven comparisons of Microsoft Copilot, Claude Enterprise, Google Gemini Enterprise, and ChatGPT Enterprise.',
    }),
    band([
      head(m, 'AI Platforms', 'Platform Evaluation Dimensions'),
      numberedCards([
        ['Multi-Tenant Architecture & Ecosystems', 'Evaluating platforms inside their native environments, including standalone Microsoft 365 tenants and Google Workspace setups connected directly to Gemini Enterprise.'],
        ['True Operational FinOps', 'Proprietary instrumentation measuring actual resource usage and cost-per-prompt-run, standardizing seat-licensed platforms against API list-price equivalents for direct comparison.'],
        ['Enterprise Administration & Governance', 'Direct auditing of administrative controls, compliance APIs, security boundary enforcement, and enterprise tenant analytics.'],
      ]),
    ], { bg: C.white, gap: 56, title: 'Evaluation dimensions' }),
    band([
      head(m, 'Evaluation matrix', 'Comparative Platform Dimensions'),
      matrix(['Dimension', 'Standard Generic Evaluation', 'Recco Independent Platform Analysis'], [
        ['Environment Tier', 'Standard business or demo accounts', 'Full enterprise-tier licensed platforms'],
        ['Ecosystem Reach', 'Isolated to a single provider tenant', 'Native Microsoft 365 and Google Workspace environments'],
        ['Cost Transparency', 'List-price seat estimations', 'Exact cost per prompt run via OpenTelemetry and billing APIs'],
        ['Output Validation', 'Subjective, isolated scoring', 'Traceable responses mapped to realistic enterprise signal data'],
      ]),
    ], { bg: C.tint, gap: 48, title: 'Comparison matrix' }),
  ],
};

/* ------------------------------------------------------------------- SEED */
const PILLARS = [
  ['Agile Multi-Vendor Lab', 'Native Enterprise Access Without Procurement Bottlenecks',
    'Complete, independent testing requires direct access to all major enterprise platforms without lengthy internal corporate procurement delays.', [
      'Native enterprise-tier access across Claude Enterprise, ChatGPT Enterprise, and dedicated Google Workspace connected to Gemini Enterprise.',
      'Direct visibility into vendor administrative consoles, enterprise analytics, security configurations, and APIs.',
      'Rapid turnaround for evaluating newly released vendor capabilities and private previews.',
    ]],
  ['Recco-Tuned Data Hydration', 'Signal-Dense Context, Not Static Filler',
    'Generic synthetic data lacks the operational signals required to test complex enterprise prompts. SEED injects rich enterprise context designed for high-context evaluations.', [
      'Built-in agentic meeting content and voice agent telemetry to establish clear audit trails for all outputs.',
      'Custom data packs engineered to evaluate Work IQ, enterprise security boundaries, and cross-application orchestration.',
      'Targeted hydration modules for deep workflows, including Dynamics 365 Sales processes and Power BI dashboards.',
    ]],
  ['Proprietary FinOps & Telemetry Stack', 'Per-Task Cost & Execution Visibility',
    'True vendor analysis requires balancing response quality with operational execution expenses.', [
      'Proprietary instrumentation combining OpenTelemetry, platform Compliance APIs, and Billing APIs.',
      'Precise cost-per-prompt-run tracking, including API list-price equivalents for seat-licensed platforms like Claude.',
      'Regular calibration against live test runs to produce accurate SecOps, ITOps, and FinOps benchmarks.',
    ]],
  ['Platform Analysis SMEs & Solution Architects', 'Expert Translation of Telemetry into Strategy',
    'Our technical team and subject matter experts translate raw telemetry into clear vendor trade-offs and presentation-ready environments.', [
      'Continuous tracking of vendor feature releases, model changes, and API updates.',
      'Comprehensive trade-off evaluations assessing quality, latency, accuracy, and operational cost.',
      'Custom demo design and tenant architecture for executive leadership briefings, Microsoft Ignite, and AI Tours.',
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
      lede: 'Standard test tenants lack signal density. SEED combines rapid vendor environment provisioning, Recco-Tuned hydration, and per-task FinOps instrumentation to reveal true performance, cost, and architectural capability.',
    }),
    band([
      head(m, 'SEED', 'The Four Pillars of SEED'),
      grid(PILLARS.map(pillar), { cols: [2, 1, 1], gap: [28, 28], gapT: [24, 24], gapM: [18, 18], align: 'stretch' }),
    ], { bg: C.tint, gap: 56, title: 'Four pillars' }),
    band([
      head(m, 'Hydration', 'SEED Pack Architecture vs. Generic Hydration',
        'How SEED’s tiered hydration packs expose platform capabilities compared to standard hydrated tenants.'),
      matrix(['Hydration Level', 'Recco-Tuned SEED Packs', 'Generic / Standard Hydrated Tenants'], [
        ['SEED Pack — Base', 'Baseline environment data with clear traceability; includes agentic meeting content and voice agent activity.', 'Hard to verify performance differences; meeting content hydration is manual, labor-intensive, and static.'],
        ['SEED Pack — Differentiators', 'Custom modules built to showcase Work IQ, security policy compliance, and cross-app orchestration.', 'Not included (relies on default, low-signal objects).'],
        ['SEED Pack — Prompt-Specific', 'Deep scenario hydration (e.g., Dynamics 365 Sales, Power BI telemetry) paired with prompt optimization recommendations.', 'Not included (evaluations are limited to generic knowledge queries).'],
      ], { highlight: 1 }),
    ], { bg: C.white, gap: 48, title: 'Hydration matrix' }),
    band([
      head(m, 'Infrastructure', 'SEED Lab Infrastructure Matrix',
        'Detailed breakdown of the technical capabilities available within the SEED environment.'),
      matrix(['Capability', 'Operational Value', 'The SEED Environment'], [
        ['Enterprise Tier Licenses', 'Test true enterprise admin, security, and licensed UX', 'Full Access (Claude, ChatGPT, Gemini Ent)'],
        ['Independent Tenant Setup', 'Test Google Workspace + Gemini ecosystem without M365 dependencies', 'Included'],
        ['Agile Procurement', 'Rapid setup bypassing corporate procurement cycles', 'Active'],
        ['Per-Task Cost Engine', 'Measure real operational cost per prompt run across platforms', 'Proprietary Telemetry Stack'],
        ['Multi-Tenant Reset & Hydration', 'Deliver consistent, clean, and repeatable test storylines', 'Active (Automation Roadmap)'],
        ['Event-Ready Demo Buildouts', 'Showcase verified platform capabilities at Ignite and AI Tours', 'Turnkey Execution'],
      ], { highlight: 2, cols: 'minmax(0,0.9fr) minmax(0,1.3fr) minmax(0,0.9fr)' }),
    ], { bg: C.tint, gap: 48, title: 'Infrastructure matrix' }),
  ],
};

module.exports = { enterpriseApps, aiPlatforms, seed };
