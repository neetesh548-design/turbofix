// Single source of truth for per-route SEO metadata.
// Consumed by src/App.jsx (client-side, via SearchMetadata) and by
// scripts/apply-seo-meta.mjs (build-time, patches the static dist/*.html
// files so non-JS crawlers see correct title/description/canonical too —
// the client-side update alone only reaches crawlers that render JS).

export const SITE_URL = 'https://www.turbofix.co.in';

export const PAGE_META = {
  '/': {
    title: 'TurboFix | Verified Maintenance for Manufacturing',
    description: 'TurboFix helps plants report breakdowns, assign work, verify repairs, and keep approved machine history in one system.',
  },
  '/why-turbofix.html': {
    title: 'Why TurboFix | Why Plants Switch',
    description: 'See how TurboFix replaces paper, spreadsheets, and WhatsApp handoffs with verified maintenance work.',
  },
  '/platform.html': {
    title: 'TurboFix Platform | Maintenance Workflows',
    description: 'See TurboFix for breakdown reporting, repair execution, records, and plant visibility.',
  },
  '/records-platform.html': {
    title: 'TurboFix Records Platform',
    description: 'Digitize handwritten and digital maintenance records into reviewable machine history.',
  },
  '/workflow.html': {
    title: 'TurboFix Workflow | Report to Verify',
    description: 'Follow each issue from report to assignment, repair, and verified closure.',
  },
  '/demo.html': {
    title: 'TurboFix Demo | See the Product in Action',
    description: 'See one representative TurboFix scenario for operators, technicians, and plant leaders.',
  },
  '/pricing.html': {
    title: 'TurboFix Pricing | Per Machine Plans',
    description: 'Explore per-machine pricing, onboarding, and what is included before you book a walkthrough.',
  },
  '/contact.html': {
    title: 'Book a TurboFix Plant Walkthrough',
    description: 'Book a guided TurboFix walkthrough for one representative machine in your plant.',
  },
  '/admin.html': {
    title: 'TurboFix | Platform Operations Control Room',
    description: 'TurboFix Platform Operations Control Room & Factory Machine Fleet Management',
  },
  '/admin': {
    title: 'TurboFix | Platform Operations Control Room',
    description: 'TurboFix Platform Operations Control Room & Factory Machine Fleet Management',
  },
  '/platform-experience.html': {
    title: 'TurboFix | Platform Experience',
    description: 'Experience how TurboFix unifies your plant maintenance workflow in one seamless platform.',
  },
  '/experience.html': {
    title: 'TurboFix | Experience',
    description: 'See the TurboFix difference and learn how to optimize your manufacturing downtime.',
  },
};

// Only these routes should be indexable — everything else (app screens,
// auth, admin tooling) gets noindex both client-side and in the static HTML.
export const PUBLIC_MARKETING_PATHS = [
  '/',
  '/why-turbofix.html',
  '/platform.html',
  '/records-platform.html',
  '/workflow.html',
  '/demo.html',
  '/pricing.html',
  '/contact.html',
];
