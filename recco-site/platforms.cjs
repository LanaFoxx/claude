// Platform lists and chip components shared by Home ("Platform expertise") and Enterprise Apps
// ("Platforms by Category"), so the two lists stay identical. Copy from the V3 copy rewrite (28 Oct 2026).
const L = require('./lib.cjs');
const { C, SANS, px, box, gap, auto, typo, container, widget, stack, row } = L;

// [label, media key, caption]. The caption is the chip's hover tooltip and the icon's alt text (set by prep.cjs).
const AI_SERVICES = [
  ['Microsoft 365 Copilot', 'icCopilot', 'Tested in hydrated M365 tenants across Teams, email, meetings, and files, with cost per task measured.'],
  ['ChatGPT Enterprise', 'icOpenai', 'Enterprise-tier, head-to-head testing with admin, analytics, and API-based cost measurement.'],
  ['Gemini Enterprise', 'icGemini', 'Evaluated natively in a dedicated Google Workspace tenant, end to end.'],
  ['Claude Enterprise', 'icClaude', 'Enterprise-tier testing, with seat usage converted to API list-price equivalents.'],
  ['Glean', 'icGlean', 'Enterprise search and assistant testing for retrieval accuracy and traceable answers.'],
  ['Perplexity', 'icPerplexity', 'Research and answer quality, source handling, and admin controls for enterprise use.'],
  ['GitHub Copilot', 'icGithubCopilot', 'Tested hands-on in licensed seats for code quality, governance controls, and cost.'],
  ['Microsoft Copilot Studio', 'icCopilotStudio', 'Agents built and tested hands-on: design, connectors, governance, and run cost.'],
  ['Salesforce Agentforce', 'icAgentforce', 'CRM-native agents tested hands-on on realistic sales and service workflows.'],
  ['Amazon Bedrock', 'icBedrock', 'Models and agents tested hands-on on AWS for quality, cost, and governance.'],
  ['Lovable', 'icLovable', 'Apps built and tested hands-on to judge prototype speed, quality, and readiness to scale.'],
  ['Replit', 'icReplit', 'Build-and-deploy workflows tested hands-on for output quality, security, and governance.'],
  ['n8n', 'icN8n', 'Workflow automations built and tested hands-on across apps, APIs, and models.'],
  ['Cursor', 'icCursor', 'Tested hands-on in licensed seats for development productivity, cost, and governance.'],
];

// [category, [[label, media key]]]
const APP_CATEGORIES = [
  ['CRM & Customer Experience', [['Salesforce', 'icSalesforce'], ['Microsoft Dynamics 365', 'icDynamics'], ['Zendesk', 'icZendesk']]],
  ['ERP & Finance', [['SAP', 'icSap'], ['Oracle', 'icOracle'], ['Intuit', 'icIntuit']]],
  ['IT Service & Workflow', [['ServiceNow', 'icServicenow'], ['Pega', 'icPega']]],
  ['Contact Center', [['Five9', 'icFive9'], ['NICE', 'icNice'], ['Genesys', 'icGenesys']]],
  ['Low-Code Platforms', [['Mendix', 'icMendix'], ['OutSystems', 'icOutsystems']]],
  ['Work Management & Collaboration', [['ClickUp', 'icClickup'], ['Jira', 'icJira'], ['Miro', 'icMiro'], ['Monday.com', 'icMonday'], ['Smartsheet', 'icSmartsheet']]],
  ['Intelligent Automation & RPA', [['UiPath', 'icUipath'], ['Blue Prism', 'icBlueprism'], ['Automation Anywhere', 'icAutomationAnywhere']]],
  ['Cloud & Digital Experience', [['AWS', 'icAws'], ['Adobe', 'icAdobe']]],
];

// White pill with icon and name. On light bands the pill gets a hairline border.
const chip = (m, [label, icon, caption], o = {}) => container({
  content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, flex_direction: 'row', flex_wrap: 'nowrap',
  flex_align_items: 'center', flex_gap: gap(10), flex_gap_mobile: gap(8),
  padding: box(9, 18, 9, 11), padding_mobile: box(8, 14, 8, 10),
  background_background: 'classic', background_color: C.white, border_radius: box(999),
  border_border: 'solid', border_width: box(1), border_color: o.dark ? C.white : C.line,
  custom_css: 'selector { transition: transform .2s, box-shadow .2s; }\nselector:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(0,0,0,.45); }',
  ...(caption ? { _attributes: `title|${caption}` } : {}),
  _title: label,
}, [
  L.image(m[icon], { width: [24, 24, 22], settings: { _element_width: 'initial', _element_custom_width: px(24), _element_custom_width_mobile: px(22), _flex_size: 'none' } }),
  widget('heading', {
    title: label, header_size: 'p', title_color: C.navy, ...typo('typography', SANS, [15, 15, 14], 600, { lh: 1.2 }),
    custom_css: 'selector .elementor-heading-title { white-space: nowrap; }',
  }),
]);

const chips = (m, items, o = {}) => row(items.map((p) => chip(m, p, o)), { gap: 10, settings: { flex_gap_mobile: gap(8) } });

// "AI Services": one wrapping row of 14 chips under a small label.
const aiGroup = (m, o = {}) => stack([
  L.eyebrowText('AI Services', 'left', o.dark ? 'rgba(255,255,255,0.72)' : C.green),
  chips(m, AI_SERVICES, o),
], { gap: 16, settings: { _title: 'AI Services' } });

// "Enterprise App Services": one ruled row per category, label left and chips right (stacked on mobile).
const appRows = (m, o = {}) => {
  const rule = o.dark ? 'rgba(255,255,255,0.16)' : C.line;
  return stack([
    ...(o.label === false ? [] : [L.eyebrowText('Enterprise App Services', 'left', o.dark ? 'rgba(255,255,255,0.72)' : C.green)]),
    stack(APP_CATEGORIES.map(([cat, items]) => container({
      container_type: 'grid', content_width: 'full', padding: box(16, 0, 16, 0), padding_mobile: box(14, 0, 14, 0),
      grid_columns_grid: { unit: 'custom', size: '240px minmax(0,1fr)' }, grid_columns_grid_tablet: { unit: 'custom', size: '190px minmax(0,1fr)' },
      grid_columns_grid_mobile: px(1, 'fr'), grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
      grid_gaps: gap(24, 10), grid_gaps_mobile: gap(10), grid_align_items: 'center',
      border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: rule,
      _title: cat,
    }, [
      widget('heading', {
        title: cat, header_size: 'h3', title_color: o.dark ? C.white : C.navy, ...typo('typography', SANS, [15, 14, 14], 700, { lh: 1.35 }),
      }),
      chips(m, items, o),
    ])), { gap: 0, settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: rule } }),
  ], { gap: 16, settings: { _title: 'Enterprise App Services' } });
};

// Media files for the icons added with the V3 list (deploy.cjs maps them; prep.cjs sets their alt text).
const ICON_FILES = {
  icGemini: 'recco-icon-gemini.png', icClaude: 'recco-icon-claude.png', icGlean: 'recco-icon-glean.png', icPerplexity: 'recco-icon-perplexity.png',
  icGithubCopilot: 'recco-icon-github-copilot.png', icAgentforce: 'recco-icon-agentforce.png', icBedrock: 'recco-icon-bedrock.png',
  icN8n: 'recco-icon-n8n.png', icCursor: 'recco-icon-cursor.png', icZendesk: 'recco-icon-zendesk.png', icSap: 'recco-icon-sap.png',
  icOracle: 'recco-icon-oracle.png', icIntuit: 'recco-icon-intuit.png', icPega: 'recco-icon-pega.png', icFive9: 'recco-icon-five9.png',
  icNice: 'recco-icon-nice.png', icGenesys: 'recco-icon-genesys.png', icMendix: 'recco-icon-mendix.png', icOutsystems: 'recco-icon-outsystems.png',
  icClickup: 'recco-icon-clickup.png', icJira: 'recco-icon-jira.png', icMiro: 'recco-icon-miro.png', icMonday: 'recco-icon-monday.png',
  icSmartsheet: 'recco-icon-smartsheet.png', icUipath: 'recco-icon-uipath.png', icBlueprism: 'recco-icon-blue-prism.png',
  icAutomationAnywhere: 'recco-icon-automation-anywhere.png', icAdobe: 'recco-icon-adobe.png',
};

// Alt text by media key: the caption for AI Services icons, the platform name for the rest.
const ICON_ALT = Object.fromEntries([
  ...APP_CATEGORIES.flatMap(([, items]) => items.map(([label, key]) => [key, label])),
  ...AI_SERVICES.map(([label, key, caption]) => [key, `${label}: ${caption}`]),
]);

module.exports = { AI_SERVICES, ICON_ALT, APP_CATEGORIES, ICON_FILES, chip, aiGroup, appRows };
